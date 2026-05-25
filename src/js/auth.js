import { supabase } from './supabaseClient.js';
import { $, toast, setupMarketingNav, getQuery } from './ui.js';

setupMarketingNav();

const registerForm = $('#registerForm');
const loginForm = $('#loginForm');
const adminLoginForm = $('#adminLoginForm');

document.querySelectorAll('[data-show-password]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
  });
});

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(registerForm);
    const fullName = String(form.get('fullName') || '').trim();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const password = String(form.get('password') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');
    if (!fullName || !email || !password) return toast('Please fill all required fields.', 'warning');
    if (password.length < 6) return toast('Password must be at least 6 characters.', 'warning');
    if (password !== confirmPassword) return toast('Passwords do not match.', 'warning');

    const button = registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Creating account...';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) {
      button.disabled = false;
      button.textContent = 'Create Account';
      return toast(error.message, 'error');
    }
    const user = data.user;
    if (user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        email,
        role: 'user',
        status: 'online'
      });
      if (profileError) toast(profileError.message, 'error');
    }
    toast('Account created. Redirecting...');
    setTimeout(() => window.location.href = '/dashboard.html', 800);
  });
}

async function loginWithRole(formElement, adminOnly = false) {
  const form = new FormData(formElement);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!email || !password) return toast('Enter email and password.', 'warning');
  const button = formElement.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Signing in...';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  button.disabled = false;
  button.textContent = adminOnly ? 'Admin Login' : 'Login';
  if (error) return toast(error.message, 'error');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: data.user.user_metadata?.full_name || email.split('@')[0],
      email,
      status: 'online'
    });
  }

  if (profile?.is_disabled) {
    await supabase.auth.signOut();
    return toast('Your account has been disabled by admin.', 'error');
  }

  if (adminOnly && profile?.role !== 'admin') {
    await supabase.auth.signOut();
    return toast('This account is not an admin account.', 'error');
  }

  await supabase.from('profiles').update({ status: 'online' }).eq('id', data.user.id);
  const next = getQuery('next');
  window.location.href = adminOnly ? '/admin/dashboard.html' : (next || '/dashboard.html');
}

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  loginWithRole(loginForm, false);
});

adminLoginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  loginWithRole(adminLoginForm, true);
});
