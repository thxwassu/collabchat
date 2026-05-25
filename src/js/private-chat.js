import { supabase } from './supabaseClient.js';
import { $, escapeHTML, formatTime, renderAvatar, requireAuth, setupShell, sidebarTemplate, toast, topbarTemplate, uploadToBucket, userWorkspaces, workspaceMembers } from './ui.js';

const app = $('#app');
app.innerHTML = `${sidebarTemplate('private')}<main class="main">${topbarTemplate('Private Chat', 'One-to-one messages with real-time delivery and file sharing.')}<section class="chat-layout" id="privateLayout"></section></main>`;
setupShell('private');
const auth = await requireAuth();
if (auth) initPrivateChat(auth);

let selectedUser = null;
let contacts = [];
let pmChannel = null;

async function initPrivateChat({ user, profile }) {
  const workspaces = await userWorkspaces(user.id);
  const map = new Map();
  for (const ws of workspaces) {
    const members = await workspaceMembers(ws.id);
    members.forEach((m) => {
      if (m.profile?.id && m.profile.id !== user.id) map.set(m.profile.id, m.profile);
    });
  }
  contacts = [...map.values()];
  selectedUser = contacts[0] || null;
  renderLayout(user, profile);
  if (selectedUser) {
    await loadThread(user);
    subscribeThread(user);
  }
}

function renderLayout(user, profile) {
  $('#privateLayout').innerHTML = `
    <aside class="rooms-panel"><h3>People</h3><input class="input" id="memberSearch" placeholder="Search members" style="margin-bottom:12px"><div id="contactList">${contactListHTML()}</div></aside>
    <section class="chat-main">
      <div class="chat-header"><div>${selectedUser ? `<strong>${escapeHTML(selectedUser.full_name)}</strong><div class="muted">${escapeHTML(selectedUser.email)} • ${escapeHTML(selectedUser.status)}</div>` : '<strong>No contact selected</strong>'}</div></div>
      <div class="messages" id="pmMessages"></div>
      <form class="composer" id="pmForm">
        <input type="file" id="pmFile" class="hidden">
        <button class="btn btn-outline" id="pmFileBtn" type="button">📎</button>
        <textarea class="input" id="pmText" rows="1" placeholder="Private message"></textarea>
        <button class="btn btn-primary">Send</button>
      </form>
    </section>
    <aside class="members-panel"><h3>Profile</h3>${selectedUser ? `<div class="card center">${renderAvatar(selectedUser, 'profile-avatar')}<h3>${escapeHTML(selectedUser.full_name)}</h3><p class="muted">${escapeHTML(selectedUser.bio || 'No bio')}</p><span class="badge ${selectedUser.status === 'online' ? 'success' : ''}">${escapeHTML(selectedUser.status)}</span></div>` : '<div class="empty">Choose a person.</div>'}</aside>`;

  $('#contactList')?.addEventListener('click', async (event) => {
    const row = event.target.closest('[data-user]');
    if (!row) return;
    selectedUser = contacts.find((c) => c.id === row.dataset.user);
    renderLayout(user, profile);
    await loadThread(user);
    subscribeThread(user);
  });
  $('#memberSearch')?.addEventListener('input', (event) => {
    const term = event.target.value.toLowerCase();
    $('#contactList').innerHTML = contactListHTML(term);
  });
  $('#pmForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    sendPrivateText(user);
  });
  $('#pmFileBtn')?.addEventListener('click', () => $('#pmFile').click());
  $('#pmFile')?.addEventListener('change', () => sendPrivateFile(user));
}

function contactListHTML(term = '') {
  const filtered = contacts.filter((c) => `${c.full_name} ${c.email}`.toLowerCase().includes(term));
  return filtered.map((c) => `<div class="member-row ${selectedUser?.id === c.id ? 'active' : ''}" data-user="${c.id}"><span class="status-dot ${c.status}"></span>${renderAvatar(c)}<div><strong>${escapeHTML(c.full_name)}</strong><div class="muted">${escapeHTML(c.email)}</div></div></div>`).join('') || '<div class="empty">No workspace members found.</div>';
}

async function loadThread(user) {
  const box = $('#pmMessages');
  if (!selectedUser) return box.innerHTML = '<div class="empty">Join a workspace with members to start private chat.</div>';
  const { data, error } = await supabase
    .from('private_messages')
    .select('*, sender:profiles!private_messages_sender_id_fkey(full_name,email,avatar_url), receiver:profiles!private_messages_receiver_id_fkey(full_name,email,avatar_url)')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true });
  if (error) return toast(error.message, 'error');
  await supabase.from('private_messages').update({ seen: true }).eq('sender_id', selectedUser.id).eq('receiver_id', user.id);
  box.innerHTML = (data || []).map((m) => pmHTML(m, user)).join('') || '<div class="empty">No messages yet.</div>';
  box.scrollTop = box.scrollHeight;
}

function pmHTML(m, user) {
  const mine = m.sender_id === user.id;
  const content = m.message_type === 'image'
    ? `<a href="${escapeHTML(m.file_url)}" target="_blank"><img src="${escapeHTML(m.file_url)}" style="max-width:300px;border-radius:14px"></a>`
    : m.message_type === 'file'
      ? `<a class="btn btn-outline btn-sm" target="_blank" href="${escapeHTML(m.file_url)}">📎 ${escapeHTML(m.file_name || 'Download')}</a>`
      : escapeHTML(m.text);
  return `<div class="msg ${mine ? 'mine' : ''}">${mine ? '' : renderAvatar(m.sender)}<div class="msg-body"><div class="msg-meta"><strong>${escapeHTML(m.sender?.full_name || 'User')}</strong><span>${formatTime(m.created_at)}</span>${mine ? `<span>${m.seen ? 'Seen' : 'Sent'}</span>` : ''}</div>${content}</div>${mine ? renderAvatar(m.sender) : ''}</div>`;
}

async function sendPrivateText(user) {
  if (!selectedUser) return;
  const input = $('#pmText');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const { error } = await supabase.from('private_messages').insert({ sender_id: user.id, receiver_id: selectedUser.id, text, message_type: 'text' });
  if (error) return toast(error.message, 'error');
  await supabase.from('notifications').insert({ user_id: selectedUser.id, title: 'New private message', message: text.slice(0, 90), type: 'private_message' });
}

async function sendPrivateFile(user) {
  const file = $('#pmFile').files[0];
  if (!file || !selectedUser) return;
  try {
    const uploaded = await uploadToBucket('collab-files', file, `private/${user.id}`);
    const type = file.type.startsWith('image/') ? 'image' : 'file';
    await supabase.from('private_messages').insert({ sender_id: user.id, receiver_id: selectedUser.id, text: file.name, message_type: type, file_url: uploaded.publicUrl, file_name: file.name });
    await supabase.from('notifications').insert({ user_id: selectedUser.id, title: 'New private file', message: file.name, type: 'file' });
    $('#pmFile').value = '';
  } catch (error) { toast(error.message, 'error'); }
}

function subscribeThread(user) {
  if (pmChannel) supabase.removeChannel(pmChannel);
  if (!selectedUser) return;
  pmChannel = supabase.channel(`private-${user.id}-${selectedUser.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, (payload) => {
      const row = payload.new || payload.old;
      const pair = [row.sender_id, row.receiver_id];
      if (pair.includes(user.id) && pair.includes(selectedUser.id)) loadThread(user);
    })
    .subscribe();
}
