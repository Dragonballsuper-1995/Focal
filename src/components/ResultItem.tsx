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
}

export const ResultItem: React.FC<ResultItemProps> = ({
  item,
  index = 0,
  isSelected,
  onSelect,
  onExecute,
  onContextMenu,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const idNum = String(index + 1).padStart(2, '0');

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
        onExecute(item);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onContextMenu?.(item);
      }}
      className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs font-mono transition-all rounded-md select-none ${
        isSelected
          ? 'bg-[var(--sys-accent)] text-black font-bold shadow-sm'
          : 'text-[var(--text-main)] hover:bg-[var(--hud-bg-card)]'
      }`}
    >
      {/* Left: ID + Brand Icon + Title + Subtitle + Alias */}
      <div className="flex items-center gap-2.5 truncate pr-2">
        <span
          className={`text-[10px] w-4 text-center shrink-0 ${
            isSelected ? 'text-black font-bold' : 'text-[var(--text-dim)]'
          }`}
        >
          {idNum}
        </span>
        <span className="w-5 h-5 flex items-center justify-center shrink-0">
          <AppIcon item={item} className="w-4 h-4 object-contain" />
        </span>
        <span className={`truncate ${isSelected ? 'text-black font-bold' : 'text-[var(--text-main)]'}`}>
          {item.title}
        </span>
        {item.subtitle && (
          <span
            className={`text-[10px] truncate max-w-[180px] hidden sm:inline ${
              isSelected ? 'text-neutral-900 font-medium' : 'text-[var(--text-muted)]'
            }`}
          >
            {item.subtitle}
          </span>
        )}
        {item.alias && (
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
              isSelected
                ? 'bg-black text-[var(--sys-accent)]'
                : 'bg-[var(--keycap-bg)] text-[var(--text-muted)] border border-[var(--keycap-border)]'
            }`}
          >
            {item.alias}
          </span>
        )}
      </div>

      {/* Right: Category Tag + Exec Keycap */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[10px] font-medium capitalize tracking-wide ${
            isSelected ? 'text-neutral-900 font-bold' : 'text-[var(--text-dim)]'
          }`}
        >
          {categoryLabel}
        </span>
        {isSelected && (
          <span className="hud-key bg-black text-[var(--sys-accent)] border-black">
            [ENTER]
          </span>
        )}
      </div>
    </div>
  );
};
