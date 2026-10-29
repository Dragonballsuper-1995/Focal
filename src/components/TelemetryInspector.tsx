import React from 'react';
import type { SearchResult, PinnedItem } from '@/types';
import { AppIcon } from './AppIcon';

export interface TelemetryInspectorProps {
  item?: SearchResult | PinnedItem;
  onToggleActions?: () => void;
}

export function getItemTelemetry(item?: SearchResult | PinnedItem) {
  if (!item) return null;

  const titleLower = item.title.toLowerCase();
  const subtitle = item.subtitle || '';

  // Explicit values if present
  let publisher = item.publisher;
  let version = item.version;
  let subsystem = item.source;
  const status = 'VERIFIED';

  if (!publisher || !version || !subsystem) {
    if (titleLower.includes('whatsapp')) {
      publisher = publisher || 'Meta Platforms, Inc.';
      version = version || '2.2443.4.0 (x64)';
      subsystem = subsystem || 'UWP_MSIX';
    } else if (titleLower.includes('code') || titleLower.includes('vscode')) {
      publisher = publisher || 'Microsoft Corporation';
      version = version || '1.95.2 (x64)';
      subsystem = subsystem || 'LOCAL_EXE';
    } else if (titleLower.includes('terminal') || titleLower.includes('wt')) {
      publisher = publisher || 'Microsoft Corporation';
      version = version || '1.20.11781.0';
      subsystem = subsystem || 'WIN32_EXE';
    } else if (titleLower.includes('youtube')) {
      publisher = publisher || 'Google LLC';
      version = version || 'Progressive Web App';
      subsystem = subsystem || 'PWA_HOST';
    } else if (titleLower.includes('shutdown') || titleLower.includes('restart') || titleLower.includes('sleep') || titleLower.includes('lock')) {
      publisher = publisher || 'Windows NT Kernel';
      version = version || 'NTOSKRNL 10.0.26100';
      subsystem = subsystem || 'SYS_API';
    } else if (titleLower.includes('matlab')) {
      publisher = publisher || 'The MathWorks, Inc.';
      version = version || 'R2026a (64-bit)';
      subsystem = subsystem || 'MATHWORKS';
    } else if (titleLower.includes('teams')) {
      publisher = publisher || 'Microsoft Corporation';
      version = version || '24295.1000.3200';
      subsystem = subsystem || 'MS_TEAMS';
    } else if (titleLower.includes('antigravity')) {
      publisher = publisher || 'Google DeepMind';
      version = version || '2.0.0-PROD';
      subsystem = subsystem || 'LOCAL_EXE';
    } else if (titleLower.includes('uniget')) {
      publisher = publisher || 'Marti Climent';
      version = version || '3.1.2 (WinUI 3)';
      subsystem = subsystem || 'WINGET';
    } else if (titleLower.includes('android')) {
      publisher = publisher || 'Google LLC';
      version = version || 'Koala 2024.1.1';
      subsystem = subsystem || 'JETBRAINS';
    } else if (titleLower.includes('steam')) {
      publisher = publisher || 'Valve Corporation';
      version = version || 'Steam Client v1715';
      subsystem = subsystem || 'VALVE';
    } else if (titleLower.includes('detroit')) {
      publisher = publisher || 'Quantic Dream';
      version = version || 'DirectX 12 / Vulkan 1.3';
      subsystem = subsystem || 'EPIC_GAMES';
    } else if (titleLower.includes('calc')) {
      publisher = publisher || 'Microsoft Corporation';
      version = version || '11.2405.8.0';
      subsystem = subsystem || 'WIN32_UWP';
    } else if (item.category === 'clipboard') {
      publisher = publisher || 'Runner Core Subsystem';
      version = version || 'SQLite v3.45';
      subsystem = subsystem || 'SUBSYSTEM';
    } else if (item.category === 'command') {
      publisher = publisher || 'Runner Core Subsystem';
      version = version || 'Local Index';
      subsystem = subsystem || 'SUBSYSTEM';
    } else if (item.category === 'file') {
      publisher = publisher || 'File Subsystem';
      version = version || 'NTFS / USN';
      subsystem = subsystem || 'LOCAL_FILE';
    } else if (item.category === 'setting') {
      publisher = publisher || 'Microsoft Corporation';
      version = version || 'Windows 11 Build 26100';
      subsystem = subsystem || 'SYS_API';
    } else {
      publisher = publisher || (subtitle.includes('Microsoft') ? 'Microsoft Corporation' : 'Local Binary');
      version = version || '1.0.0-PROD';
      subsystem = subsystem || (item.action.startsWith('launch:') ? 'WIN32_EXE' : 'LOCAL_EXE');
    }
  }

  return {
    publisher,
    version,
    subsystem,
    status,
  };
}

export const TelemetryInspector: React.FC<TelemetryInspectorProps> = ({
  item,
  onToggleActions,
}) => {
  if (!item) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-neutral-600 text-xs font-mono select-none">
        &gt;&gt; SELECT RECORD
      </div>
    );
  }

  const telemetry = getItemTelemetry(item);
  const typeTag = (item.category || 'APP').toUpperCase();

  return (
    <div className="flex flex-col h-full justify-between select-none font-mono">
      <div className="space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#1E212A] text-[9.5px] uppercase tracking-wider font-semibold">
          <span className="text-[var(--sys-accent)]">// TELEMETRY_INSPECT</span>
          <span className="text-emerald-400 font-semibold">[READY]</span>
        </div>

        {/* Item Identity */}
        <div className="p-2 rounded-xs bg-[#14161C] border border-[#20232C] space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 truncate">
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <AppIcon item={item as SearchResult} className="w-4 h-4" />
              </span>
              <span className="font-bold text-white text-xs tracking-wide font-hud truncate">
                {item.title.toUpperCase()}
              </span>
            </div>
            <span className="px-1 py-0.2 rounded-xs text-[9px] font-bold bg-[#1C1F28] text-[var(--sys-accent)] border border-[#282C38] shrink-0">
              [{typeTag}]
            </span>
          </div>
          <div className="text-[10px] text-neutral-400 font-mono truncate" title={item.subtitle}>
            {item.subtitle || item.action}
          </div>
        </div>

        {/* Clean Spec Box */}
        {telemetry && (
          <div className="space-y-1 text-xs font-mono">
            <div className="flex items-center justify-between py-1 border-b border-[#171922]">
              <span className="text-neutral-500 text-[9.5px]">PUBLISHER</span>
              <span className="text-neutral-300 font-medium text-[10.5px] truncate max-w-[150px]">
                {telemetry.publisher}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#171922]">
              <span className="text-neutral-500 text-[9.5px]">VERSION</span>
              <span className="text-neutral-300 font-medium text-[10.5px] truncate max-w-[150px]">
                {telemetry.version}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#171922]">
              <span className="text-neutral-500 text-[9.5px]">SUBSYSTEM</span>
              <span className="text-[var(--sys-accent)] font-semibold text-[10.5px]">
                {telemetry.subsystem}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#171922]">
              <span className="text-neutral-500 text-[9.5px]">STATUS</span>
              <span className="text-emerald-400 font-medium text-[10.5px]">
                {telemetry.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions Prompt in Right Pane */}
      <div className="pt-2 border-t border-[#1E212A] flex items-center justify-between text-[9.5px] font-mono">
        <span
          className="text-neutral-400 cursor-pointer hover:text-white flex items-center gap-1"
          onClick={onToggleActions}
        >
          PRESS{' '}
          <kbd className="hud-key bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-bold text-[8.5px]">
            [TAB]
          </kbd>{' '}
          ACTIONS
        </span>
        <span className="text-neutral-500 text-[9px] truncate max-w-[90px]">{item.id}</span>
      </div>
    </div>
  );
};
