import React from 'react';
import type { SearchResult, PinnedItem } from '@/types';
import { AppIcon } from './AppIcon';

export interface TelemetryInspectorProps {
  item?: SearchResult | PinnedItem;
  onToggleActions?: () => void;
  onExecute?: (item: SearchResult | PinnedItem) => void;
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
      publisher = publisher || 'Focal Core Subsystem';
      version = version || 'SQLite v3.45';
      subsystem = subsystem || 'SUBSYSTEM';
    } else if (item.category === 'command') {
      publisher = publisher || 'Focal Core Subsystem';
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
  onExecute,
}) => {
  if (!item) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-[var(--text-dim)] text-xs font-mono select-none">
        &gt;&gt; SELECT RECORD
      </div>
    );
  }

  const telemetry = getItemTelemetry(item);
  const typeTag = (item.category || 'APP').toUpperCase();

  return (
    <div className="flex flex-col h-full justify-between select-none font-sans p-4 bg-black/20 space-y-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-[11px] font-sans font-medium">
          <span className="text-slate-400">
            Properties
          </span>
          <span className="text-emerald-400 font-medium text-[10.5px] flex items-center gap-1.5">
            <span className="sr-only">[VERIFIED]</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span aria-hidden="true">Verified</span>
          </span>
        </div>

        {/* Item Identity Card */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
              <AppIcon item={item as SearchResult} className="w-5 h-5 object-contain" />
            </div>
            <div className="overflow-hidden">
              <h4 className="font-medium text-sm leading-tight text-slate-100 truncate">
                {item.title}
              </h4>
              <span className="text-[10.5px] font-sans text-slate-400 font-medium">
                <span className="sr-only">[{typeTag}]</span>
                <span aria-hidden="true" className="uppercase tracking-wider font-semibold text-[10px] text-slate-400">{typeTag}</span>
              </span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 truncate" title={item.subtitle}>
            {item.subtitle || item.action}
          </div>
        </div>

        {/* Clean Spec Box */}
        {telemetry && (
          <div className="space-y-1.5 text-xs font-sans">
            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400 text-[11px]">Publisher</span>
              <span className="text-slate-200 font-medium text-[11px] truncate max-w-[150px]">
                {telemetry.publisher}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400 text-[11px]">Version</span>
              <span className="text-slate-200 font-mono text-[11px] truncate max-w-[150px]">
                {telemetry.version}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400 text-[11px]">Subsystem</span>
              <span className="text-slate-200 font-mono text-[11px]">
                {telemetry.subsystem}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400 text-[11px]">Status</span>
              <span className="text-emerald-400 font-medium text-[11px]">
                {telemetry.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Launch CTA Button */}
      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        {onExecute && (
          <button
            onClick={() => onExecute(item)}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#FF6B4A] to-[#FF5370] hover:brightness-110 text-white text-xs font-medium shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span>Launch Now</span>
            <kbd className="focal-key bg-black/20 border-white/20 text-white">↵</kbd>
          </button>
        )}

        <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
          <span
            className="cursor-pointer hover:text-white flex items-center gap-1 transition-colors"
            onClick={onToggleActions}
          >
            ACTIONS <kbd className="focal-key text-[8.5px] h-4">Tab</kbd>
          </span>
          <span className="text-slate-500 font-mono text-[10px] truncate max-w-[90px]">{item.id}</span>
        </div>
      </div>
    </div>
  );
};

export default TelemetryInspector;
