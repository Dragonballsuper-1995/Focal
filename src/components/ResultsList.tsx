import React from 'react';
import type { SearchResult, PinnedItem, LayoutMode } from '@/types';
import { ResultItem } from './ResultItem';
import { PinnedSection } from './PinnedSection';
import { AppIcon } from './AppIcon';
import { Search } from 'lucide-react';

export interface ResultsListProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onExecute: (item: SearchResult) => void;
  query: string;
  pinnedItems?: PinnedItem[];
  selectedPinnedIndex?: number | null;
  onSelectPinnedIndex?: (index: number) => void;
  activeSection?: 'pinned' | 'results';
  onExecutePinned?: (item: PinnedItem) => void;
  onUnpinItem?: (id: string) => void;
  onContextMenu?: (item: SearchResult) => void;
  onContextMenuPinned?: (item: PinnedItem, index: number) => void;
  layoutMode?: LayoutMode;
  isCtrlHeld?: boolean;
}

export const ResultsList: React.FC<ResultsListProps> = ({
  results,
  selectedIndex,
  onSelectIndex,
  onExecute,
  query,
  pinnedItems,
  selectedPinnedIndex = null,
  onSelectPinnedIndex,
  activeSection = 'results',
  onExecutePinned,
  onUnpinItem,
  onContextMenu,
  onContextMenuPinned,
  layoutMode = 'hybrid',
  isCtrlHeld = false,
}) => {
  if (results.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none px-2 py-2 font-sans select-none" role="listbox">
        {query === '' && pinnedItems && pinnedItems.length > 0 && (
          <PinnedSection
            pinnedItems={pinnedItems}
            selectedPinnedIndex={activeSection === 'pinned' ? selectedPinnedIndex : null}
            onSelectPinned={onSelectPinnedIndex}
            onExecute={(item) => {
              if (onExecutePinned) {
                onExecutePinned(item);
              } else {
                onExecute(item as SearchResult);
              }
            }}
            onUnpin={(id) => onUnpinItem?.(id)}
            onContextMenu={onContextMenuPinned}
            isCtrlHeld={isCtrlHeld}
          />
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center select-none space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-hairline)] flex items-center justify-center text-[#FF6B4A] shadow-sm mb-1">
            <Search className="w-5 h-5 opacity-70" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-main)]">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-[var(--text-dim)] max-w-xs font-mono">
            Try searching for installed apps or system settings
          </p>
        </div>
      </div>
    );
  }

  // 1. GRID LAYOUT MODE
  if (layoutMode === 'grid') {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none p-3 font-sans select-none" role="listbox">
        <div className="grid grid-cols-4 gap-2.5">
          {results.map((item, index) => {
            const isSelected = activeSection === 'results' && index === selectedIndex;
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectIndex(index);
                }}
                onDoubleClick={() => {
                  onExecute(item);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectIndex(index);
                  onContextMenu?.(item);
                }}
                className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all duration-120 text-center ${
                  isSelected
                    ? 'bg-white/[0.08] border-white/[0.15] ring-1 ring-[#FF6B4A]/40 text-white shadow-[0_0_16px_rgba(255,107,74,0.15)]'
                    : 'bg-white/[0.03] text-slate-200 border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center mb-1.5 rounded-lg overflow-hidden group-hover:scale-105 transition-transform">
                  <AppIcon item={item} className="w-7 h-7 object-contain" />
                </div>
                <span
                  className="text-xs truncate w-full font-medium tracking-tight text-slate-100"
                >
                  {item.title}
                </span>
                <div className="flex items-center gap-1 mt-1 text-[10px] font-sans">
                  <span className="text-slate-400 capitalize">
                    {item.category || 'App'}
                  </span>
                  {item.alias && (
                    <span className="text-slate-500 font-mono">
                      {item.alias}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. HYBRID & LIST MODES: Natural array-order rendering with unified Suggestions section
  const showPinnedGrid =
    layoutMode === 'hybrid' && query === '' && pinnedItems && pinnedItems.length > 0;
  const effectivePinnedCount = showPinnedGrid && pinnedItems ? Math.min(pinnedItems.length, 9) : 0;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none px-3 py-2 space-y-1 font-sans select-none" role="listbox">
      {/* 2x5 Pinned Grid at the Top */}
      {showPinnedGrid && (
        <PinnedSection
          pinnedItems={pinnedItems}
          selectedPinnedIndex={activeSection === 'pinned' ? selectedPinnedIndex : null}
          onSelectPinned={onSelectPinnedIndex}
          onExecute={(item) => {
            if (onExecutePinned) {
              onExecutePinned(item);
            } else {
              onExecute(item as SearchResult);
            }
          }}
          onUnpin={(id) => onUnpinItem?.(id)}
          onContextMenu={onContextMenuPinned}
          isCtrlHeld={isCtrlHeld}
        />
      )}

      {/* Unified Suggestions category header when query is empty */}
      {query === '' && results.length > 0 && (
        <div className="px-2 pt-2 pb-1 text-[11px] font-sans text-slate-400 font-medium flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>Suggestions</span>
          </span>
          <span className="text-slate-500 font-normal">{results.length}</span>
        </div>
      )}

      {/* Render results with quick numeric triggers (continuing from pinned items up to 9) */}
      <div className="space-y-1">
        {results.map((item, index) => {
          const slot = effectivePinnedCount + index + 1;
          const quickNumber = slot <= 9 ? slot : undefined;

          return (
            <ResultItem
              key={item.id}
              item={item}
              index={index}
              isSelected={activeSection === 'results' && index === selectedIndex}
              onSelect={() => onSelectIndex(index)}
              onExecute={onExecute}
              onContextMenu={onContextMenu}
              isCtrlHeld={isCtrlHeld}
              quickNumber={quickNumber}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ResultsList;
