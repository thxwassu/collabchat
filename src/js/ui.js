import { supabase, isConfigured } from './supabaseClient.js';

export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

export function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function initials(name = 'U') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'U';
}

export function formatDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function fileSize(bytes = 0) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

export function getQuery(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function setQuery(params) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([k, v]) => v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  window.history.replaceState({}, '', url);
}

export function toast(message, type = 'success') {
  let holder = $('.toast');
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'toast';
    document.body.appendChild(holder);
  }
  const item = document.createElement('div');
  item.className = `toast-item ${type}`;
  item.textContent = message;
  holder.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

export function showConfigWarning() {
  if (isConfigured) return;
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:99999;background:#7f1d1d;color:#fff;border-radius:16px;padding:14px 18px;box-shadow:0 16px 50px rgba(0,0,0,.25);font-weight:800;text-align:center';
  banner.textContent = 'Supabase is not configured. Copy .env.example to .env and add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.';
  document.body.appendChild(banner);
}

export function renderAvatar(profile, sizeClass = 'avatar') {
  if (profile?.avatar_url) {
    return `<img class="${sizeClass}" src="${escapeHTML(profile.avatar_url)}" alt="${escapeHTML(profile.full_name || 'User')}" />`;
  }
  return `<div class="${sizeClass}">${escapeHTML(initials(profile?.full_name || profile?.email || 'U'))}</div>`;
}

export function modal(id) {
  const element = document.getElementById(id);
  return {
    open: () => element?.classList.add('active'),
    close: () => element?.classList.remove('active')
  };
}

export function bindModalTriggers() {
  $$('[data-modal-open]').forEach((btn) => {
    btn.addEventListener('click', () => modal(btn.dataset.modalOpen).open());
  });
  $$('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => modal(btn.dataset.modalClose).close());
  });
  $$('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) backdrop.classList.remove('active');
    });
  });
}

export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

export async function getSessionProfile() {
  const user = await currentUser();
  if (!user) return { user: null, profile: null };
  const profile = await getProfile(user.id);
  return { user, profile };
}

export async function requireAuth() {
  showConfigWarning();
  const user = await currentUser();
  if (!user) {
    window.location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    return null;
  }
  const profile = await getProfile(user.id);
  if (profile?.is_disabled) {
    await supabase.auth.signOut();
    toast('Your account is disabled. Contact admin.', 'error');
    setTimeout(() => (window.location.href = '/login.html'), 900);
    return null;
  }
  await supabase.from('profiles').update({ status: 'online' }).eq('id', user.id);
  window.addEventListener('beforeunload', () => {
    supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
  });
  return { user, profile };
}

export async function requireAdmin() {
  const state = await requireAuth();
  if (!state) return null;
  if (state.profile?.role !== 'admin') {
    toast('Admin access only.', 'error');
    setTimeout(() => (window.location.href = '/dashboard.html'), 700);
    return null;
  }
  return state;
}

export async function logout() {
  const user = await currentUser();
  if (user) await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}

export function setupShell(active = '') {
  const btn = $('.mobile-sidebar-btn');
  const sidebar = $('.sidebar');
  btn?.addEventListener('click', () => sidebar?.classList.toggle('active'));
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === active) a.classList.add('active');
  });
  $('[data-logout]')?.addEventListener('click', logout);
  const themeBtn = $('[data-theme]');
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
  themeBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
}

export function setupMarketingNav() {
  showConfigWarning();
  const toggle = $('.mobile-toggle');
  const links = $('.nav-links');
  toggle?.addEventListener('click', () => links?.classList.toggle('active'));
  const themeBtn = $('[data-theme]');
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
  themeBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
}

export async function userWorkspaces(userId) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({ ...row.workspace, memberRole: row.role }));
}

export async function workspaceMembers(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, joined_at, profile:profiles(*)')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function uploadToBucket(bucket, file, folder = '') {
  const allowed = [
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  if (!allowed.includes(file.type)) throw new Error('File type not allowed. Use image, PDF, Word, Excel, ZIP, or TXT.');
  if (file.size > 10 * 1024 * 1024) throw new Error('File too large. Maximum size is 10 MB.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${folder ? `${folder}/` : ''}${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export function sidebarTemplate(active) {
  const links = [
    ['dashboard', '/dashboard.html', '📊', 'Dashboard'],
    ['workspaces', '/workspaces.html', '🏢', 'Workspaces'],
    ['chat', '/chat.html', '💬', 'Group Chat'],
    ['private', '/private-chat.html', '🔐', 'Private Chat'],
    ['tasks', '/tasks.html', '✅', 'Tasks'],
    ['files', '/files.html', '📁', 'Files'],
    ['notifications', '/notifications.html', '🔔', 'Notifications'],
    ['profile', '/profile.html', '👤', 'Profile']
  ];
  return `
  <aside class="sidebar">
    <a class="brand" href="/dashboard.html"><span class="brand-logo">C</span><span>CollabChat</span></a>
    <div class="side-section">Workspace</div>
    ${links.map(([key, href, icon, label]) => `<a class="side-link ${key === active ? 'active' : ''}" data-nav="${key}" href="${href}"><span>${icon}</span>${label}</a>`).join('')}
    <div class="side-section">Admin</div>
    <a class="side-link" href="/admin/dashboard.html"><span>🛡️</span>Admin Panel</a>
    <div class="side-bottom">
      <button class="side-link" data-theme style="width:100%;border:0;background:transparent;text-align:left;cursor:pointer"><span>🌙</span>Theme</button>
      <button class="side-link" data-logout style="width:100%;border:0;background:transparent;text-align:left;cursor:pointer"><span>🚪</span>Logout</button>
    </div>
  </aside>`;
}

export function topbarTemplate(title, subtitle = '') {
  return `
  <header class="topbar">
    <div style="display:flex;align-items:center;gap:12px">
      <button class="btn btn-outline btn-sm mobile-sidebar-btn">☰</button>
      <div><h1>${escapeHTML(title)}</h1>${subtitle ? `<div class="muted">${escapeHTML(subtitle)}</div>` : ''}</div>
    </div>
    <div class="top-actions">
      <a class="btn btn-outline btn-sm" href="/notifications.html">🔔</a>
      <a class="btn btn-primary btn-sm" href="/profile.html">Profile</a>
    </div>
  </header>`;
}
