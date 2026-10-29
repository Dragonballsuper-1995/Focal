import React from 'react';
import type { SearchResult, PinnedItem, LayoutMode } from '@/types';
import { ResultItem } from './ResultItem';
import { PinnedSection } from './PinnedSection';
import { AppIcon } from './AppIcon';

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
}) => {
  if (results.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-2 py-2 font-mono select-none" role="listbox">
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
          />
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 text-xs font-mono">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Try searching for installed apps or system settings
          </p>
        </div>
      </div>
    );
  }

  // 1. GRID LAYOUT MODE
  if (layoutMode === 'grid') {
    return (
      <div className="flex-1 overflow-y-auto p-3 font-mono select-none" role="listbox">
        <div className="grid grid-cols-4 gap-2">
          {results.map((item, index) => {
            const isSelected = activeSection === 'results' && index === selectedIndex;
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectIndex(index);
                  onExecute(item);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectIndex(index);
                  onContextMenu?.(item);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-md border cursor-pointer transition-all text-center ${
                  isSelected
                    ? 'bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-bold shadow-md'
                    : 'bg-[var(--hud-bg-card)] text-[var(--text-main)] border-[var(--hud-border-outer)] hover:bg-[var(--hud-bg-panel)] hover:border-[var(--sys-accent)]'
                }`}
              >
                <div className="w-7 h-7 flex items-center justify-center mb-1.5">
                  <AppIcon item={item} className="w-6 h-6 object-contain" />
                </div>
                <span
                  className={`text-[11px] truncate w-full font-mono ${
                    isSelected ? 'text-black font-bold' : 'text-[var(--text-main)]'
                  }`}
                >
                  {item.title}
                </span>
                <div className="flex items-center gap-1 mt-1 text-[9px]">
                  <span className={isSelected ? 'text-neutral-900 font-bold' : 'text-[var(--text-dim)]'}>
                    [{(item.category || 'APP').toUpperCase()}]
                  </span>
                  {item.alias && (
                    <span
                      className={`px-1 rounded ${
                        isSelected
                          ? 'bg-black text-[var(--sys-accent)] font-bold'
                          : 'bg-[var(--keycap-bg)] text-[var(--text-muted)]'
                      }`}
                    >
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

  // 2. HYBRID & LIST MODES: Natural array-order rendering with Raycast-style section dividers
  const showPinnedGrid =
    layoutMode === 'hybrid' && query === '' && pinnedItems && pinnedItems.length > 0;

  let lastSection = '';

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 font-mono select-none" role="listbox">
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
        />
      )}

      {/* Render results in natural index order to preserve keyboard navigation invariants */}
      {results.map((item, index) => {
        let section = 'Commands & Settings';
        const idL = item.id.toLowerCase();
        const titleL = item.title.toLowerCase();
        if (
          idL.includes('clipboard') ||
          idL.includes('snippets') ||
          idL.includes('files') ||
          idL.includes('shutdown') ||
          idL.includes('restart') ||
          idL.includes('lock') ||
          idL.includes('sleep') ||
          titleL.includes('shut down') ||
          titleL.includes('restart')
        ) {
          section = 'Suggestions';
        } else if (item.category === 'app') {
          section = 'Applications';
        }

        const showHeader = query === '' && section !== lastSection;
        if (showHeader) {
          lastSection = section;
        }

        return (
          <React.Fragment key={item.id}>
            {showHeader && (
              <div className="px-1.5 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
                <span>{section}</span>
              </div>
            )}
            <ResultItem
              item={item}
              index={index}
              isSelected={activeSection === 'results' && index === selectedIndex}
              onSelect={() => onSelectIndex(index)}
              onExecute={onExecute}
              onContextMenu={onContextMenu}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
