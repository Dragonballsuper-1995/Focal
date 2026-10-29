import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ClipboardItem } from '@/types';
import { getClipboardHistory, copyToClipboard, clearClipboardHistory } from '@/services/ipc';
import { Clipboard, Pin, Trash2, Check, Clock, X } from 'lucide-react';

interface ClipboardViewProps {
  onBack: () => void;
}

export function ClipboardView({ onBack }: ClipboardViewProps) {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadItems = useCallback(async (q?: string) => {
    try {
      const history = await getClipboardHistory(q);
      setItems(history);
      setSelectedIndex(0);
    } catch (e) {
      console.error('Failed to load clipboard history:', e);
    }
  }, []);

  useEffect(() => {
    loadItems(query);
  }, [query, loadItems]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter((i) => i.content.toLowerCase().includes(lower));
  }, [items, query]);

  const selectedItem = filteredItems[selectedIndex];

  const handleCopy = useCallback(
    async (item: ClipboardItem, autoPaste: boolean = false) => {
      await copyToClipboard(item.content, autoPaste);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    },
    []
  );

  const handleClear = useCallback(async () => {
    await clearClipboardHistory();
    loadItems();
  }, [loadItems]);

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('input, button, [role="button"], a, kbd')) {
      e.preventDefault();
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().startDragging();
      } catch {
        // Fallback for tests
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedItem) {
          handleCopy(selectedItem, true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems.length, selectedItem, handleCopy, onBack]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--hud-bg-base)] text-[var(--text-main)] font-mono overflow-hidden select-none">
      {/* Top Search Bar */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center h-12 px-4 border-b border-[var(--hud-border-grid)] bg-[var(--hud-bg-base)] gap-3 shrink-0 backdrop-blur-xl cursor-default"
      >
        <span className="text-[var(--sys-accent)] font-bold text-base select-none pointer-events-none">&gt;</span>
        
        {/* Breadcrumb pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--sys-accent-muted)] text-[var(--sys-accent)] border border-[var(--sys-accent-border)] text-[10px] font-mono font-bold shrink-0">
          <Clipboard className="w-3 h-3" />
          <span>Clipboard History</span>
          <button
            type="button"
            onClick={onBack}
            className="hover:opacity-75 rounded p-0.5 transition-opacity"
            title="Return (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clipboard history..."
          className="flex-1 bg-transparent font-mono text-xs uppercase text-[var(--text-main)] placeholder-neutral-500 focus:outline-none tracking-wider font-medium"
          autoFocus
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            title="Clear History"
            className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-[var(--hud-bg-card)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-neutral-500 font-mono select-none">
            ESC
          </span>
        </div>
      </div>

      {/* Main split view: items list on left, preview on right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: List */}
        <div className="w-1/2 border-r border-[var(--hud-border-grid)] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-xs">
              No clipboard items found
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedIndex(idx)}
                  onDoubleClick={() => handleCopy(item, true)}
                  className={`p-2.5 rounded-md cursor-pointer transition-all border ${
                    isSel
                      ? 'bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-semibold shadow-sm'
                      : 'bg-[var(--hud-bg-card)] text-[var(--text-main)] border-[var(--hud-border-outer)] hover:bg-[var(--hud-bg-panel)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                    {item.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    <span className={isSel ? 'text-neutral-900 font-bold' : 'text-[var(--text-dim)]'}>
                      [{item.source_app || 'TEXT'}]
                    </span>
                    <span className={`ml-auto flex items-center gap-1 ${isSel ? 'text-neutral-800' : 'text-[var(--text-dim)]'}`}>
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={`text-xs font-mono line-clamp-2 break-all ${isSel ? 'text-black' : 'text-[var(--text-main)]'}`}>
                    {item.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="w-1/2 p-4 flex flex-col bg-[var(--hud-bg-panel)] overflow-y-auto">
          {selectedItem ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--hud-border-grid)] mb-3 text-[10px]">
                <span className="text-[var(--text-muted)]">
                  LENGTH: {selectedItem.content.length} CHARS
                </span>
                <button
                  onClick={() => handleCopy(selectedItem, false)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-[var(--text-main)] hover:border-[var(--sys-accent)] transition-colors text-[10px]"
                >
                  {copiedId === selectedItem.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      COPIED!
                    </>
                  ) : (
                    'COPY (ENTER)'
                  )}
                </button>
              </div>
              <pre className="flex-1 text-xs font-mono text-[var(--text-main)] whitespace-pre-wrap break-all select-text overflow-y-auto">
                {selectedItem.content}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-dim)] text-xs">
              Select an item to preview
            </div>
          )}
        </div>
      </div>

      {/* Dock Footer */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center justify-between h-9 px-4 bg-[var(--hud-bg-base)] border-t border-[var(--hud-border-grid)] text-xs font-mono text-[var(--text-muted)] select-none shrink-0"
      >
        <span className="text-[11px]">
          <span className="text-[var(--sys-accent)] font-bold">[CLIPBOARD]</span> {filteredItems.length} ENTRIES
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <kbd className="hud-key">[ENTER]</kbd> PASTE
          </span>
          <span className="flex items-center gap-1">
            <kbd className="hud-key">[ESC]</kbd> BACK
          </span>
        </div>
      </div>
    </div>
  );
}
