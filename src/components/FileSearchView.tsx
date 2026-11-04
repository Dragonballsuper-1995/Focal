import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FileResult } from '@/types';
import { searchFiles, launchItem } from '@/services/ipc';
import { FolderSearch, File, ExternalLink, X } from 'lucide-react';
import { FocalLogo } from './FocalLogo';

interface FileSearchViewProps {
  onBack: () => void;
}

export function FileSearchView({ onBack }: FileSearchViewProps) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FileResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const activeFileRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    activeFileRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

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
          <FolderSearch className="w-3.5 h-3.5 text-slate-400" />
          <span>File Search</span>
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
          placeholder="Search files and folders on your computer..."
          className="flex-1 bg-transparent font-sans text-[13.5px] text-slate-100 placeholder:text-slate-400 focus:outline-none tracking-tight font-medium"
          autoFocus
        />

        <div className="flex items-center gap-2">
          {isSearching && (
            <span className="text-[11px] text-[#FF8566] animate-pulse font-sans font-medium">
              Searching...
            </span>
          )}
          <kbd className="focal-key">
            Esc
          </kbd>
        </div>
      </div>

      {/* Main split view */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Files List */}
        <div className="w-3/5 min-h-0 border-r border-white/[0.06] overflow-y-auto overflow-x-hidden overscroll-none p-2.5 space-y-1">
          {files.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-sans">
              {query.trim() ? 'No files match your search' : 'Type to search local documents and files'}
            </div>
          ) : (
            files.map((file, idx) => {
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={file.path}
                  ref={isSel ? activeFileRef : undefined}
                  onClick={() => setSelectedIndex(idx)}
                  onDoubleClick={() => handleOpen(file)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors duration-100 flex items-center gap-3 border ${
                    isSel
                      ? 'bg-white/[0.07] border-white/[0.08] text-white shadow-sm'
                      : 'bg-white/[0.02] text-slate-300 border-white/[0.04] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border bg-white/[0.05] border-white/[0.08] text-slate-300">
                    <File className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate text-slate-100">
                      {file.file_name}
                    </div>
                    <div className="text-[10.5px] truncate font-mono text-slate-400">
                      {file.path}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono shrink-0 text-slate-400">
                    {formatSize(file.size_bytes)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: File details & actions */}
        <div className="w-2/5 min-h-0 p-4 flex flex-col bg-black/20 overflow-y-auto">
          {selectedFile ? (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/[0.06] mb-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-slate-200">
                  <File className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-slate-100 truncate">
                  {selectedFile.file_name}
                </span>
              </div>
              <div className="space-y-3 flex-1 min-h-0 text-xs">
                <div>
                  <span className="text-[10.5px] font-medium text-slate-400 block mb-1">Target Path</span>
                  <p className="font-mono text-[11px] bg-black/30 p-2.5 rounded-xl border border-white/[0.06] text-slate-200 break-all select-text shadow-inner">
                    {selectedFile.path}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                    <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Size</span>
                    <p className="font-mono text-xs text-slate-200 font-medium">{formatSize(selectedFile.size_bytes)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                    <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Type</span>
                    <p className="font-mono text-xs text-[#FF8566] uppercase font-medium">{selectedFile.extension || 'FILE'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
                <button
                  onClick={() => handleOpen(selectedFile)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#FF6B4A] hover:bg-[#FF5370] text-white rounded-lg transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                  <kbd className="focal-key text-[9px] h-4">↵</kbd>
                </button>
                <button
                  onClick={() => handleReveal(selectedFile)}
                  className="px-3.5 py-2 text-xs font-sans font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 transition-all"
                >
                  Reveal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-sans">
              Select a file to inspect
            </div>
          )}
        </div>
      </div>

      {/* Dock Footer */}
      <div
        className="flex items-center justify-between h-9 px-4 bg-[var(--surface-base)] border-t border-white/[0.06] text-xs font-sans text-slate-400 select-none shrink-0"
      >
        <span className="text-xs flex items-center gap-1.5">
          <span>Files</span>
          <span className="text-slate-600">•</span>
          <span>{files.length} matches</span>
        </span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <kbd className="focal-key">↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="focal-key">Esc</kbd> Back
          </span>
        </div>
      </div>
    </div>
  );
}

export default FileSearchView;
