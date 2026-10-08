'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Film, Download } from 'lucide-react';

export interface VideoPreviewModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  title?: string;
  logline?: string;
  onClose: () => void;
}

export function VideoPreviewModal({
  isOpen,
  videoUrl,
  title,
  logline,
  onClose,
}: VideoPreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const effectiveUrl = videoUrl || null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg flex flex-col items-center animate-in zoom-in-95 duration-200">
        {/* Top Header / Close Row */}
        <div className="w-full flex items-center justify-between pb-2.5 text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-white tracking-wide uppercase font-display">
                Master Video Preview
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">1080p · 24fps · Dynamic Subtitles</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            aria-label="Close video preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="w-full rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0c0a14] shadow-2xl shadow-purple-950/50 relative">
          <div className="relative aspect-[9/16] max-h-[72vh] w-full mx-auto bg-black flex items-center justify-center">
            {effectiveUrl ? (
              <video
                key={effectiveUrl}
                src={effectiveUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <Film className="w-8 h-8 text-violet-400 animate-pulse" />
                <p className="text-xs font-medium text-slate-200">Video Generation In Progress</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Video clips are rendering with Google Veo. The master preview will become available once Phase 4 &amp; 5 are completed.
                </p>
              </div>
            )}
          </div>

          {/* Video Metadata Footer */}
          <div className="p-3.5 border-t border-white/[0.08] bg-obsidian-900 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-semibold text-white truncate font-display">
                {title || 'Untitled Studio Vision'}
              </h3>
              {logline && (
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {logline}
                </p>
              )}
            </div>

            {effectiveUrl && (
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={effectiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Open raw video stream"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[11px]">Open Raw</span>
                </a>
                <a
                  href={effectiveUrl}
                  download
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition cursor-pointer"
                  title="Download MP4"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default VideoPreviewModal;
