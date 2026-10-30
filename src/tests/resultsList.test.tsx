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

  it('selects item row on click without executing; executes on double click', () => {
    const handleSelectIndex = vi.fn();
    const handleExecute = vi.fn();
    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={handleSelectIndex}
        onExecute={handleExecute}
        query=""
      />
    );

    const secondItem = screen.getByText('Windows Terminal');
    // Single click selects only
    fireEvent.click(secondItem);
    expect(handleSelectIndex).toHaveBeenCalledWith(1);
    expect(handleExecute).not.toHaveBeenCalled();

    // Double click executes
    fireEvent.doubleClick(secondItem);
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

    // 3. Left click selects item and does NOT trigger execution
    fireEvent.click(thirdItem);
    expect(handleSelectIndex).toHaveBeenCalledWith(2);
    expect(handleExecute).not.toHaveBeenCalled();

    // 4. Double click triggers execution
    fireEvent.doubleClick(thirdItem);
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

  it('renders a single unified Suggestions category header with no separate Applications or Commands & Settings headers', () => {
    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecute={vi.fn()}
        query=""
      />
    );

    // Single Suggestions header should be visible
    expect(screen.getByText('Suggestions')).toBeInTheDocument();

    // Distinct fragmented category headers should not exist
    expect(screen.queryByText('Applications')).not.toBeInTheDocument();
    expect(screen.queryByText('Commands & Settings')).not.toBeInTheDocument();
  });

  it('displays quick number badges on pinned items and results when isCtrlHeld is true and hides them when false', () => {
    const mockPinned = [
      {
        id: 'pin-1',
        title: 'Pinned App 1',
        subtitle: 'Sub 1',
        category: 'app',
        action: 'launch:app1',
      },
      {
        id: 'pin-2',
        title: 'Pinned App 2',
        subtitle: 'Sub 2',
        category: 'app',
        action: 'launch:app2',
      },
    ];

    const { rerender } = render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecute={vi.fn()}
        query=""
        pinnedItems={mockPinned}
        isCtrlHeld={false}
      />
    );

    // When isCtrlHeld is false, badges should not be displayed
    expect(screen.queryByTestId('pinned-quick-number-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pinned-quick-number-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-number-3')).not.toBeInTheDocument();

    // When isCtrlHeld is true, badges 1 and 2 appear on pinned, and 3, 4, 5 appear on results
    rerender(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecute={vi.fn()}
        query=""
        pinnedItems={mockPinned}
        isCtrlHeld={true}
      />
    );

    expect(screen.getByTestId('pinned-quick-number-1')).toHaveTextContent('1');
    expect(screen.getByTestId('pinned-quick-number-2')).toHaveTextContent('2');
    expect(screen.getByTestId('quick-number-3')).toHaveTextContent('3');
    expect(screen.getByTestId('quick-number-4')).toHaveTextContent('4');
    expect(screen.getByTestId('quick-number-5')).toHaveTextContent('5');
  });

  it('selects item on single click and executes on double click in grid layout mode', () => {
    const handleSelectIndex = vi.fn();
    const handleExecute = vi.fn();

    render(
      <ResultsList
        results={MOCK_ITEMS}
        selectedIndex={0}
        onSelectIndex={handleSelectIndex}
        onExecute={handleExecute}
        query="test"
        layoutMode="grid"
      />
    );

    const secondItem = screen.getByText('Windows Terminal');
    // Single click selects only
    fireEvent.click(secondItem);
    expect(handleSelectIndex).toHaveBeenCalledWith(1);
    expect(handleExecute).not.toHaveBeenCalled();

    // Double click executes
    fireEvent.doubleClick(secondItem);
    expect(handleExecute).toHaveBeenCalledTimes(1);
    expect(handleExecute).toHaveBeenCalledWith(MOCK_ITEMS[1]);
  });
});
