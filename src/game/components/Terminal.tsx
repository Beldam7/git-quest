import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Send } from 'lucide-react';
import type { TerminalLine } from '../types';

interface TerminalProps {
  history: TerminalLine[];
  onCommand: (input: string) => void;
  onClose?: () => void;
  isActive: boolean;
}

export function GameTerminal({ history, onCommand, onClose, isActive }: TerminalProps) {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setCommandHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);
    setInput('');
  }, [input, onCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
  }, [commandHistory, historyIndex]);

  const getLineColor = (type: TerminalLine['type']): string => {
    switch (type) {
      case 'input': return 'text-kq-cyan';
      case 'output': return 'text-gray-300';
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-sky-300';
      case 'system': return 'text-kq-gold';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-kq-ink border-t border-gray-700/50">
      <div className="flex items-center justify-between px-4 py-2 bg-kq-deep border-b border-gray-700/50">
        <div className="flex items-center gap-2 text-sm text-kq-muted">
          <TerminalIcon size={14} />
          <span className="font-mono">Git Quest Terminal</span>
          <span className="ml-2 text-kq-muted text-sm hidden sm:inline">Type &apos;help&apos; for commands, &apos;hint&apos; for a clue</span>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close terminal" className="p-1 text-kq-muted hover:text-kq-text transition-colors">
            <X size={16} />
          </button>
        )}
      </div>
      <div ref={scrollRef} role="log" aria-live="polite" aria-label="Terminal output" tabIndex={0} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed">
        {history.map((line, i) => (
          <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap break-words terminal-line-appear`}>
            {line.text || '\u00A0'}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2 bg-kq-deep border-t border-gray-700/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-kq-cyan/70">
        <span className="text-kq-emerald font-mono text-base" aria-hidden="true">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Git command"
          placeholder="Type a git command, e.g. git status"
          className="flex-1 bg-transparent text-kq-text font-mono text-base outline-none placeholder:text-gray-600"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" aria-label="Run command" className="p-2 text-kq-muted hover:text-kq-cyan transition-colors btn-press">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
