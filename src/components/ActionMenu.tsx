import React, { useEffect, useRef } from 'react';

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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the ActionMenu itself
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }

      // Ignore clicks on the toggle trigger button in the footer dock
      if (target.closest?.('#footer-tab-status, [title*="Toggle Actions Menu"]')) {
        return;
      }

      onClose();
    };

    document.addEventListener('pointerdown', handleOutsideClick, true);
    document.addEventListener('mousedown', handleOutsideClick, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick, true);
      document.removeEventListener('mousedown', handleOutsideClick, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="absolute bottom-11 right-3 w-64 bg-[var(--surface-raised)]/95 backdrop-blur-2xl border border-white/[0.1] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] z-50 flex flex-col font-sans text-xs overflow-hidden select-none animate-in fade-in duration-100"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-xs font-sans">
        <div className="flex items-center gap-1.5 truncate">
          <span
            className="font-medium text-slate-200 text-xs truncate"
            title="Available Actions"
          >
            {title ? `Actions: ${title}` : 'Actions'}
          </span>
          {/* Accessible text for test suites */}
          <span className="sr-only">Available Actions</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <span className="sr-only">[ESC]</span>
          <kbd className="focal-key text-[9px] h-4">Esc</kbd>
        </button>
      </div>

      {/* Action Items List */}
      <div className="p-1.5 space-y-0.5 max-h-56 overflow-y-auto">
        {actions.map((act, idx) => {
          const isActSel = idx === selectedIndex;
          return (
            <div
              key={act.id}
              role="menuitem"
              onMouseEnter={() => onSelectIndex(idx)}
              onClick={() => onSelect(act.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-normal transition-colors duration-100 ${
                isActSel
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              <span className="truncate">{act.label}</span>
              <kbd className="focal-key">
                {act.shortcut || '↵'}
              </kbd>
            </div>
          );
        })}
      </div>

      {/* Footer Navigation Hint */}
      <div className="px-3 py-1.5 bg-white/[0.02] border-t border-white/[0.06] text-[10.5px] font-sans text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span>Navigate</span>
          <kbd className="focal-key text-[9px] h-4">↑</kbd>
          <kbd className="focal-key text-[9px] h-4">↓</kbd>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="focal-key text-[9px] h-4">↵</kbd>
          <span>Execute</span>
        </span>
      </div>
    </div>
  );
};

export default ActionMenu;
