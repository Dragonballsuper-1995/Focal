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

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('button, [role="button"], a, kbd, .cursor-pointer')) {
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
      className="relative flex items-center justify-between h-9 px-4 bg-[var(--hud-bg-base)] border-t border-[var(--hud-border-grid)] text-xs font-mono text-[var(--text-muted)] select-none shrink-0 z-10 backdrop-blur-xl cursor-default"
    >
      {/* Brand & Focal Logo */}
      <div className="flex items-center gap-2 truncate">
        <FocalLogo className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold text-[var(--text-main)] tracking-wider text-[11px]">FOCAL</span>
      </div>

      {/* Right: Keycap Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-main)] text-[11px] transition-colors"
          onClick={() => onSelectAction('open')}
        >
          <span className="text-[var(--text-muted)] hover:text-[var(--text-main)] hidden md:inline">
            EXEC
          </span>
          <kbd className="hud-key">[ENTER]</kbd>
        </div>

        {selectedItem?.category === 'app' && (
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-main)] text-[11px] transition-colors"
            onClick={() => onSelectAction('admin')}
          >
            <kbd className="hud-key">[^ENTER]</kbd>
            <span>ADMIN</span>
          </div>
        )}

        <span className="text-[var(--hud-border-outer)] select-none">|</span>

        <div
          className="flex items-center gap-1.5 cursor-pointer text-[var(--sys-accent)] font-bold text-[11px] transition-colors"
          onClick={onToggleActionMenu}
          title="Toggle Actions Menu (Tab)"
        >
          <kbd className="hud-key bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-bold">
            [TAB]
          </kbd>
          <span id="footer-tab-status">ACTIONS</span>
        </div>

        <div className="flex items-center">
          <kbd className="hud-key">[ESC]</kbd>
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
