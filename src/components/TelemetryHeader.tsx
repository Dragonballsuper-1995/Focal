import React from 'react';

export interface TelemetryHeaderProps {
  targetsCount?: number;
  accentColor?: string;
  onMinimize?: () => void;
  onClose?: () => void;
}

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({
  targetsCount = 842,
  accentColor = '#0078D4',
  onMinimize,
  onClose,
}) => {
  return (
    <div
      data-tauri-drag-region
      className="h-8 px-3.5 py-1.5 bg-[#14161C] border-b border-[#1E212A] flex items-center justify-between text-xs font-mono select-none shrink-0"
    >
      {/* Left telemetry info */}
      <div className="flex items-center gap-2.5 pointer-events-none">
        <span className="w-2 h-2 bg-[var(--sys-accent)] rounded-xs inline-block shrink-0" />
        <span className="text-white font-bold tracking-wider font-hud text-xs">
          RUNNER // SYS_COMMAND_HUD
        </span>
        <span className="text-neutral-600">•</span>
        <span className="text-neutral-400 text-[10.5px]">
          {targetsCount} TARGETS
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 text-[10.5px] text-neutral-400">
        <span>
          STATUS: <strong className="text-emerald-400 font-semibold">[READY]</strong>
        </span>
        <span>
          ACCENT: <strong className="text-[var(--sys-accent)] font-semibold">{accentColor}</strong>
        </span>

        {/* Minimal Dismiss Buttons */}
        <div className="pl-2 border-l border-[#262A36] flex items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            className="px-1 py-0.5 rounded-xs text-neutral-500 hover:text-white hover:bg-[#20232D] text-[9.5px] transition-colors"
            title="Hide to Tray (Esc)"
          >
            [—]
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-1 py-0.5 rounded-xs text-neutral-500 hover:text-red-400 hover:bg-[#20232D] text-[9.5px] transition-colors"
            title="Dismiss"
          >
            [✕]
          </button>
        </div>
      </div>
    </div>
  );
};
