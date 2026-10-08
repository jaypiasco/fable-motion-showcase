'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

interface LightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export function LightboxModal({
  isOpen,
  imageUrl,
  caption,
  onClose,
}: LightboxModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !imageUrl || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-outline hover:text-on-surface p-1 cursor-pointer"
          aria-label="Close image preview"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="rounded-2xl overflow-hidden border border-[#2b2736] bg-surface-container-lowest shadow-2xl">
          <img
            src={imageUrl}
            alt={caption || 'Preview'}
            className="max-h-[80vh] w-auto object-contain"
          />
        </div>

        {caption && (
          <div className="mt-3 text-center text-xs font-medium text-on-surface-variant bg-surface-container-low/90 px-4 py-1.5 rounded-full border border-[#2b2736]">
            {caption}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
