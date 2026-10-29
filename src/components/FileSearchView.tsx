import { useState, useEffect, useCallback } from 'react';
import type { FileResult } from '@/types';
import { searchFiles, launchItem } from '@/services/ipc';
import { FolderSearch, File, ExternalLink, X } from 'lucide-react';

interface FileSearchViewProps {
  onBack: () => void;
}

export function FileSearchView({ onBack }: FileSearchViewProps) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FileResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setFiles([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchFiles(q);
      setFiles(results);
      setSelectedIndex(0);
    } catch (e) {
      console.error('File search failed:', e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const selectedFile = files[selectedIndex];

  const handleOpen = useCallback((file: FileResult) => {
    launchItem(file.path, 'file', file.path);
  }, []);

  const handleReveal = useCallback((file: FileResult) => {
    launchItem(file.path, 'reveal', file.path);
  }, []);

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
        setSelectedIndex((prev) => Math.min(prev + 1, files.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedFile) {
          handleOpen(selectedFile);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files.length, selectedFile, handleOpen, onBack]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

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
          <FolderSearch className="w-3 h-3" />
          <span>File Search</span>
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
          placeholder="Search files and folders on your computer..."
          className="flex-1 bg-transparent font-mono text-xs uppercase text-[var(--text-main)] placeholder-neutral-500 focus:outline-none tracking-wider font-medium"
          autoFocus
        />

        <div className="flex items-center gap-2">
          {isSearching && (
            <span className="text-[10px] text-[var(--sys-accent)] animate-pulse font-mono">
              SEARCHING...
            </span>
          )}
          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-neutral-500 font-mono select-none">
            ESC
          </span>
        </div>
      </div>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Files List */}
        <div className="w-3/5 border-r border-[var(--hud-border-grid)] overflow-y-auto p-2 space-y-1">
          {files.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-xs">
              {query.trim() ? 'No files match your search' : 'Type to search local documents and files'}
            </div>
          ) : (
            files.map((file, idx) => {
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedIndex(idx)}
                  onDoubleClick={() => handleOpen(file)}
                  className={`p-2.5 rounded-md cursor-pointer transition-all flex items-center gap-2.5 border ${
                    isSel
                      ? 'bg-[var(--sys-accent)] text-black border-[var(--sys-accent)] font-semibold shadow-sm'
                      : 'bg-[var(--hud-bg-card)] text-[var(--text-main)] border-[var(--hud-border-outer)] hover:bg-[var(--hud-bg-panel)]'
                  }`}
                >
                  <File className={`w-4 h-4 shrink-0 ${isSel ? 'text-black' : 'text-[var(--text-muted)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs truncate ${isSel ? 'text-black font-bold' : 'text-[var(--text-main)]'}`}>
                      {file.file_name}
                    </div>
                    <div className={`text-[10px] truncate font-mono ${isSel ? 'text-neutral-900' : 'text-[var(--text-dim)]'}`}>
                      {file.path}
                    </div>
                  </div>
                  <div className={`text-[9.5px] font-mono shrink-0 ${isSel ? 'text-neutral-900' : 'text-[var(--text-dim)]'}`}>
                    {formatSize(file.size_bytes)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: File details & actions */}
        <div className="w-2/5 p-4 flex flex-col bg-[var(--hud-bg-panel)] overflow-y-auto">
          {selectedFile ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--hud-border-grid)] mb-3">
                <File className="w-4 h-4 text-[var(--sys-accent)]" />
                <span className="text-xs font-bold text-[var(--text-main)] truncate">
                  {selectedFile.file_name}
                </span>
              </div>
              <div className="space-y-3 flex-1 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase block mb-1">Target Path</span>
                  <p className="font-mono text-[11px] bg-[var(--hud-bg-card)] p-2 rounded border border-[var(--hud-border-outer)] text-[var(--text-main)] break-all select-text">
                    {selectedFile.path}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase block mb-0.5">Size</span>
                    <p className="font-mono text-[11px] text-[var(--text-main)]">{formatSize(selectedFile.size_bytes)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase block mb-0.5">Type</span>
                    <p className="font-mono text-[11px] text-[var(--text-main)] uppercase">{selectedFile.extension || 'FILE'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--hud-border-grid)] flex items-center gap-2">
                <button
                  onClick={() => handleOpen(selectedFile)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--sys-accent)] text-black rounded transition-opacity hover:opacity-90 font-mono"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  OPEN (ENTER)
                </button>
                <button
                  onClick={() => handleReveal(selectedFile)}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-[var(--keycap-bg)] border border-[var(--keycap-border)] text-[var(--text-main)] hover:border-[var(--sys-accent)] transition-colors"
                >
                  REVEAL
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-dim)] text-xs">
              Select a file to inspect
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
          <span className="text-[var(--sys-accent)] font-bold">[FILES]</span> {files.length} MATCHES
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <kbd className="hud-key">[ENTER]</kbd> OPEN
          </span>
          <span className="flex items-center gap-1">
            <kbd className="hud-key">[ESC]</kbd> BACK
          </span>
        </div>
      </div>
    </div>
  );
}
