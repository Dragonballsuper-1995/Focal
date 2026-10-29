import React from 'react';

export interface ActionOption {
  id: string;
  label: string;
  shortcut: string;
}

export interface ActionMenuProps {
  actions: ActionOption[];
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  onSelect: (actionId: string) => void;
  onClose?: () => void;
  title?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  actions,
  selectedIndex = 0,
  onSelectIndex = () => {},
  onSelect,
  onClose = () => {},
  title,
}) => {
  const displayTitle = title ? title.toUpperCase() : 'COMMAND';

  return (
    <div
      role="menu"
      className="absolute bottom-11 right-3 w-64 bg-[var(--hud-bg-sub)] backdrop-blur-xl border border-[var(--hud-border-outer)] rounded-lg shadow-2xl z-50 flex flex-col font-mono text-xs overflow-hidden ring-1 ring-black/20 animate-in fade-in zoom-in-95 select-none"
    >
      {/* Header */}
      <div className="px-3 py-2 bg-[var(--hud-bg-panel)] border-b border-[var(--hud-border-grid)] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-1.5 h-1.5 bg-[var(--sys-accent)] rounded-full inline-block shrink-0" />
          <span
            className="font-bold text-[var(--text-main)] tracking-wider truncate"
            title="Available Actions"
          >
            ACTIONS: {displayTitle}
          </span>
          {/* Subtle hidden label for accessibility and test queries */}
          <span className="sr-only">Available Actions</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-mono text-[9px] cursor-pointer"
        >
          [ESC]
        </button>
      </div>

      {/* Action Items List */}
      <div className="p-1 space-y-0.5 max-h-56 overflow-y-auto">
        {actions.map((act, idx) => {
          const isActSel = idx === selectedIndex;
          const keyNum = `0${idx + 1}`;
          return (
            <div
              key={act.id}
              role="menuitem"
              onMouseEnter={() => onSelectIndex(idx)}
              onClick={() => onSelect(act.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-[11px] font-mono transition-colors border ${
                isActSel
                  ? 'bg-[var(--sys-accent)] text-black font-bold border-[var(--sys-accent)] shadow-sm'
                  : 'bg-[var(--hud-bg-card)] text-[var(--text-main)] border-[var(--hud-border-outer)] hover:bg-[var(--hud-bg-panel)]'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={`${isActSel ? 'text-black' : 'text-[var(--text-dim)]'} text-[9.5px]`}>
                  [{keyNum}]
                </span>
                <span className="truncate">{act.label}</span>
              </div>
              <span
                className={`hud-key ${
                  isActSel ? 'bg-black text-[var(--sys-accent)] border-black' : ''
                }`}
              >
                {act.shortcut || '↵'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Nav Hint */}
      <div className="px-3 py-1.5 bg-[var(--hud-bg-panel)] border-t border-[var(--hud-border-grid)] text-[9px] text-[var(--text-muted)] flex items-center justify-between">
        <span className="flex items-center gap-1">
          NAV: <kbd className="hud-key text-[8px]">[↑]</kbd>{' '}
          <kbd className="hud-key text-[8px]">[↓]</kbd>
        </span>
        <span className="text-[var(--sys-accent)] font-bold">↵ EXECUTE</span>
      </div>
    </div>
  );
};
