import { supabase } from './supabaseClient.js';
import { $, escapeHTML, requireAuth, renderAvatar, setupShell, sidebarTemplate, toast, topbarTemplate, uploadToBucket } from './ui.js';

const app = $('#app');
app.innerHTML = `${sidebarTemplate('profile')}<main class="main">${topbarTemplate('Profile Settings', 'Update your account, avatar, password, and activity status.')}<section class="content" id="content"></section></main>`;
setupShell('profile');

async function bootProfilePage() {
  const auth = await requireAuth();

  if (auth) {
    initProfile(auth);
  }
}

bootProfilePage();

function initProfile({ user, profile }) {
  $('#content').innerHTML = `
    <div class="profile-grid">
      <div class="card center">${renderAvatar(profile, 'profile-avatar')}<h2>${escapeHTML(profile?.full_name || user.email)}</h2><p class="muted">${escapeHTML(profile?.email || user.email)}</p><span class="badge ${profile?.status === 'online' ? 'success' : ''}">${escapeHTML(profile?.status || 'online')}</span><div style="margin-top:18px"><input type="file" id="avatarInput" class="hidden" accept="image/*"><button class="btn btn-outline" id="avatarBtn">Change Avatar</button></div></div>
      <div class="card"><h2 style="margin-top:0">Account Details</h2><form id="profileForm" class="form"><div class="grid grid-2"><div class="field"><label>Full Name</label><input class="input" name="full_name" value="${escapeHTML(profile?.full_name || '')}" required></div><div class="field"><label>Status</label><select class="select" name="status"><option ${profile?.status === 'online' ? 'selected' : ''}>online</option><option ${profile?.status === 'away' ? 'selected' : ''}>away</option><option ${profile?.status === 'busy' ? 'selected' : ''}>busy</option><option ${profile?.status === 'offline' ? 'selected' : ''}>offline</option></select></div></div><div class="field"><label>Bio</label><textarea class="textarea" name="bio">${escapeHTML(profile?.bio || '')}</textarea></div><button class="btn btn-primary">Save Profile</button></form></div>
    </div>
    <div class="card" style="margin-top:22px"><h2 style="margin-top:0">Change Password</h2><form id="passwordForm" class="form"><div class="field"><label>New Password</label><input class="input" name="password" type="password" minlength="6" required></div><button class="btn btn-dark">Update Password</button></form></div>`;

  $('#profileForm').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from('profiles').update({ full_name: String(form.get('full_name')).trim(), status: form.get('status'), bio: String(form.get('bio') || '').trim() }).eq('id', user.id);
    if (error) return toast(error.message, 'error');
    toast('Profile updated. ✅');
  };
  $('#passwordForm').onsubmit = async (event) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('password') || '');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast(error.message, 'error');
    event.currentTarget.reset();
    toast('Password updated.');
  };
  $('#avatarBtn').onclick = () => $('#avatarInput').click();
  $('#avatarInput').onchange = async () => {
    const file = $('#avatarInput').files[0];
    if (!file) return;
    try {
      const uploaded = await uploadToBucket('avatars', file, user.id);
      const { error } = await supabase.from('profiles').update({ avatar_url: uploaded.publicUrl }).eq('id', user.id);
      if (error) return toast(error.message, 'error');
      toast('Avatar updated.');
      setTimeout(() => location.reload(), 700);
    } catch (error) { toast(error.message, 'error'); }
  };
}
