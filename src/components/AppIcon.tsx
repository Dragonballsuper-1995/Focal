import React from 'react';
import {
  Lock,
  Moon,
  RotateCcw,
  Power,
  ClipboardList,
  FileCode2,
  FolderSearch,
  Settings,
  Monitor,
  Wifi,
  Bluetooth,
  Volume2,
  BatteryCharging,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  LayoutGrid,
  Sliders,
  Calculator,
  Smile,
  Terminal,
  Folder,
  Globe,
  FileText,
  KeyRound,
  Activity,
} from 'lucide-react';
import type { SearchResult } from '@/types';

interface AppIconProps {
  item: SearchResult;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ item, className = 'w-4 h-4' }) => {
  // If an extracted image icon URL/Data URI is present, use it
  if (
    item.icon &&
    (item.icon.startsWith('data:') ||
      item.icon.startsWith('http') ||
      item.icon.startsWith('asset:') ||
      item.icon.startsWith('/'))
  ) {
    return <img src={item.icon} alt={item.title} className="w-full h-full object-contain p-0.5 rounded-none" />;
  }

  const titleLower = item.title.toLowerCase();
  const actionLower = item.action.toLowerCase();
  const idLower = item.id.toLowerCase();

  // 1. Built-in system commands
  if (idLower === 'cmd-lock' || actionLower === 'system:lock') {
    return <Lock className={`${className} text-cyan-400`} />;
  }
  if (idLower === 'cmd-sleep' || actionLower === 'system:sleep') {
    return <Moon className={`${className} text-indigo-400`} />;
  }
  if (idLower === 'cmd-restart' || actionLower === 'system:restart') {
    return <RotateCcw className={`${className} text-orange-400`} />;
  }
  if (idLower === 'cmd-shutdown' || actionLower === 'system:shutdown') {
    return <Power className={`${className} text-rose-500`} />;
  }
  if (idLower === 'cmd-clipboard' || actionLower === 'view:clipboard') {
    return <ClipboardList className={`${className} text-emerald-400`} />;
  }
  if (idLower === 'cmd-snippets' || actionLower === 'view:snippets') {
    return <FileCode2 className={`${className} text-amber-400`} />;
  }
  if (idLower === 'cmd-files' || actionLower === 'view:files') {
    return <FolderSearch className={`${className} text-blue-400`} />;
  }
  if (idLower === 'cmd-settings' || actionLower === 'view:settings') {
    return <Settings className={`${className} text-purple-400`} />;
  }
  if (idLower.includes('calc') || titleLower.includes('calculator')) {
    return <Calculator className={`${className} text-amber-400`} />;
  }
  if (idLower.includes('emoji') || titleLower.includes('emoji')) {
    return <Smile className={`${className} text-yellow-400`} />;
  }

  // 2. Windows Settings contextual icons
  if (item.category === 'setting' || actionLower.startsWith('ms-settings:')) {
    if (titleLower.includes('display') || titleLower.includes('night light') || titleLower.includes('graphics')) {
      return <Monitor className={`${className} text-sky-400`} />;
    }
    if (
      titleLower.includes('wi-fi') ||
      titleLower.includes('network') ||
      titleLower.includes('ethernet') ||
      titleLower.includes('vpn') ||
      titleLower.includes('hotspot')
    ) {
      return <Wifi className={`${className} text-blue-400`} />;
    }
    if (
      titleLower.includes('bluetooth') ||
      titleLower.includes('mouse') ||
      titleLower.includes('keyboard') ||
      titleLower.includes('devices')
    ) {
      return <Bluetooth className={`${className} text-indigo-400`} />;
    }
    if (titleLower.includes('sound') || titleLower.includes('volume') || titleLower.includes('audio')) {
      return <Volume2 className={`${className} text-pink-400`} />;
    }
    if (titleLower.includes('battery') || titleLower.includes('power')) {
      return <BatteryCharging className={`${className} text-emerald-400`} />;
    }
    if (titleLower.includes('update')) {
      return <RefreshCw className={`${className} text-cyan-400`} />;
    }
    if (titleLower.includes('security') || titleLower.includes('defender') || titleLower.includes('antivirus')) {
      return <ShieldCheck className={`${className} text-green-400`} />;
    }
    if (titleLower.includes('storage') || titleLower.includes('disk')) {
      return <HardDrive className={`${className} text-amber-400`} />;
    }
    if (titleLower.includes('app') || titleLower.includes('features')) {
      return <LayoutGrid className={`${className} text-violet-400`} />;
    }
    if (titleLower.includes('account') || titleLower.includes('sign-in') || titleLower.includes('password')) {
      return <KeyRound className={`${className} text-amber-400`} />;
    }
    return <Sliders className={`${className} text-purple-400`} />;
  }

  // 3. Known Top Software Vector Brand Logos
  // Google Chrome
  if (titleLower.includes('chrome')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#EA4335" />
        <path d="M12 2C16.9 2 21 5.6 21.9 10.3L12 10.3L9.5 6L12 2Z" fill="#EA4335" />
        <path d="M21.9 10.3C22 10.8 22 11.4 22 12C22 17.5 17.5 22 12 22L16.2 14.7L21.9 10.3Z" fill="#FBBC05" />
        <path d="M12 22C6.5 22 2 17.5 2 12C2 9.5 2.9 7.2 4.4 5.5L8.7 12.8L12 22Z" fill="#34A853" />
        <circle cx="12" cy="12" r="4.5" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="3.2" fill="#4285F4" />
      </svg>
    );
  }

  // Firefox
  if (titleLower.includes('firefox')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FF7139" />
        <circle cx="12" cy="12" r="7" fill="#8B2500" opacity="0.3" />
        <path d="M12 4C14 4 17 6 17 10C17 14 14 17 10 17C6 17 5 14 5 12C5 7 10 5 12 4Z" fill="#FFE240" />
      </svg>
    );
  }

  // YouTube
  if (titleLower.includes('youtube')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
        <polygon points="10,8 16,12 10,16" fill="#FFFFFF" />
      </svg>
    );
  }

  // Brave Browser
  if (titleLower.includes('brave')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6V11C3 16.5 7 21 12 22C17 21 21 16.5 21 11V6L12 2Z" fill="#FB542B" />
        <path d="M12 6L7 9V13C7 16 9.5 18.5 12 19C14.5 18.5 17 16 17 13V9L12 6Z" fill="#FFFFFF" />
        <polygon points="12,9 10,12 12,14 14,12" fill="#FB542B" />
      </svg>
    );
  }

  // VS Code
  if (titleLower.includes('visual studio code') || titleLower === 'code' || titleLower.includes('vscode')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M17.5 2L6.5 10.5L2 7V17L6.5 13.5L17.5 22L22 20V4L17.5 2Z" fill="#007ACC" />
        <path d="M17.5 2L6.5 10.5L11 12L17.5 6V2Z" fill="#1F8AD2" />
        <path d="M17.5 22L6.5 13.5L11 12L17.5 18V22Z" fill="#1F8AD2" />
        <path d="M2 7L6.5 10.5L2 13.5V7Z" fill="#0E639C" />
      </svg>
    );
  }

  // GitHub / GitHub Desktop
  if (titleLower.includes('github')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C6.477 2 2 6.477 2 12C2 16.42 4.87 20.17 8.84 21.5C9.34 21.58 9.5 21.27 9.5 21V19.31C6.73 19.91 6.14 18.12 6.14 18.12C5.68 16.97 5.03 16.66 5.03 16.66C4.12 16.04 5.1 16.05 5.1 16.05C6.1 16.12 6.63 17.08 6.63 17.08C7.52 18.61 8.97 18.17 9.54 17.91C9.63 17.26 9.89 16.82 10.17 16.57C7.96 16.32 5.64 15.47 5.64 11.66C5.64 10.57 6.03 9.68 6.67 8.98C6.57 8.73 6.23 7.72 6.77 6.35C6.77 6.35 7.61 6.08 9.52 7.37C10.32 7.15 11.17 7.04 12.01 7.04C12.85 7.04 13.7 7.15 14.5 7.37C16.41 6.08 17.25 6.35 17.25 6.35C17.79 7.72 17.45 8.73 17.35 8.98C17.99 9.68 18.38 10.57 18.38 11.66C18.38 15.48 16.05 16.31 13.84 16.56C14.19 16.86 14.52 17.48 14.52 18.43V21C14.52 21.28 14.68 21.59 15.19 21.49C19.14 20.16 22 16.42 22 12C22 6.477 17.52 2 12 2Z"
          fill="#F0F6FC"
        />
      </svg>
    );
  }

  // Windows Terminal / Terminal / wt
  if (titleLower.includes('terminal') || titleLower === 'wt') {
    return (
      <div className="w-full h-full rounded-none bg-neutral-900 border border-neutral-700 flex items-center justify-center">
        <Terminal className="w-3.5 h-3.5 text-neutral-200" />
      </div>
    );
  }

  // PowerShell
  if (titleLower.includes('powershell') || titleLower.includes('pwsh')) {
    return (
      <div className="w-full h-full rounded-none bg-blue-900 border border-blue-700 flex items-center justify-center font-mono font-bold text-[10px] text-white">
        &gt;_
      </div>
    );
  }

  // Command Prompt (CMD)
  if (titleLower === 'cmd' || titleLower.includes('command prompt')) {
    return (
      <div className="w-full h-full rounded-none bg-black border border-neutral-700 flex items-center justify-center font-mono font-bold text-[9px] text-neutral-200">
        C:\
      </div>
    );
  }

  // Spotify
  if (titleLower.includes('spotify')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1ED760" />
        <path d="M7 9C10.5 7.8 15 8.2 17.5 9.8" stroke="#121212" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7.5 12C10.5 11 14.5 11.4 16.5 12.8" stroke="#121212" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 15C10.5 14.2 13.5 14.5 15.5 15.5" stroke="#121212" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  // Discord
  if (titleLower.includes('discord')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#5865F2" />
        <path
          d="M18 7C16.8 6.5 15.6 6.1 14.3 6C14.1 6.3 14 6.7 13.8 7C12.6 6.8 11.4 6.8 10.2 7C10 6.7 9.9 6.3 9.7 6C8.4 6.1 7.2 6.5 6 7C4 10 3.5 13 3.8 16C5.2 17 6.6 17.6 8 18C8.3 17.6 8.6 17.1 8.9 16.6C8.4 16.4 7.9 16.2 7.5 15.9C7.6 15.8 7.7 15.7 7.8 15.6C10.5 16.9 13.5 16.9 16.2 15.6C16.3 15.7 16.4 15.8 16.5 15.9C16.1 16.2 15.6 16.4 15.1 16.6C15.4 17.1 15.7 17.6 16 18C17.4 17.6 18.8 17 20.2 16C20.6 12.5 19.5 9.5 18 7ZM8.5 14C7.7 14 7 13.3 7 12.5C7 11.7 7.7 11 8.5 11C9.3 11 10 11.7 10 12.5C10 13.3 9.3 14 8.5 14ZM15.5 14C14.7 14 14 13.3 14 12.5C14 11.7 14.7 11 15.5 11C16.3 11 17 11.7 17 12.5C17 13.3 16.3 14 15.5 14Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Telegram
  if (titleLower.includes('telegram')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#229ED9" />
        <path d="M6 12L18 7L15 17L11 13.5L9.5 15L9 12.5L15 8.5L8.5 12.5L6 12Z" fill="#FFFFFF" />
      </svg>
    );
  }

  // WhatsApp
  if (titleLower.includes('whatsapp')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#25D366" />
        <path d="M17.5 14.4c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.8.9-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.8-1.1-.7-.6-1.1-1.3-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.2.3-.4.1-.1.1-.2.2-.3 0-.1 0-.2 0-.3s-.5-1.2-.7-1.6c-.2-.4-.4-.3-.5-.3h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.7.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.5-.3z" fill="white" />
      </svg>
    );
  }

  // Antigravity IDE
  if (titleLower.includes('antigravity')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1E293B" />
        <path d="M12 4l3 7h-6l3-7zm0 16l-3-7h6l-3 7z" fill="#38BDF8" />
        <circle cx="12" cy="12" r="2.5" fill="#F59E0B" />
      </svg>
    );
  }

  // UniGetUI
  if (titleLower.includes('uniget')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#3B82F6" />
        <path d="M7 8l5-3 5 3v8l-5 3-5-3V8z" stroke="white" strokeWidth="1.8" fill="none" />
        <path d="M12 5v14M7 8l10 6M17 8L7 14" stroke="white" strokeWidth="1.5" />
      </svg>
    );
  }

  // MATLAB
  if (titleLower.includes('matlab')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M3 17c3-1 5-9 8-9s3 12 6 12 4-5 4-5" stroke="#ED5C2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Android Studio
  if (titleLower.includes('android studio')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#3DDC84" />
        <circle cx="8.5" cy="9.5" r="1.5" fill="#073042" />
        <circle cx="15.5" cy="9.5" r="1.5" fill="#073042" />
        <path d="M6 14h12M9 5l-2-2M15 5l2-2" stroke="#073042" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // Detroit: Become Human
  if (titleLower.includes('detroit')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#00B4D8" strokeWidth="2.5" fill="#0B132B" />
        <path d="M8 8l8 8M16 8l-8 8" stroke="#00B4D8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Microsoft Edge
  if (titleLower.includes('edge')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#0078D7" />
        <path d="M12 4C15 4 18 6 18 9C18 12 15 13 12 13C9 13 7 15 7 17C7 19 9 20 12 20C16 20 19 17 19 14" stroke="#00C7F2" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Slack
  if (titleLower.includes('slack')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#4A154B" />
        <circle cx="8" cy="8" r="2" fill="#E01E5A" />
        <circle cx="16" cy="8" r="2" fill="#36C5F0" />
        <circle cx="8" cy="16" r="2" fill="#2EB67D" />
        <circle cx="16" cy="16" r="2" fill="#ECB22E" />
      </svg>
    );
  }

  // Notion
  if (titleLower.includes('notion')) {
    return (
      <div className="w-full h-full rounded-none bg-neutral-900 border border-neutral-700 flex items-center justify-center font-serif font-black text-xs text-white">
        N
      </div>
    );
  }

  // Figma
  if (titleLower.includes('figma')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="7" y="3" width="5" height="5" rx="2.5" fill="#F24E1E" />
        <rect x="12" y="3" width="5" height="5" rx="2.5" fill="#FF7262" />
        <rect x="7" y="8" width="5" height="5" rx="2.5" fill="#A259FF" />
        <circle cx="14.5" cy="10.5" r="2.5" fill="#1ABCFE" />
        <rect x="7" y="13" width="5" height="5" rx="2.5" fill="#0ACF83" />
      </svg>
    );
  }

  // Steam
  if (titleLower.includes('steam')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#171A21" />
        <circle cx="12" cy="12" r="9" stroke="#66C0F4" strokeWidth="1.5" />
        <circle cx="15.5" cy="8.5" r="3" fill="#66C0F4" />
        <circle cx="8.5" cy="15.5" r="2" fill="#66C0F4" />
        <line x1="13" y1="10" x2="9.5" y2="14" stroke="#66C0F4" strokeWidth="2" />
      </svg>
    );
  }

  // Docker
  if (titleLower.includes('docker')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#0db7ed" />
        <path d="M5 14H19C19 17 16 19 12 19C7 19 5 16 5 14Z" fill="#FFFFFF" />
        <rect x="7" y="10" width="2" height="3" fill="#FFFFFF" />
        <rect x="10" y="10" width="2" height="3" fill="#FFFFFF" />
        <rect x="13" y="10" width="2" height="3" fill="#FFFFFF" />
        <rect x="10" y="7" width="2" height="2.5" fill="#FFFFFF" />
      </svg>
    );
  }

  // Microsoft Word / Excel / PowerPoint / Teams / Outlook
  if (titleLower.includes('word')) {
    return (
      <div className="w-full h-full rounded-none bg-blue-600 flex items-center justify-center font-bold text-[11px] text-white">
        W
      </div>
    );
  }
  if (titleLower.includes('excel')) {
    return (
      <div className="w-full h-full rounded-none bg-emerald-600 flex items-center justify-center font-bold text-[11px] text-white">
        X
      </div>
    );
  }
  if (titleLower.includes('powerpoint')) {
    return (
      <div className="w-full h-full rounded-none bg-rose-600 flex items-center justify-center font-bold text-[11px] text-white">
        P
      </div>
    );
  }
  if (titleLower.includes('teams')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="0" fill="#5059C9" />
        <circle cx="15.5" cy="8.5" r="2.5" fill="white" />
        <path d="M13 13h5a3 3 0 0 1 3 3v2h-8v-5z" fill="white" />
        <rect x="3" y="7" width="9" height="11" rx="0" fill="#7B83EB" />
        <text x="5.5" y="15.5" fill="white" fontWeight="bold" fontSize="9" fontFamily="sans-serif">T</text>
      </svg>
    );
  }

  // Obsidian
  if (titleLower.includes('obsidian')) {
    return (
      <div className="w-full h-full rounded-none bg-purple-950 border border-purple-600 flex items-center justify-center font-bold text-[11px] text-purple-300">
        ◆
      </div>
    );
  }

  // VLC media player
  if (titleLower.includes('vlc')) {
    return (
      <div className="w-full h-full rounded-none bg-amber-600 flex items-center justify-center font-bold text-xs text-white">
        ▲
      </div>
    );
  }

  // Task Manager
  if (titleLower.includes('task manager') || titleLower.includes('taskmgr')) {
    return <Activity className={`${className} text-emerald-400`} />;
  }

  // File Explorer
  if (titleLower.includes('explorer')) {
    return <Folder className={`${className} text-amber-400`} />;
  }

  // Notepad
  if (titleLower.includes('notepad')) {
    return <FileText className={`${className} text-sky-400`} />;
  }

  // Generic Web Browser / URL link
  if (titleLower.includes('browser') || actionLower.startsWith('http')) {
    return <Globe className={`${className} text-blue-400`} />;
  }

  // Category-specific fallbacks if not app
  if (item.category === 'clipboard') {
    return <ClipboardList className={`${className} text-amber-400`} />;
  }
  if (item.category === 'file') {
    return <FileText className={`${className} text-emerald-400`} />;
  }
  if (item.category === 'command') {
    return <Terminal className={`${className} text-raycast-brand`} />;
  }

  // 4. Default Dynamic Monogram Badge for any other application
  // Generates a distinctive, harmonic gradient based on the application's name
  const getGradientForName = (name: string) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-violet-500 to-purple-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-cyan-500 to-blue-600',
      'from-fuchsia-500 to-rose-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  const initial = item.title.trim().charAt(0).toUpperCase() || 'A';
  const gradient = getGradientForName(item.title);

  return (
    <div
      className={`w-full h-full rounded-none bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white text-[11px] shadow-sm tracking-tight`}
    >
      {initial}
    </div>
  );
};
