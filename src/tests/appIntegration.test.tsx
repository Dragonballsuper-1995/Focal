import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Integration & Command Palette Shell', () => {
  it('renders the Command Palette with initial search bar and default items', async () => {
    render(<App />);

    expect(screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...")).toBeInTheDocument();
    expect(screen.getByText('FOCAL')).toBeInTheDocument();

    await waitFor(() => {
      const items = screen.getAllByText('Clipboard History');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('filters results interactively when typing into search input', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");
    fireEvent.change(input, { target: { value: 'Terminal' } });

    await waitFor(() => {
      const terminalItems = screen.getAllByText('Windows Terminal');
      expect(terminalItems.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Search and paste recent clipboard items')).not.toBeInTheDocument();
    });
  });

  it('navigates with ArrowDown and selects results', async () => {
    render(<App />);

    await waitFor(() => {
      const items = screen.getAllByText('Clipboard History');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    // Pinned section item 0 is selected initially
    const pinnedButtons = screen.getAllByRole('button');
    const firstPinned = pinnedButtons.find((btn) => btn.getAttribute('data-selected') === 'true');
    expect(firstPinned).toBeDefined();

    // Press ArrowDown to move from pinned to first result option
    const searchInput = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    // Press ArrowDown again to move to second result option
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      const updated = screen.getAllByRole('option');
      expect(updated[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('transitions into subsystem view when executing a view command', async () => {
    render(<App />);

    await waitFor(() => {
      const items = screen.getAllByText('Clipboard History');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    const options = screen.getAllByRole('option');
    fireEvent.doubleClick(options[0]);

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Search clipboard history...').length).toBeGreaterThanOrEqual(1);
    });

    // Press Esc to return to root
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...")).toBeInTheDocument();
    });
  });

  it('toggles ActionMenu popover via Tab and closes via Escape', async () => {
    render(<App />);

    await waitFor(() => {
      const items = screen.getAllByText('Clipboard History');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");
    fireEvent.keyDown(searchInput, { key: 'Tab' });

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Available Actions')).toBeInTheDocument();
    });

    // Press Escape to dismiss ActionMenu
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});
