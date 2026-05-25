import { supabase } from './supabaseClient.js';
import { $, escapeHTML, fileSize, formatTime, requireAdmin, setupShell, sidebarTemplate, toast, topbarTemplate } from './ui.js';

const page = document.body.dataset.adminPage || 'dashboard';
const app = $('#app');
app.innerHTML = `${sidebarTemplate('admin')}<main class="main">${topbarTemplate(`Admin ${page[0].toUpperCase() + page.slice(1)}`, 'Platform control panel for users, workspaces, contact messages, and files.')}<section class="content" id="content"></section></main>`;
setupShell('admin');
const auth = await requireAdmin();
if (auth) routeAdmin();

async function routeAdmin() {
  if (page === 'users') return usersPage();
  if (page === 'workspaces') return workspacesPage();
  if (page === 'messages') return messagesPage();
  if (page === 'files') return filesPage();
  return dashboardPage();
}

async function dashboardPage() {
  const [{ count: users }, { count: workspaces }, { count: messages }, { count: tasks }, { data: contacts }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('workspaces').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(5)
  ]);
  $('#content').innerHTML = `
    <div class="admin-banner"><div><h2>CollabChat Admin Panel 🛡️</h2><p>Monitor the full project from one professional dashboard.</p></div><div class="admin-tools"><a class="btn btn-outline" href="/admin/users.html">Users</a><a class="btn btn-outline" href="/admin/workspaces.html">Workspaces</a><a class="btn btn-outline" href="/admin/messages.html">Messages</a></div></div>
    <div class="grid grid-4" style="margin-top:22px"><div class="card stat-card admin-kpi"><div><span class="muted">Users</span><strong>${users || 0}</strong></div><div class="icon">👥</div></div><div class="card stat-card admin-kpi"><div><span class="muted">Workspaces</span><strong>${workspaces || 0}</strong></div><div class="icon">🏢</div></div><div class="card stat-card admin-kpi"><div><span class="muted">Messages</span><strong>${messages || 0}</strong></div><div class="icon">💬</div></div><div class="card stat-card admin-kpi"><div><span class="muted">Tasks</span><strong>${tasks || 0}</strong></div><div class="icon">✅</div></div></div>
    <div class="grid grid-2" style="margin-top:22px"><div class="card"><h3 style="margin-top:0">Recent Contact Messages</h3>${(contacts || []).map(c => `<div class="task-card"><strong>${escapeHTML(c.subject)}</strong><p class="muted">${escapeHTML(c.message)}</p><small>${escapeHTML(c.name)} • ${escapeHTML(c.email)} • ${formatTime(c.created_at)}</small></div>`).join('') || '<div class="empty">No contact messages.</div>'}</div><div class="card"><h3 style="margin-top:0">Setup Notes</h3><div class="log-panel">Admin deletion is implemented as safe soft-disable for users because client-side apps cannot delete Supabase Auth users without a service role or Edge Function. Workspaces, messages, files, and contact messages can be managed from their pages.</div></div></div>`;
}

async function usersPage() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return toast(error.message, 'error');
  $('#content').innerHTML = `<div class="card"><h2 style="margin-top:0">Manage Users</h2><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>${(data || []).map(u => `<tr><td><strong>${escapeHTML(u.full_name)}</strong></td><td>${escapeHTML(u.email)}</td><td><span class="badge ${u.role === 'admin' ? 'warning' : 'primary'}">${escapeHTML(u.role)}</span></td><td><span class="badge ${u.is_disabled ? 'danger' : u.status === 'online' ? 'success' : ''}">${u.is_disabled ? 'disabled' : escapeHTML(u.status)}</span></td><td>${formatTime(u.created_at)}</td><td><button class="btn btn-sm ${u.is_disabled ? 'btn-success' : 'btn-danger'}" data-toggle="${u.id}" data-disabled="${u.is_disabled}">${u.is_disabled ? 'Enable' : 'Disable'}</button> <button class="btn btn-sm btn-outline" data-admin="${u.id}" data-role="${u.role}">${u.role === 'admin' ? 'Make User' : 'Make Admin'}</button></td></tr>`).join('')}</tbody></table></div></div>`;
  document.querySelectorAll('[data-toggle]').forEach(btn => btn.onclick = async () => { await supabase.from('profiles').update({ is_disabled: btn.dataset.disabled !== 'true' }).eq('id', btn.dataset.toggle); usersPage(); });
  document.querySelectorAll('[data-admin]').forEach(btn => btn.onclick = async () => { await supabase.from('profiles').update({ role: btn.dataset.role === 'admin' ? 'user' : 'admin' }).eq('id', btn.dataset.admin); usersPage(); });
}

async function workspacesPage() {
  const { data, error } = await supabase.from('workspaces').select('*, owner:profiles(full_name,email)').order('created_at', { ascending: false });
  if (error) return toast(error.message, 'error');
  $('#content').innerHTML = `<div class="card"><h2 style="margin-top:0">Manage Workspaces</h2><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Owner</th><th>Invite</th><th>Created</th><th>Action</th></tr></thead><tbody>${(data || []).map(w => `<tr><td><strong>${escapeHTML(w.name)}</strong><div class="muted">${escapeHTML(w.description || '')}</div></td><td>${escapeHTML(w.owner?.full_name || 'Unknown')}<div class="muted">${escapeHTML(w.owner?.email || '')}</div></td><td><span class="invite-code">${escapeHTML(w.invite_code)}</span></td><td>${formatTime(w.created_at)}</td><td><a class="btn btn-sm btn-outline" href="/workspace.html?id=${w.id}">Open</a> <button class="btn btn-sm btn-danger" data-delete="${w.id}">Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;
  document.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = async () => { if (!confirm('Delete workspace?')) return; await supabase.from('workspaces').delete().eq('id', btn.dataset.delete); workspacesPage(); });
}

async function messagesPage() {
  const [{ data: contacts }, { data: messages }] = await Promise.all([
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
    supabase.from('messages').select('*, sender:profiles(full_name,email), room:rooms(name), workspace:workspaces(name)').order('created_at', { ascending: false }).limit(80)
  ]);
  $('#content').innerHTML = `<div class="grid grid-2"><div class="card"><h2 style="margin-top:0">Contact Messages</h2>${(contacts || []).map(c => `<div class="task-card"><strong>${escapeHTML(c.subject)}</strong><p>${escapeHTML(c.message)}</p><small class="muted">${escapeHTML(c.name)} • ${escapeHTML(c.email)} • ${formatTime(c.created_at)}</small><br><button class="btn btn-danger btn-sm" data-contact="${c.id}">Delete</button></div>`).join('') || '<div class="empty">No contact messages.</div>'}</div><div class="card"><h2 style="margin-top:0">Recent Chat Messages</h2>${(messages || []).map(m => `<div class="task-card"><strong>${escapeHTML(m.sender?.full_name || 'Unknown')}</strong><p>${escapeHTML(m.deleted ? 'Deleted message' : m.text || m.file_name || '')}</p><small class="muted">${escapeHTML(m.workspace?.name || '')} / #${escapeHTML(m.room?.name || '')} • ${formatTime(m.created_at)}</small><br><button class="btn btn-danger btn-sm" data-message="${m.id}">Hide</button></div>`).join('') || '<div class="empty">No messages.</div>'}</div></div>`;
  document.querySelectorAll('[data-contact]').forEach(btn => btn.onclick = async () => { await supabase.from('contact_messages').delete().eq('id', btn.dataset.contact); messagesPage(); });
  document.querySelectorAll('[data-message]').forEach(btn => btn.onclick = async () => { await supabase.from('messages').update({ deleted: true, text: '' }).eq('id', btn.dataset.message); messagesPage(); });
}

async function filesPage() {
  const { data, error } = await supabase.from('uploaded_files').select('*, uploader:profiles(full_name,email), workspace:workspaces(name)').order('created_at', { ascending: false }).limit(120);
  if (error) return toast(error.message, 'error');
  $('#content').innerHTML = `<div class="card"><h2 style="margin-top:0">Manage Uploaded Files</h2><div class="table-wrap"><table class="table"><thead><tr><th>File</th><th>Workspace</th><th>Uploader</th><th>Size</th><th>Created</th><th>Action</th></tr></thead><tbody>${(data || []).map(f => `<tr><td><strong>${escapeHTML(f.file_name)}</strong><div class="muted">${escapeHTML(f.file_type || '')}</div></td><td>${escapeHTML(f.workspace?.name || 'N/A')}</td><td>${escapeHTML(f.uploader?.full_name || 'Unknown')}</td><td>${fileSize(f.file_size)}</td><td>${formatTime(f.created_at)}</td><td><a class="btn btn-sm btn-outline" target="_blank" href="${escapeHTML(f.file_url)}">Open</a> <button class="btn btn-sm btn-danger" data-delete="${f.id}">Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;
  document.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = async () => { if (!confirm('Delete file record?')) return; await supabase.from('uploaded_files').delete().eq('id', btn.dataset.delete); filesPage(); });
}
