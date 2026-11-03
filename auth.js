/* BookTracker authentication shell. It is inactive while FEATURE_DB is false. */
(() => {
  'use strict';

  const disabledApi = Object.freeze({ enabled: false, client: null, user: null, isAdmin: false });
  if (window.FEATURE_DB !== true) {
    let demoUser = null;
    try { demoUser = JSON.parse(sessionStorage.getItem('bookTracker.demoUser') || 'null'); } catch { sessionStorage.removeItem('bookTracker.demoUser'); }
    if (!demoUser?.role) {
      window.location.replace('volunteer-login.html');
      return;
    }
    window.BookTrackerAuth = Object.freeze({ ...disabledApi, demoUser });
    window.addEventListener('DOMContentLoaded', () => {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      const button = document.createElement('button');
      button.className = 'button';
      button.type = 'button';
      button.textContent = `Sign out ${demoUser.identity}`;
      button.addEventListener('click', () => { sessionStorage.removeItem('bookTracker.demoUser'); window.location.assign('volunteer-login.html'); });
      sidebar.append(button);
    });
    return;
  }

  const config = window.BOOKTRACKER_CONFIG;
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) {
    document.body.innerHTML = '<main style="max-width:42rem;margin:4rem auto;padding:1.5rem;font:16px system-ui"><h1>Database configuration is missing</h1><p>Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the deployment build environment, then rebuild. No secret key belongs in this app.</p></main>';
    return;
  }

  let client;
  let currentUser = null;
  let isAdmin = false;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const setApi = () => { window.BookTrackerAuth = { enabled: true, client, user: currentUser, isAdmin }; };
  const authEvent = () => window.dispatchEvent(new CustomEvent('booktracker:auth-change', { detail: window.BookTrackerAuth }));

  function ensureStyles() {
    if (document.querySelector('#booktracker-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'booktracker-auth-styles';
    style.textContent = '.auth-gate{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:#17383cdd;padding:20px}.auth-card{width:min(420px,100%);padding:28px;border-radius:16px;background:#fff;color:#18333a;box-shadow:0 18px 55px #0005}.auth-card label{display:grid;gap:6px;margin:14px 0;font-weight:700}.auth-card input,.auth-card select{padding:10px;border:1px solid #9db1b5;border-radius:8px;font:inherit}.auth-card button{width:100%;margin-top:12px;padding:11px;border:0;border-radius:8px;background:#1c746a;color:#fff;font-weight:700;cursor:pointer}.auth-error{color:#a21f1f;min-height:1.25em}.db-preview-notice{margin:12px 0;padding:10px;border:1px solid #dba832;border-radius:8px;background:#fff7da;font-size:.9rem}.admin-user-card{max-width:780px;margin-top:18px}.admin-user-card .form-grid{margin-top:12px}';
    document.head.append(style);
  }

  function showSignIn(message = '') {
    ensureStyles();
    document.querySelector('#booktracker-auth-gate')?.remove();
    const gate = document.createElement('div');
    gate.id = 'booktracker-auth-gate';
    gate.className = 'auth-gate';
    gate.innerHTML = `<form class="auth-card" id="booktracker-sign-in"><p class="eyebrow">BookTracker</p><h1>Sign in</h1><p>Use the email and password supplied by your organizer.</p><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><p class="auth-error" role="alert">${escapeHtml(message)}</p><button type="submit">Sign in</button></form>`;
    document.body.append(gate);
    gate.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      const { error } = await client.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) });
      if (error) { showSignIn(error.message); return; }
    });
  }

  async function loadAdminStatus() {
    if (!currentUser) return false;
    const { data, error } = await client.from('app_admins').select('user_id').eq('user_id', currentUser.id).maybeSingle();
    return !error && Boolean(data);
  }

  async function loadDrives() {
    const { data, error } = await client.from('drives').select('id, name').order('name');
    if (error) throw error;
    return data || [];
  }

  async function mountAdminPanel() {
    document.querySelector('#booktracker-admin-user-card')?.remove();
    if (!isAdmin) return;
    const setup = document.querySelector('#setup-view');
    if (!setup) return;
    let drives;
    try { drives = await loadDrives(); } catch { drives = []; }
    const card = document.createElement('article');
    card.id = 'booktracker-admin-user-card';
    card.className = 'card admin-user-card';
    card.innerHTML = `<div class="card-header"><h2>App administration</h2><p>Invite a volunteer and assign them to a book drive.</p></div><form class="form-grid" id="booktracker-invite-form"><div class="field"><label for="admin-volunteer-email">Volunteer email</label><input id="admin-volunteer-email" name="email" type="email" required maxlength="254"></div><div class="field"><label for="admin-volunteer-name">Display name</label><input id="admin-volunteer-name" name="display_name" maxlength="120"></div><div class="field"><label for="admin-volunteer-drive">Book drive</label><select id="admin-volunteer-drive" name="drive_id" required>${drives.map((drive) => `<option value="${escapeHtml(drive.id)}">${escapeHtml(drive.name)}</option>`).join('')}</select></div><div class="field"><label for="admin-volunteer-role">Role</label><select id="admin-volunteer-role" name="role"><option value="volunteer">Volunteer</option><option value="organizer">Organizer</option></select></div><div class="field full"><p class="auth-error" id="admin-invite-status" role="status"></p><button class="button primary" type="submit" ${drives.length ? '' : 'disabled'}>Send invitation</button></div></form>`;
    setup.append(card);
    card.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const status = card.querySelector('#admin-invite-status');
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      status.textContent = 'Sending invitation…';
      const { data, error } = await client.functions.invoke('admin-create-drive-user', {
        body: Object.fromEntries(form.entries())
      });
      button.disabled = false;
      status.textContent = error ? error.message : data?.message || 'Invitation sent.';
    });
  }

  function mountSignOut() {
    document.querySelector('#booktracker-sign-out')?.remove();
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const button = document.createElement('button');
    button.id = 'booktracker-sign-out';
    button.className = 'button';
    button.type = 'button';
    button.textContent = `Sign out ${currentUser.email || ''}`.trim();
    button.addEventListener('click', () => client.auth.signOut());
    sidebar.append(button);
  }

  function mountPreviewNotice() {
    document.querySelector('#booktracker-db-preview')?.remove();
    const target = document.querySelector('#app-error');
    if (!target) return;
    const notice = document.createElement('div');
    notice.id = 'booktracker-db-preview';
    notice.className = 'db-preview-notice';
    notice.textContent = 'Database authentication is enabled. Inventory remains in local demo storage until the Supabase repository adapter and transactional RPC migration are deployed.';
    target.after(notice);
  }

  async function applySession(session) {
    currentUser = session?.user || null;
    isAdmin = await loadAdminStatus();
    setApi();
    authEvent();
    if (!currentUser) { document.querySelector('#booktracker-sign-out')?.remove(); document.querySelector('#booktracker-admin-user-card')?.remove(); showSignIn(); return; }
    document.querySelector('#booktracker-auth-gate')?.remove();
    mountSignOut();
    mountPreviewNotice();
    await mountAdminPanel();
  }

  (async () => {
    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      client = createClient(config.supabaseUrl, config.supabasePublishableKey);
      client.auth.onAuthStateChange((_event, session) => { void applySession(session); });
      const { data: { session } } = await client.auth.getSession();
      await applySession(session);
    } catch (error) {
      showSignIn(`Authentication could not start: ${error.message}`);
    }
  })();
})();
