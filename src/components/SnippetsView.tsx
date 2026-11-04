import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SnippetItem } from '@/types';
import { getSnippets, saveSnippet, deleteSnippet, expandSnippet, copyToClipboard } from '@/services/ipc';
import { FileText, Plus, Trash2, Check, Sparkles, Pin, X } from 'lucide-react';
import { FocalLogo } from './FocalLogo';

interface SnippetsViewProps {
  onBack: () => void;
}

export function SnippetsView({ onBack }: SnippetsViewProps) {
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const activeSnippetRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editKeyword, setEditKeyword] = useState('');
  const [editText, setEditText] = useState('');

  const loadSnippets = useCallback(async () => {
    try {
      const list = await getSnippets();
      setSnippets(list);
      setSelectedIndex(0);
    } catch (e) {
      console.error('Failed to load snippets:', e);
    }
  }, []);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const filteredSnippets = useMemo(() => {
    if (!query.trim()) return snippets;
    const lower = query.toLowerCase();
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.keyword.toLowerCase().includes(lower) ||
        s.text.toLowerCase().includes(lower)
    );
  }, [snippets, query]);

  const selectedSnippet = filteredSnippets[selectedIndex];

  const handleUseSnippet = useCallback(
    async (snippet: SnippetItem) => {
      if (snippet.id) {
        const expanded = await expandSnippet(snippet.id);
        await copyToClipboard(expanded, true);
        setCopiedId(snippet.id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    },
    []
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editText.trim()) return;

    await saveSnippet({
      title: editTitle.trim(),
      keyword: editKeyword.trim().startsWith('!') ? editKeyword.trim() : `!${editKeyword.trim()}`,
      text: editText,
      copy_count: 0,
      pinned: false,
    });

    setIsEditing(false);
    setEditTitle('');
    setEditKeyword('');
    setEditText('');
    loadSnippets();
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await deleteSnippet(id);
    loadSnippets();
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('input, button, [role="button"], a, kbd, textarea')) {
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
      if (isEditing) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsEditing(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredSnippets.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSnippet) {
          handleUseSnippet(selectedSnippet);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, filteredSnippets.length, selectedSnippet, handleUseSnippet, onBack]);

  useEffect(() => {
    activeSnippetRef.current?.scrollIntoView({ block: 'nearest' });
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
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>Snippets</span>
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
          placeholder="Search snippets by name or keyword..."
          className="flex-1 bg-transparent font-sans text-[13.5px] text-slate-100 placeholder:text-slate-400 focus:outline-none tracking-tight font-medium"
          autoFocus
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium bg-[#FF6B4A] hover:bg-[#FF5370] text-white rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Snippet
          </button>
          <kbd className="focal-key">
            Esc
          </kbd>
        </div>
      </div>

      {/* Main split view or create dialog */}
      {isEditing ? (
        <form onSubmit={handleSave} className="flex-1 min-h-0 p-6 flex flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-none bg-black/20">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-medium text-slate-100 tracking-tight">Create New Text Snippet</h3>
            <span className="text-[11px] text-slate-500 font-sans">Esc to Cancel</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. My Phone Number"
              className="w-full px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-xs text-slate-100 font-sans focus:outline-none focus:border-[#FF6B4A]/60 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Keyword Trigger (auto-prefixed with !)
            </label>
            <input
              type="text"
              value={editKeyword}
              onChange={(e) => setEditKeyword(e.target.value)}
              placeholder="e.g. phone"
              className="w-full px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#FF6B4A]/60 transition-colors"
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Snippet Content (Placeholders: {'{date}'}, {'{time}'}, {'{uuid}'}, {'{clipboard}'}, {'{cursor}'})
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Hello, today is {date}..."
              className="flex-1 min-h-[120px] px-3.5 py-2.5 bg-black/30 border border-white/[0.08] rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-[#FF6B4A]/60 transition-colors resize-none"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#FF6B4A] hover:bg-[#FF5370] text-white rounded-lg shadow-sm transition-all"
            >
              Save Snippet
            </button>
          </div>
        </form>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: Snippet list */}
          <div className="w-1/2 min-h-0 border-r border-white/[0.06] overflow-y-auto overflow-x-hidden overscroll-none p-2.5 space-y-1">
            {filteredSnippets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-sans">
                No snippets found. Click &ldquo;New Snippet&rdquo; to create one.
              </div>
            ) : (
              filteredSnippets.map((snippet, idx) => {
                const isSel = idx === selectedIndex;
                return (
                  <div
                    key={snippet.id || idx}
                    ref={isSel ? activeSnippetRef : undefined}
                    onClick={() => setSelectedIndex(idx)}
                    onDoubleClick={() => handleUseSnippet(snippet)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-colors duration-100 border ${
                      isSel
                        ? 'bg-white/[0.07] border-white/[0.08] text-white shadow-sm'
                        : 'bg-white/[0.02] text-slate-300 border-white/[0.04] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] font-sans">
                      {snippet.pinned && <Pin className="w-3 h-3 text-[#FFA06A] fill-[#FFA06A]" />}
                      <span className="font-medium truncate text-slate-200">
                        {snippet.title}
                      </span>
                      {snippet.keyword && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ml-auto bg-[#FF6B4A]/10 text-[#FF8566] border border-[#FF6B4A]/25">
                          {snippet.keyword}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-mono line-clamp-1 truncate ${isSel ? 'text-slate-100' : 'text-slate-400'}`}>
                      {snippet.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Preview & Actions */}
          <div className="w-1/2 min-h-0 p-4 flex flex-col bg-black/20 overflow-y-auto">
            {selectedSnippet ? (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] mb-3">
                  <div>
                    <h4 className="text-xs font-medium text-slate-100">{selectedSnippet.title}</h4>
                    <span className="text-[11px] text-[#FF8566] font-mono font-medium">
                      {selectedSnippet.keyword}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(selectedSnippet.id)}
                      title="Delete Snippet"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] border border-transparent transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUseSnippet(selectedSnippet)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 text-xs font-medium transition-all shadow-sm"
                    >
                      {copiedId === selectedSnippet.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pasted</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Expand</span>
                          <kbd className="focal-key text-[9px] h-4">↵</kbd>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <span className="text-[10.5px] font-medium text-slate-400 mb-1.5">Template Content</span>
                  <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-xl text-xs font-mono text-slate-200 whitespace-pre-wrap break-all flex-1 select-text overflow-y-auto shadow-inner">
                    {selectedSnippet.text}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-sans">
                Select a snippet to inspect and expand
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dock Footer */}
      <div
        className="flex items-center justify-between h-9 px-4 bg-[var(--surface-base)] border-t border-white/[0.06] text-xs font-sans text-slate-400 select-none shrink-0"
      >
        <span className="text-xs flex items-center gap-1.5">
          <span>Snippets</span>
          <span className="text-slate-600">•</span>
          <span>{filteredSnippets.length} templates</span>
        </span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <kbd className="focal-key">↵</kbd> Expand
          </span>
          <span className="flex items-center gap-1">
            <kbd className="focal-key">Esc</kbd> Back
          </span>
        </div>
      </div>
    </div>
  );
}

export default SnippetsView;
