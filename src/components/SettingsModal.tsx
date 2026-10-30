import { useState, useEffect } from 'react';
import type { RunnerConfig } from '@/types';
import { getSettings, updateSettings } from '@/services/ipc';
import { Settings as SettingsIcon, SunMoon, Keyboard, Folder, Save, Check, Pin, X } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface SettingsModalProps {
  onBack: () => void;
}

export function SettingsModal({ onBack }: SettingsModalProps) {
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddDir = () => {
    if (!newDirectory.trim() || !config) return;
    if (!config.search_directories.includes(newDirectory.trim())) {
      setConfig({
        ...config,
        search_directories: [...config.search_directories, newDirectory.trim()],
      });
    }
    setNewDirectory('');
  };

  const handleRemoveDir = (dir: string) => {
    if (!config) return;
    setConfig({
      ...config,
      search_directories: config.search_directories.filter((d) => d !== dir),
    });
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
      <div className="flex-1 flex items-center justify-center bg-[var(--hud-bg-base)] text-[var(--text-muted)] text-xs font-mono">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--hud-bg-base)] text-[var(--text-main)] font-mono overflow-hidden select-none">
      {/* Top Header Bar */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center h-12 px-4 border-b border-[var(--hud-border-grid)] bg-[var(--hud-bg-base)] justify-between shrink-0 backdrop-blur-xl cursor-default"
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--sys-accent)] font-bold text-base select-none">&gt;</span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-[var(--sys-accent-muted)] text-[var(--sys-accent)] border border-[var(--sys-accent-border)] text-[10px] font-mono font-bold">
            <SettingsIcon className="w-3 h-3" />
            <span>Focal Preferences</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-neutral-400 hover:text-[var(--text-main)] text-[9.5px] font-mono transition-colors"
        >
          <span>ESC</span>
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-48 border-r border-[var(--hud-border-grid)] p-3 space-y-1 bg-[var(--hud-bg-sub)]">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-none text-xs font-mono transition-all border ${
              activeTab === 'general'
                ? 'bg-[var(--sys-accent)] text-black font-bold border-[var(--sys-accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-panel)] border-transparent'
            }`}
          >
            <SunMoon className="w-3.5 h-3.5" />
            General & Appearance
          </button>
          <button
            onClick={() => setActiveTab('hotkeys')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-none text-xs font-mono transition-all border ${
              activeTab === 'hotkeys'
                ? 'bg-[var(--sys-accent)] text-black font-bold border-[var(--sys-accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-panel)] border-transparent'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Hotkeys & Activation
          </button>
          <button
            onClick={() => setActiveTab('indexing')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-none text-xs font-mono transition-all border ${
              activeTab === 'indexing'
                ? 'bg-[var(--sys-accent)] text-black font-bold border-[var(--sys-accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-panel)] border-transparent'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            Search Directories
          </button>
          <button
            onClick={() => setActiveTab('pinned')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-none text-xs font-mono transition-all border ${
              activeTab === 'pinned'
                ? 'bg-[var(--sys-accent)] text-black font-bold border-[var(--sys-accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-panel)] border-transparent'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            Pinned Items
          </button>
        </div>

        {/* Content Pane */}
        <form onSubmit={handleSave} className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-[var(--hud-bg-panel)]">
          {activeTab === 'general' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setConfig({ ...config, theme: t })}
                      className={`px-3 py-1.5 text-xs font-mono capitalize rounded-none border transition-all ${
                        config.theme === t
                          ? 'bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-bold shadow-sm'
                          : 'border-[var(--hud-border-outer)] bg-[var(--hud-bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-sub)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5">
                  Default Layout Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['hybrid', 'list', 'grid'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setConfig({ ...config, layout_mode: mode })}
                      className={`px-3 py-1.5 text-xs font-mono uppercase rounded-none border transition-all ${
                        (config.layout_mode || 'hybrid') === mode
                          ? 'bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-bold shadow-sm'
                          : 'border-[var(--hud-border-outer)] bg-[var(--hud-bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-sub)]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text-dim)] mt-1 font-mono">
                  Hybrid displays favorites in a 2×5 grid above split category sections.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1">
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
                  className="w-full px-3 py-1.5 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--sys-accent)]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-medium text-[var(--text-main)] block">
                    Auto-paste on select
                  </span>
                  <span className="text-[10px] text-[var(--text-dim)]">
                    Directly paste selected clipboard or snippet item into active window
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.auto_paste_on_select}
                  onChange={(e) =>
                    setConfig({ ...config, auto_paste_on_select: e.target.checked })
                  }
                  className="w-4 h-4 accent-[var(--sys-accent)] cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1">
                  Global Activation Shortcut
                </label>
                <input
                  type="text"
                  value={config.global_hotkey}
                  onChange={(e) => setConfig({ ...config, global_hotkey: e.target.value })}
                  placeholder="e.g. Alt+Space"
                  className="w-full px-3 py-1.5 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--sys-accent)]"
                />
                <span className="text-[10px] text-[var(--text-dim)] mt-1 block">
                  Format: Modifier+Key (e.g., Alt+Space, Ctrl+Space, Super+Space)
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1">
                  Fallback Shortcut (in case of conflict)
                </label>
                <input
                  type="text"
                  value={config.fallback_hotkey}
                  onChange={(e) => setConfig({ ...config, fallback_hotkey: e.target.value })}
                  placeholder="e.g. Ctrl+Alt+Space"
                  className="w-full px-3 py-1.5 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--sys-accent)]"
                />
              </div>
            </div>
          )}

          {activeTab === 'indexing' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1">
                  Indexed File Directories
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newDirectory}
                    onChange={(e) => setNewDirectory(e.target.value)}
                    placeholder="e.g. C:\Users\MyUser\Documents"
                    className="flex-1 px-3 py-1.5 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--sys-accent)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddDir}
                    className="px-3 py-1.5 bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-xs font-mono text-[var(--text-main)] rounded-none hover:border-[var(--sys-accent)] transition-colors"
                  >
                    ADD
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {config.search_directories.map((dir) => (
                    <div
                      key={dir}
                      className="flex items-center justify-between px-3 py-1.5 bg-[var(--hud-bg-card)] rounded-none border border-[var(--hud-border-outer)] text-xs font-mono text-[var(--text-main)]"
                    >
                      <span className="truncate">{dir}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDir(dir)}
                        className="text-neutral-500 hover:text-red-400 text-xs ml-2"
                      >
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pinned' && (
            <div className="space-y-3 max-w-lg">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Pinned Apps & Actions</h3>
                <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
                  Manage items in the 2×5 grid when Focal is opened (maximum 10 items).
                </p>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(!config.pinned_items || config.pinned_items.length === 0) ? (
                  <div className="p-4 rounded-none bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] text-center text-xs text-[var(--text-dim)]">
                    No items pinned yet. In search results, press <kbd className="hud-key text-[9px]">[TAB]</kbd> then <kbd className="hud-key text-[9px]">CTRL+P</kbd> to pin any app or command.
                  </div>
                ) : (
                  config.pinned_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-[var(--hud-bg-card)] hover:bg-[var(--hud-bg-sub)] rounded-none border border-[var(--hud-border-outer)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AppIcon
                          item={item as any}
                          className="w-5 h-5 shrink-0 object-contain"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[var(--text-main)] truncate">{item.title}</div>
                          <div className="text-[10px] text-[var(--text-dim)] truncate">{item.subtitle || item.category}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (config.pinned_items || []).filter((p) => p.id !== item.id);
                          setConfig({ ...config, pinned_items: updated });
                        }}
                        className="p-1 text-neutral-400 hover:text-red-400 transition-colors rounded-none hover:bg-[var(--keycap-bg)]"
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
          <div className="flex items-center justify-between pt-4 border-t border-[var(--hud-border-grid)] mt-4">
            <span className="text-[10px] text-[var(--text-dim)] font-mono">
              %APPDATA%\Focal\config.json
            </span>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--sys-accent)] hover:opacity-90 text-black text-xs font-bold rounded-none transition-opacity shadow-sm"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  SAVED!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  SAVE CHANGES
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
