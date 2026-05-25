import { supabase } from './supabaseClient.js';
import { $, escapeHTML, fileSize, formatTime, getQuery, requireAuth, setupShell, sidebarTemplate, toast, topbarTemplate, uploadToBucket, userWorkspaces } from './ui.js';

const app = $('#app');
app.innerHTML = `${sidebarTemplate('files')}<main class="main">${topbarTemplate('Files', 'Upload, preview, download, and search shared workspace files.')}<section class="content" id="content"></section></main>`;
setupShell('files');
const auth = await requireAuth();
if (auth) initFiles(auth);
let currentWorkspace = null;
let fileChannel = null;

async function initFiles({ user }) {
  const workspaces = await userWorkspaces(user.id);
  if (!workspaces.length) return $('#content').innerHTML = '<div class="empty">Create or join a workspace to use file sharing. <br><br><a class="btn btn-primary" href="/workspaces.html">Go to Workspaces</a></div>';
  currentWorkspace = workspaces.find(w => w.id === getQuery('workspace')) || workspaces[0];
  renderShell(workspaces, user);
  loadFiles();
  subscribeFiles();
}

function renderShell(workspaces, user) {
  $('#content').innerHTML = `
    <div class="grid grid-2">
      <div class="card"><h2 style="margin-top:0">Upload File</h2><form id="fileForm" class="form"><div class="field"><label>Workspace</label><select id="workspaceSelect" class="select">${workspaces.map(w => `<option value="${w.id}" ${w.id === currentWorkspace.id ? 'selected' : ''}>${escapeHTML(w.name)}</option>`).join('')}</select></div><div class="field"><label>File</label><input class="input" type="file" id="fileInput" required></div><button class="btn btn-primary">Upload File</button></form></div>
      <div class="card"><h2 style="margin-top:0">Search Files</h2><input class="input" id="fileSearch" placeholder="Search by filename"><p class="muted">Allowed: images, PDFs, Word, Excel, ZIP, TXT. Max 10 MB.</p></div>
    </div>
    <div style="margin-top:24px"><h2>Workspace Files</h2><div id="filesGrid" class="grid grid-3"></div></div>`;
  $('#workspaceSelect').onchange = (event) => { currentWorkspace = workspaces.find(w => w.id === event.target.value); loadFiles(); subscribeFiles(); };
  $('#fileSearch').oninput = () => loadFiles($('#fileSearch').value);
  $('#fileForm').onsubmit = async (event) => {
    event.preventDefault();
    const file = $('#fileInput').files[0];
    if (!file) return;
    try {
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      button.textContent = 'Uploading...';
      const uploaded = await uploadToBucket('collab-files', file, `${currentWorkspace.id}/files`);
      const { error } = await supabase.from('uploaded_files').insert({ workspace_id: currentWorkspace.id, uploaded_by: user.id, file_url: uploaded.publicUrl, file_name: file.name, file_type: file.type, file_size: file.size });
      button.disabled = false;
      button.textContent = 'Upload File';
      if (error) return toast(error.message, 'error');
      await supabase.from('notifications').insert({ user_id: user.id, title: 'File uploaded', message: file.name, type: 'file' });
      $('#fileInput').value = '';
      toast('File uploaded. 📁');
    } catch (error) { toast(error.message, 'error'); }
  };
}

async function loadFiles(term = '') {
  let query = supabase.from('uploaded_files').select('*, uploader:profiles(full_name,email)').eq('workspace_id', currentWorkspace.id).order('created_at', { ascending: false });
  if (term) query = query.ilike('file_name', `%${term}%`);
  const { data, error } = await query;
  if (error) return toast(error.message, 'error');
  $('#filesGrid').innerHTML = (data || []).map(f => `<article class="card file-card"><div><div style="font-size:2rem">${f.file_type?.startsWith('image/') ? '🖼️' : f.file_type?.includes('pdf') ? '📕' : '📄'}</div><strong>${escapeHTML(f.file_name)}</strong><div class="muted">${fileSize(f.file_size)} • ${escapeHTML(f.uploader?.full_name || 'Unknown')}</div><small class="muted">${formatTime(f.created_at)}</small></div><div style="display:flex;gap:8px;flex-direction:column"><a class="btn btn-sm btn-outline" target="_blank" href="${escapeHTML(f.file_url)}">Open</a><button class="btn btn-sm btn-danger" data-delete="${f.id}">Delete</button></div></article>`).join('') || '<div class="empty" style="grid-column:1/-1">No files uploaded yet.</div>';
  document.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = () => deleteFile(btn.dataset.delete));
}

async function deleteFile(id) {
  if (!confirm('Delete file record?')) return;
  const { error } = await supabase.from('uploaded_files').delete().eq('id', id);
  if (error) return toast(error.message, 'error');
  toast('File removed.');
}

function subscribeFiles() {
  if (fileChannel) supabase.removeChannel(fileChannel);
  fileChannel = supabase.channel(`files-${currentWorkspace.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'uploaded_files', filter: `workspace_id=eq.${currentWorkspace.id}` }, () => loadFiles($('#fileSearch')?.value || ''))
    .subscribe();
}
