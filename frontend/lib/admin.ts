export interface WhitelistedUser {
  email: string;
  role: 'admin' | 'creator';
  addedAt: string;
  isEnv?: boolean;
  note?: string;
}

export const STORAGE_KEY_WHITELIST = 'fablemotion_access_whitelist';

/**
 * Returns static admin emails configured via environment variables.
 */
export function getAdminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns dynamic whitelisted users persisted in localStorage.
 */
export function getStoredWhitelistedUsers(): WhitelistedUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WHITELIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Returns all whitelisted users combining environment admins and dynamic user entries.
 */
export function getAllWhitelistedUsers(): WhitelistedUser[] {
  const envAdmins: WhitelistedUser[] = getAdminEmails().map((email) => ({
    email,
    role: 'admin',
    addedAt: 'Environment Config',
    isEnv: true,
    note: 'Root Admin (Environment Config)',
  }));

  const stored = getStoredWhitelistedUsers();
  const envEmailSet = new Set(envAdmins.map((u) => u.email.toLowerCase()));
  const uniqueStored = stored.filter((u) => !envEmailSet.has(u.email.toLowerCase()));

  return [...envAdmins, ...uniqueStored];
}

/**
 * Add or update a user on the dynamic access whitelist.
 */
export function addWhitelistedUser(
  email: string,
  role: 'admin' | 'creator' = 'creator',
  note?: string
): WhitelistedUser[] {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return getAllWhitelistedUsers();

  const current = getStoredWhitelistedUsers();
  const envAdmins = getAdminEmails();

  if (envAdmins.includes(cleanEmail)) {
    return getAllWhitelistedUsers();
  }

  const existingIndex = current.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  const newUser: WhitelistedUser = {
    email: cleanEmail,
    role,
    addedAt: new Date().toISOString(),
    isEnv: false,
    note: note?.trim() || undefined,
  };

  let updated: WhitelistedUser[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = newUser;
  } else {
    updated = [newUser, ...current];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_WHITELIST, JSON.stringify(updated));
      window.dispatchEvent(new Event('fablemotion-whitelist-updated'));
    } catch (e) {
      console.warn('Failed to save whitelist to localStorage:', e);
    }
  }

  return getAllWhitelistedUsers();
}

/**
 * Remove a user from the dynamic access whitelist.
 */
export function removeWhitelistedUser(email: string): WhitelistedUser[] {
  const cleanEmail = email.trim().toLowerCase();
  const current = getStoredWhitelistedUsers();
  const updated = current.filter((u) => u.email.toLowerCase() !== cleanEmail);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_WHITELIST, JSON.stringify(updated));
      window.dispatchEvent(new Event('fablemotion-whitelist-updated'));
    } catch (e) {
      console.warn('Failed to remove from whitelist in localStorage:', e);
    }
  }

  return getAllWhitelistedUsers();
}

/**
 * Checks whether an email is permitted to access the application.
 * If no whitelist exists at all, access is unrestricted.
 */
export function isWhitelistedEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const all = getAllWhitelistedUsers();
  if (all.length === 0) return true;
  return all.some((u) => u.email.toLowerCase() === clean);
}

/**
 * Checks whether an email possesses Admin tier privileges (either via environment or dynamic whitelist).
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (getAdminEmails().includes(clean)) return true;
  const stored = getStoredWhitelistedUsers();
  return stored.some((u) => u.email.toLowerCase() === clean && u.role === 'admin');
}

/**
 * Helper to check if a user is permitted to use studio generation & app capabilities.
 */
export function canUseApp(email?: string | null): boolean {
  return isWhitelistedEmail(email);
}
