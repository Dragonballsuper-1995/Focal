import React from 'react';
import type { SearchResult } from '@/types';
import { ActionMenu, type ActionOption } from './ActionMenu';
import { FocalLogo } from './FocalLogo';

export interface ActionBarProps {
  selectedItem?: SearchResult;
  isActionMenuOpen: boolean;
  actionIndex?: number;
  onSelectActionIndex?: (index: number) => void;
  onToggleActionMenu: () => void;
  onCloseActionMenu: () => void;
  onSelectAction: (actionId: string) => void;
  isPinned?: boolean;
}

export function getActionOptions(item?: SearchResult, isPinned: boolean = false): ActionOption[] {
  if (!item) return [];
  const pinOption: ActionOption = {
    id: isPinned ? 'unpin' : 'pin',
    label: isPinned ? 'Unpin from Favorites' : 'Pin to Favorites',
    shortcut: 'Ctrl+P',
  };

  if (item.category === 'app') {
    return [
      { id: 'open', label: 'Open Application', shortcut: '↵' },
      { id: 'admin', label: 'Run Privileged (Admin)', shortcut: 'Ctrl+↵' },
      { id: 'reveal', label: 'Reveal in Explorer', shortcut: 'Ctrl+O' },
      pinOption,
      { id: 'copy_path', label: 'Copy Full Path', shortcut: 'Ctrl+C' },
    ];
  }
  if (item.category === 'file') {
    return [
      { id: 'open', label: 'Open File', shortcut: '↵' },
      { id: 'reveal', label: 'Reveal in Explorer', shortcut: 'Ctrl+O' },
      pinOption,
      { id: 'copy_path', label: 'Copy Full Path', shortcut: 'Ctrl+C' },
    ];
  }
  return [
    { id: 'open', label: 'Execute Command', shortcut: '↵' },
    pinOption,
    { id: 'copy_title', label: 'Copy Title', shortcut: 'Ctrl+C' },
  ];
}

export const ActionBar: React.FC<ActionBarProps> = ({
  selectedItem,
  isActionMenuOpen,
  actionIndex = 0,
  onSelectActionIndex = () => {},
  onToggleActionMenu,
  onCloseActionMenu,
  onSelectAction,
  isPinned = false,
}) => {
  const actions = getActionOptions(selectedItem, isPinned);

  return (
    <div
      className="relative flex items-center justify-between h-9 px-4 bg-[#0E121A]/85 border-t border-white/[0.06] text-xs font-sans text-slate-400 select-none shrink-0 z-10 backdrop-blur-2xl cursor-default transition-colors"
    >
      {/* Left: Focal Logo + Brand */}
      <div className="flex items-center gap-2 truncate">
        <div className="w-3.5 h-3.5 shrink-0 opacity-90">
          <FocalLogo className="w-full h-full" />
        </div>
        <span className="font-semibold text-slate-200 tracking-wider text-[11px] font-sans">
          FOCAL
        </span>
      </div>

      {/* Right: Minimalist Shortcut Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 text-xs transition-colors"
          onClick={() => onSelectAction('open')}
        >
          <span className="text-slate-400 hover:text-slate-200 hidden md:inline text-[11px]">
            Open
          </span>
          <kbd className="focal-key">
            <span className="sr-only">[ENTER]</span>
            <span aria-hidden="true">↵</span>
          </kbd>
        </div>

        {selectedItem?.category === 'app' && (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 text-xs transition-colors"
            onClick={() => onSelectAction('admin')}
          >
            <span className="text-slate-400 text-[11px]">
              <span className="sr-only">ADMIN</span>
              <span aria-hidden="true">Admin</span>
            </span>
            <kbd className="focal-key">
              <span className="sr-only">[^ENTER]</span>
              <span aria-hidden="true">Ctrl+↵</span>
            </kbd>
          </div>
        )}

        <span className="text-white/[0.1] select-none">|</span>

        <div
          className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white text-xs transition-colors"
          onClick={onToggleActionMenu}
          title="Toggle Actions Menu (Tab)"
        >
          <span id="footer-tab-status" className="text-[11px] font-medium text-slate-300">
            Actions
            <span className="sr-only">ACTIONS</span>
          </span>
          <kbd className="focal-key">
            <span className="sr-only">[TAB]</span>
            <span aria-hidden="true">Tab</span>
          </kbd>
        </div>

        <div className="flex items-center">
          <kbd className="focal-key">
            <span className="sr-only">[ESC]</span>
            <span aria-hidden="true">Esc</span>
          </kbd>
        </div>
      </div>

      {/* Floating Glass Action Menu Popover */}
      {isActionMenuOpen && (
        <ActionMenu
          actions={actions}
          selectedIndex={actionIndex}
          onSelectIndex={onSelectActionIndex}
          onSelect={(actionId) => {
            onSelectAction(actionId);
            onCloseActionMenu();
          }}
          onClose={onCloseActionMenu}
          title={selectedItem?.title}
        />
      )}
    </div>
  );
};

export default ActionBar;
