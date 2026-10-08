'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface NewStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: (storyId?: string) => void;
}

export function NewStoryModal({
  isOpen,
  onClose,
}: NewStoryModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      onClose();
      router.push('/create');
    }
  }, [isOpen, onClose, router]);

  return null;
}



