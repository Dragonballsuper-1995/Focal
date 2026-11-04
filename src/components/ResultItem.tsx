import React, { useEffect, useRef } from 'react';
import type { SearchResult } from '@/types';
import { AppIcon } from '@/components/AppIcon';

export interface ResultItemProps {
  item: SearchResult;
  index?: number;
  isSelected: boolean;
  onSelect: () => void;
  onExecute: (item: SearchResult) => void;
  onContextMenu?: (item: SearchResult) => void;
  isCtrlHeld?: boolean;
  quickNumber?: number;
}

export const ResultItem: React.FC<ResultItemProps> = ({
  item,
  index: _index = 0,
  isSelected,
  onSelect,
  onExecute,
  onContextMenu,
  isCtrlHeld = false,
  quickNumber,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) {
      itemRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  const categoryLabel =
    item.category === 'app'
      ? 'Application'
      : item.category === 'command'
      ? 'Command'
      : item.category === 'setting'
      ? 'Setting'
      : item.category === 'file'
      ? 'File'
      : item.category;

  return (
    <div
      ref={itemRef}
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        onSelect();
      }}
      onDoubleClick={() => {
        onExecute(item);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onContextMenu?.(item);
      }}
      className={`group relative flex items-center justify-between h-11 px-3.5 cursor-pointer text-xs font-sans transition-all duration-100 rounded-xl select-none border ${
        isSelected
          ? 'bg-white/[0.08] border-white/[0.1] text-white shadow-sm ring-1 ring-[#FF6B4A]/25'
          : 'border-transparent text-slate-300 hover:bg-white/[0.03]'
      }`}
    >
      {/* Left: Brand Icon + Title + Subtitle + Alias */}
      <div className="flex items-center gap-3 truncate pr-2">
        <span className="w-6 h-6 flex items-center justify-center shrink-0">
          <AppIcon item={item} className="w-5 h-5 object-contain" />
        </span>
        <span className="font-medium tracking-tight truncate text-slate-100 text-[13.5px]">
          {item.title}
        </span>
        {item.subtitle && (
          <span className="text-[11.5px] truncate max-w-[240px] hidden sm:inline text-slate-400 font-normal">
            {item.subtitle}
          </span>
        )}
        {item.alias && (
          <span className="text-[10px] font-mono text-slate-400 font-normal px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.06]">
            {item.alias}
          </span>
        )}
      </div>

      {/* Right: Subtle Category Metadata + Quick Number Keycap / Sleek Exec Keycap */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-[11px] font-sans text-slate-400 font-normal">
          {categoryLabel}
        </span>

        {isCtrlHeld && quickNumber !== undefined && (
          <span
            data-testid={`quick-number-${quickNumber}`}
            className={`min-w-[19px] h-[19px] px-1.5 flex items-center justify-center rounded-md text-[10px] font-sans font-semibold transition-all ${
              isSelected
                ? 'bg-[#FF6B4A] text-white shadow-sm'
                : 'bg-white/[0.1] text-slate-300 border border-white/[0.14]'
            }`}
          >
            {quickNumber}
          </span>
        )}

        {isSelected && !isCtrlHeld && (
          <span className="focal-key">
            <span className="sr-only">[ENTER]</span>
            <span aria-hidden="true">↵</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default ResultItem;
