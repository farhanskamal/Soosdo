import { useState } from 'react';
import { X, Send, Copy, CheckSquare, Square, Zap, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Task, AIMessage, GeneratedCode, Node, Connection } from '../types';
import { generateCodeFromFlowchart, CodeGenerationResult } from '../utils/codeGenerator';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  nodes?: Node[];
  connections?: Connection[];
  boardName?: string;
}

// Settings stored in localStorage under 'soodo-settings'
interface SoodoSettings {
  theme: 'light' | 'dark' | 'system';
  apiProvider?: 'auto' | 'openai' | 'anthropic' | 'gemini' | 'huggingface' | 'supabase' | 'custom' | 'none';
  codeProvider?: 'local' | 'supabase' | 'custom';
  apiKey?: string;
  chatModel?: string;      // e.g., gpt-4o-mini, claude-3-5-sonnet-latest
  customEndpoint?: string; // chat service
  codeEndpoint?: string;   // flowchart-to-code service
}
const AIAssistant = ({ isOpen, onClose, nodes = [], connections = [], boardName = 'Generated Program' }: AIAssistantProps) => {
  const [chatMessage, setChatMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'I can help you generate code from your flowchart. Ask me to generate code, share tasks, or send an image for guidance.',
      timestamp: new Date()
    }
  ]);

  // Removed standalone generated code panel; code is delivered as chat messages

  const [isGenerating, setIsGenerating] = useState(false);
  const [codeGenerationResult, setCodeGenerationResult] = useState<CodeGenerationResult | null>(null);
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
        ? { theme: 'light', apiProvider: 'auto', codeProvider: 'local', ...JSON.parse(raw) }
        : { theme: 'light', apiProvider: 'auto', codeProvider: 'local' };
      // Auto-detect provider by key/endpoint if 'auto'
      if (s.apiProvider === 'auto') {
        const k = s.apiKey || '';
        const url = s.customEndpoint || '';
        if (/sk-ant-/.test(k) || /anthropic\.com/.test(url)) s.apiProvider = 'anthropic';
        else if (/^AIza[0-9A-Za-z\-_]{35}$/.test(k) || /generativelanguage\.googleapis\.com/.test(url)) s.apiProvider = 'gemini';
        else if (/^hf_[A-Za-z0-9]{20,}$/.test(k) || /huggingface\.co/.test(url)) s.apiProvider = 'huggingface';
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
            { role: 'system', content: `You are Soodo Code's assistant. Flowchart: ${JSON.stringify({ boardName, nodes, connections })}` },
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

    // Custom proxy
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
        const chatMessages = [
          { role: 'system', content: `You are Soodo Code's assistant. Analyze flowcharts (nodes and connections) and help users build programs. When helpful, include a control JSON block wrapped in <soodo>{"tasks": [..], "code": {"filename":"","language":"","code":"..."}}</soodo>. Keep replies concise.` },
          { role: 'system', content: `Flowchart: ${JSON.stringify(flowchartContext)}` },
          // include last few turns
          ...messages.slice(-6).map(m => ({ role: m.type === 'assistant' ? 'assistant' : 'user', content: m.content }))
        ];
        // latest user with images
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
          const parts: any[] = [{ text: `Flowchart: ${JSON.stringify(flowchartContext)}` }];
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
        const prompt = `You are Soodo Code's assistant. Use the provided flowchart to guide development. If helpful, produce a <soodo>{"tasks":[],"code":{...}}</soodo> block.\n\nFlowchart: ${JSON.stringify(flowchartContext)}\n\nUser: ${message}`;
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
            system: `You are Soodo Code's assistant. Analyze the provided flowchart JSON and help the user build software. Optionally include a <soodo> control JSON with tasks/code as described. Flowchart: ${JSON.stringify(flowchartContext)}`,
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
    const userMsg: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatMessage || '(image)',
      timestamp: new Date(),
      contentType: pendingImages.length ? 'image' : 'text',
      imagesPayload: pendingImages.length ? pendingImages : undefined
    };
    setMessages(prev => [...prev, userMsg]);

    const reply = await callChatAPI(chatMessage, pendingImages.map(p => p.dataUrl));
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
      toAdd.push({ id: (Date.now()+2).toString(), type: 'assistant', content: 'Here are proposed tasks:', timestamp: new Date(), contentType: 'tasks', tasksPayload: augment.tasks.map((t, i) => ({ id: `${Date.now()}_${i}`, text: t, completed: false })) });
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
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Please add some nodes to your flowchart first! Then ask me to generate code.',
        timestamp: new Date(),
        contentType: 'text'
      }]);
      return;
    }

    setIsGenerating(true);
    const analysisMessageId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: analysisMessageId,
      type: 'assistant',
      content: `Analyzing "${boardName}" and generating code for ${nodes.length} nodes and ${connections.length} connections...`,
      timestamp: new Date(),
      contentType: 'text'
    }]);

    setTimeout(async () => {
      try {
        const settings = getSettings();
        let result: CodeGenerationResult;
        if (settings.codeProvider !== 'local' && settings.codeEndpoint) {
          // Call backend
          const res = await fetch(settings.codeEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}) },
            body: JSON.stringify({ nodes, connections, language: 'python', boardName })
          });
          const data = await res.json();
          const payload = data.data || data; // handle both shapes
          result = {
            code: payload.code,
            language: payload.language || 'python',
            filename: payload.filename || `${boardName.replace(/[^a-zA-Z0-9]/g,'')}.py`,
            lineCount: payload.lineCount || (payload.code?.split('\n').length ?? 0),
            timestamp: new Date().toISOString(),
            nodesAnalyzed: payload.nodesAnalyzed ?? nodes.length,
            connectionsAnalyzed: payload.connectionsAnalyzed ?? connections.length,
          };
        } else {
          // Local generation fallback
          result = generateCodeFromFlowchart(nodes, connections, 'python', boardName);
        }
        setCodeGenerationResult(result);
        const codeMsg: AIMessage = {
          id: (Date.now()+1).toString(),
          type: 'assistant',
          content: 'Here is the generated code snippet:',
          timestamp: new Date(),
          contentType: 'code',
          codePayload: {
            filename: result.filename,
            language: result.language,
            code: result.code,
            lineNumbers: Array.from({ length: result.lineCount }, (_, i) => i + 1)
          }
        };
        setMessages(prev => [...prev, codeMsg]);
      } catch (error) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: 'Error generating code.',
          timestamp: new Date(),
          contentType: 'text'
        }]);
      } finally {
        setIsGenerating(false);
      }
    }, 1200);
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
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>


          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-soodo-oxford-blue">Chat</h3>
          </div>
          
            {/* Messages */}
            <div className="h-[67rem] overflow-auto flex flex-col p-4 space-y-4">
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
                    <div className={`${m.type==='assistant' ? 'text-gray-800' : ''} text-[13px] leading-relaxed font-normal font-body whitespace-pre-wrap`}>{m.content}</div>

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
            </div>

            {/* Input */}
            <div className="flex-1 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
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
                  title="Generate code from flowchart"
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