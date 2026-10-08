'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StorySummary, ModelsConfig, SystemStatus, StoryDetail } from '../lib/types';
import { AssetCategory } from './Sidebar';

interface DashboardViewProps {
  stories: StorySummary[];
  activeStoryId: string | null;
  activeStoryDetail: StoryDetail | null;
  selectedCategory: AssetCategory;
  searchQuery: string;
  sortBy: string;
  viewMode: 'grid' | 'list';
  onSelectStory: (storyId: string) => void;
  onInspectStory: (storyId: string) => void;
  onOpenNewStoryModal: () => void;
  onOpenLightbox: (imageUrl: string, caption?: string) => void;
  onTrashStory?: (storyId: string) => void;
  onRestoreStory?: (storyId: string) => void;
  modelsConfig?: ModelsConfig | null;
  systemStatus?: SystemStatus | null;
  onRefresh?: () => void;
}

export interface SequenceBreakdown {
  id: string;
  seqNumber: number;
  title: string;
  status: 'Locked Master' | 'Editorial Cut' | 'Color Graded' | 'Drafting' | 'Synced';
  keyframesCount: number;
  clipsCount: number;
  vosCount: number;
}

export interface StoryCardModel {
  id: string;
  isBackendStory: boolean;
  projectNumber: string;
  title: string;
  synopsis: string;
  genre: string;
  dateStr: string;
  thumbnailUrl: string;
  sequencesCount: number;
  isSingleArc?: boolean;
  status: 'In Production' | 'Ready' | 'Processing' | 'Synced' | 'Draft' | 'Scripting';
  cast: Array<{ name: string; dotColor: string }>;
  sequences: SequenceBreakdown[];
  isTrashed: boolean;
}

// Curated Showcase Story Projects matching user's design prototype
const DEMO_STORIES: StoryCardModel[] = [
  {
    id: 'demo-neo-kyoto',
    isBackendStory: false,
    projectNumber: 'Story Project #01',
    title: 'Neo-Kyoto 2089: Act II – Rain & Neon',
    synopsis:
      'In the saturated underbelly of Neo-Kyoto, a rogue detective uncovers a clandestine synthetic syndicate operating within the imperial watergrid.',
    genre: 'Cyber-Noir',
    dateStr: 'Updated Oct 24, 2026',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCHy9l_jH_kxKEwh6XLKDMkmq9ZIK3EeNU257TEfogRmFoaPUwShkHyjzysQosIbp3LznR6-4uFZJ7Ro7fdZihK7zSj_Z0Xc9Bv3QnXVFrSSyE_9TVbUT6F6v5wvWra1e_IMxosEML7GSq8RNpKa__uJPe9hNLFSbEPGscvrm3hyIl0VL-zT4350fmbv7aP7zUr7IILrs2824HvBTcNMdFwrY3DN8aSzNWcYSN0XmTu1E_1bzWDZ4vJFshfE2IMwjieMhU',
    sequencesCount: 3,
    status: 'In Production',
    cast: [
      { name: 'Det. Kaelen', dotColor: 'bg-primary' },
      { name: 'The Courier', dotColor: 'bg-secondary' },
    ],
    sequences: [
      {
        id: 'nk-seq-1',
        seqNumber: 1,
        title: 'Seq 01: The Breach Alley',
        status: 'Locked Master',
        keyframesCount: 12,
        clipsCount: 12,
        vosCount: 12,
      },
      {
        id: 'nk-seq-2',
        seqNumber: 2,
        title: 'Seq 02: Synth Rain Confrontation',
        status: 'Editorial Cut',
        keyframesCount: 16,
        clipsCount: 14,
        vosCount: 8,
      },
      {
        id: 'nk-seq-3',
        seqNumber: 3,
        title: 'Seq 03: Latent Rooftop Exit',
        status: 'Color Graded',
        keyframesCount: 9,
        clipsCount: 9,
        vosCount: 6,
      },
    ],
    isTrashed: false,
  },
  {
    id: 'demo-shards-betrayal',
    isBackendStory: false,
    projectNumber: 'Story Project #02',
    title: 'Shards of Betrayal - Season 1',
    synopsis:
      'Tensions flare in an opulent estate as buried secrets surface between two bonded companions during an intimate domestic confrontation.',
    genre: 'Drama / Intrigue',
    dateStr: 'Updated Oct 22, 2026',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB7C5XucZlz7P1rYLJAoC2U7aYKol-A5Su5mO2NRxwoDpSdNua_PmBOuSWrZwjBxSWkAgAO9tNVkwIS0vH7fYyTLvokDfRhw35E_xo_Yyjqm_8xPBkZ0JQS4tsIfA-6W8ydIN-j7wk5aLYmM_c1q9bxK31BoNp-ApiBTw_M53G5BHCzvIY_UlThwFcuH1NgHxgRw4iHQqSdHsG22NBcPTm4AenAoMRR9kWE4uO0GQyXUVVh2EZxxziGkg6f9phmdspn5LQ',
    sequencesCount: 1,
    isSingleArc: true,
    status: 'Ready',
    cast: [
      { name: 'Lady Fragaria', dotColor: 'bg-tertiary' },
      { name: 'Clement', dotColor: 'bg-amber-400' },
    ],
    sequences: [
      {
        id: 'sb-seq-1',
        seqNumber: 1,
        title: 'Continuous Arc — No Sequences',
        status: 'Synced',
        keyframesCount: 14,
        clipsCount: 14,
        vosCount: 14,
      },
    ],
    isTrashed: false,
  },
  {
    id: 'demo-orbital-penthouse',
    isBackendStory: false,
    projectNumber: 'Story Project #03',
    title: 'Orbital Penthouse Heist',
    synopsis:
      'A high-velocity dash through an opulent palace ballroom as an improbable fugitive evades golden laser traps and elite palace security.',
    genre: 'Action Thriller',
    dateStr: 'Updated Oct 20, 2026',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDUExEfwOzIpUIRfiKhKuKGvH3EEcV19q4tpqDCY32SwJKA83r9jmYh-Qy3uBim8JXvrF9hoKUtp3zcavOrAAMea1sfBFAUxZrBsCl54V_zvQ7ZFsw1U7We89TeodXR6UdiusPc89q1fL235Hq_uGYpaUgNSzU5KrwemfT1FNHrcrlmRnUMuJ8aSy7V-QyUPmGKBnd6oSHkKldE9Rk9aNDA3SLjXD8XfKOJ9fqTs0DABEp5KYl_Y8xeqTD60XVG34DlLmA',
    sequencesCount: 2,
    status: 'Synced',
    cast: [{ name: 'Pip the Runner', dotColor: 'bg-tertiary' }],
    sequences: [
      {
        id: 'op-seq-1',
        seqNumber: 1,
        title: 'Seq 01: Palace Infiltration',
        status: 'Locked Master',
        keyframesCount: 10,
        clipsCount: 8,
        vosCount: 5,
      },
      {
        id: 'op-seq-2',
        seqNumber: 2,
        title: 'Seq 02: Chandelier Leap',
        status: 'Color Graded',
        keyframesCount: 14,
        clipsCount: 12,
        vosCount: 7,
      },
    ],
    isTrashed: false,
  },
  {
    id: 'demo-sovereign-alliance',
    isBackendStory: false,
    projectNumber: 'Story Project #04',
    title: 'The Sovereign Alliance',
    synopsis:
      'At the precipice of the mystical Wishing Well, three rival delegates forge an uneasy pact that could reshape the outer realm.',
    genre: 'Fantasy / Political',
    dateStr: 'Updated Oct 18, 2026',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDObUn9SIAvftBV-hvMe4yqp26omkHasCUZB2f2MEl2PdaouWqr9O2lfHf1T11MuRB7_FEW518i8px20B6hSK-uZn1QV-dvn4_wP41OFmY8s0EiW3RsMML1JxOEoez7lwoFO8C0DQeH6FqCHdni7hp4j42gpyNiLhP6pCp4TgJT1dAd7b-Q--4xHqqjqMxFnD5kU9XZPA-0BlZoLvPSC23owxTeJ6mE9ezPGfS1ZWe7B_xWRBHkPbQ_bGUw7ef4SwqpbSg',
    sequencesCount: 3,
    status: 'Processing',
    cast: [
      { name: 'Mira', dotColor: 'bg-secondary' },
      { name: 'Lord Mango', dotColor: 'bg-amber-500' },
      { name: 'Lyra', dotColor: 'bg-tertiary' },
    ],
    sequences: [
      {
        id: 'sa-seq-1',
        seqNumber: 1,
        title: 'Seq 01: The Well Gathering',
        status: 'Locked Master',
        keyframesCount: 18,
        clipsCount: 18,
        vosCount: 15,
      },
      {
        id: 'sa-seq-2',
        seqNumber: 2,
        title: 'Seq 02: Royal Ultimatum',
        status: 'Editorial Cut',
        keyframesCount: 12,
        clipsCount: 10,
        vosCount: 10,
      },
      {
        id: 'sa-seq-3',
        seqNumber: 3,
        title: 'Seq 03: The Blood Moon Vow',
        status: 'Drafting',
        keyframesCount: 8,
        clipsCount: 6,
        vosCount: 4,
      },
    ],
    isTrashed: false,
  },
  {
    id: 'demo-cyber-district-9',
    isBackendStory: false,
    projectNumber: 'Story Project #05',
    title: 'Cyber District 9',
    synopsis:
      "Deep undercover in District 9's bathhouse sub-levels, an operative receives an anonymous data chip with lethal coordinates.",
    genre: 'Sci-Fi Noir',
    dateStr: 'Updated Oct 15, 2026',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqFJheUQ7ZXEYvhaoB9_hrEp2_4IpYXJEQ7aARYxuC1p_LjmcMYl_JYPTdHu2dTWW0vgRXLX0zCl0nKE2CqHjObeXXuNsPQZCgJ37fQf2nJ0Ssu6TGFaxPluRVAX1GFYTIxJhiKqebORNuyA_HtvftWl2uY7nCojF6SGoRGr9Qvk8i2aDoAM7FLu7hHUksVa19SO_lbLSmz6NQjLwmMqHhWo1GehmRSJhVc_vN8_nbOhkPI2z1BIB-nvJO_rIbPJGf1wQ',
    sequencesCount: 2,
    status: 'Draft',
    cast: [
      { name: 'Agent Scarlet', dotColor: 'bg-primary' },
      { name: 'Informant Root', dotColor: 'bg-amber-400' },
    ],
    sequences: [
      {
        id: 'cd-seq-1',
        seqNumber: 1,
        title: 'Seq 01: Sub-level Rendezvous',
        status: 'Editorial Cut',
        keyframesCount: 15,
        clipsCount: 11,
        vosCount: 9,
      },
      {
        id: 'cd-seq-2',
        seqNumber: 2,
        title: 'Seq 02: Neon Drain Escape',
        status: 'Color Graded',
        keyframesCount: 11,
        clipsCount: 11,
        vosCount: 7,
      },
    ],
    isTrashed: false,
  },
  {
    id: 'demo-executive-deal',
    isBackendStory: false,
    projectNumber: 'Story Project #06',
    title: 'Executive Penthouse Deal',
    synopsis:
      'High above the metropolitan skyline, two formidable conglomerate leaders negotiate an audacious multi-sector hostile takeover.',
    genre: 'Corporate Thriller',
    dateStr: 'Updated Oct 12, 2026',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCtv5FUY3FOssWEGgPfQhVMP6GvS8iNhC0O9xHCDqRC4XAlDP_z7ugGH-y7b8Oq8Poqmy4dNwNVGWT2WFSDPEiyqPMXbKWnIRlxB9SM_6NqY0v13dljoJiy4DNc3VhWbIwAVBLHzbvJHtN0YNulVDk5RULk2XK89-aBFrxzg7x-eJfy_xTdE6EmRXx3Xb78VEYkqtFcJHhU8olmGJqs6kKgc_YqG3h8udzu5LBp9rSUlz3ppB7iwfQUnRZZBP1qQVSnAMQ',
    sequencesCount: 3,
    status: 'Ready',
    cast: [
      { name: 'CEO Ananas', dotColor: 'bg-amber-400' },
      { name: 'VP Rubus', dotColor: 'bg-pink-400' },
    ],
    sequences: [
      {
        id: 'ep-seq-1',
        seqNumber: 1,
        title: 'Seq 01: Midnight Terms',
        status: 'Locked Master',
        keyframesCount: 12,
        clipsCount: 12,
        vosCount: 12,
      },
      {
        id: 'ep-seq-2',
        seqNumber: 2,
        title: 'Seq 02: The Skyline Whisper',
        status: 'Color Graded',
        keyframesCount: 14,
        clipsCount: 14,
        vosCount: 10,
      },
      {
        id: 'ep-seq-3',
        seqNumber: 3,
        title: 'Seq 03: The Hostile Signing',
        status: 'Editorial Cut',
        keyframesCount: 8,
        clipsCount: 8,
        vosCount: 8,
      },
    ],
    isTrashed: false,
  },
];

export function DashboardView({
  stories,
  activeStoryId,
  activeStoryDetail,
  selectedCategory,
  searchQuery,
  sortBy,
  viewMode,
  onSelectStory,
  onInspectStory,
  onOpenNewStoryModal,
  onOpenLightbox,
  onTrashStory,
  onRestoreStory,
  modelsConfig,
  systemStatus,
  onRefresh,
}: DashboardViewProps) {
  const router = useRouter();
  // Story state tab filter: 'active' | 'draft' | 'archive'
  const [storyStateTab, setStoryStateTab] = useState<'active' | 'draft' | 'archive'>('active');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [localSortBy, setLocalSortBy] = useState<'recent' | 'title' | 'sequences'>('recent');
  const [cardSize, setCardSize] = useState<'compact' | 'comfortable' | 'large'>('compact');

  // Archive & restore state for immediate optimistic updates across all stories
  const [archivedStoryIds, setArchivedStoryIds] = useState<Set<string>>(new Set());
  const [restoredStoryIds, setRestoredStoryIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ text: string; undoStoryId?: string; id: number } | null>(null);

  // Synchronize storyStateTab when sidebar selectedCategory changes
  useEffect(() => {
    if (selectedCategory === 'trash') {
      setStoryStateTab('archive');
    } else if (selectedCategory === 'all' || selectedCategory === 'episodes' || selectedCategory === 'key_scenes') {
      setStoryStateTab('active');
    }
  }, [selectedCategory]);

  // Auto-dismiss toast after 4.5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Helper to determine if a story is currently archived/trashed
  const isCardTrashed = (card: StoryCardModel) => {
    if (archivedStoryIds.has(card.id)) return true;
    if (restoredStoryIds.has(card.id)) return false;
    return card.isTrashed;
  };

  // Archive action handler
  const handleArchiveStory = (storyId: string, title?: string) => {
    setArchivedStoryIds((prev) => new Set([...prev, storyId]));
    setRestoredStoryIds((prev) => {
      const next = new Set(prev);
      next.delete(storyId);
      return next;
    });
    if (onTrashStory) {
      onTrashStory(storyId);
    }
    setToastMessage({
      text: `"${title || 'Story'}" moved to Story Archive.`,
      undoStoryId: storyId,
      id: Date.now(),
    });
  };

  // Restore action handler
  const handleRestoreStory = (storyId: string, title?: string) => {
    setRestoredStoryIds((prev) => new Set([...prev, storyId]));
    setArchivedStoryIds((prev) => {
      const next = new Set(prev);
      next.delete(storyId);
      return next;
    });
    if (onRestoreStory) {
      onRestoreStory(storyId);
    }
    setToastMessage({
      text: `"${title || 'Story'}" restored to Active Productions.`,
      id: Date.now(),
    });
  };

  // Map backend stories into StoryCardModels
  const convertedBackendStories = useMemo<StoryCardModel[]>(() => {
    return stories.map((s, idx) => {
      const formattedDate = new Date(s.created_at || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const scenesCount = s.scenes_count || 4;
      const status: StoryCardModel['status'] =
        s.status === 'completed' || s.has_final_video
          ? 'Ready'
          : s.status === 'running' || s.status === 'in_progress'
          ? 'Processing'
          : 'In Production';

      // Generate sequences breakdown for backend story
      const sequences: SequenceBreakdown[] = [];
      for (let sc = 1; sc <= scenesCount; sc++) {
        sequences.push({
          id: `${s.story_id}-seq-${sc}`,
          seqNumber: sc,
          title: `Seq 0${sc}: Scene ${sc}`,
          status: sc === 1 ? 'Locked Master' : sc === 2 ? 'Editorial Cut' : 'Color Graded',
          keyframesCount: 10 + sc,
          clipsCount: 8 + sc,
          vosCount: 6 + sc,
        });
      }

      const defaultThumbnail =
        s.thumbnail_url ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCHy9l_jH_kxKEwh6XLKDMkmq9ZIK3EeNU257TEfogRmFoaPUwShkHyjzysQosIbp3LznR6-4uFZJ7Ro7fdZihK7zSj_Z0Xc9Bv3QnXVFrSSyE_9TVbUT6F6v5wvWra1e_IMxosEML7GSq8RNpKa__uJPe9hNLFSbEPGscvrm3hyIl0VL-zT4350fmbv7aP7zUr7IILrs2824HvBTcNMdFwrY3DN8aSzNWcYSN0XmTu1E_1bzWDZ4vJFshfE2IMwjieMhU';

      return {
        id: s.story_id,
        isBackendStory: true,
        projectNumber: `Story Project #${String(idx + 1).padStart(2, '0')}`,
        title: s.title || 'Untitled Story',
        synopsis: s.logline || s.prompt || 'Synthesizing short drama generation...',
        genre: idx % 2 === 0 ? 'Cyber-Noir' : 'Action Thriller',
        dateStr: `Updated ${formattedDate}`,
        thumbnailUrl: defaultThumbnail,
        sequencesCount: scenesCount,
        status,
        cast: [
          { name: 'Lead Character', dotColor: 'bg-primary' },
          { name: 'Supporting Cast', dotColor: 'bg-secondary' },
        ],
        sequences,
        isTrashed: !!s.is_trashed,
      };
    });
  }, [stories]);

  // Combined stories pool (Real backend stories take precedence, followed by demo showcase projects)
  const allCards = useMemo<StoryCardModel[]>(() => {
    // If backend stories exist, include them first, then demo stories
    const combined = [...convertedBackendStories];
    DEMO_STORIES.forEach((demo) => {
      // Avoid duplicated ids
      if (!combined.some((c) => c.title.toLowerCase() === demo.title.toLowerCase())) {
        combined.push(demo);
      }
    });
    return combined;
  }, [convertedBackendStories]);

  // Tab counts dynamically calculated from state
  const activeCount = allCards.filter(
    (c) => !isCardTrashed(c) && (c.status === 'In Production' || c.status === 'Ready' || c.status === 'Synced')
  ).length;
  const draftCount = allCards.filter(
    (c) => !isCardTrashed(c) && (c.status === 'Draft' || (c.status as string) === 'Scripting' || c.sequencesCount <= 2)
  ).length;
  const archiveCount = allCards.filter((c) => isCardTrashed(c)).length;

  // Filter cards based on Category, Tab, and Search
  const filteredCards = useMemo(() => {
    let list = allCards;

    // Sidebar Category Filter override
    if (selectedCategory === 'trash') {
      list = list.filter((c) => isCardTrashed(c));
    } else {
      // Filter by Segment Tab
      if (storyStateTab === 'archive') {
        list = list.filter((c) => isCardTrashed(c));
      } else {
        list = list.filter((c) => !isCardTrashed(c));
        if (storyStateTab === 'active') {
          // Include In Production, Ready, Synced
          list = list.filter((c) => c.status === 'In Production' || c.status === 'Ready' || c.status === 'Synced');
        } else if (storyStateTab === 'draft') {
          list = list.filter((c) => c.status === 'Draft' || (c.status as string) === 'Scripting' || c.sequencesCount <= 2);
        }
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.synopsis.toLowerCase().includes(q) ||
          c.genre.toLowerCase().includes(q) ||
          c.cast.some((member) => member.name.toLowerCase().includes(q))
      );
    }

    // Sort
    if (localSortBy === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (localSortBy === 'sequences') {
      list = [...list].sort((a, b) => b.sequencesCount - a.sequencesCount);
    }

    return list;
  }, [allCards, selectedCategory, storyStateTab, searchQuery, localSortBy, archivedStoryIds, restoredStoryIds]);

  return (
    <div className="w-full bg-surface text-on-surface flex-1 min-h-[calc(100vh-4rem)] relative overflow-y-auto custom-scrollbar select-none">
      {/* Subtle ambient glow emitters */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/3 -right-24 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="p-space-lg lg:p-space-xl space-y-space-xl max-w-[1720px] mx-auto">
          {/* Top Title Bar & Meta Status */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="space-y-space-2xs">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">
                  Creative Director Deck
                </span>
                <span className="text-outline text-body-sm">/</span>
                <span className="font-label-sm text-label-sm text-outline">
                  {systemStatus?.is_running ? 'Production Node Cluster #04 (Active)' : 'Production Node Cluster #04'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-space-sm">
                <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                  Studio Stories
                </h1>
              </div>
            </div>

            {/* Global Action Cluster */}
            <div className="flex flex-wrap items-center gap-space-xs">
              <button
                onClick={onOpenNewStoryModal}
                className="flex items-center gap-space-2xs px-space-md py-space-xs rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all font-label-md text-label-md shadow-sm border border-[#2b2736] cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">file_upload</span>
                <span>Import Script (Fountain/FDX)</span>
              </button>
              <button
                onClick={onOpenNewStoryModal}
                className="flex items-center gap-space-2xs px-space-lg py-space-xs rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-on-primary font-headline-sm text-label-lg shadow-[0_0_28px_rgba(160,120,255,0.45)] hover:shadow-[0_0_36px_rgba(76,215,246,0.6)] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                <span>+ Create New Story Arc</span>
              </button>
            </div>
          </div>

          {/* Segment Tabs & Multifunctional Search Filter Bar */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-2xl p-space-xs shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-[#2b2736]/50 flex flex-col xl:flex-row xl:items-center justify-between gap-space-sm">
            {/* Story State Tabs */}
            <div className="flex items-center overflow-x-auto gap-space-3xs py-space-3xs px-space-3xs scrollbar-none">
              <button
                type="button"
                onClick={() => setStoryStateTab('active')}
                className={`px-space-md py-space-2xs rounded-xl font-label-md text-label-md transition-all flex items-center gap-space-2xs whitespace-nowrap cursor-pointer ${
                  storyStateTab === 'active'
                    ? 'bg-surface-container-high text-primary shadow-inner'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">movie_filter</span>
                <span>Active Productions</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-label-sm font-label-sm">
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStoryStateTab('draft')}
                className={`px-space-md py-space-2xs rounded-xl font-label-md text-label-md transition-all flex items-center gap-space-2xs whitespace-nowrap cursor-pointer ${
                  storyStateTab === 'draft'
                    ? 'bg-surface-container-high text-primary shadow-inner'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-outline">edit_note</span>
                <span>Draft</span>
                <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-outline text-label-sm font-label-sm">
                  {draftCount}
                </span>
              </button>

              {/* Subscription Tab */}
              <button
                type="button"
                onClick={() => setStoryStateTab('archive')}
                className={`px-space-md py-space-2xs rounded-xl font-label-md text-label-md transition-all flex items-center gap-space-2xs whitespace-nowrap cursor-pointer shadow-[0_0_12px_rgba(76,215,246,0.15)] ${
                  storyStateTab === 'archive'
                    ? 'bg-secondary-container/20 text-secondary border border-secondary/40'
                    : 'bg-secondary-container/10 hover:bg-secondary-container/20 text-secondary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">loyalty</span>
                <span className="font-bold">Subscription</span>
                <span className="px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary text-label-sm font-label-sm">
                  {archiveCount}
                </span>
              </button>
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-wrap items-center gap-space-xs px-space-2xs">
              {/* Sort Filter */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors border border-[#2b2736]/60 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">swap_vert</span>
                  <span>
                    {localSortBy === 'recent'
                      ? 'Recently Modified'
                      : localSortBy === 'title'
                      ? 'Title Alphabetical'
                      : 'Sequences Count'}
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-outline">expand_more</span>
                </button>

                {sortDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 p-1.5 rounded-xl bg-surface-container-high border border-[#2b2736] shadow-2xl z-50 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSortBy('recent');
                        setSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container"
                    >
                      Recently Modified
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSortBy('title');
                        setSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container"
                    >
                      Title Alphabetical
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSortBy('sequences');
                        setSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container"
                    >
                      Sequences Count
                    </button>
                  </div>
                )}
              </div>

              {/* View Size Options (Compact / Standard / Large) */}
              <div className="flex items-center p-0.5 rounded-xl bg-surface-container border border-[#2b2736]/60">
                <button
                  type="button"
                  onClick={() => setCardSize('compact')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    cardSize === 'compact'
                      ? 'bg-surface-container-high text-primary shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                  title="Compact View (4 columns)"
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardSize('comfortable')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    cardSize === 'comfortable'
                      ? 'bg-surface-container-high text-primary shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                  title="Comfortable View (3 columns)"
                >
                  <span className="material-symbols-outlined text-[16px]">view_module</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardSize('large')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    cardSize === 'large'
                      ? 'bg-surface-container-high text-primary shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                  title="Large Cinematic View (2 columns)"
                >
                  <span className="material-symbols-outlined text-[16px]">crop_landscape</span>
                </button>
              </div>
            </div>
          </div>

          {/* Responsive Grid of Story Cards */}
          <div
            className={`grid gap-6 pt-2 ${
              cardSize === 'compact'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                : cardSize === 'large'
                ? 'grid-cols-1 lg:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {filteredCards.map((card) => {
              const isSelected = activeStoryId === card.id;
              const isArchived = isCardTrashed(card);

              return (
                <div
                  key={card.id}
                  className={`bg-[#15131c] border border-[#2b2736] hover:border-primary/50 transition-all duration-300 rounded-2xl flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_36px_rgba(208,188,255,0.12)] group ${
                    cardSize === 'compact' ? 'p-3.5' : cardSize === 'large' ? 'p-6' : 'p-5'
                  } ${
                    isSelected ? 'ring-1 ring-primary border-primary/60' : ''
                  }`}
                >
                  <div className={cardSize === 'compact' ? 'space-y-2.5' : 'space-y-4'}>
                    {/* Media Thumbnail with Aspect Framing & Overlay Badges */}
                    <div
                      onClick={() => {
                        onSelectStory(card.id);
                        onInspectStory(card.id);
                      }}
                      className={`relative w-full rounded-xl overflow-hidden bg-surface-container-lowest border border-[#2b2736]/60 cursor-pointer ${
                        cardSize === 'compact'
                          ? 'aspect-video'
                          : cardSize === 'large'
                          ? 'aspect-[16/9] sm:aspect-[21/9]'
                          : 'aspect-video sm:aspect-[16/10]'
                      }`}
                    >
                      <img
                        alt={card.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        src={card.thumbnailUrl}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#15131c] via-transparent to-black/20" />

                      {/* Top Left Project Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/40 text-[11px] font-label-sm text-secondary">
                        <span className="material-symbols-outlined text-[14px]">folder</span>
                        <span>{card.projectNumber}</span>
                      </div>

                      {/* Top Right Status Badge (Archived Indicator) */}
                      {isArchived && (
                        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-lowest/85 backdrop-blur-md border border-secondary/40 text-[11px] font-label-sm text-secondary shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                          <span>Archived</span>
                        </div>
                      )}

                      {/* Bottom Right Sequences Pill */}
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-outline text-[11px] font-mono">
                        {card.isSingleArc ? 'Single Arc' : `${card.sequencesCount} Sequences`}
                      </div>

                      {/* Hover Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 backdrop-blur-[1px] transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLightbox(card.thumbnailUrl, card.title);
                          }}
                          className="w-11 h-11 rounded-full bg-gradient-to-r from-primary-container to-secondary-container hover:from-primary hover:to-secondary text-surface flex items-center justify-center shadow-[0_0_20px_rgba(160,120,255,0.35)] hover:shadow-[0_0_28px_rgba(3,181,211,0.5)] hover:scale-110 transition-all cursor-pointer"
                          title="Preview Media"
                        >
                          <span className="material-symbols-outlined text-[24px]">play_arrow</span>
                        </button>
                      </div>
                    </div>

                    {/* Header Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-label-sm font-label-sm text-outline">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-outline">schedule</span>
                          {card.dateStr}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                          {card.genre}
                        </span>
                      </div>
                      <h3
                        onClick={() => {
                          onSelectStory(card.id);
                          onInspectStory(card.id);
                        }}
                        className={`font-headline-sm text-on-surface tracking-tight group-hover:text-primary transition-colors cursor-pointer ${
                          cardSize === 'compact'
                            ? 'text-base font-semibold'
                            : cardSize === 'large'
                            ? 'text-headline-md font-bold'
                            : 'text-headline-sm font-semibold'
                        }`}
                      >
                        {card.title}
                      </h3>
                      <p
                        className={`font-body-sm text-on-surface-variant leading-relaxed ${
                          cardSize === 'compact'
                            ? 'text-xs line-clamp-1'
                            : cardSize === 'large'
                            ? 'text-body-md line-clamp-3'
                            : 'text-body-sm line-clamp-2'
                        }`}
                      >
                        {card.synopsis}
                      </p>
                    </div>

                    {/* Scoped Cast */}
                    <div className="flex items-center justify-between py-2 border-t border-b border-[#2b2736]/60 text-body-sm font-body-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-outline text-label-sm font-label-sm uppercase tracking-wide">
                          Cast ({card.cast.length}):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {card.cast.map((member, cIdx) => (
                            <span
                              key={cIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-label-sm"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${member.dotColor}`} />
                              {member.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Quick Actions & Status Bar */}
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectStory(card.id);
                            onInspectStory(card.id);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-label-sm font-label-sm border border-outline-variant/30 hover:border-primary/40 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-primary">upload_file</span>
                          <span>Upload</span>
                        </button>


                        {isArchived ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreStory(card.id, card.title);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary-container/20 hover:bg-secondary-container/30 text-secondary text-label-sm font-label-sm border border-secondary/40 transition-colors cursor-pointer"
                            title="Restore to Active Productions"
                          >
                            <span className="material-symbols-outlined text-[16px]">unarchive</span>
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveStory(card.id, card.title);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-rose-500/10 hover:border-rose-500/30 text-outline hover:text-rose-300 text-label-sm font-label-sm border border-outline-variant/30 transition-colors cursor-pointer"
                            title="Put into Story Archive"
                          >
                            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                            <span>Archive</span>
                          </button>
                        )}
                      </div>

                      {/* Status Pill */}
                      {isArchived ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/20 text-secondary border border-secondary/35 text-label-sm font-label-sm">
                          <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                          <span>Archived</span>
                        </div>
                      ) : (
                        <>
                          {card.status === 'In Production' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/15 text-secondary border border-secondary/30 text-label-sm font-label-sm">
                              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                              <span>In Production</span>
                            </div>
                          )}
                          {card.status === 'Ready' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-label-sm font-label-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>Ready</span>
                            </div>
                          )}
                          {card.status === 'Processing' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-label-sm font-label-sm">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              <span>Processing</span>
                            </div>
                          )}
                          {card.status === 'Synced' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-label-sm font-label-sm">
                              <span className="w-2 h-2 rounded-full bg-primary" />
                              <span>Synced</span>
                            </div>
                          )}
                          {(card.status === 'Draft' || (card.status as string) === 'Scripting') && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-outline border border-outline-variant/30 text-label-sm font-label-sm">
                              <span className="w-2 h-2 rounded-full bg-outline" />
                              <span>Draft</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Sequence Dropdown Breakdown */}
                  <div className="mt-4 pt-3 border-t border-[#2b2736]">
                    <details className="group/details" open={isSelected}>
                      <summary className="flex items-center justify-between cursor-pointer list-none text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors select-none py-1">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-secondary">
                            {card.isSingleArc ? 'movie' : 'view_timeline'}
                          </span>
                          <span>
                            {card.isSingleArc
                              ? 'Single Scene (No Sequences)'
                              : `Sequences (${card.sequences.length}) • View Breakdown`}
                          </span>
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-outline dropdown-chevron transition-transform duration-200">
                          expand_more
                        </span>
                      </summary>

                      <div className="mt-3 space-y-2 pt-2 border-t border-[#2b2736]/40">
                        {card.sequences.map((seq) => (
                          <div
                            key={seq.id}
                            onClick={() => {
                              onSelectStory(card.id);
                              onInspectStory(card.id);
                            }}
                            className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low/70 hover:bg-surface-container transition-colors cursor-pointer group/seq"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-body-sm font-headline-sm text-on-surface group-hover/seq:text-primary transition-colors">
                                  {seq.title}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-label-sm border ${
                                    seq.status === 'Locked Master'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : seq.status === 'Editorial Cut'
                                      ? 'bg-secondary/10 text-secondary border-secondary/20'
                                      : seq.status === 'Color Graded'
                                      ? 'bg-tertiary/10 text-tertiary border-tertiary/20'
                                      : seq.status === 'Synced'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-surface-container text-outline border-outline/20'
                                  }`}
                                >
                                  {seq.status}
                                </span>
                              </div>
                              <p className="text-[11px] font-label-sm text-outline flex items-center gap-2">
                                <span>{seq.keyframesCount} Keyframes</span>
                                <span>•</span>
                                <span>{seq.clipsCount} Clips</span>
                                <span>•</span>
                                <span>{seq.vosCount} VOs</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectStory(card.id);
                                onInspectStory(card.id);
                              }}
                              className="p-1.5 rounded-lg bg-surface-container group-hover/seq:bg-primary group-hover/seq:text-on-primary text-on-surface-variant transition-colors cursor-pointer"
                              title="Inspect Story Details"
                            >
                              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                          </div>
                        ))}

                        {card.isSingleArc && (
                          <div className="pt-2 border-t border-[#2b2736]/60 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectStory(card.id);
                                onInspectStory(card.id);
                              }}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-label-sm font-label-sm transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                              <span>+ Add Sequence</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}

            {/* Empty state when no cards match current filter/tab */}
            {filteredCards.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-[#15131c] border border-[#2b2736] space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-secondary-container/20 border border-secondary/30 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[32px]">
                    {storyStateTab === 'archive' ? 'inventory_2' : 'movie_filter'}
                  </span>
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-headline-sm font-headline-sm text-on-surface">
                    {storyStateTab === 'archive' ? 'Story Archive is Empty' : 'No Stories Found'}
                  </h3>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    {storyStateTab === 'archive'
                      ? 'No stories have been archived yet. Click "Archive" on any active story card in Studio Stories to store it safely here.'
                      : 'Try adjusting your search query, tab filter, or create a new story.'}
                  </p>
                </div>
                {storyStateTab === 'archive' && (
                  <button
                    type="button"
                    onClick={() => setStoryStateTab('active')}
                    className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-[#2b2736] text-primary text-label-md font-semibold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">movie_filter</span>
                    <span>View Active Productions</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-high border border-[#2b2736] shadow-2xl text-on-surface text-body-sm font-body-sm animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[20px] text-secondary">inventory_2</span>
          <span>{toastMessage.text}</span>
          {toastMessage.undoStoryId && (
            <button
              type="button"
              onClick={() => {
                if (toastMessage.undoStoryId) {
                  handleRestoreStory(toastMessage.undoStoryId);
                  setToastMessage(null);
                }
              }}
              className="ml-2 px-2.5 py-1 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary font-semibold text-xs border border-secondary/30 transition-colors cursor-pointer"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-outline hover:text-on-surface ml-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
