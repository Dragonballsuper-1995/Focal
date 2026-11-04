import React from 'react';
import { FocalLogo } from './FocalLogo';
import { hideWindow } from '@/services/ipc';

export interface TelemetryHeaderProps {
  targetsCount?: number;
  accentColor?: string;
  onMinimize?: () => void;
  onClose?: () => void;
}

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({
  targetsCount = 842,
  accentColor = '#FF6B4A',
  onMinimize,
  onClose,
}) => {
  const handleMinimize = onMinimize || (() => hideWindow().catch(() => {}));
  const handleClose = onClose || (() => hideWindow().catch(() => {}));

  return (
    <div
      data-tauri-drag-region
      className="h-9 px-4 bg-[var(--surface-base)]/90 border-b border-[var(--border-hairline)] flex items-center justify-between text-xs font-mono select-none shrink-0 backdrop-blur-2xl transition-colors"
    >
      {/* Left telemetry info */}
      <div className="flex items-center gap-2.5 pointer-events-none">
        <div className="w-4 h-4 shrink-0 logo-aura">
          <FocalLogo className="w-full h-full" />
        </div>
        <span className="font-extrabold text-[var(--text-main)] tracking-wider font-sans text-xs">
          FOCAL
        </span>
        <span className="text-[var(--text-dim)]">//</span>
        <span className="text-[var(--text-muted)] text-[11px] font-medium">
          SYS_COMMAND_HUD
        </span>
        <span className="text-neutral-600">•</span>
        <span className="text-[#FF6B4A] font-semibold text-[11px]">
          {targetsCount} TARGETS
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5 text-[10.5px]">
          STATUS: <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 focal-dot-pulse" />
          <strong className="text-emerald-400 font-semibold">[READY]</strong>
        </span>
        <span className="text-[10.5px] hidden sm:inline">
          ACCENT:{' '}
          <strong style={{ color: accentColor }} className="font-semibold">
            {accentColor}
          </strong>
        </span>

        {/* Minimal Window Control Dots */}
        <div className="pl-2 border-l border-[var(--border-hairline)] flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-neutral-600/70 hover:bg-neutral-500 transition-colors flex items-center justify-center text-[8px] text-transparent hover:text-white"
            title="Minimize to Tray (Esc)"
          >
            —
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#FF4565]/80 hover:bg-[#FF4565] hover:brightness-125 transition-all flex items-center justify-center text-[8px] text-transparent hover:text-white"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelemetryHeader;
