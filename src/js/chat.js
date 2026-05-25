import { supabase } from './supabaseClient.js';
import { $, escapeHTML, fileSize, formatTime, getQuery, renderAvatar, requireAuth, setQuery, setupShell, sidebarTemplate, toast, topbarTemplate, uploadToBucket, userWorkspaces, workspaceMembers } from './ui.js';

const app = $('#app');
app.innerHTML = `${sidebarTemplate('chat')}<main class="main">${topbarTemplate('Group Chat', 'Real-time rooms with files, typing indicators, and message tools.')}<section class="chat-layout" id="chatLayout"></section></main>`;
setupShell('chat');
const auth = await requireAuth();
if (auth) initChat(auth);

let currentWorkspace = null;
let currentRoom = null;
let rooms = [];
let members = [];
let messageChannel = null;
let roomChannel = null;
let typingTimer = null;

async function initChat({ user, profile }) {
  const workspaces = await userWorkspaces(user.id);
  if (!workspaces.length) {
    $('#chatLayout').innerHTML = '<div class="content" style="grid-column:1/-1"><div class="empty">Create or join a workspace before using group chat. <br><br><a class="btn btn-primary" href="/workspaces.html">Go to Workspaces</a></div></div>';
    return;
  }
  const wsId = getQuery('workspace') || workspaces[0].id;
  currentWorkspace = workspaces.find((w) => w.id === wsId) || workspaces[0];
  await loadWorkspaceRooms();
  const roomId = getQuery('room') || rooms[0]?.id;
  currentRoom = rooms.find((r) => r.id === roomId) || rooms[0];
  setQuery({ workspace: currentWorkspace.id, room: currentRoom?.id });
  renderShell(workspaces, user, profile);
  await loadMessages(user);
  subscribeMessages(user, profile);
  subscribePresence(user, profile);
}

async function loadWorkspaceRooms() {
  const [{ data: roomData }, memberRows] = await Promise.all([
    supabase.from('rooms').select('*').eq('workspace_id', currentWorkspace.id).order('created_at'),
    workspaceMembers(currentWorkspace.id)
  ]);
  rooms = roomData || [];
  members = memberRows || [];
}

function renderShell(workspaces, user, profile) {
  $('#chatLayout').innerHTML = `
    <aside class="rooms-panel">
      <div class="field"><label>Workspace</label><select id="workspaceSelect" class="select">${workspaces.map(w => `<option value="${w.id}" ${w.id === currentWorkspace.id ? 'selected' : ''}>${escapeHTML(w.name)}</option>`).join('')}</select></div>
      <h3>Channels</h3>
      <div id="roomsList">${rooms.map(r => `<div class="room-link ${r.id === currentRoom?.id ? 'active' : ''}" data-room="${r.id}"><span># ${escapeHTML(r.name)}</span></div>`).join('')}</div>
    </aside>
    <section class="chat-main">
      <div class="chat-header"><div><strong># ${escapeHTML(currentRoom?.name || 'No room')}</strong><div class="muted" id="typingText">${members.length} members</div></div><div style="display:flex;gap:8px"><a class="btn btn-outline btn-sm" href="/workspace.html?id=${currentWorkspace.id}">Workspace</a><button class="btn btn-outline btn-sm" id="searchBtn">Search</button></div></div>
      <div class="messages" id="messages"></div>
      <form class="composer" id="messageForm">
        <input type="file" id="fileInput" class="hidden" />
        <button class="btn btn-outline" type="button" id="fileBtn">📎</button>
        <textarea class="input" id="messageText" placeholder="Message #${escapeHTML(currentRoom?.name || '')}" rows="1"></textarea>
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
    </section>
    <aside class="members-panel"><h3>Members</h3><div id="membersList">${members.map(m => `<div class="member-row"><span class="status-dot ${m.profile?.status}"></span>${renderAvatar(m.profile)}<div><strong>${escapeHTML(m.profile?.full_name || 'User')}</strong><div class="muted">${escapeHTML(m.role)}</div></div></div>`).join('')}</div></aside>`;

  $('#workspaceSelect').addEventListener('change', async (event) => {
    currentWorkspace = workspaces.find((w) => w.id === event.target.value);
    await loadWorkspaceRooms();
    currentRoom = rooms[0];
    setQuery({ workspace: currentWorkspace.id, room: currentRoom?.id });
    renderShell(workspaces, user, profile);
    await loadMessages(user);
    subscribeMessages(user, profile);
    subscribePresence(user, profile);
  });

  $('#roomsList').addEventListener('click', async (event) => {
    const row = event.target.closest('[data-room]');
    if (!row) return;
    currentRoom = rooms.find((r) => r.id === row.dataset.room);
    setQuery({ workspace: currentWorkspace.id, room: currentRoom.id });
    renderShell(workspaces, user, profile);
    await loadMessages(user);
    subscribeMessages(user, profile);
    subscribePresence(user, profile);
  });

  $('#fileBtn').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', () => sendFile(user));
  $('#messageText').addEventListener('input', () => sendTyping(user, profile));
  $('#messageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendMessage(user);
  });
  $('#searchBtn').addEventListener('click', () => searchMessages(user));
}

async function loadMessages(user) {
  const box = $('#messages');
  if (!currentRoom) {
    box.innerHTML = '<div class="empty">No room selected.</div>';
    return;
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles(full_name,email,avatar_url)')
    .eq('room_id', currentRoom.id)
    .order('created_at', { ascending: true })
    .limit(150);
  if (error) return toast(error.message, 'error');
  renderMessages(data || [], user);
}

function renderMessages(messages, user) {
  const box = $('#messages');
  box.innerHTML = messages.map((m) => messageHTML(m, user)).join('') || '<div class="empty">No messages yet. Send the first one. 💬</div>';
  box.scrollTop = box.scrollHeight;
  box.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deleteMessage(btn.dataset.delete)));
  box.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => editMessage(btn.dataset.edit, btn.dataset.text || '')));
  box.querySelectorAll('[data-pin]').forEach((btn) => btn.addEventListener('click', () => pinMessage(btn.dataset.pin, btn.dataset.pinned === 'true')));
}

function messageHTML(m, user) {
  const mine = m.sender_id === user.id;
  const body = m.deleted ? '<em class="muted">Message deleted</em>' : renderMessageContent(m);
  return `<div class="msg ${mine ? 'mine' : ''}">
    ${mine ? '' : renderAvatar(m.sender)}
    <div class="msg-body">
      <div class="msg-meta"><strong>${escapeHTML(m.sender?.full_name || 'Unknown')}</strong><span>${formatTime(m.created_at)}</span>${m.edited ? '<span>edited</span>' : ''}${m.pinned ? '<span class="badge warning">Pinned</span>' : ''}</div>
      <div>${body}</div>
      ${mine && !m.deleted ? `<div class="msg-actions"><button data-edit="${m.id}" data-text="${escapeHTML(m.text || '')}">Edit</button><button data-delete="${m.id}">Delete</button><button data-pin="${m.id}" data-pinned="${m.pinned}">${m.pinned ? 'Unpin' : 'Pin'}</button></div>` : ''}
    </div>
    ${mine ? renderAvatar(m.sender) : ''}
  </div>`;
}

function renderMessageContent(m) {
  if (m.message_type === 'image') return `<a href="${escapeHTML(m.file_url)}" target="_blank"><img src="${escapeHTML(m.file_url)}" alt="${escapeHTML(m.file_name || 'image')}" style="max-width:320px;border-radius:14px;margin-top:6px"></a><div>${escapeHTML(m.text || m.file_name || '')}</div>`;
  if (m.message_type === 'file') return `<div class="file-card"><div><strong>📎 ${escapeHTML(m.file_name || 'File')}</strong><div class="muted">${fileSize(m.file_size)}</div></div><a class="btn btn-sm btn-outline" target="_blank" href="${escapeHTML(m.file_url)}">Download</a></div>`;
  return escapeHTML(m.text || '');
}

async function sendMessage(user) {
  const input = $('#messageText');
  const text = input.value.trim();
  if (!text || !currentRoom) return;
  input.value = '';
  const { error } = await supabase.from('messages').insert({ workspace_id: currentWorkspace.id, room_id: currentRoom.id, sender_id: user.id, text, message_type: 'text' });
  if (error) toast(error.message, 'error');
}

async function sendFile(user) {
  const file = $('#fileInput').files[0];
  if (!file || !currentRoom) return;
  try {
    toast('Uploading file...', 'warning');
    const uploaded = await uploadToBucket('collab-files', file, `${currentWorkspace.id}/${currentRoom.id}`);
    const type = file.type.startsWith('image/') ? 'image' : 'file';
    await supabase.from('uploaded_files').insert({ workspace_id: currentWorkspace.id, room_id: currentRoom.id, uploaded_by: user.id, file_url: uploaded.publicUrl, file_name: file.name, file_type: file.type, file_size: file.size });
    await supabase.from('messages').insert({ workspace_id: currentWorkspace.id, room_id: currentRoom.id, sender_id: user.id, text: file.name, message_type: type, file_url: uploaded.publicUrl, file_name: file.name, file_size: file.size });
    toast('File uploaded. 📁');
    $('#fileInput').value = '';
  } catch (error) {
    toast(error.message, 'error');
  }
}

function subscribeMessages(user, profile) {
  if (messageChannel) supabase.removeChannel(messageChannel);
  if (!currentRoom) return;
  messageChannel = supabase.channel(`messages-${currentRoom.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoom.id}` }, () => loadMessages(user))
    .subscribe();
}

function subscribePresence(user, profile) {
  if (roomChannel) supabase.removeChannel(roomChannel);
  if (!currentRoom) return;
  roomChannel = supabase.channel(`room-presence-${currentRoom.id}`, { config: { presence: { key: user.id } } });
  roomChannel
    .on('presence', { event: 'sync' }, () => {
      const count = Object.keys(roomChannel.presenceState()).length;
      const text = $('#typingText');
      if (text && !text.dataset.typing) text.textContent = `${members.length} members • ${count} online in room`;
    })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId === user.id) return;
      const text = $('#typingText');
      if (!text) return;
      text.dataset.typing = 'true';
      text.textContent = `${payload.name} is typing...`;
      clearTimeout(window.__typingReset);
      window.__typingReset = setTimeout(() => {
        text.dataset.typing = '';
        text.textContent = `${members.length} members`;
      }, 1600);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await roomChannel.track({ name: profile?.full_name || user.email, online_at: new Date().toISOString() });
    });
}

function sendTyping(user, profile) {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    roomChannel?.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, name: profile?.full_name || user.email } });
  }, 140);
}

async function editMessage(id, text) {
  const next = prompt('Edit message', text);
  if (next === null) return;
  const { error } = await supabase.from('messages').update({ text: next.trim(), edited: true }).eq('id', id);
  if (error) toast(error.message, 'error');
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  const { error } = await supabase.from('messages').update({ deleted: true, text: '' }).eq('id', id);
  if (error) toast(error.message, 'error');
}

async function pinMessage(id, pinned) {
  const { error } = await supabase.from('messages').update({ pinned: !pinned }).eq('id', id);
  if (error) toast(error.message, 'error');
}

async function searchMessages(user) {
  const term = prompt('Search messages in this room');
  if (!term) return;
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles(full_name,email,avatar_url)')
    .eq('room_id', currentRoom.id)
    .ilike('text', `%${term}%`)
    .order('created_at', { ascending: true });
  if (error) return toast(error.message, 'error');
  renderMessages(data || [], user);
  toast(`Showing ${data?.length || 0} matching messages.`);
}
