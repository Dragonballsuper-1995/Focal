import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SnippetItem } from '@/types';
import { getSnippets, saveSnippet, deleteSnippet, expandSnippet, copyToClipboard } from '@/services/ipc';
import { FileText, Plus, Trash2, Check, Sparkles, Pin, X } from 'lucide-react';

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
    <div className="flex-1 flex flex-col h-full bg-[var(--hud-bg-base)] text-[var(--text-main)] font-mono overflow-hidden select-none">
      {/* Top Search Bar */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center h-12 px-4 border-b border-[var(--hud-border-grid)] bg-[var(--hud-bg-base)] gap-3 shrink-0 backdrop-blur-xl cursor-default"
      >
        <span className="text-[var(--sys-accent)] font-bold text-base select-none pointer-events-none">&gt;</span>

        {/* Breadcrumb pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-[var(--sys-accent-muted)] text-[var(--sys-accent)] border border-[var(--sys-accent-border)] text-[10px] font-mono font-bold shrink-0">
          <FileText className="w-3 h-3" />
          <span>Snippets</span>
          <button
            type="button"
            onClick={onBack}
            className="hover:opacity-75 rounded-none p-0.5 transition-opacity"
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
          className="flex-1 bg-transparent font-mono text-xs uppercase text-[var(--text-main)] placeholder-neutral-500 focus:outline-none tracking-wider font-medium"
          autoFocus
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-[var(--sys-accent)] text-black rounded-none hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" />
            New Snippet
          </button>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded-none bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-neutral-500 font-mono select-none">
            ESC
          </span>
        </div>
      </div>

      {/* Main split view or create dialog */}
      {isEditing ? (
        <form onSubmit={handleSave} className="flex-1 min-h-0 p-6 flex flex-col gap-4 overflow-y-auto bg-[var(--hud-bg-panel)]">
          <div className="flex items-center justify-between border-b border-[var(--hud-border-grid)] pb-2">
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Create New Text Snippet</h3>
            <span className="text-[10px] text-[var(--text-dim)]">ESC to Cancel</span>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. My Phone Number"
              className="w-full px-3 py-1.5 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--sys-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
              Keyword Trigger (auto-prefixed with !)
            </label>
            <input
              type="text"
              value={editKeyword}
              onChange={(e) => setEditKeyword(e.target.value)}
              placeholder="e.g. phone"
              className="w-full px-3 py-1.5 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--sys-accent)]"
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
              Snippet Content (Placeholders: {'{date}'}, {'{time}'}, {'{uuid}'}, {'{clipboard}'}, {'{cursor}'})
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Hello, today is {date}..."
              className="flex-1 min-h-[120px] px-3 py-2 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--sys-accent)] resize-none"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-[var(--sys-accent)] text-black rounded-none font-mono hover:opacity-90"
            >
              Save Snippet
            </button>
          </div>
        </form>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: Snippet list */}
          <div className="w-1/2 min-h-0 border-r border-[var(--hud-border-grid)] overflow-y-auto p-2 space-y-1">
            {filteredSnippets.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)] text-xs">
                No snippets found. Click &ldquo;NEW&rdquo; to create one.
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
                    className={`p-2.5 rounded-none cursor-pointer transition-all border ${
                      isSel
                        ? 'bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-semibold shadow-sm'
                        : 'bg-[var(--hud-bg-card)] text-[var(--text-main)] border-[var(--hud-border-outer)] hover:bg-[var(--hud-bg-panel)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px]">
                      {snippet.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      <span className={`font-mono truncate ${isSel ? 'text-black font-bold' : 'text-[var(--text-main)]'}`}>
                        {snippet.title}
                      </span>
                      {snippet.keyword && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded-none font-mono ml-auto ${
                            isSel
                              ? 'bg-black text-[var(--sys-accent)] font-bold'
                              : 'bg-[var(--keycap-bg)] text-[var(--text-muted)]'
                          }`}
                        >
                          {snippet.keyword}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-mono line-clamp-1 truncate ${isSel ? 'text-neutral-900' : 'text-[var(--text-dim)]'}`}>
                      {snippet.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Preview & Actions */}
          <div className="w-1/2 min-h-0 p-4 flex flex-col bg-[var(--hud-bg-panel)] overflow-y-auto">
            {selectedSnippet ? (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--hud-border-grid)] mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-main)]">{selectedSnippet.title}</h4>
                    <span className="text-[10px] text-[var(--sys-accent)] font-mono font-bold">
                      {selectedSnippet.keyword}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(selectedSnippet.id)}
                      title="Delete Snippet"
                      className="p-1 rounded-none text-neutral-400 hover:text-red-400 hover:bg-[var(--hud-bg-card)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUseSnippet(selectedSnippet)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-black bg-[var(--sys-accent)] hover:opacity-90 rounded-none transition-opacity"
                    >
                      {copiedId === selectedSnippet.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-950" />
                          PASTED!
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          EXPAND (ENTER)
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <span className="text-[10px] font-bold text-[var(--text-dim)] mb-1 uppercase tracking-wider">RAW TEMPLATE</span>
                  <pre className="p-3 bg-[var(--hud-bg-card)] border border-[var(--hud-border-outer)] rounded-none text-xs font-mono text-[var(--text-main)] whitespace-pre-wrap break-all flex-1 select-text overflow-y-auto">
                    {selectedSnippet.text}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-dim)] text-xs">
                Select a snippet to inspect and expand
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dock Footer */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center justify-between h-9 px-4 bg-[var(--hud-bg-base)] border-t border-[var(--hud-border-grid)] text-xs font-mono text-[var(--text-muted)] select-none shrink-0"
      >
        <span className="text-[11px]">
          <span className="text-[var(--sys-accent)] font-bold">[SNIPPETS]</span> {filteredSnippets.length} TEMPLATES
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <kbd className="hud-key">[ENTER]</kbd> EXPAND
          </span>
          <span className="flex items-center gap-1">
            <kbd className="hud-key">[ESC]</kbd> BACK
          </span>
        </div>
      </div>
    </div>
  );
}
