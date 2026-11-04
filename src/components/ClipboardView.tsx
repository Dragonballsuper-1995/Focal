import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ClipboardItem } from '@/types';
import { getClipboardHistory, copyToClipboard, clearClipboardHistory } from '@/services/ipc';
import { Clipboard, Pin, Trash2, Check, Clock, X } from 'lucide-react';
import { FocalLogo } from './FocalLogo';

interface ClipboardViewProps {
  onBack: () => void;
}

export function ClipboardView({ onBack }: ClipboardViewProps) {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface-base)] text-slate-100 font-sans overflow-hidden select-none">
      {/* Top Search Bar */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center h-[52px] px-4 border-b border-white/[0.06] bg-[var(--surface-base)]/90 gap-3 shrink-0 backdrop-blur-2xl cursor-default transition-colors"
      >
        <div className="w-4 h-4 shrink-0 opacity-90">
          <FocalLogo className="w-full h-full" />
        </div>
        
        {/* Breadcrumb pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.07] text-slate-200 border border-white/[0.1] text-xs font-sans font-medium shrink-0 shadow-sm">
          <Clipboard className="w-3.5 h-3.5 text-slate-400" />
          <span>Clipboard History</span>
          <button
            type="button"
            onClick={onBack}
            className="hover:text-white rounded p-0.5 transition-colors text-slate-400"
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
          className="flex-1 bg-transparent font-sans text-[13.5px] text-slate-100 placeholder:text-slate-400 focus:outline-none tracking-tight font-medium"
          autoFocus
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            title="Clear History"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] border border-transparent transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <kbd className="focal-key">
            Esc
          </kbd>
        </div>
      </div>

      {/* Main split view: items list on left, preview on right */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: List */}
        <div className="w-1/2 min-h-0 border-r border-white/[0.06] overflow-y-auto overflow-x-hidden overscroll-none p-2.5 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-sans">
              No clipboard items found
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  ref={isSel ? activeItemRef : undefined}
                  onClick={() => setSelectedIndex(idx)}
                  onDoubleClick={() => handleCopy(item, true)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors duration-100 border ${
                    isSel
                      ? 'bg-white/[0.07] border-white/[0.08] text-white shadow-sm'
                      : 'bg-white/[0.02] text-slate-300 border-white/[0.04] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-sans">
                    {item.pinned && <Pin className="w-3 h-3 text-[#FFA06A] fill-[#FFA06A]" />}
                    <span className={`font-medium ${isSel ? 'text-slate-200' : 'text-slate-400'}`}>
                      {item.source_app || 'Text'}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={`text-xs font-mono line-clamp-2 break-all ${isSel ? 'text-slate-100 font-medium' : 'text-slate-300'}`}>
                    {item.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="w-1/2 min-h-0 p-4 flex flex-col bg-black/20 overflow-y-auto">
          {selectedItem ? (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] mb-3 text-xs font-sans">
                <span className="text-slate-400">
                  Length: <strong className="text-slate-200 font-medium">{selectedItem.content.length}</strong> chars
                </span>
                <button
                  onClick={() => handleCopy(selectedItem, false)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 text-xs font-medium transition-all shadow-sm"
                >
                  {copiedId === selectedItem.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <span>Copy</span>
                      <kbd className="focal-key text-[9px] h-4">↵</kbd>
                    </>
                  )}
                </button>
              </div>
              <pre className="flex-1 text-xs font-mono text-slate-200 whitespace-pre-wrap break-all select-text overflow-y-auto overflow-x-hidden overscroll-none p-3 rounded-xl bg-black/30 border border-white/[0.06] shadow-inner">
                {selectedItem.content}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-sans">
              Select an item to preview
            </div>
          )}
        </div>
      </div>

      {/* Dock Footer */}
      <div
        className="flex items-center justify-between h-9 px-4 bg-[var(--surface-base)] border-t border-white/[0.06] text-xs font-sans text-slate-400 select-none shrink-0"
      >
        <span className="text-xs flex items-center gap-1.5">
          <span>Clipboard History</span>
          <span className="text-slate-600">•</span>
          <span>{filteredItems.length} entries</span>
        </span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <kbd className="focal-key">↵</kbd> Paste
          </span>
          <span className="flex items-center gap-1">
            <kbd className="focal-key">Esc</kbd> Back
          </span>
        </div>
      </div>
    </div>
  );
}

export default ClipboardView;
