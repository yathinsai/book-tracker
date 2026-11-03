import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200, origin = '*') => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' }
});

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') || '*';
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY');
  const authorization = request.headers.get('Authorization');
  if (!url || !publishableKey || !secretKey || !authorization) return json({ error: 'Function is not configured or caller is not authenticated.' }, 401, origin);

  const callerClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return json({ error: 'Invalid session.' }, 401, origin);

  const adminClient = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: adminRecord } = await adminClient.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRecord) return json({ error: 'Only an app administrator can invite users.' }, 403, origin);

  let body: { email?: unknown; display_name?: unknown; drive_id?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'A JSON request body is required.' }, 400, origin); }
  const email = String(body.email || '').trim().toLowerCase();
  const displayName = String(body.display_name || '').trim();
  const driveId = String(body.drive_id || '').trim();
  const role = String(body.role || 'volunteer');
  if (!/^\S+@\S+\.\S+$/.test(email) || !driveId || !['volunteer', 'organizer'].includes(role) || displayName.length > 120) {
    return json({ error: 'Provide a valid email, drive, optional display name, and role.' }, 400, origin);
  }

  const { data: drive } = await adminClient.from('drives').select('id').eq('id', driveId).maybeSingle();
  if (!drive) return json({ error: 'The selected drive does not exist.' }, 404, origin);

  const { data: invite, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
    redirectTo: origin === '*' ? undefined : origin
  });
  if (inviteError || !invite.user) return json({ error: inviteError?.message || 'The invitation could not be created.' }, 400, origin);

  const { error: membershipError } = await adminClient.from('drive_memberships').upsert({
    drive_id: driveId,
    user_id: invite.user.id,
    role,
    status: 'active'
  }, { onConflict: 'drive_id,user_id' });
  if (membershipError) return json({ error: 'Invitation was created but drive access could not be assigned. Contact an administrator.' }, 500, origin);

  return json({ message: `Invitation sent to ${email}.` }, 200, origin);
});
