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
  isCtrlHeld?: boolean;
}

interface PinnedTileProps {
  item: PinnedItem;
  isSelected: boolean;
  onSelect: () => void;
  onExecute: () => void;
  onUnpin: () => void;
  onContextMenu?: () => void;
  isCtrlHeld?: boolean;
  quickNumber?: number;
}

const PinnedTile: React.FC<PinnedTileProps> = ({
  item,
  isSelected,
  onSelect,
  onExecute,
  onUnpin,
  onContextMenu,
  isCtrlHeld = false,
  quickNumber,
}) => {
  const tileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) {
      tileRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  const displaySubtitle = item.subtitle || (item.category === 'app' ? 'Application' : item.category === 'command' ? 'Command' : item.category || 'App');

  return (
    <div
      ref={tileRef}
      role="button"
      tabIndex={-1}
      aria-pressed={isSelected}
      data-selected={isSelected}
      onClick={() => {
        onSelect();
      }}
      onDoubleClick={() => {
        onExecute();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onContextMenu?.();
      }}
      className={`group relative flex items-center gap-2.5 px-3 h-[46px] rounded-xl border cursor-pointer transition-all duration-120 select-none font-sans ${
        isSelected
          ? 'bg-white/[0.08] border-white/[0.15] ring-1 ring-[#FF6B4A]/40 text-white shadow-[0_0_16px_rgba(255,107,74,0.15)]'
          : 'bg-white/[0.03] text-slate-200 border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
      }`}
      title={`${item.title} (${displaySubtitle})`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
        isSelected ? 'bg-white/[0.12] border-white/[0.18]' : 'bg-white/[0.04] border-white/[0.06]'
      }`}>
        <AppIcon item={item as SearchResult} className="w-4 h-4 object-contain" />
      </div>
      <div className="truncate flex-1 min-w-0 pr-1">
        <div className="text-[12px] truncate leading-tight font-medium text-slate-100">
          {item.title}
        </div>
        <div className={`text-[10px] leading-tight truncate mt-0.5 ${
          isSelected ? 'text-slate-300' : 'text-slate-400'
        }`}>
          {displaySubtitle}
        </div>
      </div>

      {/* Quick Number badge when Ctrl is held */}
      {isCtrlHeld && quickNumber !== undefined && (
        <span
          data-testid={`pinned-quick-number-${quickNumber}`}
          className={`absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-md text-[9px] font-sans font-semibold shadow-sm z-10 transition-all ${
            isSelected
              ? 'bg-[#FF6B4A] text-white shadow-sm'
              : 'bg-white/[0.12] text-slate-300 border border-white/[0.15]'
          }`}
        >
          {quickNumber}
        </span>
      )}

      {/* Quick Unpin button on hover (hidden if Ctrl is held) */}
      {!isCtrlHeld && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white rounded-full bg-black/60 hover:bg-rose-600 transition-all shadow-sm"
          title="Unpin item"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
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
  isCtrlHeld = false,
}) => {
  if (pinnedItems.length === 0) {
    return null;
  }

  // Cap at 10 items for a 2x5 grid
  const displayItems = pinnedItems.slice(0, 10);

  return (
    <div className="px-3 pt-2 pb-2 mb-2 border-b border-white/[0.06]">
      <div className="px-1 pb-1.5 flex items-center justify-between text-[11px] font-sans text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <span>Favorites</span>
        </span>
        <span className="text-slate-500 font-normal">{displayItems.length}</span>
      </div>

      {/* 2x5 Grid */}
      <div className="grid grid-cols-5 gap-2 mb-0.5">
        {displayItems.map((item, index) => (
          <PinnedTile
            key={item.id}
            item={item}
            isSelected={selectedPinnedIndex === index}
            onSelect={() => onSelectPinned?.(index)}
            onExecute={() => onExecute(item)}
            onUnpin={() => onUnpin(item.id)}
            onContextMenu={() => onContextMenu?.(item, index)}
            isCtrlHeld={isCtrlHeld}
            quickNumber={index < 9 ? index + 1 : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default PinnedSection;
