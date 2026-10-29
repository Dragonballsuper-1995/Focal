import { useState, useCallback, useEffect } from 'react';

export interface UseKeyboardNavOptions {
  totalItems: number;
  pinnedCount?: number;
  actionItemsCount?: number;
  onExecutePrimary?: (index: number) => void;
  onExecutePinned?: (pinnedIndex: number) => void;
  onExecuteAdmin?: (index: number) => void;
  onExecuteActionByIndex?: (actionIdx: number) => void;
  onExecuteActionById?: (actionId: string) => void;
  onToggleActionMenu?: () => void;
  onCloseActionMenu?: () => void;
  onResetView?: () => void;
  onClearQuery?: () => void;
  onHideWindow?: () => void;
  isActionMenuOpen?: boolean;
  viewMode?: string;
  hasQuery?: boolean;
}

export function useKeyboardNav({
  totalItems,
  pinnedCount = 0,
  actionItemsCount = 0,
  onExecutePrimary,
  onExecutePinned,
  onExecuteAdmin,
  onExecuteActionByIndex,
  onExecuteActionById,
  onToggleActionMenu,
  onCloseActionMenu,
  onResetView,
  onClearQuery,
  onHideWindow,
  isActionMenuOpen = false,
  viewMode = 'root',
  hasQuery = false,
}: UseKeyboardNavOptions) {
  const [activeSection, setActiveSection] = useState<'pinned' | 'results'>('results');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedPinnedIndex, setSelectedPinnedIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);

  // If query is present or no pinned items exist, force results section
  useEffect(() => {
    if (hasQuery || pinnedCount === 0) {
      setActiveSection('results');
    }
  }, [hasQuery, pinnedCount]);

  // Keep selected index bounded within range whenever totalItems changes
  useEffect(() => {
    if (totalItems === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= totalItems) {
      setSelectedIndex(totalItems - 1);
    }
  }, [totalItems, selectedIndex]);

  // Keep selected pinned index bounded
  useEffect(() => {
    if (pinnedCount === 0) {
      setSelectedPinnedIndex(0);
    } else if (selectedPinnedIndex >= pinnedCount) {
      setSelectedPinnedIndex(pinnedCount - 1);
    }
  }, [pinnedCount, selectedPinnedIndex]);

  // Reset action menu index when menu opens
  useEffect(() => {
    if (isActionMenuOpen) {
      setActionIndex(0);
    }
  }, [isActionMenuOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      // 1. Action Menu Toggle: Tab or Ctrl+K
      if (e.key === 'Tab' || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) {
        e.preventDefault();
        onToggleActionMenu?.();
        return;
      }

      // 2. Escape Hierarchy
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isActionMenuOpen) {
          onCloseActionMenu?.();
        } else if (viewMode !== 'root') {
          onResetView?.();
        } else if (hasQuery) {
          onClearQuery?.();
        } else {
          onHideWindow?.();
        }
        return;
      }

      // 3. If Action Menu is open, allow direct execution via shortcuts or navigation
      if (isActionMenuOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (actionItemsCount > 0) {
            setActionIndex((prev) => (prev + 1) % actionItemsCount);
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (actionItemsCount > 0) {
            setActionIndex((prev) => (prev - 1 + actionItemsCount) % actionItemsCount);
          }
          return;
        }

        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (actionItemsCount > 0 && onExecuteActionByIndex) {
            onExecuteActionByIndex(actionIndex);
          }
          onCloseActionMenu?.();
          return;
        }

        // Direct shortcut triggers while Action Menu is open:
        // Admin: Ctrl+Enter
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onExecuteActionById?.('admin');
          onCloseActionMenu?.();
          return;
        }

        // Reveal: Ctrl+O
        if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
          e.preventDefault();
          onExecuteActionById?.('reveal');
          onCloseActionMenu?.();
          return;
        }

        // Pin/Unpin: Ctrl+P
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          onExecuteActionById?.('pin');
          onCloseActionMenu?.();
          return;
        }

        // Copy Path: Ctrl+C
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          onExecuteActionById?.('copy_path');
          onCloseActionMenu?.();
          return;
        }

        // Quick numeric triggers: 1..5 or Ctrl+1..5
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= actionItemsCount) {
          e.preventDefault();
          onExecuteActionByIndex?.(num - 1);
          onCloseActionMenu?.();
          return;
        }

        // Lock out background navigation for other keys
        return;
      }

      // 4. Action Shortcuts (executable when browsing search results or pinned items)
      // Run as Administrator: Ctrl+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeSection === 'pinned') {
          if (onExecuteAdmin) {
            onExecuteAdmin(selectedPinnedIndex);
          } else if (onExecuteActionById) {
            onExecuteActionById('admin');
          }
        } else {
          if (onExecuteAdmin) {
            onExecuteAdmin(selectedIndex);
          } else if (onExecuteActionById) {
            onExecuteActionById('admin');
          }
        }
        return;
      }

      // Open in Explorer / Reveal: Ctrl+O or Shift+Enter
      if (((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) || (e.shiftKey && e.key === 'Enter')) {
        e.preventDefault();
        onExecuteActionById?.('reveal');
        return;
      }

      // Toggle Pin / Unpin: Ctrl+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onExecuteActionById?.('pin');
        return;
      }

      // Copy Path to Clipboard: Ctrl+C (when no text is highlighted in search bar)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const selection = window.getSelection()?.toString();
        if (!selection || selection.length === 0) {
          e.preventDefault();
          onExecuteActionById?.('copy_path');
          return;
        }
      }

      // 5. Arrow Right: navigate pinned grid horizontally
      if (e.key === 'ArrowRight') {
        if (activeSection === 'pinned' && pinnedCount > 0) {
          e.preventDefault();
          setSelectedPinnedIndex((prev) => (prev + 1) % pinnedCount);
          return;
        }
      }

      // 6. Arrow Left: navigate pinned grid horizontally backward
      if (e.key === 'ArrowLeft') {
        if (activeSection === 'pinned' && pinnedCount > 0) {
          e.preventDefault();
          setSelectedPinnedIndex((prev) => (prev - 1 + pinnedCount) % pinnedCount);
          return;
        }
      }

      // 7. Arrow Down: next item or drop from pinned to results
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeSection === 'pinned' && pinnedCount > 0) {
          // If in top row (cols 0..4) and row 1 has a corresponding item:
          if (selectedPinnedIndex < 5) {
            const nextRowIdx = selectedPinnedIndex + 5;
            if (nextRowIdx < pinnedCount) {
              setSelectedPinnedIndex(nextRowIdx);
            } else if (pinnedCount > 5) {
              setSelectedPinnedIndex(pinnedCount - 1);
            } else if (totalItems > 0) {
              setActiveSection('results');
              setSelectedIndex(0);
            }
          } else {
            // In row 1 (bottom pinned row) -> drop down to results list
            if (totalItems > 0) {
              setActiveSection('results');
              setSelectedIndex(0);
            } else {
              // Wrap to top row in pinned
              setSelectedPinnedIndex((prev) => prev - 5);
            }
          }
          return;
        }

        // In results list: cycle through results with exact modulo wrapping
        if (totalItems > 0) {
          setSelectedIndex((prev) => (prev + 1) % totalItems);
        }
        return;
      }

      // 8. Arrow Up: previous item or move from results up to pinned
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeSection === 'pinned' && pinnedCount > 0) {
          if (selectedPinnedIndex >= 5) {
            // In row 1 -> move up to row 0
            setSelectedPinnedIndex((prev) => prev - 5);
          } else {
            // In row 0 (top row) -> wrap to bottom of results
            if (totalItems > 0) {
              setActiveSection('results');
              setSelectedIndex(totalItems - 1);
            } else if (pinnedCount > 5) {
              setSelectedPinnedIndex((prev) => Math.min(prev + 5, pinnedCount - 1));
            }
          }
          return;
        }

        // In results list
        if (totalItems > 0) {
          if (selectedIndex === 0 && pinnedCount > 0 && !hasQuery) {
            // Move up into pinned grid (bottom row of pinned)
            setActiveSection('pinned');
            setSelectedPinnedIndex(pinnedCount > 5 ? Math.min(5, pinnedCount - 1) : 0);
          } else {
            setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          }
        }
        return;
      }

      // 9. Page Down: advance 5 items
      if (e.key === 'PageDown') {
        e.preventDefault();
        if (activeSection === 'pinned') {
          if (totalItems > 0) {
            setActiveSection('results');
            setSelectedIndex(Math.min(4, totalItems - 1));
          } else if (pinnedCount > 5 && selectedPinnedIndex < 5) {
            setSelectedPinnedIndex(Math.min(selectedPinnedIndex + 5, pinnedCount - 1));
          }
        } else if (totalItems > 0) {
          setSelectedIndex((prev) => Math.min(prev + 5, totalItems - 1));
        }
        return;
      }

      // 10. Page Up: rewind 5 items
      if (e.key === 'PageUp') {
        e.preventDefault();
        if (activeSection === 'results') {
          if (selectedIndex <= 4 && pinnedCount > 0 && !hasQuery) {
            setActiveSection('pinned');
            setSelectedPinnedIndex(0);
          } else if (totalItems > 0) {
            setSelectedIndex((prev) => Math.max(prev - 5, 0));
          }
        } else if (activeSection === 'pinned' && selectedPinnedIndex >= 5) {
          setSelectedPinnedIndex((prev) => prev - 5);
        }
        return;
      }

      // 11. Home: jump to top
      if (e.key === 'Home') {
        e.preventDefault();
        if (pinnedCount > 0 && !hasQuery) {
          setActiveSection('pinned');
          setSelectedPinnedIndex(0);
        } else {
          setSelectedIndex(0);
        }
        return;
      }

      // 12. End: jump to bottom
      if (e.key === 'End') {
        e.preventDefault();
        if (totalItems > 0) {
          setActiveSection('results');
          setSelectedIndex(totalItems - 1);
        } else if (pinnedCount > 0) {
          setActiveSection('pinned');
          setSelectedPinnedIndex(pinnedCount - 1);
        }
        return;
      }

      // 13. Enter: Primary execution
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSection === 'pinned' && pinnedCount > 0) {
          if (onExecutePinned) {
            onExecutePinned(selectedPinnedIndex);
          } else if (onExecutePrimary) {
            onExecutePrimary(selectedPinnedIndex);
          }
          return;
        }

        if (totalItems > 0) {
          onExecutePrimary?.(selectedIndex);
        }
        return;
      }
    },
    [
      totalItems,
      pinnedCount,
      activeSection,
      selectedIndex,
      selectedPinnedIndex,
      actionIndex,
      actionItemsCount,
      isActionMenuOpen,
      viewMode,
      hasQuery,
      onToggleActionMenu,
      onCloseActionMenu,
      onResetView,
      onClearQuery,
      onHideWindow,
      onExecutePrimary,
      onExecutePinned,
      onExecuteAdmin,
      onExecuteActionByIndex,
      onExecuteActionById,
    ]
  );

  return {
    selectedIndex,
    setSelectedIndex,
    selectedPinnedIndex,
    setSelectedPinnedIndex,
    activeSection,
    setActiveSection,
    actionIndex,
    setActionIndex,
    handleKeyDown,
  };
}
