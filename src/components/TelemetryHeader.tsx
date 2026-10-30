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
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 100 100" fill="none" aria-label="Focal Logo">
          <defs>
            <linearGradient id="hdr-focal-1" x1="22" y1="26" x2="86" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FFA07A"/>
              <stop offset="100%" stop-color="#FB923C"/>
            </linearGradient>
            <linearGradient id="hdr-focal-2" x1="22" y1="54" x2="70" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FB7185"/>
              <stop offset="100%" stop-color="#F43F5E"/>
            </linearGradient>
            <linearGradient id="hdr-focal-3" x1="22" y1="82" x2="42" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#F43F5E"/>
              <stop offset="100%" stop-color="#E11D48"/>
            </linearGradient>
          </defs>
          <rect x="22" y="16" width="64" height="20" rx="10" fill="url(#hdr-focal-1)"/>
          <rect x="22" y="44" width="48" height="20" rx="10" fill="url(#hdr-focal-2)"/>
          <circle cx="32" cy="82" r="10" fill="url(#hdr-focal-3)"/>
        </svg>
        <span className="text-white font-bold tracking-wider font-hud text-xs">
          FOCAL // SYS_COMMAND_HUD
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
            className="px-1 py-0.5 rounded-none text-neutral-500 hover:text-white hover:bg-[#20232D] text-[9.5px] transition-colors"
            title="Hide to Tray (Esc)"
          >
            [—]
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-1 py-0.5 rounded-none text-neutral-500 hover:text-red-400 hover:bg-[#20232D] text-[9.5px] transition-colors"
            title="Dismiss"
          >
            [✕]
          </button>
        </div>
      </div>
    </div>
  );
};
