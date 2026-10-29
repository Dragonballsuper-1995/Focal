import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActionBar } from '../components/ActionBar';
import type { SearchResult } from '../types';

const MOCK_APP_ITEM: SearchResult = {
  id: 'app-terminal',
  title: 'Windows Terminal',
  subtitle: 'wt.exe',
  category: 'app',
  action: 'launch:wt.exe',
  score: 85.0,
};

const MOCK_CMD_ITEM: SearchResult = {
  id: 'cmd-clipboard',
  title: 'Clipboard History',
  subtitle: 'Search copied items and paste',
  category: 'command',
  action: 'view:clipboard',
  score: 100.0,
};

describe('ActionBar Component', () => {
  it('renders RUNNER branding and active item title', () => {
    render(
      <ActionBar
        selectedItem={MOCK_APP_ITEM}
        isActionMenuOpen={false}
        onToggleActionMenu={vi.fn()}
        onCloseActionMenu={vi.fn()}
        onSelectAction={vi.fn()}
      />
    );

    expect(screen.getByText('RUNNER')).toBeInTheDocument();
    expect(screen.getByText('Windows Terminal')).toBeInTheDocument();
  });

  it('renders Admin shortcut hint only for app category', () => {
    const { rerender } = render(
      <ActionBar
        selectedItem={MOCK_CMD_ITEM}
        isActionMenuOpen={false}
        onToggleActionMenu={vi.fn()}
        onCloseActionMenu={vi.fn()}
        onSelectAction={vi.fn()}
      />
    );

    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();

    rerender(
      <ActionBar
        selectedItem={MOCK_APP_ITEM}
        isActionMenuOpen={false}
        onToggleActionMenu={vi.fn()}
        onCloseActionMenu={vi.fn()}
        onSelectAction={vi.fn()}
      />
    );

    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('[^ENTER]')).toBeInTheDocument();
  });

  it('calls onToggleActionMenu when clicking Actions hint', () => {
    const handleToggle = vi.fn();
    render(
      <ActionBar
        selectedItem={MOCK_APP_ITEM}
        isActionMenuOpen={false}
        onToggleActionMenu={handleToggle}
        onCloseActionMenu={vi.fn()}
        onSelectAction={vi.fn()}
      />
    );

    const actionsTrigger = screen.getByTitle('Toggle Actions Menu (Tab)');
    fireEvent.click(actionsTrigger);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders ActionMenu popover when isActionMenuOpen is true', () => {
    render(
      <ActionBar
        selectedItem={MOCK_APP_ITEM}
        isActionMenuOpen={true}
        onToggleActionMenu={vi.fn()}
        onCloseActionMenu={vi.fn()}
        onSelectAction={vi.fn()}
      />
    );

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Available Actions')).toBeInTheDocument();
    expect(screen.getByText('Open Application')).toBeInTheDocument();
    expect(screen.getByText('Run Privileged (Admin)')).toBeInTheDocument();
    expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    expect(screen.getByText('Copy Full Path')).toBeInTheDocument();
  });

  it('triggers onSelectAction and closes menu when an action option is clicked', () => {
    const handleSelectAction = vi.fn();
    const handleCloseActionMenu = vi.fn();

    render(
      <ActionBar
        selectedItem={MOCK_APP_ITEM}
        isActionMenuOpen={true}
        onToggleActionMenu={vi.fn()}
        onCloseActionMenu={handleCloseActionMenu}
        onSelectAction={handleSelectAction}
      />
    );

    const adminOption = screen.getByText('Run Privileged (Admin)');
    fireEvent.click(adminOption);

    expect(handleSelectAction).toHaveBeenCalledWith('admin');
    expect(handleCloseActionMenu).toHaveBeenCalledTimes(1);
  });
});
