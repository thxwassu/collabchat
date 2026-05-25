import { supabase } from './supabaseClient.js';
import { $, escapeHTML, formatTime, requireAuth, renderAvatar, setupShell, sidebarTemplate, toast, topbarTemplate, userWorkspaces } from './ui.js';

const app = $('#app');
app.innerHTML = `${sidebarTemplate('dashboard')}<main class="main">${topbarTemplate('Dashboard', 'Live overview of your workspaces, messages, tasks, and members.')}<section class="content" id="content"></section></main>`;
setupShell('dashboard');

const state = await requireAuth();
const content = $('#content');
if (state) loadDashboard(state);

async function loadDashboard({ user, profile }) {
  try {
    const workspaces = await userWorkspaces(user.id);
    const workspaceIds = workspaces.map((w) => w.id);
    const [{ data: tasks }, { data: notifications }, { data: online }] = await Promise.all([
      workspaceIds.length ? supabase.from('tasks').select('*, workspace:workspaces(name), assignee:profiles!tasks_assigned_to_fkey(full_name)').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(6) : { data: [] },
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('profiles').select('*').eq('status', 'online').limit(12)
    ]);

    let messages = [];
    if (workspaceIds.length) {
      const { data } = await supabase.from('messages').select('*, sender:profiles(full_name, avatar_url), room:rooms(name)').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(8);
      messages = data || [];
    }

    content.innerHTML = `
      <div class="grid grid-4">
        <div class="card stat-card"><div><span class="muted">Joined Workspaces</span><strong>${workspaces.length}</strong></div><div class="icon">🏢</div></div>
        <div class="card stat-card"><div><span class="muted">Recent Tasks</span><strong>${tasks?.length || 0}</strong></div><div class="icon">✅</div></div>
        <div class="card stat-card"><div><span class="muted">Unread Alerts</span><strong>${(notifications || []).filter(n => !n.is_read).length}</strong></div><div class="icon">🔔</div></div>
        <div class="card stat-card"><div><span class="muted">Online Users</span><strong>${online?.length || 0}</strong></div><div class="icon">🟢</div></div>
      </div>

      <div class="grid grid-2" style="margin-top:22px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div><h2 style="margin:0">Welcome, ${escapeHTML(profile?.full_name || 'User')} 👋</h2><p class="muted" style="margin:.2rem 0 0">Create or join a workspace to start collaborating.</p></div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a class="btn btn-primary" href="/workspaces.html">Create Workspace</a>
            <a class="btn btn-outline" href="/chat.html">Open Chat</a>
            <a class="btn btn-outline" href="/tasks.html">View Tasks</a>
          </div>
        </div>
        <div class="card">
          <h3 style="margin-top:0">Online Teammates</h3>
          <div class="grid" style="gap:10px">
            ${(online || []).map((p) => `<div class="member-row">${renderAvatar(p)}<div style="flex:1"><strong>${escapeHTML(p.full_name)}</strong><div class="muted">${escapeHTML(p.email)}</div></div><span class="status-dot ${p.status}"></span></div>`).join('') || '<div class="empty">No online users yet.</div>'}
          </div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:22px">
        <div class="card">
          <h3 style="margin-top:0">Recent Messages</h3>
          <div class="grid" style="gap:12px">
            ${messages.map((m) => `<div class="message-bubble"><div>${renderAvatar(m.sender)}</div><div class="bubble"><strong>${escapeHTML(m.sender?.full_name || 'Unknown')}</strong><div>${escapeHTML(m.deleted ? 'Message deleted' : m.text || m.file_name || '')}</div><small class="muted">#${escapeHTML(m.room?.name || 'room')} • ${formatTime(m.created_at)}</small></div></div>`).join('') || '<div class="empty">No messages yet.</div>'}
          </div>
        </div>
        <div class="card">
          <h3 style="margin-top:0">Recent Tasks</h3>
          <div class="grid" style="gap:12px">
            ${(tasks || []).map((t) => `<div class="task-card"><strong>${escapeHTML(t.title)}</strong><p class="muted" style="margin:6px 0">${escapeHTML(t.description || 'No description')}</p><span class="badge ${t.status === 'Completed' ? 'success' : t.priority === 'High' ? 'danger' : 'primary'}">${escapeHTML(t.status)}</span> <span class="badge warning">${escapeHTML(t.priority)}</span></div>`).join('') || '<div class="empty">No tasks yet.</div>'}
          </div>
        </div>
      </div>`;
  } catch (error) {
    toast(error.message, 'error');
  }
}
