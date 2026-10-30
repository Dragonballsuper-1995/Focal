import { describe, it, expect } from 'vitest';
import type { SearchResult, RunnerConfig, ClipboardItem, SnippetItem, FileResult } from '@/types';

describe('Frontend Scaffolding & DTO Contract Verification', () => {
  it('instantiates SearchResult conforming to Section 6.3.B', () => {
    const item: SearchResult = {
      id: 'app-vscode',
      title: 'Visual Studio Code',
      subtitle: 'C:\\Program Files\\VSCode\\code.exe',
      category: 'app',
      icon: 'code',
      action: 'launch',
      score: 0.99,
    };
    expect(item.id).toBe('app-vscode');
    expect(item.category).toBe('app');
    expect(item.score).toBeGreaterThan(0.9);
  });

  it('instantiates ClipboardItem conforming to Section 6.3.B', () => {
    const clip: ClipboardItem = {
      id: 1,
      content: 'Hello, clean-room world!',
      source_app: 'notepad.exe',
      created_at: new Date().toISOString(),
      copy_count: 3,
      pinned: true,
    };
    expect(clip.id).toBe(1);
    expect(clip.copy_count).toBe(3);
    expect(clip.pinned).toBe(true);
  });

  it('instantiates SnippetItem conforming to Section 6.3.B', () => {
    const snippet: SnippetItem = {
      id: 101,
      title: 'Email Signature',
      keyword: '!sig',
      text: 'Best regards,\nFocal Team',
      copy_count: 12,
      pinned: false,
    };
    expect(snippet.keyword).toBe('!sig');
    expect(snippet.text).toContain('Focal Team');
  });

  it('instantiates FileResult conforming to Section 6.3.B', () => {
    const file: FileResult = {
      path: 'C:\\Projects\\Focal\\README.md',
      file_name: 'README.md',
      extension: 'md',
      size_bytes: 2048,
      modified_at: 1730112000,
    };
    expect(file.file_name).toBe('README.md');
    expect(file.size_bytes).toBe(2048);
  });

  it('instantiates RunnerConfig with two-tier hotkey fallback resilience', () => {
    const config: RunnerConfig = {
      theme: 'dark',
      global_hotkey: 'Alt+Space',
      fallback_hotkey: 'Ctrl+Alt+Space',
      max_clipboard_items: 500,
      auto_paste_on_select: true,
      search_directories: ['C:\\Users\\Default'],
      snippet_expansion_enabled: true,
    };
    expect(config.theme).toBe('dark');
    expect(config.global_hotkey).toBe('Alt+Space');
    expect(config.fallback_hotkey).toBe('Ctrl+Alt+Space');
    expect(config.max_clipboard_items).toBe(500);
  });
});

