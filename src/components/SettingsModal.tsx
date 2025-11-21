import React, { useEffect, useState } from 'react';
import { X, Save, KeyRound, SlidersHorizontal, Moon, Sun, Link as LinkIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SoodoSettings {
  theme: 'light' | 'dark' | 'system';
  // High-level mode for the provider UI
  apiMode?: 'simple' | 'advanced';
  apiProvider?: 'auto' | 'openai' | 'anthropic' | 'gemini' | 'huggingface' | 'openrouter' | 'supabase' | 'custom' | 'selfhosted' | 'none';
  codeProvider?: 'local' | 'supabase' | 'custom';
  apiKey?: string;
  chatModel?: string; // provider-specific model id
  customEndpoint?: string; // chat endpoint (used for supabase/custom/openrouter/selfhosted)
  codeEndpoint?: string;   // flowchart-to-code endpoint
}

const defaultSettings: SoodoSettings = {
  theme: 'light',
  apiMode: 'simple',
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[94vw] bg-white rounded-3xl shadow-[0_18px_45px_rgba(0,0,0,0.18)] border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-[#FFF9E6]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow">
              <SlidersHorizontal size={18} className="text-soodo-cocoa-brown" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Soodo Code</span>
              <h3 className="font-heading font-bold text-soodo-oxford-blue text-sm">Workspace Settings</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/80">
            <X size={18} className="text-gray-600" />
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Chat Provider</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <span>Mode:</span>
                <button
                  onClick={() => setSettings(s => ({ ...s, apiMode: 'simple' }))}
                  className={`px-2 py-1 rounded-lg border text-xs ${
                    (settings.apiMode ?? 'simple') === 'simple'
                      ? 'border-soodo-cocoa-brown text-soodo-cocoa-brown'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setSettings(s => ({ ...s, apiMode: 'advanced' }))}
                  className={`px-2 py-1 rounded-lg border text-xs ${
                    (settings.apiMode ?? 'simple') === 'advanced'
                      ? 'border-soodo-cocoa-brown text-soodo-cocoa-brown'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>
            {(() => {
              const mode = settings.apiMode ?? 'simple';
              const simpleProviders: SoodoSettings['apiProvider'][] = [
                'none',
                'openai',
                'anthropic',
                'gemini',
                'huggingface',
                'openrouter',
              ];
              const advancedProviders: SoodoSettings['apiProvider'][] = [
                'auto',
                'none',
                'openai',
                'anthropic',
                'gemini',
                'huggingface',
                'openrouter',
                'supabase',
                'custom',
                'selfhosted',
              ];
              const providerList = mode === 'simple' ? simpleProviders : advancedProviders;
              return (
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {providerList.map(p => (
                    <button
                      key={p}
                      onClick={() => setSettings(s => ({ ...s, apiProvider: p }))}
                      className={`border rounded-lg py-2 text-xs md:text-sm ${
                        settings.apiProvider === p
                          ? 'border-soodo-cocoa-brown text-soodo-cocoa-brown'
                          : 'border-gray-300 text-gray-700'
                      } hover:border-soodo-cocoa-brown`}
                    >
                      {p === 'none'
                        ? 'Disabled'
                        : p === 'openrouter'
                        ? 'OpenRouter'
                        : p === 'selfhosted'
                        ? 'Self-hosted'
                        : p === 'auto'
                        ? 'Auto'
                        : p[0].toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              );
            })()}

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
              <label className="block text-xs text-gray-600">AI API Key</label>
              <div className="flex items-center gap-2">
                <input type={showKey?'text':'password'} value={settings.apiKey||''}
                  onChange={(e)=>setSettings(s=>({...s, apiKey: e.target.value}))}
                  className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" placeholder="Paste API key for selected provider (OpenAI, Anthropic, OpenRouter, etc.)" />
                <button onClick={()=>setShowKey(v=>!v)} className="text-xs text-gray-600 hover:text-gray-800">{showKey?'Hide':'Show'}</button>
              </div>
              <div className="text-[11px] text-gray-500">Use a single key for the selected provider. In advanced mode you can point to custom endpoints or self-hosted, OpenAI-compatible models.</div>

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
                  {(settings.apiProvider === 'custom' || settings.apiProvider === 'supabase' || settings.apiProvider === 'openrouter' || settings.apiProvider === 'selfhosted') && (
                    <>
                      <label className="block text-xs text-gray-600 mt-3">Chat Endpoint ({settings.apiProvider})</label>
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} className="text-gray-500" />
                        <input type="text" value={settings.customEndpoint||''}
                          onChange={(e)=>setSettings(s=>({...s, customEndpoint: e.target.value}))}
                          className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-soodo-cocoa-brown focus:border-transparent" placeholder={
                            settings.apiProvider === 'openrouter'
                              ? 'https://openrouter.ai/api/v1'
                              : settings.apiProvider === 'selfhosted'
                              ? 'http://localhost:8000/v1'
                              : 'https://api.yourservice.com/chat'
                          } />
                      </div>
                    </>
                  )}
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
