import React, { useState, useEffect } from 'react';
import type { RunnerConfig } from '@/types';
import { getSettings, updateSettings } from '@/services/ipc';
import { Settings as SettingsIcon, SunMoon, Keyboard, Folder, Save, Check, Pin, X } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { FocalLogo } from './FocalLogo';

interface SettingsModalProps {
  onBack: () => void;
  onConfigChange?: (config: RunnerConfig) => void;
}

export function SettingsModal({ onBack, onConfigChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'hotkeys' | 'indexing' | 'pinned'>('general');
  const [config, setConfig] = useState<RunnerConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [newDirectory, setNewDirectory] = useState('');

  useEffect(() => {
    getSettings().then((cfg) => setConfig(cfg));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    await updateSettings(config);
    onConfigChange?.(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddDir = () => {
    if (!newDirectory.trim() || !config) return;
    if (!config.search_directories.includes(newDirectory.trim())) {
      const updated = {
        ...config,
        search_directories: [...config.search_directories, newDirectory.trim()],
      };
      setConfig(updated);
      onConfigChange?.(updated);
    }
    setNewDirectory('');
  };

  const handleRemoveDir = (dir: string) => {
    if (!config) return;
    const updated = {
      ...config,
      search_directories: config.search_directories.filter((d) => d !== dir),
    };
    setConfig(updated);
    onConfigChange?.(updated);
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('input, button, [role="button"], a, kbd, select')) {
      e.preventDefault();
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().startDragging();
      } catch {
        // Fallback for tests
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--surface-base)] text-[var(--text-muted)] text-xs font-mono">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface-base)] text-slate-100 font-sans overflow-hidden select-none">
      {/* Top Header Bar */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center h-[52px] px-4 border-b border-white/[0.06] bg-[var(--surface-base)]/90 justify-between shrink-0 backdrop-blur-2xl cursor-default transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 shrink-0 opacity-90">
            <FocalLogo className="w-full h-full" />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.07] text-slate-200 border border-white/[0.1] text-xs font-sans font-medium shadow-sm">
            <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Focal Preferences</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.1] text-xs font-sans transition-all"
        >
          <span>Esc</span>
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-52 border-r border-white/[0.06] p-3 space-y-1 bg-black/20">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'general'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <SunMoon className="w-3.5 h-3.5" />
            General & Appearance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hotkeys')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'hotkeys'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Hotkeys & Activation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('indexing')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'indexing'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            Search Directories
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pinned')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'pinned'
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            Pinned Items
          </button>
        </div>

        {/* Content Pane */}
        <form onSubmit={handleSave} className="flex-1 p-6 flex flex-col justify-between overflow-y-auto overflow-x-hidden overscroll-none bg-black/10">
          {activeTab === 'general' && (
            <div className="space-y-5 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/30 border border-white/[0.06] rounded-xl">
                  {(['dark', 'light', 'oled', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const updated = { ...config, theme: t };
                        setConfig(updated);
                        onConfigChange?.(updated);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium capitalize rounded-lg transition-all ${
                        config.theme === t
                          ? 'bg-white/[0.12] text-white font-semibold shadow-sm border border-white/[0.1]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2">
                  Default Layout Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/30 border border-white/[0.06] rounded-xl">
                  {(['hybrid', 'list', 'grid'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        const updated = { ...config, layout_mode: mode };
                        setConfig(updated);
                        onConfigChange?.(updated);
                      }}
                      className={`px-3 py-1.5 text-xs capitalize rounded-lg transition-all ${
                        (config.layout_mode || 'hybrid') === mode
                          ? 'bg-white/[0.12] text-white font-semibold shadow-sm border border-white/[0.1]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 font-normal">
                  Hybrid displays favorites in a 2×5 grid above split category suggestions.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Inspector Preview Pane
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Display side telemetry inspector with technical specifications
                  </span>
                </div>
                <input
                  type="checkbox"
                  aria-label="Inspector Preview Pane"
                  checked={config.preview_pane_enabled || false}
                  onChange={(e) => {
                    const updated = { ...config, preview_pane_enabled: e.target.checked };
                    setConfig(updated);
                    onConfigChange?.(updated);
                  }}
                  className="w-4 h-4 accent-[#FF6B4A] cursor-pointer rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Clipboard History Capacity (items)
                </label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  value={config.max_clipboard_items}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      max_clipboard_items: parseInt(e.target.value) || 500,
                    })
                  }
                  className="w-full px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#FF6B4A]/60 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Auto-paste on select
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Directly paste selected clipboard or snippet item into active window
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.auto_paste_on_select}
                  onChange={(e) =>
                    setConfig({ ...config, auto_paste_on_select: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#FF6B4A] cursor-pointer rounded"
                />
              </div>
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Global Activation Shortcut
                </label>
                <input
                  type="text"
                  value={config.global_hotkey}
                  onChange={(e) => setConfig({ ...config, global_hotkey: e.target.value })}
                  placeholder="e.g. Alt+Space"
                  className="w-full px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#FF6B4A]/60 transition-colors"
                />
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Format: Modifier+Key (e.g., Alt+Space, Ctrl+Space, Super+Space)
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Fallback Shortcut (in case of conflict)
                </label>
                <input
                  type="text"
                  value={config.fallback_hotkey}
                  onChange={(e) => setConfig({ ...config, fallback_hotkey: e.target.value })}
                  placeholder="e.g. Ctrl+Alt+Space"
                  className="w-full px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#FF6B4A]/60 transition-colors"
                />
              </div>
            </div>
          )}

          {activeTab === 'indexing' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Indexed File Directories
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newDirectory}
                    onChange={(e) => setNewDirectory(e.target.value)}
                    placeholder="e.g. C:\Users\MyUser\Documents"
                    className="flex-1 px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#FF6B4A]/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddDir}
                    className="px-3.5 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.1] text-xs font-medium rounded-lg shadow-sm transition-all"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {config.search_directories.map((dir) => (
                    <div
                      key={dir}
                      className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06] text-xs text-slate-200"
                    >
                      <span className="truncate">{dir}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDir(dir)}
                        className="text-slate-400 hover:text-rose-400 text-xs font-medium ml-2 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pinned' && (
            <div className="space-y-3.5 max-w-lg">
              <div>
                <h3 className="text-xs font-medium text-slate-200">Pinned Apps & Actions</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Manage items in the 2×5 grid when Focal is opened (maximum 10 items).
                </p>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(!config.pinned_items || config.pinned_items.length === 0) ? (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center text-xs text-slate-400">
                    No items pinned yet. In search results, press <kbd className="focal-key text-[9px]">Tab</kbd> then <kbd className="focal-key text-[9px]">Ctrl+P</kbd> to pin any app or command.
                  </div>
                ) : (
                  config.pinned_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg border border-white/[0.06] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                          <AppIcon
                            item={item as any}
                            className="w-4 h-4 shrink-0 object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-200 truncate">{item.title}</div>
                          <div className="text-[10.5px] text-slate-400 truncate">{item.subtitle || item.category}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (config.pinned_items || []).filter((p) => p.id !== item.id);
                          setConfig({ ...config, pinned_items: updated });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors rounded-full hover:bg-white/[0.06]"
                        title="Unpin"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-4">
            <span className="text-[11px] text-slate-500 font-mono">
              %APPDATA%\Focal\config.json
            </span>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6B4A] hover:bg-[#FF5370] text-white text-xs font-medium rounded-lg transition-all shadow-sm active:scale-[0.98]"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                  <span className="sr-only">SAVE CHANGES</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsModal;
