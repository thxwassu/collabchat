import { supabase } from './supabaseClient.js';
import { $, escapeHTML, formatDate, getQuery, requireAuth, setupShell, sidebarTemplate, toast, topbarTemplate, userWorkspaces, workspaceMembers } from './ui.js';

const app = $('#app');
app.innerHTML = `${sidebarTemplate('tasks')}<main class="main">${topbarTemplate('Tasks', 'Assign, track, filter, and update work in real time.')}<section class="content" id="content"></section></main>`;
setupShell('tasks');
const auth = await requireAuth();
if (auth) initTasks(auth);
let currentWorkspace = null;
let members = [];
let taskChannel = null;

async function initTasks({ user }) {
  const workspaces = await userWorkspaces(user.id);
  if (!workspaces.length) return $('#content').innerHTML = '<div class="empty">Create or join a workspace to use tasks. <br><br><a class="btn btn-primary" href="/workspaces.html">Go to Workspaces</a></div>';
  currentWorkspace = workspaces.find(w => w.id === getQuery('workspace')) || workspaces[0];
  members = await workspaceMembers(currentWorkspace.id);
  renderTasksShell(workspaces, user);
  await loadTasks();
  subscribeTasks();
}

function renderTasksShell(workspaces, user) {
  $('#content').innerHTML = `
    <div class="card" style="margin-bottom:20px;display:flex;justify-content:space-between;gap:14px;align-items:end;flex-wrap:wrap">
      <div class="field" style="min-width:260px"><label>Workspace</label><select id="workspaceSelect" class="select">${workspaces.map(w => `<option value="${w.id}" ${w.id === currentWorkspace.id ? 'selected' : ''}>${escapeHTML(w.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Filter</label><select id="statusFilter" class="select"><option value="all">All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></div>
      <button class="btn btn-primary" id="quickTask">Create Task</button>
    </div>
    <div class="card" id="taskFormCard" style="display:none;margin-bottom:20px">
      <h3 style="margin-top:0">Create Task</h3>
      <form class="form" id="taskForm">
        <div class="grid grid-2"><div class="field"><label>Title</label><input class="input" name="title" required></div><div class="field"><label>Assign To</label><select class="select" name="assigned_to">${members.map(m => `<option value="${m.profile.id}">${escapeHTML(m.profile.full_name)}</option>`).join('')}</select></div></div>
        <div class="field"><label>Description</label><textarea class="textarea" name="description"></textarea></div>
        <div class="grid grid-3"><div class="field"><label>Priority</label><select class="select" name="priority"><option>Low</option><option selected>Medium</option><option>High</option></select></div><div class="field"><label>Status</label><select class="select" name="status"><option>Pending</option><option>In Progress</option><option>Completed</option></select></div><div class="field"><label>Due Date</label><input class="input" name="due_date" type="date"></div></div>
        <button class="btn btn-primary">Save Task</button>
      </form>
    </div>
    <div class="task-board"><div class="task-col"><h3>Pending</h3><div id="Pending"></div></div><div class="task-col"><h3>In Progress</h3><div id="In Progress"></div></div><div class="task-col"><h3>Completed</h3><div id="Completed"></div></div></div>`;

  $('#quickTask').onclick = () => $('#taskFormCard').style.display = $('#taskFormCard').style.display === 'none' ? 'block' : 'none';
  $('#workspaceSelect').onchange = async (event) => {
    currentWorkspace = workspaces.find(w => w.id === event.target.value);
    members = await workspaceMembers(currentWorkspace.id);
    renderTasksShell(workspaces, user);
    await loadTasks();
    subscribeTasks();
  };
  $('#statusFilter').onchange = loadTasks;
  $('#taskForm').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      workspace_id: currentWorkspace.id,
      title: String(form.get('title')).trim(),
      description: String(form.get('description') || '').trim(),
      assigned_to: form.get('assigned_to'),
      assigned_by: user.id,
      priority: form.get('priority'),
      status: form.get('status'),
      due_date: form.get('due_date') || null
    };
    const { data, error } = await supabase.from('tasks').insert(payload).select().single();
    if (error) return toast(error.message, 'error');
    await supabase.from('notifications').insert({ user_id: payload.assigned_to, title: 'New task assigned', message: payload.title, type: 'task', ref_id: data.id });
    event.currentTarget.reset();
    $('#taskFormCard').style.display = 'none';
    toast('Task created. ✅');
  };
}

async function loadTasks() {
  const filter = $('#statusFilter')?.value || 'all';
  let query = supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name,email), assigner:profiles!tasks_assigned_by_fkey(full_name,email)').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false });
  if (filter !== 'all') query = query.eq('status', filter);
  const { data, error } = await query;
  if (error) return toast(error.message, 'error');
  ['Pending', 'In Progress', 'Completed'].forEach(status => { const col = document.getElementById(status); if (col) col.innerHTML = ''; });
  (data || []).forEach(task => {
    const html = `<div class="task-card"><strong>${escapeHTML(task.title)}</strong><p class="muted">${escapeHTML(task.description || 'No description')}</p><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="badge ${task.priority === 'High' ? 'danger' : task.priority === 'Low' ? 'success' : 'warning'}">${escapeHTML(task.priority)}</span><span class="badge primary">Due ${formatDate(task.due_date)}</span></div><div class="muted" style="margin-top:8px">Assigned to ${escapeHTML(task.assignee?.full_name || 'Unassigned')}</div><div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn btn-sm btn-outline" data-status="${task.id}" data-next="In Progress">Start</button><button class="btn btn-sm btn-success" data-status="${task.id}" data-next="Completed">Complete</button><button class="btn btn-sm btn-danger" data-delete="${task.id}">Delete</button></div></div>`;
    const col = document.getElementById(task.status);
    if (col) col.insertAdjacentHTML('beforeend', html);
  });
  document.querySelectorAll('[data-status]').forEach(btn => btn.onclick = () => updateStatus(btn.dataset.status, btn.dataset.next));
  document.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = () => deleteTask(btn.dataset.delete));
}

async function updateStatus(id, status) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) toast(error.message, 'error');
}

async function deleteTask(id) {
  if (!confirm('Delete task?')) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) toast(error.message, 'error');
}

function subscribeTasks() {
  if (taskChannel) supabase.removeChannel(taskChannel);
  taskChannel = supabase.channel(`tasks-${currentWorkspace.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${currentWorkspace.id}` }, loadTasks)
    .subscribe();
}
