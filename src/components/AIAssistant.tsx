import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Send, Copy, CheckSquare, Square, Zap, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Task, AIMessage, GeneratedCode, Node, Connection } from '../types';
import type { SoodoSettings } from './SettingsModal';
import { loadBoardMemory, saveBoardMemory } from '../utils/memory';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  nodes?: Node[];
  connections?: Connection[];
  boardName?: string;
}

// Settings stored in localStorage under 'soodo-settings'
const AIAssistant = ({ isOpen, onClose, nodes = [], connections = [], boardName = 'Generated Program' }: AIAssistantProps) => {
  const [chatMessage, setChatMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ name: string; dataUrl: string }[]>([]);

  // Load any persisted memory for this board (plan + language)
  const initialMemory = loadBoardMemory(boardName || 'default-board');

  // Pinned TODO list inferred from the latest analysis
  const [planTasks, setPlanTasks] = useState<Task[] | null>(initialMemory.planTasks ?? null);
  // Index of the current plan step the user is working on (0-based)
  const [activePlanStep, setActivePlanStep] = useState<number | null>(initialMemory.activePlanStep ?? null);
  // User's preferred programming language for code snippets (inferred from chat)
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(initialMemory.preferredLanguage ?? null);
  // For keeping the view scrolled to the latest messages
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content:
        "Hi! I'm here to help you build software from flowcharts. I can analyze your board, suggest ideas, provide code snippets, or just chat about your project. What would you like to work on?",
      timestamp: new Date()
    }
  ]);

  // Removed standalone generated code panel; code is delivered as chat messages

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const toggleTaskInMessage = (messageId: string, taskId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId || !m.tasksPayload) return m;
      return {
        ...m,
        tasksPayload: m.tasksPayload.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
      };
    }));
  };

  const getSettings = (): SoodoSettings => {
    try {
      const raw = localStorage.getItem('soodo-settings');
      const s: SoodoSettings = raw
        ? { theme: 'light', apiMode: 'simple', apiProvider: 'auto', codeProvider: 'local', ...JSON.parse(raw) }
        : { theme: 'light', apiMode: 'simple', apiProvider: 'auto', codeProvider: 'local' };
      // Auto-detect provider by key/endpoint if 'auto'
      if (s.apiProvider === 'auto') {
        const k = s.apiKey || '';
        const url = s.customEndpoint || '';
        if (/sk-ant-/.test(k) || /anthropic\.com/.test(url)) s.apiProvider = 'anthropic';
        else if (/^AIza[0-9A-Za-z\-_]{35}$/.test(k) || /generativelanguage\.googleapis\.com/.test(url)) s.apiProvider = 'gemini';
        else if (/^hf_[A-Za-z0-9]{20,}$/.test(k) || /huggingface\.co/.test(url)) s.apiProvider = 'huggingface';
        else if (/openrouter\.ai/.test(url)) s.apiProvider = 'openrouter';
        else if (/localhost|127\.0\.0\.1/.test(url)) s.apiProvider = 'selfhosted';
        else if (/sk-\w{20,}/.test(k) || /openai\.com/.test(url)) s.apiProvider = 'openai';
        else if (/supabase\.co\/functions\/v1\//.test(url)) s.apiProvider = 'supabase';
        else if (url) s.apiProvider = 'custom';
        else s.apiProvider = 'none';
      }
      // Normalize default model per provider
      if (s.apiProvider === 'openai' && !(s.chatModel || '').toLowerCase().startsWith('gpt')) {
        s.chatModel = 'gpt-4o-mini';
      }
      if (s.apiProvider === 'anthropic' && !(s.chatModel || '').toLowerCase().startsWith('claude')) {
        s.chatModel = 'claude-3-5-sonnet-latest';
      }
      if (s.apiProvider === 'gemini' && !(s.chatModel || '').toLowerCase().startsWith('gemini')) {
        s.chatModel = 'gemini-1.5-flash';
      }
      return s;
    } catch {
      return { theme: 'light', apiProvider: 'auto', codeProvider: 'local' } as SoodoSettings;
    }
  };

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } catch {
        // ignore scroll errors
      }
    }
  }, [isOpen, messages]);

  // Persist memory whenever core memory state changes
  useEffect(() => {
    saveBoardMemory(boardName || 'default-board', {
      planTasks,
      activePlanStep,
      preferredLanguage,
    });
  }, [boardName, planTasks, activePlanStep, preferredLanguage]);

  const callChatAPI = async (message: string, imagesBase64: string[] = []): Promise<string> => {
    const settings = getSettings();

    const tryOpenAICompatible = async (endpoint: string, key?: string) => {
      const base = endpoint.replace(/\/$/, '');
      const path = /\/v\d+(?:\/)?$/.test(base) ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({
          model: settings.chatModel || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                "You are Soodo Code's assistant. Help users build software from flowcharts. Be conversational, curious, and act like a senior engineer mentoring the user. Ask short clarifying questions when needed, but do NOT repeat the same explanation many times. When providing code, give small, focused snippets that build incrementally. Guide through each step with explanations, then provide code for that specific step. Only provide full complete code at the very end of the implementation guide, or when the user specifically requests it. Focus on teaching and guiding rather than dumping code. Prefer the user's chosen language if provided (preferred_language), otherwise pick a reasonable default and stick to it until they change it. Flowchart: " + JSON.stringify(flowchartContext) + ". preferred_language: " + (preferredLanguage || 'unspecified') + ". current_plan_tasks: " + JSON.stringify(planTasks?.map(t => t.text) || []),
            },
            { role: 'user', content: message }
          ]
        })
      });
      const data = await res.json();
      const choice = data.choices?.[0]?.message?.content;
      return typeof choice === 'string' ? choice : JSON.stringify(data);
    };

    const flowchartContext = {
      boardName,
      nodes: nodes.map(n => ({ id: n.id, type: n.type, text: n.text, x: n.x, y: n.y })),
      connections: connections.map(c => ({ from: c.fromNode, to: c.toNode }))
    };

    // Special handling for OpenRouter and self-hosted OpenAI-compatible models
    if (settings.apiProvider === 'openrouter') {
      const endpoint = settings.customEndpoint || 'https://openrouter.ai/api/v1';
      return await tryOpenAICompatible(endpoint, settings.apiKey);
    }
    if (settings.apiProvider === 'selfhosted' && settings.customEndpoint) {
      // Assume self-hosted is OpenAI-compatible (e.g., v1/chat/completions)
      return await tryOpenAICompatible(settings.customEndpoint, settings.apiKey);
    }

    // Custom proxy / Supabase function (expects our own JSON contract)
    if ((settings.apiProvider === 'custom' || settings.apiProvider === 'supabase') && settings.customEndpoint) {
      try {
        const res = await fetch(settings.customEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}) },
          body: JSON.stringify({ message, images: imagesBase64, flowchart: flowchartContext })
        });
        if (res.status === 404) {
          // Try OpenAI-compatible fallback
          return await tryOpenAICompatible(settings.customEndpoint, settings.apiKey);
        }
        const data = await res.json();
        return data.reply || data.message || JSON.stringify(data);
      } catch (e) {
        // Fallback to OpenAI-compatible route if provided
        try {
          return await tryOpenAICompatible(settings.customEndpoint, settings.apiKey);
        } catch {
          return 'Failed to reach custom chat endpoint.';
        }
      }
    }

    // OpenAI
    if (settings.apiProvider === 'openai' && settings.apiKey) {
      try {
        const model = (settings.chatModel && settings.chatModel.toLowerCase().startsWith('gpt')) ? settings.chatModel : 'gpt-4o-mini';
        const chatMessages: any[] = [
          {
            role: 'system',
            content:
              "You are Soodo Code's assistant. Help users build software from flowcharts. Be conversational, curious, and act like a senior engineer mentoring the user. Ask short clarifying questions when needed, but do NOT repeat the same explanation many times. When providing code, give small, focused snippets that build incrementally. Guide through each step with explanations, then provide code for that specific step. Only provide full complete code at the very end of the implementation guide, or when the user specifically requests it. Focus on teaching and guiding rather than dumping code. Prefer the user's chosen language if provided (preferred_language), otherwise pick a reasonable default and stick to it until they change it.",
          },
          { role: 'system', content: `Flowchart: ${JSON.stringify(flowchartContext)}` },
          { role: 'system', content: `Preferred language: ${preferredLanguage || 'unspecified'}` },
          { role: 'system', content: `Current plan tasks: ${JSON.stringify(planTasks?.map(t => t.text) || [])}` },
          // include last few turns, but trim repeated TODO proposals by keeping only last 2 assistant messages
          ...messages.slice(-4).map(m => ({ role: m.type === 'assistant' ? 'assistant' : 'user', content: m.content }))
        ];
        const contentParts: any[] = [{ type: 'text', text: message }];
        for (const img of imagesBase64) contentParts.push({ type: 'input_image', image_url: img });
        chatMessages.push({ role: 'user', content: contentParts });

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
          body: JSON.stringify({ model, messages: chatMessages })
        });
        const data = await res.json();
        const choice = data.choices?.[0]?.message?.content;
        if (typeof choice === 'string') return choice;
        if (Array.isArray(choice)) {
          return choice.map((p: any) => p.text || p.content || '').join('\n');
        }
      } catch (e) {
        return 'OpenAI request failed.';
      }
    }

    // Google Gemini
    if (settings.apiProvider === 'gemini' && settings.apiKey) {
      try {
        const normalizeModel = (m?: string) => {
          let mm = (m && m.toLowerCase().startsWith('gemini')) ? m : 'gemini-1.5-flash';
          if (!/-latest$/.test(mm)) mm = mm + '-latest';
          return mm;
        };
        const model = normalizeModel(settings.chatModel);

        const makeReq = async (mdl: string) => {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${settings.apiKey}`;
          const parts: any[] = [
            {
              text:
                "You are Soodo Code's assistant. Help users build software from flowcharts. Be conversational, curious, and act like a senior engineer mentoring the user. Ask short clarifying questions when needed, but do NOT repeat the same explanation many times. When providing code, give small, focused snippets that build incrementally. Guide through each step with explanations, then provide code for that specific step. Only provide full complete code at the very end of the implementation guide, or when the user specifically requests it. Focus on teaching and guiding rather than dumping code. Preferred language: " + (preferredLanguage || 'unspecified') + ". Current plan tasks: " + JSON.stringify(planTasks?.map(t => t.text) || []),
            },
            { text: `Flowchart: ${JSON.stringify(flowchartContext)}` },
          ];
          if (message) parts.push({ text: message });
          for (const img of imagesBase64) parts.push({ inline_data: { mime_type: 'image/png', data: (img.split(',')[1] || img) } });
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }) });
          return res.json();
        };

        let data = await makeReq(model);
        // Fallback if model unsupported
        if (data?.error?.message?.toLowerCase().includes('not found') || data?.error?.message?.toLowerCase().includes('not supported')) {
          // Try list models and pick first supporting generateContent
          const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${settings.apiKey}`;
          const list = await fetch(listUrl).then(r => r.json());
          const candidate = (list.models || []).find((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'));
          if (candidate?.name) {
            const name = String(candidate.name).replace(/^models\//, '');
            data = await makeReq(name);
          }
        }
        const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('\n');
        return text || (data.error?.message || 'Gemini response empty.');
      } catch (e) {
        return 'Gemini request failed.';
      }
    }

    // Hugging Face Inference
    if (settings.apiProvider === 'huggingface' && settings.apiKey) {
      try {
        const model = settings.chatModel || 'mistralai/Mixtral-8x7B-Instruct-v0.1';
        const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
        const prompt = `You are Soodo Code's assistant. Help users build software from flowcharts. Be conversational, curious, and act like a senior engineer mentoring the user. Ask short clarifying questions when needed, but do NOT repeat the same explanation many times. When providing code, give small, focused snippets that build incrementally. Guide through each step with explanations, then provide code for that specific step. Only provide full complete code at the very end of the implementation guide, or when the user specifically requests it. Focus on teaching and guiding rather than dumping code. Preferred language: ${preferredLanguage || 'unspecified'}. Current plan tasks: ${JSON.stringify(planTasks?.map(t => t.text) || [])}.\n\nFlowchart: ${JSON.stringify(flowchartContext)}\n\nUser: ${message}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
          body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 600, return_full_text: false } })
        });
        const data = await res.json();
        // Try several common response shapes
        if (Array.isArray(data)) {
          const first = data[0];
          const text = first?.generated_text || first?.summary_text || '';
          if (text) return text;
        }
        if (typeof data?.generated_text === 'string') return data.generated_text;
        if (Array.isArray(data?.choices)) return data.choices.map((c: any) => c.text || '').join('\n');
        return JSON.stringify(data);
      } catch (e) {
        return 'Hugging Face request failed.';
      }
    }

    // Anthropic
    if (settings.apiProvider === 'anthropic' && settings.apiKey) {
      try {
        const model = (settings.chatModel && settings.chatModel.toLowerCase().startsWith('claude')) ? settings.chatModel : 'claude-3-5-sonnet-latest';
        const userContent: any[] = [{ type: 'text', text: message }];
        for (const img of imagesBase64) userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: img.split(',')[1] || img } });
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model,
            system: `You are Soodo Code's assistant. Help users build software from flowcharts. Be conversational, curious, and act like a senior engineer mentoring the user. Ask short clarifying questions when needed, but do NOT repeat the same explanation many times. When providing code, give small, focused snippets that build incrementally. Guide through each step with explanations, then provide code for that specific step. Only provide full complete code at the very end of the implementation guide, or when the user specifically requests it. Focus on teaching and guiding rather than dumping code. Preferred language: ${preferredLanguage || 'unspecified'}. Current plan tasks: ${JSON.stringify(planTasks?.map(t => t.text) || [])}. Flowchart: ${JSON.stringify(flowchartContext)}`,
            messages: [{ role: 'user', content: userContent }],
            max_tokens: 800
          })
        });
        const data = await res.json();
        const text = (data.content || []).map((p: any) => p.text || '').join('\n');
        return text || 'Received empty response.';
      } catch (e) {
        return 'Anthropic request failed.';
      }
    }

    // Fallback simulated
    return `I received: "${message}"${imagesBase64.length ? ` with ${imagesBase64.length} image(s)` : ''}. Configure a provider in Settings for real AI responses.`;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() && pendingImages.length === 0) return;

    const raw = chatMessage.trim();
    const lower = raw.toLowerCase();

    // Try to detect preferred language from this message
    const languageMatch = lower.match(/\b(python|typescript|javascript|node\.js|c#|csharp|java|go|rust|php|ruby)\b/);
    if (languageMatch) {
      const lang = languageMatch[1];
      setPreferredLanguage(prev => prev || lang);
    }

    // Special handling: user asks for the next step in the plan or a specific step number
    const hasPlan = !!planTasks && planTasks.length > 0;
    const wantsNextStep = hasPlan && /(next step|next one|next part|continue|keep going|go on|move on|let's proceed|let us proceed|continue onward|continue forward|we can move on)/i.test(raw);
    const stepNumMatch = hasPlan ? raw.match(/step\s+(\d+)/i) : null;
    let stepIndex: number | null = null;
    if (hasPlan && stepNumMatch) {
      const n = parseInt(stepNumMatch[1], 10);
      if (!isNaN(n)) stepIndex = Math.min(Math.max(n - 1, 0), planTasks!.length - 1);
    } else if (hasPlan && wantsNextStep) {
      stepIndex = activePlanStep == null ? 0 : Math.min(activePlanStep + 1, planTasks!.length - 1);
    }

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatMessage || '(image)',
      timestamp: new Date(),
      contentType: pendingImages.length ? 'image' : 'text',
      imagesPayload: pendingImages.length ? pendingImages : undefined
    };
    setMessages(prev => [...prev, userMsg]);

    let outboundMessage = chatMessage;

    // If user is asking for a particular TODO step, direct the model accordingly
    if (hasPlan && stepIndex !== null && planTasks) {
      setActivePlanStep(stepIndex);
      const stepText = planTasks[stepIndex].text;
      const numberedPlan = planTasks.map((t, i) => `${i + 1}. ${t.text}`).join('\n');
      const completedSoFar = stepIndex > 0 ? planTasks.slice(0, stepIndex).map((t, i) => `${i + 1}. ${t.text}`).join('\n') : 'none';
      outboundMessage = `ASSISTANT_INSTRUCTION: We already agreed on this implementation plan (TODO list):\n${numberedPlan}\n\nThe user just said: "${raw}". They want detailed help for TODO #${stepIndex + 1}: "${stepText}". Assume that ALL steps listed as completed have already been implemented and tested, so you MUST NOT repeat or re-implement them.\n\nCompleted steps: ${completedSoFar}.\n\nPlease act like a mentor: briefly explain this step in 1-2 short paragraphs, then provide a concise code snippet that implements ONLY this step in the user's preferred language (${preferredLanguage || 'unspecified'}). Do not repeat the entire plan, do not re-initialize variables that belong to earlier steps, and do not restate the whole flowchart; stay focused on this one step and keep the answer tight.`;
    }

    const reply = await callChatAPI(outboundMessage, pendingImages.map(p => p.dataUrl));
    // Parse optional control block from reply
    const augment = parseAugmentations(reply);
    const assistantMsg: AIMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: augment.cleaned,
      timestamp: new Date(),
      contentType: 'text'
    };
    const toAdd: AIMessage[] = [assistantMsg];
    if (augment.tasks && augment.tasks.length) {
      const generatedTasks: Task[] = augment.tasks.map((t, i) => ({ id: `${Date.now()}_${i}`, text: t, completed: false }));
      // For normal chat, only adopt these as the main plan if we don't already have one
      if (!planTasks || planTasks.length === 0) {
        setPlanTasks(generatedTasks);
        setActivePlanStep(null);
      }
      toAdd.push({
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: 'Here are proposed tasks:',
        timestamp: new Date(),
        contentType: 'tasks',
        tasksPayload: generatedTasks,
      });
    }
    if (augment.code) {
      toAdd.push({ id: (Date.now()+3).toString(), type: 'assistant', content: 'Generated snippet:', timestamp: new Date(), contentType: 'code', codePayload: augment.code });
    }
    setMessages(prev => [...prev, ...toAdd]);

    setChatMessage('');
    setPendingImages([]);
  };
  const handleGenerateCode = async () => {
    if (nodes.length === 0) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'assistant',
          content: 'Please add some nodes to your flowchart first.',
          timestamp: new Date(),
          contentType: 'text',
        },
      ]);
      return;
    }

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: 'Please analyze my flowchart and suggest a plan.',
      timestamp: new Date(),
      contentType: 'text',
    };
    setMessages(prev => [...prev, userMsg]);

    // Strongly instruct the model to return a <soodo>{"tasks":[...]}</soodo> block
    const planningPrompt =
      'ANALYZE_FLOWCHART_AND_PLAN: Please analyze the current flowchart and respond with: ' +
      '(1) a short natural-language summary (2-4 sentences max) of what the system does, and ' +
      '(2) a <soodo>{"tasks":["..."]}</soodo> JSON control block listing 4-8 concrete TODO steps to implement the system. ' +
      'Each task should be short and implementation-focused. Do NOT include code in the tasks array; keep that for later steps.';

    const reply = await callChatAPI(planningPrompt);
    const augment = parseAugmentations(reply);
    const assistantMsg: AIMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: augment.cleaned,
      timestamp: new Date(),
      contentType: 'text'
    };
    const toAdd: AIMessage[] = [assistantMsg];
    if (augment.tasks && augment.tasks.length) {
      const generatedTasks: Task[] = augment.tasks.map((t, i) => ({ id: `${Date.now()}_${i}`, text: t, completed: false }));
      setPlanTasks(generatedTasks);
      setActivePlanStep(null);
      toAdd.push({
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: 'Here are proposed tasks:',
        timestamp: new Date(),
        contentType: 'tasks',
        tasksPayload: generatedTasks,
      });
    }
    if (augment.code) {
      toAdd.push({ id: (Date.now()+3).toString(), type: 'assistant', content: 'Generated snippet:', timestamp: new Date(), contentType: 'code', codePayload: augment.code });
    }
    setMessages(prev => [...prev, ...toAdd]);
  };

  const handleCopyCode = async (code?: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };



  function parseAugmentations(text: string): { cleaned: string; tasks?: string[]; code?: GeneratedCode } {
    const result: any = { cleaned: text };
    const match = text.match(/<soodo>([\s\S]*?)<\/soodo>/);
    if (match) {
      try {
        const payload = JSON.parse(match[1]);
        result.cleaned = text.replace(match[0], '').trim();
        if (Array.isArray(payload.tasks)) result.tasks = payload.tasks.map((t: any) => String(t));
        if (payload.code && payload.code.code) {
          result.code = {
            filename: payload.code.filename || 'snippet.txt',
            language: payload.code.language || 'text',
            code: payload.code.code,
            lineNumbers: Array.from({ length: (payload.code.code.split('\n').length) }, (_, i) => i + 1)
          } as GeneratedCode;
        }
      } catch (e) {
        // ignore JSON parse failure; show raw text
      }
    }
    // Also support Markdown code fences if no control block
    if (!result.code) {
      const fence = text.match(/```(\w+)?[\r\n]+([\s\S]*?)```/);
      if (fence) {
        result.code = {
          filename: 'snippet.' + (fence[1] || 'txt'),
          language: fence[1] || 'text',
          code: fence[2].trim(),
          lineNumbers: Array.from({ length: fence[2].trim().split('\n').length }, (_, i) => i + 1)
        } as GeneratedCode;
        result.cleaned = text.replace(fence[0], '').trim();
      }
    }

    // Fallback: infer tasks from bullet/numbered lists if none were provided explicitly
    if (!result.tasks) {
      const bulletLines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => /^([-*]\s+|\d+\.\s+)/.test(l));
      if (bulletLines.length >= 2) {
        result.tasks = bulletLines.map(l => l.replace(/^([-*]\s+|\d+\.\s+)/, '').trim()).filter(Boolean);
      }
    }

    return result;
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed right-4 top-4 bottom-4 bg-white/95 backdrop-blur-sm
          shadow-[0_18px_45px_rgba(0,0,0,0.18)] border border-gray-200
          rounded-3xl transform transition-transform duration-300 ease-in-out z-50 overflow-hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-[110%]'}
        `}
        style={{ width: 'min(420px, 100vw - 2rem)' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-heading font-bold text-soodo-oxford-blue">
              AI Assistant
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([{
                  id: '1',
                  type: 'assistant',
                  content: "Hi! I'm here to help you build software from flowcharts. I can analyze your board, suggest ideas, provide code snippets, or just chat about your project. What would you like to work on?",
                  timestamp: new Date()
                }])}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset chat"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-soodo-oxford-blue">Chat</h3>
          </div>

          {/* Chat Section */}
          {/* Pinned TODO plan (if any) */}
          {planTasks && planTasks.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-soodo-oxford-blue">Plan TODOs</h4>
                <span className="text-[10px] text-gray-500">Guiding this board</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-auto pr-1">
                {planTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPlanTasks(prev => prev?.map(p => p.id === t.id ? { ...p, completed: !p.completed } : p) || null)}
                    className="flex items-center gap-2 text-left w-full hover:bg-white/60 rounded px-1 py-0.5"
                  >
                    {t.completed ? (
                      <CheckSquare size={14} className="text-soodo-cocoa-brown" />
                    ) : (
                      <Square size={14} className="text-gray-400" />
                    )}
                    <span className={`${t.completed ? 'line-through text-gray-500' : 'text-gray-800'} text-[11px] font-light`}>
                      {t.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 flex flex-col overflow-y-auto">
          
            {/* Messages */}
            <div className="flex flex-col p-4 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm border
                      ${m.type === 'user'
                        ? 'bg-[var(--soodo-jasmine)] border-[#FACC15] text-black'
                        : 'bg-white border-[#E5E7EB] text-gray-800'}
                    `}
                  >
                    {/* Text */}
                    {m.content && (
                      <ReactMarkdown className={`${m.type==='assistant' ? 'text-gray-800' : ''} text-[13px] leading-relaxed font-normal font-body whitespace-pre-wrap`}>{m.content}</ReactMarkdown>
                    )}

                    {/* Tasks checklist inside assistant message */}
                    {m.tasksPayload && (
                      <div className="mt-2 space-y-1">
                        {m.tasksPayload.map(t => (
                          <button
                            key={t.id}
                            onClick={() => toggleTaskInMessage(m.id, t.id)}
                            className="flex items-center gap-2 text-left w-full hover:opacity-90"
                          >
                            {t.completed ? <CheckSquare size={16} className="text-soodo-cocoa-brown" /> : <Square size={16} className="text-gray-400" />}
                            <span className={`${t.completed ? 'line-through text-gray-500' : 'text-gray-800'} text-[13px] font-light`}>{t.text}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Code snippet bubble */}
                    {m.codePayload && (
                      <div className="mt-2 bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-100 overflow-x-auto">
                        <div className="flex items-center justify-between mb-2 text-gray-400">
                          <span>{m.codePayload.filename}</span>
                          <button onClick={() => handleCopyCode(m.codePayload?.code)} className="flex items-center gap-1 text-gray-300 hover:text-white">
                            {isCopied ? <CheckSquare size={14} /> : <Copy size={14} />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap text-[12px] leading-relaxed">
                          <code>{m.codePayload.code}</code>
                        </pre>
                      </div>
                    )}

                    {/* Images preview */}
                    {m.imagesPayload && m.imagesPayload.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {m.imagesPayload.map((img, idx) => (
                          <img key={idx} src={img.dataUrl} alt={img.name} className="rounded-lg border object-cover max-h-40" />
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] opacity-70 mt-1 font-mono">
                      {m.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
              <div className="flex items-center gap-2">
                <label className="p-2 border rounded-lg hover:bg-gray-50 cursor-pointer" title="Attach image">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = reader.result as string;
                        setPendingImages(prev => [...prev, { name: file.name, dataUrl }]);
                        setUploadingImage(false);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <ImageIcon size={18} className="text-gray-600" />
                </label>
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Tell us anything..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent"
                />
                <button
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                  title="Analyze flowchart and propose TODO plan"
                >
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} className="text-soodo-cocoa-brown" />}
                </button>
                <button
                  onClick={handleSendMessage}
                  className="bg-soodo-cocoa-brown text-white p-2 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              {pendingImages.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {pendingImages.map((img, i) => (
                    <img key={i} src={img.dataUrl} alt={img.name} className="h-16 w-16 object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
