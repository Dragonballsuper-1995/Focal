import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { SearchResult, FocalConfig, RunnerConfig, ClipboardItem, SnippetItem, FileResult } from '@/types';

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Fallback mock items for headless unit testing & browser preview
export const MOCK_SEARCH_ITEMS: SearchResult[] = [
  {
    id: 'cmd-clipboard',
    title: 'Clipboard History',
    subtitle: 'Search and paste recent clipboard items',
    category: 'command',
    action: 'view:clipboard',
    score: 100.0,
  },
  {
    id: 'cmd-snippets',
    title: 'Snippets',
    subtitle: 'Create and expand text snippets with triggers',
    category: 'command',
    action: 'view:snippets',
    score: 95.0,
  },
  {
    id: 'cmd-files',
    title: 'Search Files',
    subtitle: 'Find documents and folders instantly on disk',
    category: 'command',
    action: 'view:files',
    score: 90.0,
  },
  {
    id: 'app-terminal',
    title: 'Windows Terminal',
    subtitle: 'wt.exe',
    category: 'app',
    action: 'launch:wt.exe',
    score: 85.0,
  },
  {
    id: 'cmd-settings',
    title: 'Settings',
    subtitle: 'Configure hotkeys, theme, and search preferences',
    category: 'setting',
    action: 'view:settings',
    score: 80.0,
  },
];

export async function searchItems(query: string): Promise<SearchResult[]> {
  if (isTauri()) {
    return await invoke<SearchResult[]>('search_items', { query });
  }
  if (!query.trim()) return MOCK_SEARCH_ITEMS;
  const q = query.toLowerCase();
  return MOCK_SEARCH_ITEMS.filter(
    (i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q)
  );
}

export async function launchItem(id: string, itemType: string, target: string): Promise<void> {
  if (isTauri()) {
    return await invoke<void>('launch_item', { id, itemType, target });
  }
  console.log(`[IPC Mock] launchItem: id=${id}, itemType=${itemType}, target=${target}`);
}

export async function hideWindow(): Promise<void> {
  if (isTauri()) {
    return await invoke<void>('hide_window');
  }
  console.log('[IPC Mock] hideWindow');
}

export async function showWindow(): Promise<void> {
  if (isTauri()) {
    return await invoke<void>('show_window');
  }
  console.log('[IPC Mock] showWindow');
}

export async function searchFiles(
  query: string,
  directories: string[] = []
): Promise<FileResult[]> {
  if (isTauri()) {
    return await invoke<FileResult[]>('search_files', { query, directories });
  }
  return [
    {
      path: 'C:\\Users\\User\\Documents\\Project_Specification.pdf',
      file_name: 'Project_Specification.pdf',
      extension: 'pdf',
      size_bytes: 1048576,
      modified_at: Math.floor(Date.now() / 1000) - 3600,
    },
    {
      path: 'C:\\Users\\User\\Documents\\Budget_2026.xlsx',
      file_name: 'Budget_2026.xlsx',
      extension: 'xlsx',
      size_bytes: 524288,
      modified_at: Math.floor(Date.now() / 1000) - 86400,
    },
    {
      path: 'C:\\Users\\User\\Projects\\Focal\\README.md',
      file_name: 'README.md',
      extension: 'md',
      size_bytes: 4096,
      modified_at: Math.floor(Date.now() / 1000),
    },
  ];
}

export async function getSettings(): Promise<RunnerConfig> {
  if (isTauri()) {
    return await invoke<RunnerConfig>('get_settings');
  }
  return {
    theme: 'dark',
    global_hotkey: 'Shift+Alt+Space',
    fallback_hotkey: 'Ctrl+Alt+Space',
    max_clipboard_items: 500,
    auto_paste_on_select: true,
    search_directories: ['C:\\Users'],
    snippet_expansion_enabled: true,
  };
}

export async function getClipboardHistory(
  query?: string,
  limit?: number
): Promise<ClipboardItem[]> {
  if (isTauri()) {
    return await invoke<ClipboardItem[]>('get_clipboard_history', { query, limit });
  }
  return [
    {
      id: 1,
      content: 'https://github.com/tauri-apps/tauri',
      source_app: 'Arc',
      created_at: new Date().toISOString(),
      copy_count: 3,
      pinned: true,
    },
    {
      id: 2,
      content: 'git commit -m "feat: clean-room Raycast clone"',
      source_app: 'Windows Terminal',
      created_at: new Date().toISOString(),
      copy_count: 1,
      pinned: false,
    },
    {
      id: 3,
      content: 'SELECT * FROM clipboard_entries ORDER BY updated_at DESC;',
      source_app: 'DBeaver',
      created_at: new Date().toISOString(),
      copy_count: 2,
      pinned: false,
    },
  ];
}

export async function copyToClipboard(content: string, autoPaste: boolean = false): Promise<void> {
  if (isTauri()) {
    return await invoke<void>('copy_to_clipboard', { content, autoPaste });
  }
  console.log('[IPC Mock] copyToClipboard', content, 'autoPaste:', autoPaste);
}

export async function clearClipboardHistory(): Promise<number> {
  if (isTauri()) {
    return await invoke<number>('clear_clipboard_history');
  }
  return 0;
}

export async function getSnippets(): Promise<SnippetItem[]> {
  if (isTauri()) {
    return await invoke<SnippetItem[]>('get_snippets');
  }
  return [
    {
      id: 1,
      title: 'Current Date',
      keyword: '!date',
      text: 'Today is {date}',
      copy_count: 5,
      pinned: true,
    },
    {
      id: 2,
      title: 'UUID Generator',
      keyword: '!uuid',
      text: '{uuid}',
      copy_count: 12,
      pinned: false,
    },
    {
      id: 3,
      title: 'Email Signature',
      keyword: '!sig',
      text: 'Best regards,\nFocal Team\nSent on {datetime}',
      copy_count: 4,
      pinned: false,
    },
  ];
}

export async function saveSnippet(snippet: SnippetItem): Promise<number> {
  if (isTauri()) {
    return await invoke<number>('save_snippet', { snippet });
  }
  return 1;
}

export async function deleteSnippet(id: number): Promise<void> {
  if (isTauri()) {
    return await invoke<void>('delete_snippet', { id });
  }
}

export async function expandSnippet(id: number): Promise<string> {
  if (isTauri()) {
    return await invoke<string>('expand_snippet', { id });
  }
  return 'Expanded snippet content';
}

export async function updateSettings(settings: FocalConfig): Promise<void> {
  if (isTauri()) {
    return await invoke<void>('update_settings', { settings });
  }
  console.log('[IPC Mock] updateSettings', settings);
}

export async function subscribeLauncherEvents(
  onShow: () => void,
  onHide: () => void
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }
  try {
    const unlistenShow = await listen('launcher-shown', () => onShow());
    const unlistenHide = await listen('launcher-hidden', () => onHide());
    return () => {
      unlistenShow();
      unlistenHide();
    };
  } catch (e) {
    console.warn('[IPC] Event subscription fallback:', e);
    return () => {};
  }
}

