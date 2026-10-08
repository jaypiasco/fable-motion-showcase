'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  WhitelistedUser,
  getAllWhitelistedUsers,
  addWhitelistedUser,
  removeWhitelistedUser,
  getAdminEmails,
} from '../lib/admin';

interface WhitelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export function WhitelistModal({ isOpen, onClose, currentUserEmail }: WhitelistModalProps) {
  const [users, setUsers] = useState<WhitelistedUser[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'creator'>('creator');
  const [noteInput, setNoteInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'admin' | 'creator'>('all');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  const reloadUsers = () => {
    setUsers(getAllWhitelistedUsers());
  };

  useEffect(() => {
    if (isOpen) {
      reloadUsers();
      setStatusMessage(null);
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleStorageChange = () => reloadUsers();
    window.addEventListener('fablemotion-whitelist-updated', handleStorageChange);
    return () => window.removeEventListener('fablemotion-whitelist-updated', handleStorageChange);
  }, []);

  // Keyboard navigation & dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAddUser = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setStatusMessage({ type: 'error', text: 'Invalid email format. Please check the address.' });
      return;
    }

    const updated = addWhitelistedUser(cleanEmail, roleInput, noteInput);
    setUsers(updated);
    setEmailInput('');
    setNoteInput('');
    setStatusMessage({
      type: 'success',
      text: `Added ${cleanEmail} as ${roleInput === 'admin' ? 'Admin' : 'Creator'}.`,
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkInput
      .split(/[\n,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (lines.length === 0) {
      setStatusMessage({ type: 'error', text: 'No valid email addresses found in bulk input.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let addedCount = 0;

    for (const email of lines) {
      if (emailRegex.test(email)) {
        addWhitelistedUser(email, roleInput, 'Batch imported');
        addedCount += 1;
      }
    }

    reloadUsers();
    setBulkInput('');
    setIsBulkMode(false);
    setStatusMessage({
      type: 'success',
      text: `Successfully added ${addedCount} user${addedCount === 1 ? '' : 's'} to the whitelist.`,
    });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleRemoveUser = (emailToRemove: string) => {
    const updated = removeWhitelistedUser(emailToRemove);
    setUsers(updated);
    setStatusMessage({
      type: 'success',
      text: `Removed ${emailToRemove} from the access whitelist.`,
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleCopyEnvString = () => {
    const adminEmails = users
      .filter((u) => u.role === 'admin')
      .map((u) => u.email)
      .join(',');
    const envString = `NEXT_PUBLIC_ADMIN_EMAILS="${adminEmails}"`;
    navigator.clipboard.writeText(envString);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 1800);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.note && user.note.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = activeFilter === 'all' || user.role === activeFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, activeFilter]);

  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
  const creatorCount = useMemo(() => users.filter((u) => u.role === 'creator').length, [users]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whitelist-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#0d0f17] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#111420]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="whitelist-modal-title" className="text-base font-semibold text-white tracking-tight">
                  Studio Access Whitelist
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Access Gate
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Define which team members and creator accounts are permitted to sign in and generate stories.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/[0.06]"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/20'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Metrics Row */}
        <div className="px-6 py-3 bg-[#0a0b12] border-b border-white/[0.06] flex items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-4 text-slate-400">
            <div>
              <span className="text-slate-500">Total Authorized: </span>
              <span className="text-white font-semibold">{users.length}</span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div>
              <span className="text-slate-500">Admins: </span>
              <span className="text-violet-400 font-semibold">{adminCount}</span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div>
              <span className="text-slate-500">Creators / Pro: </span>
              <span className="text-cyan-400 font-semibold">{creatorCount}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsBulkMode(!isBulkMode)}
            className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition cursor-pointer"
          >
            <span>{isBulkMode ? 'Single Add' : 'Batch / Bulk Add'}</span>
            <span className="font-mono">→</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add User Section */}
          {!isBulkMode ? (
            <form onSubmit={handleAddUser} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
              <div className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Add User to Whitelist</span>
                <span className="text-[11px] text-slate-500 font-normal">Immediate permission grant</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-6">
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="user@studio.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#07080d] border border-white/[0.1] focus:border-violet-500/60 focus:outline-none text-xs text-white placeholder-slate-500 font-mono transition"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as 'admin' | 'creator')}
                    className="w-full px-3 py-2 rounded-lg bg-[#07080d] border border-white/[0.1] focus:border-violet-500/60 focus:outline-none text-xs text-slate-200 cursor-pointer transition font-mono"
                  >
                    <option value="creator">Creator (Pro)</option>
                    <option value="admin">Admin (Full)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-violet-950/40"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Access</span>
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Optional internal note (e.g. Lead Animator, Reviewer, Client)"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#07080d] border border-white/[0.06] focus:border-violet-500/40 focus:outline-none text-[11px] text-slate-300 placeholder-slate-600 transition"
                />
              </div>
            </form>
          ) : (
            <form onSubmit={handleBulkAdd} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Bulk Whitelist Import</span>
                <span className="text-[11px] text-slate-500">Comma or line separated</span>
              </div>
              <textarea
                rows={3}
                placeholder="member1@studio.com&#10;member2@studio.com&#10;member3@agency.com"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#07080d] border border-white/[0.1] focus:border-violet-500/60 focus:outline-none text-xs text-white placeholder-slate-600 font-mono transition resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Grant role:</span>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as 'admin' | 'creator')}
                    className="px-2 py-1 rounded bg-[#07080d] border border-white/[0.1] text-xs text-slate-200 font-mono cursor-pointer"
                  >
                    <option value="creator">Creator (Pro)</option>
                    <option value="admin">Admin (Full)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkMode(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs cursor-pointer transition shadow-md"
                  >
                    Import Batch
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1">
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search whitelisted users or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 focus:outline-none text-xs text-white placeholder-slate-500 transition"
              />
            </div>

            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06] text-xs shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-violet-600/30 text-violet-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('admin')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeFilter === 'admin'
                    ? 'bg-violet-600/30 text-violet-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admins ({adminCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('creator')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeFilter === 'creator'
                    ? 'bg-violet-600/30 text-violet-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Creators ({creatorCount})
              </button>
            </div>
          </div>

          {/* Whitelisted Users List */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#090b10]">
            {filteredUsers.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xs text-slate-400 font-medium">No whitelisted users match your search.</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Add an email address above to grant studio access.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredUsers.map((user) => {
                  const isCurrent = currentUserEmail && user.email.toLowerCase() === currentUserEmail.toLowerCase();
                  return (
                    <div
                      key={user.email}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                            user.role === 'admin'
                              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {user.email.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-100 font-medium truncate">
                              {user.email}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                You
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(user.email)}
                              className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
                              title="Copy email"
                            >
                              {copiedEmail === user.email ? (
                                <span className="text-[10px] text-emerald-400 font-mono">Copied</span>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {user.note && <span className="text-slate-400 truncate max-w-xs">{user.note} •</span>}
                            <span>{user.isEnv ? 'System .env' : 'Dynamic Whitelist'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Tags & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          }`}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Creator'}
                        </span>

                        {user.isEnv ? (
                          <span
                            className="p-1 text-slate-600 cursor-not-allowed"
                            title="Root admin configured via .env variables cannot be removed from UI"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(user.email)}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Revoke whitelist access"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#0c0d15] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEnvString}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title="Copy as NEXT_PUBLIC_ADMIN_EMAILS configuration string"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copiedEnv ? 'Copied .env String!' : 'Copy for .env.local'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
