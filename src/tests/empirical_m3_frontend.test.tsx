import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSearch } from '../hooks/useSearch';
import { useTheme } from '../hooks/useTheme';
import { useTauriEvents } from '../hooks/useTauriEvents';
import { SearchBar } from '../components/SearchBar';
import { ResultsList } from '../components/ResultsList';
import { ActionMenu, ActionOption } from '../components/ActionMenu';
import * as ipc from '../services/ipc';
import type { SearchResult } from '../types';

// ============================================================================
// Helper Test Harness Components
// ============================================================================

function KeyboardNavHarness({
  totalItems,
  onExecutePrimary,
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
  const { selectedIndex, handleKeyDown } = useKeyboardNav({
    totalItems,
    onExecutePrimary,
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
    </div>
  );
}

function DynamicItemsNavHarness({ initialCount }: { initialCount: number }) {
  const [itemsCount, setItemsCount] = useState(initialCount);
  const { selectedIndex, handleKeyDown } = useKeyboardNav({
    totalItems: itemsCount,
  });

  return (
    <div data-testid="dynamic-container" tabIndex={0} onKeyDown={handleKeyDown}>
      <span data-testid="dynamic-selected-index">{selectedIndex}</span>
      <span data-testid="dynamic-total-items">{itemsCount}</span>
      <button data-testid="btn-shrink-to-5" onClick={() => setItemsCount(5)}>
        Shrink to 5
      </button>
      <button data-testid="btn-shrink-to-0" onClick={() => setItemsCount(0)}>
        Shrink to 0
      </button>
      <button data-testid="btn-grow-to-50" onClick={() => setItemsCount(50)}>
        Grow to 50
      </button>
    </div>
  );
}

function SearchHarness() {
  const { query, setQuery, clearQuery, results, isLoading } = useSearch();

  return (
    <div>
      <input
        data-testid="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button data-testid="search-clear" onClick={clearQuery}>
        Clear
      </button>
      <span data-testid="search-loading">{isLoading ? 'loading' : 'idle'}</span>
      <span data-testid="search-count">{results.length}</span>
      <ul data-testid="search-results">
        {results.map((r) => (
          <li key={r.id} data-testid={`result-${r.id}`}>
            {r.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThemeHarness({ theme }: { theme: 'dark' | 'light' | 'system' }) {
  useTheme(theme);
  return <div data-testid="theme-harness">Theme: {theme}</div>;
}

// Generate N synthetic search results
function generateItems(count: number): SearchResult[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    title: `Result Title ${i}`,
    subtitle: `Subtitle description for item ${i}`,
    category: (i % 2 === 0 ? 'app' : 'command') as SearchResult['category'],
    action: `launch:item-${i}`,
    score: 100 - i * 0.5,
  }));
}

// ============================================================================
// Empirical Test Suite
// ============================================================================

describe('Empirical M3 Frontend UI & Keyboard Navigation Challenge Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Stress-tests keyboard navigation rapid key events (100 rapid events & wrap)
  // --------------------------------------------------------------------------
  describe('1. Keyboard Navigation Rapid Stress & Modulo Boundary Wrapping', () => {
    it('handles 100 rapid ArrowDown events with exact modulo boundary wrapping', () => {
      const TOTAL_ITEMS = 7;
      render(<KeyboardNavHarness totalItems={TOTAL_ITEMS} />);
      const container = screen.getByTestId('nav-container');

      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      // Dispatch 100 rapid ArrowDown events
      for (let i = 0; i < 100; i++) {
        fireEvent.keyDown(container, { key: 'ArrowDown' });
      }

      // 100 % 7 = 2
      expect(screen.getByTestId('selected-index')).toHaveTextContent('2');
    });

    it('handles 100 rapid ArrowUp events with reverse modulo boundary wrapping', () => {
      const TOTAL_ITEMS = 7;
      render(<KeyboardNavHarness totalItems={TOTAL_ITEMS} />);
      const container = screen.getByTestId('nav-container');

      // First move to index 2
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('2');

      // Now fire 100 rapid ArrowUp events
      for (let i = 0; i < 100; i++) {
        fireEvent.keyDown(container, { key: 'ArrowUp' });
      }

      // (2 - (100 % 7) + 7) % 7 = (2 - 2 + 7) % 7 = 0
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
    });

    it('remains resilient with totalItems = 0 (no division by zero, no NaN, no negative index)', () => {
      render(<KeyboardNavHarness totalItems={0} />);
      const container = screen.getByTestId('nav-container');

      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      for (let i = 0; i < 50; i++) {
        fireEvent.keyDown(container, { key: 'ArrowDown' });
      }
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      for (let i = 0; i < 50; i++) {
        fireEvent.keyDown(container, { key: 'ArrowUp' });
      }
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      fireEvent.keyDown(container, { key: 'Home' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      fireEvent.keyDown(container, { key: 'End' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      fireEvent.keyDown(container, { key: 'PageDown' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      fireEvent.keyDown(container, { key: 'PageUp' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
    });

    it('remains resilient with totalItems = 1 under 50 rapid arrow events', () => {
      render(<KeyboardNavHarness totalItems={1} />);
      const container = screen.getByTestId('nav-container');

      for (let i = 0; i < 50; i++) {
        fireEvent.keyDown(container, { key: 'ArrowDown' });
      }
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      for (let i = 0; i < 50; i++) {
        fireEvent.keyDown(container, { key: 'ArrowUp' });
      }
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
    });

    it('handles rapid interleaved PageDown, PageUp, Home, End, and Arrow navigation', () => {
      render(<KeyboardNavHarness totalItems={30} />);
      const container = screen.getByTestId('nav-container');

      // 0 -> PageDown (5) -> PageDown (10) -> PageDown (15)
      fireEvent.keyDown(container, { key: 'PageDown' });
      fireEvent.keyDown(container, { key: 'PageDown' });
      fireEvent.keyDown(container, { key: 'PageDown' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('15');

      // End -> jumps to 29
      fireEvent.keyDown(container, { key: 'End' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('29');

      // ArrowDown from 29 wraps around to 0
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      // ArrowUp from 0 wraps back to 29
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('29');

      // PageUp from 29 -> 24 -> 19
      fireEvent.keyDown(container, { key: 'PageUp' });
      fireEvent.keyDown(container, { key: 'PageUp' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('19');

      // Home -> jumps to 0
      fireEvent.keyDown(container, { key: 'Home' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');
    });

    it('dynamically clamps selectedIndex when totalItems shrinks unexpectedly', async () => {
      render(<DynamicItemsNavHarness initialCount={20} />);
      const container = screen.getByTestId('dynamic-container');

      // Navigate to index 18
      fireEvent.keyDown(container, { key: 'End' }); // 19
      fireEvent.keyDown(container, { key: 'ArrowUp' }); // 18
      expect(screen.getByTestId('dynamic-selected-index')).toHaveTextContent('18');

      // Shrink total items to 5
      fireEvent.click(screen.getByTestId('btn-shrink-to-5'));

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-total-items')).toHaveTextContent('5');
        // selectedIndex must clamp to 4 (totalItems - 1)
        expect(screen.getByTestId('dynamic-selected-index')).toHaveTextContent('4');
      });

      // Shrink total items to 0
      fireEvent.click(screen.getByTestId('btn-shrink-to-0'));

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-total-items')).toHaveTextContent('0');
        expect(screen.getByTestId('dynamic-selected-index')).toHaveTextContent('0');
      });
    });

    it('stress tests rapid key navigation in full App component', async () => {
      render(<App />);

      await waitFor(() => {
        const items = screen.getAllByRole('option');
        expect(items.length).toBe(5); // default mock items
      });

      const input = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");

      // Fire 100 rapid ArrowDown events on input
      for (let i = 0; i < 100; i++) {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
      }

      // 100 % 5 = 0 -> item 0 remains selected
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveAttribute('aria-selected', 'true');
      });

      // Fire 3 ArrowDown events -> item 3 selected (Windows Terminal)
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options[3]).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 2. Rapid typing and race condition handling in useSearch and SearchBar
  // --------------------------------------------------------------------------
  describe('2. Rapid Typing & Async Race Condition Defense', () => {
    it('debounces rapid keystroke bursts and only fires for the final query', async () => {
      const searchSpy = vi.spyOn(ipc, 'searchItems');
      render(<SearchHarness />);

      // Initial search for empty string
      await waitFor(() => {
        expect(screen.getByTestId('search-count')).not.toHaveTextContent('0');
      });
      searchSpy.mockClear();

      const input = screen.getByTestId('search-input');

      // Simulate rapid burst typing "term" within 5ms intervals
      fireEvent.change(input, { target: { value: 't' } });
      fireEvent.change(input, { target: { value: 'te' } });
      fireEvent.change(input, { target: { value: 'ter' } });
      fireEvent.change(input, { target: { value: 'term' } });

      // Wait 30ms for 15ms debounce to fire
      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledWith('term');
      });

      // searchItems should NOT have been called for intermediate 't', 'te', 'ter'
      const calledQueries = searchSpy.mock.calls.map((c) => c[0]);
      expect(calledQueries).not.toContain('t');
      expect(calledQueries).not.toContain('te');
      expect(calledQueries).not.toContain('ter');
      expect(calledQueries).toContain('term');
    });

    it('race condition oracle: discards slow out-of-order responses and keeps newer query', async () => {
      // Simulate race condition where Request 1 (slow) finishes AFTER Request 2 (fast)
      let resolveSlowReq: (val: SearchResult[]) => void;
      let resolveFastReq: (val: SearchResult[]) => void;

      const slowPromise = new Promise<SearchResult[]>((resolve) => {
        resolveSlowReq = resolve;
      });
      const fastPromise = new Promise<SearchResult[]>((resolve) => {
        resolveFastReq = resolve;
      });

      vi.spyOn(ipc, 'searchItems').mockImplementation(async (q: string) => {
        if (q === 'slow-query') {
          return await slowPromise;
        }
        if (q === 'fast-query') {
          return await fastPromise;
        }
        return [];
      });

      render(<SearchHarness />);
      const input = screen.getByTestId('search-input');

      // 1. Dispatch first search (slow-query)
      fireEvent.change(input, { target: { value: 'slow-query' } });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20)); // allow 15ms debounce to trigger
      });

      // 2. Dispatch second search (fast-query)
      fireEvent.change(input, { target: { value: 'fast-query' } });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      // 3. Resolve the FASTER, NEWER query first
      await act(async () => {
        resolveFastReq!([
          {
            id: 'fast-item',
            title: 'Fast Query Result',
            subtitle: 'Newest result',
            category: 'app',
            action: 'launch:fast',
            score: 99,
          },
        ]);
      });

      // Verify fast result is displayed
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toHaveTextContent('Fast Query Result');
      });

      // 4. Now resolve the SLOW, OLDER query
      await act(async () => {
        resolveSlowReq!([
          {
            id: 'stale-item',
            title: 'Stale Out Of Order Result',
            subtitle: 'Should be discarded',
            category: 'app',
            action: 'launch:stale',
            score: 50,
          },
        ]);
      });

      // Verify that stale result was DISCARDED and Fast Query Result is STILL shown
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toHaveTextContent('Fast Query Result');
        expect(screen.getByTestId('search-results')).not.toHaveTextContent('Stale Out Of Order Result');
        expect(screen.getByTestId('search-loading')).toHaveTextContent('idle');
      });
    });

    it('in-flight search cancellation when query is cleared', async () => {
      let resolveSlowReq: (val: SearchResult[]) => void;
      const slowPromise = new Promise<SearchResult[]>((resolve) => {
        resolveSlowReq = resolve;
      });

      vi.spyOn(ipc, 'searchItems').mockImplementation(async (q: string) => {
        if (q === 'pending-query') {
          return await slowPromise;
        }
        return ipc.MOCK_SEARCH_ITEMS;
      });

      render(<SearchHarness />);
      const input = screen.getByTestId('search-input');
      const clearBtn = screen.getByTestId('search-clear');

      // Dispatch search
      fireEvent.change(input, { target: { value: 'pending-query' } });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      // Clear query immediately
      fireEvent.click(clearBtn);

      // Now resolve slow request
      await act(async () => {
        resolveSlowReq!([
          {
            id: 'abandoned-item',
            title: 'Abandoned Stale Item',
            subtitle: 'Should not appear',
            category: 'app',
            action: 'launch:none',
            score: 10,
          },
        ]);
      });

      // Should show root mock items, not abandoned item
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).not.toHaveTextContent('Abandoned Stale Item');
        expect(screen.getByTestId('search-results')).toHaveTextContent('Clipboard History');
      });
    });

    it('SearchBar handles special characters, unicode emojis, and long input strings without error', () => {
      const handleChange = vi.fn();
      const handleClear = vi.fn();
      const handleReset = vi.fn();
      const inputRef = React.createRef<HTMLInputElement>();

      const { rerender } = render(
        <SearchBar
          query=""
          onChange={handleChange}
          onClear={handleClear}
          onResetView={handleReset}
          inputRef={inputRef}
          viewMode="root"
        />
      );

      const input = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");

      // 1. Unicode & emoji typing
      fireEvent.change(input, { target: { value: '🚀 Raycast Runner 💻' } });
      expect(handleChange).toHaveBeenCalledWith('🚀 Raycast Runner 💻');

      // 2. Special chars & XSS-like payload
      fireEvent.change(input, {
        target: { value: '<script>alert("xss")</script> & DROP TABLE users; --' },
      });
      expect(handleChange).toHaveBeenCalledWith(
        '<script>alert("xss")</script> & DROP TABLE users; --'
      );

      // 3. Very long string (1,000 characters)
      const longStr = 'a'.repeat(1000);
      fireEvent.change(input, { target: { value: longStr } });
      expect(handleChange).toHaveBeenCalledWith(longStr);

      // 4. Clear button appears and works
      rerender(
        <SearchBar
          query="non-empty"
          onChange={handleChange}
          onClear={handleClear}
          onResetView={handleReset}
          inputRef={inputRef}
          viewMode="root"
        />
      );
      const clearBtn = screen.getByTitle('Clear search query');
      fireEvent.click(clearBtn);
      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Tests ActionMenu state transitions under rapid Tab / Ctrl+K and Escape
  // --------------------------------------------------------------------------
  describe('3. ActionMenu Transitions under Rapid Tab / Ctrl+K and Strict Escape Hierarchy', () => {
    it('rapidly toggles ActionMenu via 20 Tab key events (even count closes)', () => {
      const handleToggle = vi.fn();
      render(<KeyboardNavHarness totalItems={5} onToggleActionMenu={handleToggle} />);
      const container = screen.getByTestId('nav-container');

      for (let i = 0; i < 20; i++) {
        fireEvent.keyDown(container, { key: 'Tab' });
      }

      expect(handleToggle).toHaveBeenCalledTimes(20);
    });

    it('rapidly toggles ActionMenu via 15 Ctrl+K key events (odd count opens)', () => {
      const handleToggle = vi.fn();
      render(<KeyboardNavHarness totalItems={5} onToggleActionMenu={handleToggle} />);
      const container = screen.getByTestId('nav-container');

      for (let i = 0; i < 15; i++) {
        fireEvent.keyDown(container, { key: 'k', ctrlKey: true });
      }

      expect(handleToggle).toHaveBeenCalledTimes(15);
    });

    it('executes strict Escape hierarchy under all combination states', () => {
      const handleCloseMenu = vi.fn();
      const handleResetView = vi.fn();
      const handleClearQuery = vi.fn();
      const handleHideWindow = vi.fn();

      // State A: ActionMenu is open -> only close menu
      const { rerender } = render(
        <KeyboardNavHarness
          totalItems={5}
          isActionMenuOpen={true}
          viewMode="snippets"
          hasQuery={true}
          onCloseActionMenu={handleCloseMenu}
          onResetView={handleResetView}
          onClearQuery={handleClearQuery}
          onHideWindow={handleHideWindow}
        />
      );
      const container = screen.getByTestId('nav-container');
      fireEvent.keyDown(container, { key: 'Escape' });

      expect(handleCloseMenu).toHaveBeenCalledTimes(1);
      expect(handleResetView).not.toHaveBeenCalled();
      expect(handleClearQuery).not.toHaveBeenCalled();
      expect(handleHideWindow).not.toHaveBeenCalled();

      // State B: ActionMenu closed, in Subview -> only reset view
      rerender(
        <KeyboardNavHarness
          totalItems={5}
          isActionMenuOpen={false}
          viewMode="snippets"
          hasQuery={true}
          onCloseActionMenu={handleCloseMenu}
          onResetView={handleResetView}
          onClearQuery={handleClearQuery}
          onHideWindow={handleHideWindow}
        />
      );
      fireEvent.keyDown(container, { key: 'Escape' });

      expect(handleResetView).toHaveBeenCalledTimes(1);
      expect(handleClearQuery).not.toHaveBeenCalled();
      expect(handleHideWindow).not.toHaveBeenCalled();

      // State C: ActionMenu closed, root view, active query -> only clear query
      rerender(
        <KeyboardNavHarness
          totalItems={5}
          isActionMenuOpen={false}
          viewMode="root"
          hasQuery={true}
          onCloseActionMenu={handleCloseMenu}
          onResetView={handleResetView}
          onClearQuery={handleClearQuery}
          onHideWindow={handleHideWindow}
        />
      );
      fireEvent.keyDown(container, { key: 'Escape' });

      expect(handleClearQuery).toHaveBeenCalledTimes(1);
      expect(handleHideWindow).not.toHaveBeenCalled();

      // State D: ActionMenu closed, root view, empty query -> hide window
      rerender(
        <KeyboardNavHarness
          totalItems={5}
          isActionMenuOpen={false}
          viewMode="root"
          hasQuery={false}
          onCloseActionMenu={handleCloseMenu}
          onResetView={handleResetView}
          onClearQuery={handleClearQuery}
          onHideWindow={handleHideWindow}
        />
      );
      fireEvent.keyDown(container, { key: 'Escape' });

      expect(handleHideWindow).toHaveBeenCalledTimes(1);
    });

    it('locks out background navigation and execution when ActionMenu is open', () => {
      const handlePrimary = vi.fn();
      const handleAdmin = vi.fn();

      render(
        <KeyboardNavHarness
          totalItems={5}
          isActionMenuOpen={true}
          onExecutePrimary={handlePrimary}
          onExecuteAdmin={handleAdmin}
        />
      );
      const container = screen.getByTestId('nav-container');

      // Arrow navigation should be ignored by main list
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      fireEvent.keyDown(container, { key: 'ArrowUp' });
      expect(screen.getByTestId('selected-index')).toHaveTextContent('0');

      // Enter execution should be ignored
      fireEvent.keyDown(container, { key: 'Enter' });
      expect(handlePrimary).not.toHaveBeenCalled();

      fireEvent.keyDown(container, { key: 'Enter', ctrlKey: true });
      expect(handleAdmin).not.toHaveBeenCalled();
    });

    it('ActionMenu renders actions and triggers selection callback', () => {
      const actions: ActionOption[] = [
        { id: 'open', label: 'Open Application', shortcut: '↵' },
        { id: 'admin', label: 'Run as Administrator', shortcut: 'Ctrl+↵' },
        { id: 'reveal', label: 'Open in File Explorer', shortcut: 'Ctrl+O' },
      ];
      const handleSelect = vi.fn();
      const handleClose = vi.fn();

      render(<ActionMenu actions={actions} onSelect={handleSelect} onClose={handleClose} />);

      expect(screen.getByText('Available Actions')).toBeInTheDocument();
      expect(screen.getByText('Open Application')).toBeInTheDocument();
      expect(screen.getByText('Run as Administrator')).toBeInTheDocument();
      expect(screen.getByText('Open in File Explorer')).toBeInTheDocument();

      // Click second item
      fireEvent.click(screen.getByText('Run as Administrator'));
      expect(handleSelect).toHaveBeenCalledWith('admin');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Tests empty search results, single item results, and 50+ result items
  // --------------------------------------------------------------------------
  describe('4. Result Set Scaling: Empty, Single, and 50+ Result Items', () => {
    it('handles empty search results with correct feedback message and no crashes on key events', () => {
      const handleSelect = vi.fn();
      const handleExecute = vi.fn();

      render(
        <ResultsList
          results={[]}
          selectedIndex={0}
          onSelectIndex={handleSelect}
          onExecute={handleExecute}
          query="nonexistent_xyz"
        />
      );

      expect(
        screen.getByText('No results found for “nonexistent_xyz”')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Try searching for installed apps or system settings')
      ).toBeInTheDocument();

      // Ensure no options rendered
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('handles single item result with correct selection and execution', () => {
      const items = generateItems(1);
      const handleSelect = vi.fn();
      const handleExecute = vi.fn();

      render(
        <ResultsList
          results={items}
          selectedIndex={0}
          onSelectIndex={handleSelect}
          onExecute={handleExecute}
          query="item"
        />
      );

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(1);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Result Title 0')).toBeInTheDocument();

      fireEvent.click(options[0]);
      expect(handleExecute).toHaveBeenCalledWith(items[0]);
    });

    it('scales gracefully to 100 result items with fast rendering and keyboard accessibility', async () => {
      const items = generateItems(100);
      let selectedIdx = 0;
      const handleSelect = vi.fn((idx) => {
        selectedIdx = idx;
      });
      const handleExecute = vi.fn();

      const startTime = performance.now();
      const { rerender } = render(
        <ResultsList
          results={items}
          selectedIndex={selectedIdx}
          onSelectIndex={handleSelect}
          onExecute={handleExecute}
          query=""
        />
      );
      const renderDuration = performance.now() - startTime;

      // Rendering 100 items in JSDOM should complete without quadratic stall (< 1000ms)
      expect(renderDuration).toBeLessThan(1000);

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(100);

      // Verify first item selected
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[99]).toHaveAttribute('aria-selected', 'false');

      // Update to last item
      rerender(
        <ResultsList
          results={items}
          selectedIndex={99}
          onSelectIndex={handleSelect}
          onExecute={handleExecute}
          query=""
        />
      );

      const updatedOptions = screen.getAllByRole('option');
      expect(updatedOptions[99]).toHaveAttribute('aria-selected', 'true');
      expect(updatedOptions[0]).toHaveAttribute('aria-selected', 'false');

      // Execute last item
      fireEvent.click(updatedOptions[99]);
      expect(handleExecute).toHaveBeenCalledWith(items[99]);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Tests theme switching and window event lifecycle (launcher-shown reset)
  // --------------------------------------------------------------------------
  describe('5. Theme Switching & Window Event Lifecycle State Reset', () => {
    it('switches themes dynamically between dark, light, and system', () => {
      const root = document.documentElement;

      // 1. Dark theme
      const { rerender } = render(<ThemeHarness theme="dark" />);
      expect(root.getAttribute('data-theme')).toBe('dark');
      expect(root.classList.contains('dark')).toBe(true);

      // 2. Light theme
      rerender(<ThemeHarness theme="light" />);
      expect(root.getAttribute('data-theme')).toBe('light');
      expect(root.classList.contains('dark')).toBe(false);

      // 3. System theme (mock media query matches light)
      rerender(<ThemeHarness theme="system" />);
      expect(root.getAttribute('data-theme')).toBe('light');
    });

    it('resets complete Command Palette state when launcher-shown is received', async () => {
      let registeredOnShown: (() => void) | null = null;

      // Spy on subscribeLauncherEvents to capture callbacks registered by App
      vi.spyOn(ipc, 'subscribeLauncherEvents').mockImplementation(
        async (onShow, _onHide) => {
          registeredOnShown = onShow;
          return () => {};
        }
      );

      render(<App />);

      // Wait for initial render
      await waitFor(() => {
        expect(registeredOnShown).not.toBeNull();
      });

      const input = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");

      // 1. Mutate state: type a search query
      fireEvent.change(input, { target: { value: 'custom query' } });
      await waitFor(() => {
        expect(input).toHaveValue('custom query');
      });

      // 2. Mutate state: navigate to another item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // 3. Mutate state: open ActionMenu
      fireEvent.keyDown(input, { key: 'Tab' });
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // 4. SIMULATE LAUNCHER-SHOWN EVENT (Global Hotkey pressed by user to summon window)
      act(() => {
        registeredOnShown!();
      });

      // 5. Verify all states are cleanly reset:
      await waitFor(() => {
        // Query cleared
        expect(input).toHaveValue('');
        // ActionMenu closed
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        // Selection reset to first item
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('clears query and dismisses ActionMenu when launcher-hidden is received', async () => {
      let registeredOnHidden: (() => void) | null = null;

      vi.spyOn(ipc, 'subscribeLauncherEvents').mockImplementation(
        async (_, onHide) => {
          registeredOnHidden = onHide;
          return () => {};
        }
      );

      render(<App />);

      await waitFor(() => {
        expect(registeredOnHidden).not.toBeNull();
      });

      const input = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");

      // Mutate state
      fireEvent.change(input, { target: { value: 'query to hide' } });
      fireEvent.keyDown(input, { key: 'Tab' }); // open menu

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Simulate window hidden event (blur or Esc hide)
      act(() => {
        registeredOnHidden!();
      });

      await waitFor(() => {
        expect(input).toHaveValue('');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('useTauriEvents unsubscribes properly on unmount', async () => {
      const mockUnlisten = vi.fn();
      vi.spyOn(ipc, 'subscribeLauncherEvents').mockResolvedValue(mockUnlisten);

      function EventsHarness() {
        useTauriEvents({ onShown: () => {}, onHidden: () => {} });
        return <div>Events Harness</div>;
      }

      const { unmount } = render(<EventsHarness />);

      await waitFor(() => {
        expect(ipc.subscribeLauncherEvents).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnlisten).toHaveBeenCalledTimes(1);
    });
  });
});
