# Bootstrap the first BookTracker app administrator

Apply both migrations first. The Edge Function does not create the first admin by itself, preventing an untrusted user from self-promoting.

1. In the Supabase Dashboard, create the trusted first user under **Authentication → Users** using the approved invitation process.
2. Copy that user's UUID.
3. Run this **data-only** statement once in the SQL Editor, replacing the placeholder:

```sql
insert into public.app_admins (user_id)
values ('<trusted-auth-user-uuid>');
```

4. Deploy `admin-create-drive-user` using the Supabase CLI:

```bash
supabase functions deploy admin-create-drive-user
```

5. In **Authentication → URL Configuration**, add the final HTTPS application URL to Site URL and Redirect URLs. Invitation emails return there.

The Edge Function verifies `app_admins` using a server-only secret key before it invites a user and creates their drive membership. Never expose that key in the app, browser build, or Cloudflare Pages settings.
