import React from 'react';
import { X, Sun, Moon, Settings } from 'lucide-react';
import type { ViewMode, LayoutMode } from '@/types';

export interface SearchBarProps {
  query: string;
  onChange: (query: string) => void;
  onClear: () => void;
  onResetView: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  placeholder?: string;
  viewMode: ViewMode;
  isLoading?: boolean;
  layoutMode?: LayoutMode;
  onLayoutChange?: (mode: LayoutMode) => void;
  theme?: 'dark' | 'light' | 'system';
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChange,
  onClear,
  onResetView,
  inputRef,
  placeholder,
  viewMode,
  isLoading = false,
  theme = 'dark',
  onToggleTheme,
  onOpenSettings,
}) => {
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (viewMode) {
      case 'clipboard':
        return 'Search clipboard history...';
      case 'snippets':
        return 'Search snippets by name or keyword...';
      case 'files':
        return 'Search files and folders...';
      case 'settings':
        return 'Search settings...';
      default:
        return "EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...";
    }
  };

  const getViewModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'clipboard':
        return 'Clipboard History';
      case 'snippets':
        return 'Snippets';
      case 'files':
        return 'File Search';
      case 'settings':
        return 'Preferences';
      default:
        return '';
    }
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('input, button, [role="button"], a, kbd')) {
      e.preventDefault();
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().startDragging();
      } catch {
        // Fallback for test and browser environments
      }
    }
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleStartDrag}
      className="flex items-center h-12 px-4 border-b border-[var(--hud-border-grid)] bg-[var(--hud-bg-base)] gap-3 shrink-0 select-none backdrop-blur-xl cursor-default"
    >
      {/* Branded HUD prompt symbol */}
      <span
        data-tauri-drag-region
        className={`text-[var(--sys-accent)] font-bold text-base select-none pointer-events-none ${
          isLoading ? 'animate-pulse' : ''
        }`}
      >
        &gt;
      </span>

      {/* Breadcrumb Pill for Subsystems */}
      {viewMode !== 'root' && (
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--sys-accent-muted)] text-[var(--sys-accent)] border border-[var(--sys-accent-border)] text-[10px] font-mono font-bold shrink-0">
          <span>{getViewModeLabel(viewMode)}</span>
          <button
            type="button"
            onClick={onResetView}
            className="hover:opacity-75 rounded p-0.5 transition-opacity"
            title="Return to Command Palette (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main input */}
      <input
        ref={inputRef}
        type="text"
        placeholder={getPlaceholder()}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        className="flex-1 bg-transparent font-mono text-xs uppercase text-[var(--text-main)] placeholder-neutral-500 focus:outline-none tracking-wider font-medium"
      />

      {/* Right controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {viewMode === 'root' && (
          <>
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1 rounded text-neutral-400 hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-card)] transition-colors"
                title={`Switch Theme (Current: ${theme})`}
              >
                {theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                )}
              </button>
            )}

            {/* Settings Button */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1 rounded text-neutral-400 hover:text-[var(--text-main)] hover:bg-[var(--hud-bg-card)] transition-colors"
                title="Preferences"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        {/* ESC Badge / Clear Button */}
        {query ? (
          <button
            type="button"
            onClick={onClear}
            title="Clear search query"
            className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-neutral-300 hover:text-[var(--text-main)] hover:border-[var(--sys-accent)] transition-colors font-mono cursor-pointer"
          >
            ESC
          </button>
        ) : (
          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-neutral-500 font-mono select-none">
            ESC
          </span>
        )}

        {/* Subview Back Button */}
        {viewMode !== 'root' && (
          <button
            type="button"
            onClick={onResetView}
            className="px-2 py-0.5 text-[9.5px] font-mono font-medium text-[var(--text-main)] bg-[var(--keycap-bg)] hover:opacity-80 rounded border border-[var(--keycap-border)] transition-opacity"
          >
            BACK (ESC)
          </button>
        )}
      </div>
    </div>
  );
};
