import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from '../components/SearchBar';

describe('SearchBar Component', () => {
  it('renders default placeholder in root mode', () => {
    const inputRef = React.createRef<HTMLInputElement>();
    render(
      <SearchBar
        query=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        onResetView={vi.fn()}
        inputRef={inputRef}
        viewMode="root"
      />
    );

    const input = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");
    expect(input).toBeInTheDocument();
  });

  it('triggers onChange when user types query', () => {
    const handleChange = vi.fn();
    const inputRef = React.createRef<HTMLInputElement>();
    render(
      <SearchBar
        query=""
        onChange={handleChange}
        onClear={vi.fn()}
        onResetView={vi.fn()}
        inputRef={inputRef}
        viewMode="root"
      />
    );

    const input = screen.getByPlaceholderText("EXECUTE QUERY, ALIAS (wh, vs, yt, psh), OR TYPE '/'...");
    fireEvent.change(input, { target: { value: 'terminal' } });
    expect(handleChange).toHaveBeenCalledWith('terminal');
  });

  it('does not render theme toggle or ESC badge in root mode', () => {
    const inputRef = React.createRef<HTMLInputElement>();
    render(
      <SearchBar
        query="calc"
        onChange={vi.fn()}
        onClear={vi.fn()}
        onResetView={vi.fn()}
        inputRef={inputRef}
        viewMode="root"
      />
    );

    expect(screen.queryByText('ESC')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Clear search query')).not.toBeInTheDocument();
    expect(screen.queryByTitle(/theme/i)).not.toBeInTheDocument();
  });

  it('renders breadcrumb badge when active in subview mode', () => {
    const inputRef = React.createRef<HTMLInputElement>();
    render(
      <SearchBar
        query=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        onResetView={vi.fn()}
        inputRef={inputRef}
        viewMode="clipboard"
      />
    );

    expect(screen.getByText('Clipboard History')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search clipboard history...')).toBeInTheDocument();
  });

  it('triggers onResetView when clicking breadcrumb close button', () => {
    const handleResetView = vi.fn();
    const inputRef = React.createRef<HTMLInputElement>();
    render(
      <SearchBar
        query=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        onResetView={handleResetView}
        inputRef={inputRef}
        viewMode="snippets"
      />
    );

    const closeBtn = screen.getByTitle('Return to Command Palette (Esc)');
    fireEvent.click(closeBtn);
    expect(handleResetView).toHaveBeenCalledTimes(1);
  });
});
