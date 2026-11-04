import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TelemetryHeader } from '@/components/TelemetryHeader';
import { TelemetryInspector, getItemTelemetry } from '@/components/TelemetryInspector';
import { SettingsModal } from '@/components/SettingsModal';
import type { SearchResult } from '@/types';

const MOCK_APP_ITEM: SearchResult = {
  id: 'app-vscode',
  title: 'Visual Studio Code',
  subtitle: 'C:\\Users\\AppData\\Local\\Programs\\VSCode\\Code.exe',
  category: 'app',
  icon: 'code',
  action: 'launch:code.exe',
  score: 99.5,
};

const MOCK_CMD_ITEM: SearchResult = {
  id: 'cmd-clipboard',
  title: 'Clipboard History',
  subtitle: 'Recent clips',
  category: 'command',
  icon: 'clipboard',
  action: 'view:clipboard',
  score: 85.0,
};

describe('TelemetryHeader Component', () => {
  it('renders branding, target counts, and ready status', () => {
    render(<TelemetryHeader targetsCount={999} />);

    expect(screen.getByText('FOCAL')).toBeInTheDocument();
    expect(screen.getByText('SYS_COMMAND_HUD')).toBeInTheDocument();
    expect(screen.getByText('999 TARGETS')).toBeInTheDocument();
    expect(screen.getByText('[READY]')).toBeInTheDocument();
  });

  it('renders custom accent color dynamically', () => {
    render(<TelemetryHeader accentColor="#FF5370" />);

    const accentElement = screen.getByText('#FF5370');
    expect(accentElement).toBeInTheDocument();
    expect(accentElement).toHaveStyle({ color: '#FF5370' });
  });

  it('triggers minimize and close callbacks on window control button clicks', () => {
    const handleMin = vi.fn();
    const handleClose = vi.fn();
    render(<TelemetryHeader onMinimize={handleMin} onClose={handleClose} />);

    const minBtn = screen.getByTitle('Minimize to Tray (Esc)');
    const closeBtn = screen.getByTitle('Dismiss');

    fireEvent.click(minBtn);
    expect(handleMin).toHaveBeenCalledTimes(1);

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('TelemetryInspector Component', () => {
  it('renders prompt when item is undefined', () => {
    render(<TelemetryInspector />);
    expect(screen.getByText('>> SELECT RECORD')).toBeInTheDocument();
  });

  it('renders item details, verified badge, and technical specifications', () => {
    render(<TelemetryInspector item={MOCK_APP_ITEM} />);

    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('[APP]')).toBeInTheDocument();
    expect(screen.getByText('[VERIFIED]')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
    expect(screen.getByText('LOCAL_EXE')).toBeInTheDocument();
  });

  it('triggers onExecute when Launch Now is clicked', () => {
    const handleExec = vi.fn();
    render(<TelemetryInspector item={MOCK_APP_ITEM} onExecute={handleExec} />);

    const launchBtn = screen.getByText('Launch Now');
    fireEvent.click(launchBtn);
    expect(handleExec).toHaveBeenCalledWith(MOCK_APP_ITEM);
  });

  it('triggers onToggleActions when ACTIONS is clicked', () => {
    const handleToggle = vi.fn();
    render(<TelemetryInspector item={MOCK_APP_ITEM} onToggleActions={handleToggle} />);

    const actionsTrigger = screen.getByText(/ACTIONS/);
    fireEvent.click(actionsTrigger);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('resolves appropriate telemetry metadata for different categories', () => {
    const appTelem = getItemTelemetry(MOCK_APP_ITEM);
    expect(appTelem?.publisher).toBe('Microsoft Corporation');

    const cmdTelem = getItemTelemetry(MOCK_CMD_ITEM);
    expect(cmdTelem?.subsystem).toBe('SUBSYSTEM');
  });
});

describe('SettingsModal Live Configuration Updates', () => {
  it('notifies onConfigChange when switching theme to OLED', async () => {
    const handleConfigChange = vi.fn();
    render(<SettingsModal onBack={vi.fn()} onConfigChange={handleConfigChange} />);

    const oledBtn = await screen.findByRole('button', { name: /oled/i });
    fireEvent.click(oledBtn);

    expect(handleConfigChange).toHaveBeenCalled();
    const lastCall = handleConfigChange.mock.calls[handleConfigChange.mock.calls.length - 1][0];
    expect(lastCall.theme).toBe('oled');
  });

  it('notifies onConfigChange when toggling inspector preview pane', async () => {
    const handleConfigChange = vi.fn();
    render(<SettingsModal onBack={vi.fn()} onConfigChange={handleConfigChange} />);

    const previewCheckbox = await screen.findByRole('checkbox', {
      name: /Inspector Preview Pane/i,
    });
    fireEvent.click(previewCheckbox);

    expect(handleConfigChange).toHaveBeenCalled();
    const lastCall = handleConfigChange.mock.calls[handleConfigChange.mock.calls.length - 1][0];
    expect(lastCall.preview_pane_enabled).toBe(true);
  });
});
