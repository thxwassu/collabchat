import { supabase } from './supabaseClient.js';
import { $, bindModalTriggers, escapeHTML, formatTime, getQuery, modal, requireAuth, renderAvatar, setupShell, sidebarTemplate, toast, topbarTemplate, userWorkspaces, workspaceMembers } from './ui.js';

const app = $('#app');
const isDetails = location.pathname.includes('workspace.html');
app.innerHTML = `${sidebarTemplate('workspaces')}<main class="main">${topbarTemplate(isDetails ? 'Workspace Details' : 'Workspaces', isDetails ? 'Manage rooms, members, and workspace settings.' : 'Create, join, and manage your team spaces.')}<section class="content" id="content"></section></main>`;
setupShell('workspaces');
bindModalTriggers();
const auth = await requireAuth();
if (auth) isDetails ? loadWorkspaceDetails(auth) : loadWorkspaces(auth);

function generateInviteCode() {
  return `CC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

async function loadWorkspaces({ user }) {
  const content = $('#content');
  content.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2 style="margin-top:0">Create Workspace</h2>
        <form class="form" id="createWorkspaceForm">
          <div class="field"><label>Workspace Name</label><input class="input" name="name" required placeholder="e.g. Final Year Project Team"></div>
          <div class="field"><label>Description</label><textarea class="textarea" name="description" placeholder="Purpose of this workspace"></textarea></div>
          <button class="btn btn-primary" type="submit">Create Workspace</button>
        </form>
      </div>
      <div class="card">
        <h2 style="margin-top:0">Join Workspace</h2>
        <form class="form" id="joinWorkspaceForm">
          <div class="field"><label>Invite Code</label><input class="input" name="inviteCode" required placeholder="CC-ABCD-1234"></div>
          <button class="btn btn-dark" type="submit">Join Workspace</button>
        </form>
      </div>
    </div>
    <div style="margin-top:24px;display:flex;justify-content:space-between;align-items:center;gap:12px"><h2 style="margin:0">My Workspaces</h2><a class="btn btn-outline btn-sm" href="/chat.html">Open Chat</a></div>
    <div id="workspaceGrid" class="grid grid-3" style="margin-top:16px"></div>`;

  await renderWorkspaceGrid(user.id);

  $('#createWorkspaceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const description = String(form.get('description') || '').trim();
    if (!name) return toast('Workspace name is required.', 'warning');
    const invite_code = generateInviteCode();
    const { data: ws, error } = await supabase.from('workspaces').insert({ name, description, owner_id: user.id, invite_code }).select().single();
    if (error) return toast(error.message, 'error');
    await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });
    const defaultRooms = ['General', 'Announcements', 'Frontend', 'Backend'].map((room) => ({ workspace_id: ws.id, name: room, description: `${room} channel`, created_by: user.id }));
    await supabase.from('rooms').insert(defaultRooms);
    await supabase.from('notifications').insert({ user_id: user.id, title: 'Workspace created', message: `${name} is ready with default rooms.`, type: 'workspace', ref_id: ws.id });
    toast('Workspace created successfully. 🚀');
    event.currentTarget.reset();
    renderWorkspaceGrid(user.id);
  });

  $('#joinWorkspaceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const inviteCode = String(new FormData(event.currentTarget).get('inviteCode') || '').trim().toUpperCase();
    const { data: ws, error } = await supabase.from('workspaces').select('*').eq('invite_code', inviteCode).single();
    if (error || !ws) return toast('Invalid invite code.', 'error');
    const { error: joinError } = await supabase.from('workspace_members').upsert({ workspace_id: ws.id, user_id: user.id, role: 'member' });
    if (joinError) return toast(joinError.message, 'error');
    await supabase.from('notifications').insert({ user_id: ws.owner_id, title: 'New workspace member', message: 'A new user joined your workspace.', type: 'workspace', ref_id: ws.id });
    toast(`Joined ${ws.name}. ✅`);
    event.currentTarget.reset();
    renderWorkspaceGrid(user.id);
  });
}

async function renderWorkspaceGrid(userId) {
  const grid = $('#workspaceGrid');
  const workspaces = await userWorkspaces(userId);
  grid.innerHTML = workspaces.map((w) => `
    <article class="card workspace-card">
      <div class="workspace-head"><div><h3 style="margin:0">${escapeHTML(w.name)}</h3><p class="muted" style="margin:6px 0 0">${escapeHTML(w.description || 'No description')}</p></div><span class="badge primary">${escapeHTML(w.memberRole)}</span></div>
      <div><span class="muted">Invite Code</span><div class="invite-code">${escapeHTML(w.invite_code)}</div></div>
      <small class="muted">Created ${formatTime(w.created_at)}</small>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:auto"><a class="btn btn-primary btn-sm" href="/workspace.html?id=${w.id}">Open</a><a class="btn btn-outline btn-sm" href="/chat.html?workspace=${w.id}">Chat</a><a class="btn btn-outline btn-sm" href="/tasks.html?workspace=${w.id}">Tasks</a></div>
    </article>`).join('') || '<div class="empty" style="grid-column:1/-1">No workspaces yet. Create or join one above.</div>';
}

async function loadWorkspaceDetails({ user }) {
  const id = getQuery('id');
  const content = $('#content');
  if (!id) {
    content.innerHTML = '<div class="empty">No workspace selected. Open a workspace from the Workspaces page.</div>';
    return;
  }
  const { data: ws, error } = await supabase.from('workspaces').select('*').eq('id', id).single();
  if (error) return content.innerHTML = `<div class="empty">${escapeHTML(error.message)}</div>`;
  const members = await workspaceMembers(id);
  const { data: rooms } = await supabase.from('rooms').select('*').eq('workspace_id', id).order('created_at');
  const myMember = members.find((m) => m.profile?.id === user.id);
  const isAdmin = myMember?.role === 'owner' || myMember?.role === 'admin';

  content.innerHTML = `
    <div class="admin-banner">
      <div><h2>${escapeHTML(ws.name)}</h2><p style="margin:0;color:#cbd5e1">${escapeHTML(ws.description || 'No description')}</p></div>
      <div><span class="muted" style="color:#bfdbfe">Invite Code</span><div class="invite-code">${escapeHTML(ws.invite_code)}</div></div>
    </div>
    <div class="grid grid-3" style="margin-top:22px">
      <div class="card stat-card"><div><span class="muted">Members</span><strong>${members.length}</strong></div><div class="icon">👥</div></div>
      <div class="card stat-card"><div><span class="muted">Rooms</span><strong>${rooms?.length || 0}</strong></div><div class="icon">#</div></div>
      <div class="card stat-card"><div><span class="muted">My Role</span><strong style="font-size:1.35rem">${escapeHTML(myMember?.role || 'member')}</strong></div><div class="icon">🛡️</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:22px">
      <div class="card"><h3 style="margin-top:0">Rooms</h3><form id="roomForm" class="form" style="margin-bottom:12px"><div class="field"><label>Create Room</label><input class="input" name="name" placeholder="Room name" ${isAdmin ? '' : 'disabled'}></div><button class="btn btn-primary" ${isAdmin ? '' : 'disabled'}>Create Room</button></form><div class="grid" style="gap:10px">${(rooms || []).map(r => `<div class="room-link"><div><strong># ${escapeHTML(r.name)}</strong><div class="muted">${escapeHTML(r.description || '')}</div></div><a class="btn btn-sm btn-outline" href="/chat.html?workspace=${id}&room=${r.id}">Open</a></div>`).join('') || '<div class="empty">No rooms found.</div>'}</div></div>
      <div class="card"><h3 style="margin-top:0">Members</h3><div class="grid" style="gap:10px">${members.map(m => `<div class="member-row">${renderAvatar(m.profile)}<div style="flex:1"><strong>${escapeHTML(m.profile?.full_name || 'User')}</strong><div class="muted">${escapeHTML(m.profile?.email || '')}</div></div><span class="badge">${escapeHTML(m.role)}</span></div>`).join('')}</div></div>
    </div>
    <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="/chat.html?workspace=${id}">Open Workspace Chat</a><a class="btn btn-outline" href="/tasks.html?workspace=${id}">Workspace Tasks</a>${isAdmin ? '<button id="deleteWorkspace" class="btn btn-danger">Delete Workspace</button>' : '<button id="leaveWorkspace" class="btn btn-outline">Leave Workspace</button>'}</div>`;

  $('#roomForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') || '').trim();
    if (!name) return toast('Room name is required.', 'warning');
    const { error: roomError } = await supabase.from('rooms').insert({ workspace_id: id, name, description: `${name} room`, created_by: user.id });
    if (roomError) return toast(roomError.message, 'error');
    toast('Room created.');
    loadWorkspaceDetails({ user });
  });

  $('#deleteWorkspace')?.addEventListener('click', async () => {
    if (!confirm('Delete this workspace and all related rooms/messages/tasks?')) return;
    const { error: deleteError } = await supabase.from('workspaces').delete().eq('id', id);
    if (deleteError) return toast(deleteError.message, 'error');
    toast('Workspace deleted.');
    window.location.href = '/workspaces.html';
  });

  $('#leaveWorkspace')?.addEventListener('click', async () => {
    if (!confirm('Leave this workspace?')) return;
    await supabase.from('workspace_members').delete().eq('workspace_id', id).eq('user_id', user.id);
    toast('You left the workspace.');
    window.location.href = '/workspaces.html';
  });
}
