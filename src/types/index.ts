/**
 * Shared TypeScript Data Transfer Objects (DTOs) for Focal
 * Grounded in Section 6.3.B of RAYCAST_WINDOWS_ARCHITECTURE_REPORT.md
 */

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'app' | 'command' | 'setting' | 'file' | 'clipboard';
  icon?: string;
  action: string;
  score: number;
  alias?: string;
  cluster?: string;
  publisher?: string;
  version?: string;
  source?: string;
  runtime?: string;
  actions?: string[];
}

export interface ClipboardItem {
  id: number;
  content: string;
  source_app?: string;
  created_at: string;
  copy_count: number;
  pinned: boolean;
}

export interface SnippetItem {
  id?: number;
  title: string;
  keyword: string;
  text: string;
  raw_content?: string;
  copy_count: number;
  pinned: boolean;
}

export interface FileResult {
  path: string;
  file_name: string;
  extension: string;
  size_bytes: number;
  modified_at: number;
}

export interface PinnedItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon?: string;
  action: string;
  alias?: string;
  cluster?: string;
  publisher?: string;
  version?: string;
  source?: string;
  runtime?: string;
  actions?: string[];
}

export type LayoutMode = 'hybrid' | 'list' | 'grid';

export interface RunnerConfig {
  theme: 'dark' | 'light' | 'system';
  global_hotkey: string;
  fallback_hotkey: string;
  max_clipboard_items: number;
  auto_paste_on_select: boolean;
  search_directories: string[];
  snippet_expansion_enabled: boolean;
  search_sensitivity?: 'low' | 'medium' | 'high';
  include_path_executables?: boolean;
  pinned_items?: PinnedItem[];
  // New Nordic HUD preferences
  layout_mode?: LayoutMode;
  preview_pane_enabled?: boolean;
  accent_color?: string;
}

export type FocalConfig = RunnerConfig;

export type ViewMode = 'root' | 'clipboard' | 'snippets' | 'files' | 'settings';

export type SearchCategory = SearchResult['category'];

/**
 * Strongly typed Tauri IPC Command definitions
 */
export interface TauriCommandMap {
  search_items: {
    args: { query: string };
    response: SearchResult[];
  };
  launch_item: {
    args: { id: string; itemType: string; target: string };
    response: void;
  };
  get_clipboard_history: {
    args: { query?: string; limit?: number };
    response: ClipboardItem[];
  };
  copy_to_clipboard: {
    args: { content: string; autoPaste: boolean };
    response: void;
  };
  clear_clipboard_history: {
    args: Record<string, never>;
    response: void;
  };
  get_snippets: {
    args: Record<string, never>;
    response: SnippetItem[];
  };
  save_snippet: {
    args: { snippet: SnippetItem };
    response: number;
  };
  delete_snippet: {
    args: { id: number };
    response: void;
  };
  expand_snippet: {
    args: { id: number };
    response: string;
  };
  search_files: {
    args: { query: string; directories: string[] };
    response: FileResult[];
  };
  get_settings: {
    args: Record<string, never>;
    response: RunnerConfig;
  };
  update_settings: {
    args: { settings: RunnerConfig };
    response: void;
  };
}
