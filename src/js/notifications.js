import { supabase } from './supabaseClient.js';
import { $, escapeHTML, formatTime, requireAuth, setupShell, sidebarTemplate, toast, topbarTemplate } from './ui.js';

const app = $('#app');
app.innerHTML = `${sidebarTemplate('notifications')}<main class="main">${topbarTemplate('Notifications', 'Read, filter, and manage your updates.')}<section class="content" id="content"></section></main>`;
setupShell('notifications');
const auth = await requireAuth();
if (auth) initNotifications(auth);
let channel = null;

async function initNotifications({ user }) {
  $('#content').innerHTML = `<div class="card" style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2 style="margin:0">Notification Center</h2><p class="muted" style="margin:4px 0 0">Stay updated about messages, tasks, files, and workspace activity.</p></div><button class="btn btn-primary" id="markAll">Mark all read</button></div><div id="notificationList" class="grid" style="margin-top:20px"></div>`;
  $('#markAll').onclick = async () => { await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id); toast('All notifications marked as read.'); loadNotifications(user); };
  await loadNotifications(user);
  channel = supabase.channel(`notifications-${user.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadNotifications(user))
    .subscribe();
}

async function loadNotifications(user) {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return toast(error.message, 'error');
  $('#notificationList').innerHTML = (data || []).map(n => `<article class="card notification-item ${n.is_read ? '' : 'unread'}"><div style="font-size:1.8rem">${n.type === 'task' ? '✅' : n.type === 'file' ? '📁' : n.type === 'private_message' ? '🔐' : '🔔'}</div><div style="flex:1"><h3 style="margin:0">${escapeHTML(n.title)}</h3><p class="muted" style="margin:4px 0 10px">${escapeHTML(n.message)}</p><small class="muted">${formatTime(n.created_at)}</small></div>${n.is_read ? '<span class="badge">Read</span>' : `<button class="btn btn-sm btn-primary" data-read="${n.id}">Mark Read</button>`}</article>`).join('') || '<div class="empty">No notifications.</div>';
  document.querySelectorAll('[data-read]').forEach(btn => btn.onclick = async () => { await supabase.from('notifications').update({ is_read: true }).eq('id', btn.dataset.read); loadNotifications(user); });
}
