import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { PinnedItem, SearchResult } from '@/types';
import { AppIcon } from './AppIcon';

export interface PinnedSectionProps {
  pinnedItems: PinnedItem[];
  selectedPinnedIndex?: number | null;
  onSelectPinned?: (index: number) => void;
  onExecute: (item: PinnedItem) => void;
  onUnpin: (id: string) => void;
  onContextMenu?: (item: PinnedItem, index: number) => void;
}

interface PinnedTileProps {
  item: PinnedItem;
  isSelected: boolean;
  onSelect: () => void;
  onExecute: () => void;
  onUnpin: () => void;
  onContextMenu?: () => void;
}

const PinnedTile: React.FC<PinnedTileProps> = ({
  item,
  isSelected,
  onSelect,
  onExecute,
  onUnpin,
  onContextMenu,
}) => {
  const tileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) {
      tileRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  const alias = item.alias || (item.category ? item.category.slice(0, 3) : 'app');

  return (
    <div
      ref={tileRef}
      role="button"
      tabIndex={-1}
      aria-pressed={isSelected}
      data-selected={isSelected}
      onClick={() => {
        onSelect();
        onExecute();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onContextMenu?.();
      }}
      className={`group relative flex items-center gap-2 p-1.5 h-[42px] rounded-md border cursor-pointer transition-all select-none font-mono ${
        isSelected
          ? 'bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-bold shadow-md'
          : 'bg-[var(--hud-bg-card)] text-[var(--text-main)] border-[var(--hud-border-outer)] hover:bg-[var(--hud-bg-panel)] hover:border-[var(--sys-accent)]'
      }`}
      title={`${item.title} (${item.subtitle || item.category})`}
    >
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <AppIcon item={item as SearchResult} className="w-4 h-4 object-contain" />
      </div>
      <div className="truncate flex-1 min-w-0 pr-3">
        <div
          className={`text-[11px] truncate leading-tight font-medium ${
            isSelected ? 'text-black font-bold' : 'text-[var(--text-main)]'
          }`}
        >
          {item.title}
        </div>
        <div
          className={`text-[9px] leading-tight flex items-center gap-1 ${
            isSelected ? 'text-neutral-900 font-semibold' : 'text-[var(--text-muted)]'
          }`}
        >
          <span>[{alias}]</span>
        </div>
      </div>

      {/* Quick Unpin button on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnpin();
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-white rounded bg-black/60 hover:bg-red-500/80 transition-all shadow-sm"
        title="Unpin item"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

export const PinnedSection: React.FC<PinnedSectionProps> = ({
  pinnedItems,
  selectedPinnedIndex = null,
  onSelectPinned,
  onExecute,
  onUnpin,
  onContextMenu,
}) => {
  if (pinnedItems.length === 0) {
    return null;
  }

  // Cap at 10 items for a 2x5 grid
  const displayItems = pinnedItems.slice(0, 10);

  return (
    <div className="px-3 pt-2 pb-1.5 mb-2 border-b border-[var(--hud-border-grid)]">
      <div className="px-0.5 pb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1.5">
        <span>Favorites</span>
        <span className="text-[var(--text-dim)]">[{displayItems.length}]</span>
      </div>

      {/* 2x5 Grid */}
      <div className="grid grid-cols-5 gap-2 mb-1">
        {displayItems.map((item, index) => (
          <PinnedTile
            key={item.id}
            item={item}
            isSelected={selectedPinnedIndex === index}
            onSelect={() => onSelectPinned?.(index)}
            onExecute={() => onExecute(item)}
            onUnpin={() => onUnpin(item.id)}
            onContextMenu={() => onContextMenu?.(item, index)}
          />
        ))}
      </div>
    </div>
  );
};
