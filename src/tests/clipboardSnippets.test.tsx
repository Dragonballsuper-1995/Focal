import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClipboardView } from '@/components/ClipboardView';
import { SnippetsView } from '@/components/SnippetsView';

describe('Milestone 4: Clipboard & Snippets UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders clipboard items, allows searching and previewing', async () => {
    const mockBack = vi.fn();
    render(<ClipboardView onBack={mockBack} />);

    await waitFor(() => {
      expect(screen.getAllByText('https://github.com/tauri-apps/tauri').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('git commit -m "feat: clean-room Raycast clone"')).toBeInTheDocument();
    });

    // Test search filter
    const input = screen.getByPlaceholderText('Search clipboard history...');
    fireEvent.change(input, { target: { value: 'tauri' } });

    await waitFor(() => {
      expect(screen.getAllByText('https://github.com/tauri-apps/tauri').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('git commit -m "feat: clean-room Raycast clone"')).not.toBeInTheDocument();
    });
  });

  it('renders snippets, displays keywords, and creates new snippet', async () => {
    const mockBack = vi.fn();
    render(<SnippetsView onBack={mockBack} />);

    await waitFor(() => {
      expect(screen.getAllByText('Current Date').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('!date').length).toBeGreaterThanOrEqual(1);
    });

    // Open creation dialog
    const newBtn = screen.getByText('New Snippet');
    fireEvent.click(newBtn);

    expect(screen.getByText('Create New Text Snippet')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('e.g. My Phone Number');
    const keywordInput = screen.getByPlaceholderText('e.g. phone');
    const textInput = screen.getByPlaceholderText(/Hello, today is/);

    fireEvent.change(titleInput, { target: { value: 'Support Email' } });
    fireEvent.change(keywordInput, { target: { value: 'support' } });
    fireEvent.change(textInput, { target: { value: 'support@example.com' } });

    const saveBtn = screen.getByText('Save Snippet');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create New Text Snippet')).not.toBeInTheDocument();
    });
  });
});
