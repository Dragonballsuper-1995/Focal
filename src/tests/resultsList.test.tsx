import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultsList } from '../components/ResultsList';
import type { SearchResult } from '../types';

const MOCK_ITEMS: SearchResult[] = [
  {
    id: 'cmd-clipboard',
    title: 'Clipboard History',
    subtitle: 'Search copied items and paste',
    category: 'command',
    action: 'view:clipboard',
    score: 100.0,
  },
  {
    id: 'app-terminal',
    title: 'Windows Terminal',
    subtitle: 'wt.exe',
    category: 'app',
    action: 'launch:wt.exe',
    score: 85.0,
  },
  {
    id: 'setting-wifi',
    title: 'Wi-Fi Settings',
    subtitle: 'Windows Setting',
    category: 'setting',
    action: 'launch:ms-settings:network-wifi',
    score: 70.0,
  },
];

describe('ResultsList Component', () => {
  it('renders all items with title, subtitle, and category badges', () => {
    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecute={vi.fn()}
        query=""
      />
    );

    expect(screen.getByText('Clipboard History')).toBeInTheDocument();
    expect(screen.getByText('Windows Terminal')).toBeInTheDocument();
    expect(screen.getByText('Wi-Fi Settings')).toBeInTheDocument();
    expect(screen.getByText('Search copied items and paste')).toBeInTheDocument();
  });

  it('applies aria-selected="true" to the currently selected index', () => {
    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={1}
        onSelectIndex={vi.fn()}
        onExecute={vi.fn()}
        query=""
      />
    );

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('shows Enter badge only on the currently selected item', () => {
    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={1}
        onSelectIndex={vi.fn()}
        onExecute={vi.fn()}
        query=""
      />
    );

    const badges = screen.getAllByText('[ENTER]');
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('[role="option"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('triggers onExecute when clicking an item row', () => {
    const handleExecute = vi.fn();
    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecute={handleExecute}
        query=""
      />
    );

    const secondItem = screen.getByText('Windows Terminal');
    fireEvent.click(secondItem);

    expect(handleExecute).toHaveBeenCalledTimes(1);
    expect(handleExecute).toHaveBeenCalledWith(MOCK_ITEMS[1]);
  });

  it('does not select item on hover, but selects on click and right-click', () => {
    const handleSelectIndex = vi.fn();
    const handleExecute = vi.fn();
    const handleContextMenu = vi.fn();

    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={handleSelectIndex}
        onExecute={handleExecute}
        onContextMenu={handleContextMenu}
        query=""
      />
    );

    const thirdItem = screen.getByText('Wi-Fi Settings');

    // 1. Mouse hover should NOT change selection
    fireEvent.mouseEnter(thirdItem);
    expect(handleSelectIndex).not.toHaveBeenCalled();

    // 2. Right click selects item and triggers context menu
    fireEvent.contextMenu(thirdItem);
    expect(handleSelectIndex).toHaveBeenCalledWith(2);
    expect(handleContextMenu).toHaveBeenCalledWith(MOCK_ITEMS[2]);

    // 3. Left click selects item and triggers execution
    fireEvent.click(thirdItem);
    expect(handleSelectIndex).toHaveBeenCalledWith(2);
    expect(handleExecute).toHaveBeenCalledWith(MOCK_ITEMS[2]);
  });

  it('renders friendly empty state when no results match', () => {
    render(
      <ResultsList
        results={[]}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecute={vi.fn()}
        query="xyznonexistent"
      />
    );

    expect(screen.getByText(/No results found for “xyznonexistent”/)).toBeInTheDocument();
    expect(
      screen.getByText('Try searching for installed apps or system settings')
    ).toBeInTheDocument();
  });
});
