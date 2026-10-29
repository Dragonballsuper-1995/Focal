import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ViewMode, SearchResult, RunnerConfig, PinnedItem, LayoutMode } from '@/types';
import { useSearch } from '@/hooks/useSearch';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useTauriEvents } from '@/hooks/useTauriEvents';
import { useTheme } from '@/hooks/useTheme';
import { SearchBar } from '@/components/SearchBar';
import { ResultsList } from '@/components/ResultsList';
import { ActionBar, getActionOptions } from '@/components/ActionBar';
import { ClipboardView } from '@/components/ClipboardView';
import { SnippetsView } from '@/components/SnippetsView';
import { FileSearchView } from '@/components/FileSearchView';
import { SettingsModal } from '@/components/SettingsModal';
import { getSettings, updateSettings, launchItem, hideWindow } from '@/services/ipc';

const defaultPinnedItems: PinnedItem[] = [
  {
    id: 'cmd-clipboard',
    title: 'Clipboard History',
    subtitle: 'View recent clipboard entries',
    category: 'command',
    icon: 'clipboard',
    action: 'view:clipboard',
    alias: 'cli',
  },
  {
    id: 'cmd-snippets',
    title: 'Snippets',
    subtitle: 'Text expansion and templates',
    category: 'command',
    icon: 'text',
    action: 'view:snippets',
    alias: 'snp',
  },
  {
    id: 'cmd-files',
    title: 'File Search',
    subtitle: 'Query files and directories',
    category: 'command',
    icon: 'folder',
    action: 'view:files',
    alias: 'fil',
  },
  {
    id: 'app-terminal',
    title: 'Windows Terminal',
    subtitle: 'wt.exe (PowerShell 7, WSL2)',
    category: 'app',
    icon: 'terminal',
    action: 'launch:wt.exe',
    alias: 'psh',
  },
];

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('root');
  const [config, setConfig] = useState<RunnerConfig>({
    theme: 'dark',
    global_hotkey: 'Shift+Alt+Space',
    fallback_hotkey: 'Ctrl+Alt+Space',
    max_clipboard_items: 500,
    auto_paste_on_select: true,
    search_directories: [],
    snippet_expansion_enabled: true,
    pinned_items: defaultPinnedItems,
    layout_mode: 'hybrid',
    accent_color: '#0078D4',
  });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hybrid');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Theme synchronization
  useTheme(config.theme);

  // 2. Search query and results management
  const { query, setQuery, clearQuery, results, isLoading } = useSearch();

  // 3. Load initial settings from IPC
  useEffect(() => {
    getSettings()
      .then((cfg) => {
        if (!cfg.pinned_items || cfg.pinned_items.length === 0) {
          cfg.pinned_items = defaultPinnedItems;
        }
        if (cfg.layout_mode) {
          setLayoutMode(cfg.layout_mode);
        }
        if (cfg.accent_color) {
          document.documentElement.style.setProperty('--sys-accent', cfg.accent_color);
        }
        setConfig(cfg);
      })
      .catch((err) => console.warn('[App] Failed to load settings:', err));
  }, []);

  // 4. Auto-focus input text area on initial launch & on window focus
  useEffect(() => {
    const t1 = setTimeout(() => inputRef.current?.focus(), 50);
    const t2 = setTimeout(() => inputRef.current?.focus(), 250);
    const handleWindowFocus = () => inputRef.current?.focus();
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // 4b. Prevent default WebView2 / Chromium browser shortcut intercepts (Print, Open File, Reload, Find)
  useEffect(() => {
    const preventBrowserInterferingShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (['p', 'o', 'f', 'r', 'u', 'j'].includes(k)) {
          e.preventDefault();
        }
      }
      if (['f5', 'f3', 'f7'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', preventBrowserInterferingShortcuts, { capture: true });
    return () => window.removeEventListener('keydown', preventBrowserInterferingShortcuts, { capture: true });
  }, []);

  // 5. Action Handlers
  const handleExecuteItem = useCallback(
    (item: SearchResult) => {
      if (item.action.startsWith('view:')) {
        const nextView = item.action.replace('view:', '') as ViewMode;
        setViewMode(nextView);
        clearQuery();
        return;
      }

      launchItem(item.id, item.category, item.action).catch((err) =>
        console.error('[App] Failed to launch item:', err)
      );
    },
    [clearQuery]
  );

  const handleTogglePin = useCallback(
    async (item?: SearchResult | PinnedItem) => {
      if (!item) return;
      const currentPinned = config.pinned_items || [];
      const isAlreadyPinned = currentPinned.some((p) => p.id === item.id);

      let updatedPinned: PinnedItem[];
      if (isAlreadyPinned) {
        updatedPinned = currentPinned.filter((p) => p.id !== item.id);
      } else {
        if (currentPinned.length >= 10) {
          console.warn('[App] Maximum of 10 items (2 rows x 5 columns) can be pinned');
          return;
        }
        const newPin: PinnedItem = {
          id: item.id,
          title: item.title,
          subtitle: item.subtitle || '',
          category: item.category,
          icon: item.icon,
          action: item.action,
          alias: (item as any).alias,
        };
        updatedPinned = [...currentPinned, newPin];
      }

      const updatedConfig = { ...config, pinned_items: updatedPinned };
      setConfig(updatedConfig);
      await updateSettings(updatedConfig).catch((err) =>
        console.error('[App] Failed to save pinned item:', err)
      );
    },
    [config]
  );

  const handleAction = useCallback(
    (actionId: string, item?: SearchResult) => {
      if (!item) return;

      switch (actionId) {
        case 'open':
          handleExecuteItem(item);
          break;
        case 'admin':
          launchItem(item.id, 'app_admin', item.action).catch((err) =>
            console.error('[App] Failed to run as admin:', err)
          );
          break;
        case 'reveal':
          launchItem(item.id, 'reveal', item.subtitle).catch((err) =>
            console.error('[App] Failed to reveal in explorer:', err)
          );
          break;
        case 'pin':
        case 'unpin':
          handleTogglePin(item);
          break;
        case 'copy_path':
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(item.subtitle || item.action);
          }
          break;
        case 'copy_title':
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(item.title);
          }
          break;
        default:
          handleExecuteItem(item);
          break;
      }
    },
    [handleExecuteItem, handleTogglePin]
  );

  const handleToggleTheme = useCallback(() => {
    setConfig((prev) => {
      const nextTheme: 'dark' | 'light' = prev.theme === 'light' ? 'dark' : 'light';
      const updated = { ...prev, theme: nextTheme };
      updateSettings(updated).catch(console.error);
      return updated;
    });
  }, []);

  // Pinned items derived state
  const pinnedItems = config.pinned_items || [];
  const pinnedCount =
    viewMode === 'root' && query === '' && layoutMode === 'hybrid' ? pinnedItems.length : 0;

  // 6. Keyboard Navigation hook
  const {
    selectedIndex,
    setSelectedIndex,
    selectedPinnedIndex,
    setSelectedPinnedIndex,
    activeSection,
    setActiveSection,
    actionIndex,
    setActionIndex,
    handleKeyDown,
  } = useKeyboardNav({
    totalItems: results.length,
    pinnedCount,
    actionItemsCount: 5,
    onExecutePrimary: (idx) => {
      if (results[idx]) {
        handleExecuteItem(results[idx]);
      }
    },
    onExecutePinned: (pIdx) => {
      if (pinnedItems[pIdx]) {
        const item = pinnedItems[pIdx];
        handleExecuteItem({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          category: item.category as any,
          icon: item.icon,
          action: item.action,
          score: 100,
          alias: item.alias,
        });
      }
    },
    onExecuteAdmin: (idx) => {
      if (activeSection === 'pinned' && pinnedItems[selectedPinnedIndex]) {
        const item = pinnedItems[selectedPinnedIndex];
        launchItem(item.id, 'app_admin', item.action).catch(console.error);
      } else if (results[idx]) {
        handleAction('admin', results[idx]);
      }
    },
    onExecuteActionByIndex: (actIdx) => {
      const act = currentActions[actIdx];
      if (act && currentSelectedItem) {
        handleAction(act.id, currentSelectedItem);
      }
    },
    onExecuteActionById: (actId) => {
      if (currentSelectedItem) {
        handleAction(actId, currentSelectedItem);
      }
    },
    onToggleActionMenu: () => setIsActionMenuOpen((prev) => !prev),
    onCloseActionMenu: () => setIsActionMenuOpen(false),
    onResetView: () => {
      setViewMode('root');
      clearQuery();
      setTimeout(() => inputRef.current?.focus(), 10);
    },
    onClearQuery: clearQuery,
    onHideWindow: () => {
      hideWindow().catch(() => {});
    },
    isActionMenuOpen,
    viewMode,
    hasQuery: query.length > 0,
  });

  // Derive active selected item across pinned items and results
  const currentSelectedItem = useMemo<SearchResult | undefined>(() => {
    if (activeSection === 'pinned' && pinnedCount > 0 && pinnedItems[selectedPinnedIndex]) {
      const p = pinnedItems[selectedPinnedIndex];
      return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        category: p.category as any,
        icon: p.icon,
        action: p.action,
        score: 100,
        alias: p.alias,
      };
    }
    return results[selectedIndex];
  }, [activeSection, pinnedCount, pinnedItems, selectedPinnedIndex, results, selectedIndex]);

  const isSelectedPinned = useMemo(() => {
    if (!currentSelectedItem) return false;
    return pinnedItems.some((p) => p.id === currentSelectedItem.id);
  }, [currentSelectedItem, pinnedItems]);

  const currentActions = useMemo(() => {
    return getActionOptions(currentSelectedItem, isSelectedPinned);
  }, [currentSelectedItem, isSelectedPinned]);

  // Prevent browser context menu globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handleItemContextMenu = useCallback(
    (item: SearchResult) => {
      const idx = results.findIndex((r) => r.id === item.id);
      if (idx !== -1) {
        setActiveSection('results');
        setSelectedIndex(idx);
      }
      setIsActionMenuOpen(true);
    },
    [results, setActiveSection, setSelectedIndex]
  );

  const handlePinnedContextMenu = useCallback(
    (_item: PinnedItem, index: number) => {
      setActiveSection('pinned');
      setSelectedPinnedIndex(index);
      setIsActionMenuOpen(true);
    },
    [setActiveSection, setSelectedPinnedIndex]
  );

  // 7. Tauri Window Lifecycle Events: reset palette on summon
  useTauriEvents({
    onShown: () => {
      clearQuery();
      setViewMode('root');
      setActiveSection('results');
      setSelectedIndex(0);
      setSelectedPinnedIndex(0);
      setIsActionMenuOpen(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    },
    onHidden: () => {
      clearQuery();
      setIsActionMenuOpen(false);
    },
  });

  return (
    <div className="flex items-center justify-center w-full h-full bg-transparent p-0 select-none">
      <div
        className="relative flex flex-col w-full max-w-[760px] h-full max-h-[480px] bg-[var(--hud-bg-base)] border border-[var(--hud-border-outer)] rounded-xl shadow-2xl overflow-hidden font-mono backdrop-blur-xl ring-1 ring-black/10"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* 1. Command Prompt Omnibar directly at Top (No telemetry header) */}
        <SearchBar
          query={query}
          onChange={(q) => {
            setQuery(q);
            setActiveSection('results');
            setSelectedIndex(0);
          }}
          onClear={() => {
            clearQuery();
            setActiveSection('results');
            setSelectedIndex(0);
            setSelectedPinnedIndex(0);
          }}
          onResetView={() => {
            setViewMode('root');
            clearQuery();
            setTimeout(() => inputRef.current?.focus(), 10);
          }}
          inputRef={inputRef}
          viewMode={viewMode}
          isLoading={isLoading}
          theme={config.theme}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => {
            setViewMode('settings');
            clearQuery();
          }}
        />

        {/* 2. Main Stage (Full 100% width, no preview pane) */}
        {viewMode === 'root' ? (
          <div className="flex-1 w-full overflow-hidden flex flex-col bg-transparent relative">
            <ResultsList
              results={results}
              selectedIndex={selectedIndex}
              onSelectIndex={(idx) => {
                setActiveSection('results');
                setSelectedIndex(idx);
              }}
              selectedPinnedIndex={selectedPinnedIndex}
              onSelectPinnedIndex={(pIdx) => {
                setActiveSection('pinned');
                setSelectedPinnedIndex(pIdx);
              }}
              activeSection={activeSection}
              onExecute={handleExecuteItem}
              query={query}
              pinnedItems={pinnedItems}
              onExecutePinned={(pinned) => {
                handleExecuteItem({
                  id: pinned.id,
                  title: pinned.title,
                  subtitle: pinned.subtitle,
                  category: pinned.category as any,
                  icon: pinned.icon,
                  action: pinned.action,
                  score: 100,
                  alias: pinned.alias,
                });
              }}
              onUnpinItem={(id) => {
                const updated = pinnedItems.filter((p) => p.id !== id);
                const updatedConfig = { ...config, pinned_items: updated };
                setConfig(updatedConfig);
                updateSettings(updatedConfig).catch(console.error);
              }}
              onContextMenu={handleItemContextMenu}
              onContextMenuPinned={handlePinnedContextMenu}
              layoutMode={layoutMode}
            />
          </div>
        ) : viewMode === 'clipboard' ? (
          <div className="flex-1 w-full overflow-hidden flex flex-col">
            <ClipboardView
              onBack={() => {
                setViewMode('root');
                clearQuery();
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
            />
          </div>
        ) : viewMode === 'snippets' ? (
          <div className="flex-1 w-full overflow-hidden flex flex-col">
            <SnippetsView
              onBack={() => {
                setViewMode('root');
                clearQuery();
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
            />
          </div>
        ) : viewMode === 'files' ? (
          <div className="flex-1 w-full overflow-hidden flex flex-col">
            <FileSearchView
              onBack={() => {
                setViewMode('root');
                clearQuery();
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
            />
          </div>
        ) : viewMode === 'settings' ? (
          <div className="flex-1 w-full overflow-hidden flex flex-col">
            <SettingsModal
              onBack={() => {
                setViewMode('root');
                clearQuery();
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-neutral-400 font-mono">
            <div className="max-w-md text-center">
              <h2 className="text-lg font-semibold text-white capitalize mb-1">
                {viewMode} Subsystem
              </h2>
              <button
                type="button"
                onClick={() => {
                  setViewMode('root');
                  clearQuery();
                  inputRef.current?.focus();
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--sys-accent)] hover:opacity-90 rounded transition-opacity shadow-sm"
              >
                Return to Search (Esc)
              </button>
            </div>
          </div>
        )}

        {/* 3. Raycast-Inspired Bottom Dock Footer */}
        <ActionBar
          selectedItem={currentSelectedItem}
          isActionMenuOpen={isActionMenuOpen}
          actionIndex={actionIndex}
          onSelectActionIndex={setActionIndex}
          onToggleActionMenu={() => setIsActionMenuOpen((prev) => !prev)}
          onCloseActionMenu={() => setIsActionMenuOpen(false)}
          onSelectAction={(actionId) => handleAction(actionId, currentSelectedItem)}
          isPinned={isSelectedPinned}
        />
      </div>
    </div>
  );
}

export default App;
