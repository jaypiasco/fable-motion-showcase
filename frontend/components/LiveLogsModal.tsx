'use client'

import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, Copy, Check, RotateCw, ArrowDown } from 'lucide-react';
import { fetchStoryLogs } from '../lib/api';

interface LiveLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStoryId?: string | null;
}

export function LiveLogsModal({
  isOpen,
  onClose,
  activeStoryId,
}: LiveLogsModalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadLogs = async () => {
    try {
      const data = await fetchStoryLogs(activeStoryId || 'pipeline');
      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {
      // ignore error
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadLogs();
    const interval = setInterval(loadLogs, 2500);
    return () => clearInterval(interval);
  }, [isOpen, activeStoryId]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!isOpen) return null;

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl h-[650px] max-h-[85vh] rounded-2xl bg-surface-container-lowest border border-[#2b2736] shadow-2xl flex flex-col overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-[#2b2736] text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-secondary" />
            <span className="font-bold text-on-surface">Live Execution Terminal</span>
            <span className="text-[10px] text-outline font-mono">
              ({activeStoryId || 'Global Daemon Stream'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border cursor-pointer ${
                autoScroll ? 'bg-secondary/20 border-secondary/40 text-secondary' : 'bg-surface-container border-[#2b2736] text-outline'
              }`}
            >
              <ArrowDown className="w-3 h-3" /> Auto-scroll
            </button>

            <button
              onClick={handleCopyLogs}
              className="px-2 py-1 rounded text-[10px] font-mono bg-surface-container hover:bg-surface-container-high border border-[#2b2736] text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={onClose}
              className="text-outline hover:text-on-surface p-1 ml-1 cursor-pointer"
              aria-label="Close logs modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-on-surface-variant bg-surface-container-lowest space-y-1 custom-scrollbar"
        >
          {logs.length === 0 ? (
            <div className="text-outline italic">No logs recorded yet.</div>
          ) : (
            logs.map((line, idx) => {
              let color = 'text-on-surface-variant';
              if (line.includes('[SUCCESS]')) color = 'text-secondary font-semibold';
              else if (line.includes('[ERROR]') || line.includes('429')) color = 'text-tertiary font-semibold';
              else if (line.includes('[PHASE') || line.includes('[START]')) color = 'text-primary font-bold';
              else if (line.includes('[RETRY]') || line.includes('[WARN]')) color = 'text-amber-300';

              return (
                <div key={idx} className={`${color} whitespace-pre-wrap break-all font-mono`}>
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
