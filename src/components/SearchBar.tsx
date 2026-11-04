import React from 'react';
import { X, Settings } from 'lucide-react';
import type { ViewMode, LayoutMode } from '@/types';
import { FocalLogo } from './FocalLogo';

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
  theme?: 'dark' | 'light' | 'oled' | 'system';
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChange,
  onClear: _onClear,
  onResetView,
  inputRef,
  placeholder,
  viewMode,
  isLoading = false,
  theme: _theme = 'dark',
  onToggleTheme: _onToggleTheme,
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
        return 'Search files and folders on your computer...';
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
      className="flex items-center h-[52px] px-4 border-b border-white/[0.06] bg-[#0E121A]/80 gap-3 shrink-0 select-none backdrop-blur-2xl cursor-default transition-colors"
    >
      {/* Branded Focal Omnibox Prefix Mark */}
      <div className={`relative flex items-center justify-center shrink-0 ${isLoading ? 'animate-pulse' : ''}`}>
        <FocalLogo className="w-4 h-4 opacity-90" />
      </div>

      {/* Subsystem Breadcrumb Pill */}
      {viewMode !== 'root' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.07] text-slate-200 border border-white/[0.1] text-xs font-sans font-medium shrink-0 shadow-sm animate-in fade-in duration-150">
          <span>{getViewModeLabel(viewMode)}</span>
          <button
            type="button"
            onClick={onResetView}
            className="hover:text-white rounded p-0.5 transition-colors text-slate-400"
            title="Return to Command Palette (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Omnibox Search Input with Crystal Clear Visual Placeholder */}
      <div className="relative flex-1 flex items-center">
        {!query && (
          <span className="absolute left-0 pointer-events-none text-[13.5px] text-slate-400 font-normal tracking-tight select-none">
            {viewMode === 'root'
              ? 'Search apps, commands, or files...'
              : getPlaceholder()}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={getPlaceholder()}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent font-sans text-[13.5px] text-[var(--text-main)] placeholder:text-transparent focus:outline-none tracking-tight font-medium"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {viewMode === 'root' && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent transition-all"
            title="Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Subview Back Button */}
        {viewMode !== 'root' && (
          <button
            type="button"
            onClick={onResetView}
            className="focal-key hover:text-white hover:bg-white/[0.1] transition-colors"
          >
            <span className="sr-only">BACK (ESC)</span>
            <span aria-hidden="true">Esc</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
