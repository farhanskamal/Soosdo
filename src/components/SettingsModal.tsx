import React, { useEffect, useState } from 'react';
import { X, Save, KeyRound, SlidersHorizontal, Moon, Sun, Link as LinkIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SoodoSettings {
  theme: 'light' | 'dark' | 'system';
  apiProvider?: 'auto' | 'openai' | 'anthropic' | 'gemini' | 'huggingface' | 'supabase' | 'custom' | 'none';
  codeProvider?: 'local' | 'supabase' | 'custom';
  apiKey?: string;
  chatModel?: string; // gpt-4o-mini, claude-3-5-sonnet-latest
  customEndpoint?: string; // chat endpoint (used for supabase/custom)
  codeEndpoint?: string;   // flowchart-to-code endpoint
}

const defaultSettings: SoodoSettings = {
  theme: 'light',
  apiProvider: 'auto',
  codeProvider: 'local',
  apiKey: '',
  chatModel: 'gpt-4o-mini',
  customEndpoint: '',
  codeEndpoint: ''
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<SoodoSettings>(defaultSettings);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('soodo-settings');
      if (raw) setSettings({ ...defaultSettings, ...JSON.parse(raw) });
    } catch (e) {
      // ignore settings parse errors
    }
  }, [isOpen]);

  useEffect(() => {
    // Apply theme immediately
    const root = document.documentElement;
    root.classList.remove('dark');
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    }
  }, [settings.theme]);

  const save = () => {
    localStorage.setItem('soodo-settings', JSON.stringify(settings));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[94vw] bg-white rounded-xl shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-soodo-cocoa-brown" />
            <h3 className="font-heading font-bold text-soodo-oxford-blue">Settings</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Sun size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Theme</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['light','dark','system'] as const).map(t => (
                <button key={t} onClick={() => setSettings(s => ({...s, theme: t}))}
                  className={`border rounded-lg py-2 text-sm ${settings.theme===t?'border-soodo-cocoa-brown text-soodo-cocoa-brown':'border-gray-300 text-gray-700'} hover:border-soodo-cocoa-brown`}>
                  {t[0].toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* Providers */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Chat Provider</span>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {(['auto','none','openai','anthropic','gemini','huggingface','supabase','custom'] as const).map(p => (
                <button key={p} onClick={() => setSettings(s => ({...s, apiProvider: p}))}
                  className={`border rounded-lg py-2 text-sm ${settings.apiProvider===p?'border-soodo-cocoa-brown text-soodo-cocoa-brown':'border-gray-300 text-gray-700'} hover:border-soodo-cocoa-brown`}>
                  {p==='none'?'Disabled':p[0].toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Code Provider</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['local','supabase','custom'] as const).map(p => (
                <button key={p} onClick={() => setSettings(s => ({...s, codeProvider: p}))}
                  className={`border rounded-lg py-2 text-sm ${settings.codeProvider===p?'border-soodo-cocoa-brown text-soodo-cocoa-brown':'border-gray-300 text-gray-700'} hover:border-soodo-cocoa-brown`}>
                  {p==='local'?'Local':p[0].toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>

            {/* Shared credentials and endpoints */}
            <div className="space-y-3">
              <label className="block text-xs text-gray-600">AI API Key (Auto-detect)</label>
              <div className="flex items-center gap-2">
                <input type={showKey?'text':'password'} value={settings.apiKey||''}
                  onChange={(e)=>setSettings(s=>({...s, apiKey: e.target.value}))}
                  className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" placeholder="Paste your key (OpenAI/Anthropic)" />
                <button onClick={()=>setShowKey(v=>!v)} className="text-xs text-gray-600 hover:text-gray-800">{showKey?'Hide':'Show'}</button>
              </div>
              <div className="text-[11px] text-gray-500">We will auto-detect the provider by key prefix or the endpoint you set below. You can still override by choosing a specific provider.</div>

              {settings.apiProvider && settings.apiProvider !== 'none' && (
                <>
                  {(settings.apiProvider === 'openai' || settings.apiProvider === 'anthropic' || settings.apiProvider === 'gemini' || settings.apiProvider === 'huggingface') && (
                    <>
                      <label className="block text-xs text-gray-600 mt-3">Model</label>
                      <input type="text" value={settings.chatModel||''}
                        onChange={(e)=>setSettings(s=>({...s, chatModel: e.target.value}))}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" placeholder={settings.apiProvider==='openai'?'gpt-4o-mini':settings.apiProvider==='gemini'?'gemini-1.5-flash':settings.apiProvider==='huggingface'?'mistralai/Mixtral-8x7B-Instruct-v0.1':'claude-3-5-sonnet-latest'} />
                    </>
                  )}
                  {(settings.apiProvider === 'custom' || settings.apiProvider === 'supabase') && (
                    <>
                      <label className="block text-xs text-gray-600 mt-3">Chat Endpoint ({settings.apiProvider})</label>
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} className="text-gray-500" />
                        <input type="text" value={settings.customEndpoint||''}
                          onChange={(e)=>setSettings(s=>({...s, customEndpoint: e.target.value}))}
                          className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" placeholder="https://api.yourservice.com/chat" />
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <LinkIcon size={16} className="text-gray-500" />
                    <input type="text" value={settings.customEndpoint||''}
                      onChange={(e)=>setSettings(s=>({...s, customEndpoint: e.target.value}))}
                      className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" placeholder="https://api.yourservice.com/chat" />
                  </div>
                </>
              )}

              {settings.codeProvider !== 'local' && (
                <>
                  <label className="block text-xs text-gray-600 mt-3">Code Endpoint ({settings.codeProvider})</label>
                  <div className="flex items-center gap-2">
                    <LinkIcon size={16} className="text-gray-500" />
                    <input type="text" value={settings.codeEndpoint||''}
                      onChange={(e)=>setSettings(s=>({...s, codeEndpoint: e.target.value}))}
                      className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" placeholder="https://<project>.supabase.co/functions/v1/flowchart-to-code" />
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
          <button onClick={save} className="px-3 py-2 rounded-lg bg-soodo-cocoa-brown text-white text-sm hover:bg-opacity-90 flex items-center gap-2">
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
