import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

// Test harness component for useKeyboardNav hook with pinned support
function NavHarness({
  totalItems,
  pinnedCount = 0,
  onExecutePrimary,
  onExecutePinned,
  onExecuteAdmin,
  onToggleActionMenu,
  onCloseActionMenu,
  onResetView,
  onClearQuery,
  onHideWindow,
  isActionMenuOpen = false,
  viewMode = 'root',
  hasQuery = false,
}: any) {
  const { selectedIndex, selectedPinnedIndex, activeSection, handleKeyDown } = useKeyboardNav({
    totalItems,
    pinnedCount,
    onExecutePrimary,
    onExecutePinned,
    onExecuteAdmin,
    onToggleActionMenu,
    onCloseActionMenu,
    onResetView,
    onClearQuery,
    onHideWindow,
    isActionMenuOpen,
    viewMode,
    hasQuery,
  });

  return (
    <div data-testid="nav-container" tabIndex={0} onKeyDown={handleKeyDown}>
      <span data-testid="selected-index">{selectedIndex}</span>
      <span data-testid="selected-pinned-index">{selectedPinnedIndex}</span>
      <span data-testid="active-section">{activeSection}</span>
    </div>
  );
}

describe('useKeyboardNav Hook', () => {
  it('navigates down and wraps around with ArrowDown', () => {
    render(<NavHarness totalItems={3} />);
    const container = screen.getByTestId('nav-container');

    expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('1');

    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('2');

    // Wrap around to 0
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
  });

  it('navigates up and wraps around backwards with ArrowUp', () => {
    render(<NavHarness totalItems={3} />);
    const container = screen.getByTestId('nav-container');

    expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

    // Wrap around backward to 2
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('2');

    fireEvent.keyDown(container, { key: 'ArrowUp' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('1');
  });

  it('jumps directly to start with Home and end with End', () => {
    render(<NavHarness totalItems={10} />);
    const container = screen.getByTestId('nav-container');

    fireEvent.keyDown(container, { key: 'End' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('9');

    fireEvent.keyDown(container, { key: 'Home' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
  });

  it('pages through items with PageDown and PageUp', () => {
    render(<NavHarness totalItems={12} />);
    const container = screen.getByTestId('nav-container');

    fireEvent.keyDown(container, { key: 'PageDown' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('5');

    fireEvent.keyDown(container, { key: 'PageDown' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('10');

    fireEvent.keyDown(container, { key: 'PageUp' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('5');

    fireEvent.keyDown(container, { key: 'PageUp' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
  });

  it('executes primary action on Enter', () => {
    const handlePrimary = vi.fn();
    render(<NavHarness totalItems={5} onExecutePrimary={handlePrimary} />);
    const container = screen.getByTestId('nav-container');

    fireEvent.keyDown(container, { key: 'ArrowDown' });
    fireEvent.keyDown(container, { key: 'Enter' });

    expect(handlePrimary).toHaveBeenCalledWith(1);
  });

  it('executes admin action on Ctrl+Enter', () => {
    const handleAdmin = vi.fn();
    render(<NavHarness totalItems={5} onExecuteAdmin={handleAdmin} />);
    const container = screen.getByTestId('nav-container');

    fireEvent.keyDown(container, { key: 'ArrowDown' });
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    fireEvent.keyDown(container, { key: 'Enter', ctrlKey: true });

    expect(handleAdmin).toHaveBeenCalledWith(2);
  });

  it('toggles action menu on Tab or Ctrl+K', () => {
    const handleToggle = vi.fn();
    render(<NavHarness totalItems={5} onToggleActionMenu={handleToggle} />);
    const container = screen.getByTestId('nav-container');

    fireEvent.keyDown(container, { key: 'Tab' });
    expect(handleToggle).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(container, { key: 'k', ctrlKey: true });
    expect(handleToggle).toHaveBeenCalledTimes(2);
  });

  it('follows the strict Escape hierarchy: action menu -> subview -> query -> hide', () => {
    const handleCloseMenu = vi.fn();
    const handleResetView = vi.fn();
    const handleClearQuery = vi.fn();
    const handleHideWindow = vi.fn();

    // 1. When action menu is open
    const { rerender } = render(
      <NavHarness
        totalItems={5}
        isActionMenuOpen={true}
        viewMode="root"
        hasQuery={false}
        onCloseActionMenu={handleCloseMenu}
      />
    );
    fireEvent.keyDown(screen.getByTestId('nav-container'), { key: 'Escape' });
    expect(handleCloseMenu).toHaveBeenCalledTimes(1);

    // 2. When in subview
    rerender(
      <NavHarness
        totalItems={5}
        isActionMenuOpen={false}
        viewMode="clipboard"
        hasQuery={false}
        onResetView={handleResetView}
      />
    );
    fireEvent.keyDown(screen.getByTestId('nav-container'), { key: 'Escape' });
    expect(handleResetView).toHaveBeenCalledTimes(1);

    // 3. When in root mode with active query text
    rerender(
      <NavHarness
        totalItems={5}
        isActionMenuOpen={false}
        viewMode="root"
        hasQuery={true}
        onClearQuery={handleClearQuery}
      />
    );
    fireEvent.keyDown(screen.getByTestId('nav-container'), { key: 'Escape' });
    expect(handleClearQuery).toHaveBeenCalledTimes(1);

    // 4. When at root with empty query
    rerender(
      <NavHarness
        totalItems={5}
        isActionMenuOpen={false}
        viewMode="root"
        hasQuery={false}
        onHideWindow={handleHideWindow}
      />
    );
    fireEvent.keyDown(screen.getByTestId('nav-container'), { key: 'Escape' });
    expect(handleHideWindow).toHaveBeenCalledTimes(1);
  });

  it('navigates seamlessly between pinned section and results list', () => {
    const handleExecutePrimary = vi.fn();
    const handleExecutePinned = vi.fn();

    render(
      <NavHarness
        totalItems={5}
        pinnedCount={4}
        onExecutePrimary={handleExecutePrimary}
        onExecutePinned={handleExecutePinned}
      />
    );
    const container = screen.getByTestId('nav-container');

    // Initially at pinned[0] (first pinned item)
    expect(screen.getByTestId('active-section')).toHaveTextContent('pinned');
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('0');

    // ArrowRight moves horizontally in pinned grid
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('1');

    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('2');

    // ArrowLeft moves back
    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('1');

    // Pressing Enter executes the focused pinned item
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(handleExecutePinned).toHaveBeenCalledWith(1);
    expect(handleExecutePrimary).not.toHaveBeenCalled();

    // ArrowDown drops down to results[0]
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('active-section')).toHaveTextContent('results');
    expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

    // Pressing Enter executes primary result
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(handleExecutePrimary).toHaveBeenCalledWith(0);

    // Navigate to last result item and press ArrowDown -> wraps back to pinned[0]
    fireEvent.keyDown(container, { key: 'End' });
    expect(screen.getByTestId('selected-index')).toHaveTextContent('4');

    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('active-section')).toHaveTextContent('pinned');
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('0');
  });

  it('navigates across 2 rows of pinned grid (up to 10 items)', () => {
    render(<NavHarness totalItems={5} pinnedCount={8} />);
    const container = screen.getByTestId('nav-container');

    // Initially at pinned row 0 (index 0)
    expect(screen.getByTestId('active-section')).toHaveTextContent('pinned');
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('0');

    // ArrowDown moves to row 1 (index 5)
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('5');

    // ArrowUp moves back to row 0 (index 0)
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('0');

    // ArrowRight to index 1
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('1');

    // ArrowDown moves from index 1 to index 6 in row 1
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('selected-pinned-index')).toHaveTextContent('6');

    // ArrowDown from row 1 drops to results[0]
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(screen.getByTestId('active-section')).toHaveTextContent('results');
    expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
  });

  it('executes quick numeric shortcuts with Ctrl+1 through Ctrl+9', () => {
    const handleExecutePrimary = vi.fn();
    const handleExecutePinned = vi.fn();

    render(
      <NavHarness
        totalItems={5}
        pinnedCount={4}
        onExecutePrimary={handleExecutePrimary}
        onExecutePinned={handleExecutePinned}
      />
    );
    const container = screen.getByTestId('nav-container');

    // Ctrl+1 should execute pinned item 0
    fireEvent.keyDown(container, { key: '1', ctrlKey: true });
    expect(handleExecutePinned).toHaveBeenCalledWith(0);

    // Ctrl+4 should execute pinned item 3
    fireEvent.keyDown(container, { key: '4', ctrlKey: true });
    expect(handleExecutePinned).toHaveBeenCalledWith(3);

    // Ctrl+5 should execute suggestion result 0
    fireEvent.keyDown(container, { key: '5', ctrlKey: true });
    expect(handleExecutePrimary).toHaveBeenCalledWith(0);

    // Ctrl+9 should execute suggestion result 4
    fireEvent.keyDown(container, { key: '9', ctrlKey: true });
    expect(handleExecutePrimary).toHaveBeenCalledWith(4);
  });
});
