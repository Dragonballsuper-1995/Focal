import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileSearchView } from '@/components/FileSearchView';
import { SettingsModal } from '@/components/SettingsModal';

describe('Milestone 5: File Search & Settings UI', () => {
  it('renders file search interface and displays queried files', async () => {
    const mockBack = vi.fn();
    render(<FileSearchView onBack={mockBack} />);

    const input = screen.getByPlaceholderText('Search files and folders on your computer...');
    fireEvent.change(input, { target: { value: 'Project' } });

    await waitFor(() => {
      expect(screen.getAllByText('Project_Specification.pdf').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders settings modal tabs and allows changing theme and hotkey', async () => {
    const mockBack = vi.fn();
    render(<SettingsModal onBack={mockBack} />);

    await waitFor(() => {
      expect(screen.getByText('Runner Preferences')).toBeInTheDocument();
      expect(screen.getByText('General & Appearance')).toBeInTheDocument();
      expect(screen.getByText('Hotkeys & Activation')).toBeInTheDocument();
      expect(screen.getByText('Search Directories')).toBeInTheDocument();
    });

    // Switch to Hotkeys tab
    const hotkeyTab = screen.getByText('Hotkeys & Activation');
    fireEvent.click(hotkeyTab);

    expect(screen.getByText('Global Activation Shortcut')).toBeInTheDocument();
    const hotkeyInput = screen.getByPlaceholderText('e.g. Alt+Space');
    expect(hotkeyInput).toHaveValue('Shift+Alt+Space');

    // Switch to Search Directories tab
    const dirTab = screen.getByText('Search Directories');
    fireEvent.click(dirTab);

    expect(screen.getByText('Indexed File Directories')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. C:\\Users\\MyUser\\Documents')).toBeInTheDocument();
  });
});
