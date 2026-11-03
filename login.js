(() => {
  'use strict';

  const role = document.body.dataset.loginRole;
  const form = document.querySelector('#login-form');
  const hint = document.querySelector('#login-hint');
  const identityLabel = document.querySelector('#identity-label');
  const error = document.querySelector('#login-error');
  const demoCredentials = Object.freeze({ admin: ['admin', 'admin'], volunteer: ['agent', 'agent'] });
  const destination = 'index.html';

  const showError = (message) => { error.textContent = message; };

  async function signInWithSupabase(identity, password) {
    const config = window.BOOKTRACKER_CONFIG;
    if (!config?.supabaseUrl || !config?.supabasePublishableKey) throw new Error('Database configuration is missing. Rebuild with Supabase environment variables.');
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const client = createClient(config.supabaseUrl, config.supabasePublishableKey);
    const { data, error: signInError } = await client.auth.signInWithPassword({ email: identity, password });
    if (signInError || !data.user) throw new Error(signInError?.message || 'Sign-in failed.');

    if (role === 'admin') {
      const { data: admin } = await client.from('app_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (!admin) { await client.auth.signOut(); throw new Error('This account is not an app administrator.'); }
    } else {
      const { data: membership } = await client.from('drive_memberships').select('drive_id').eq('user_id', data.user.id).eq('status', 'active').limit(1);
      if (!membership?.length) { await client.auth.signOut(); throw new Error('This account is not assigned to an active book drive.'); }
    }
  }

  if (window.FEATURE_DB === true) {
    hint.textContent = 'Use the email address and password for your invited Supabase account.';
    identityLabel.firstChild.textContent = 'Email';
    form.elements.identity.type = 'email';
    form.elements.identity.autocomplete = 'email';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');
    const button = form.querySelector('button');
    button.disabled = true;
    const data = new FormData(form);
    const identity = String(data.get('identity') || '').trim();
    const password = String(data.get('password') || '');
    try {
      if (window.FEATURE_DB === true) {
        await signInWithSupabase(identity, password);
      } else {
        const [expectedIdentity, expectedPassword] = demoCredentials[role] || [];
        if (identity !== expectedIdentity || password !== expectedPassword) throw new Error('Use the demo credentials shown on this page.');
        sessionStorage.setItem('bookTracker.demoUser', JSON.stringify({ role, identity, signedInAt: new Date().toISOString() }));
      }
      window.location.assign(destination);
    } catch (loginError) {
      showError(loginError.message || 'Sign-in failed.');
      button.disabled = false;
    }
  });
})();
