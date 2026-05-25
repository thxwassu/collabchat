import { setupMarketingNav, $, toast } from './ui.js';
import { supabase } from './supabaseClient.js';

setupMarketingNav();

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

const contactForm = $('#contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(contactForm);
    const payload = {
      name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      subject: String(form.get('subject') || '').trim(),
      message: String(form.get('message') || '').trim()
    };
    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      toast('Please complete all contact fields.', 'warning');
      return;
    }
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    const { error } = await supabase.from('contact_messages').insert(payload);
    btn.disabled = false;
    btn.textContent = 'Send Message';
    if (error) {
      toast(error.message, 'error');
      return;
    }
    contactForm.reset();
    toast('Message sent successfully. ✅');
  });
}
