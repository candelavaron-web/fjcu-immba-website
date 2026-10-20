# Supabase setup (AI-ADPD class #6)

The website reads its faculty data from Supabase. Follow these steps once.

## 1. Create the project
1. Go to <https://supabase.com> → **Sign Up** → **Continue with GitHub**.
2. **New Project** → name it `immba-backend`, choose a region near Taiwan
   (Northeast Asia / Tokyo) and set a database password.
   Keep that password safe — it is **not** needed in the website code.

## 2. Create the tables
1. Open **SQL Editor** → **New query**.
2. Paste the whole content of [`schema.sql`](schema.sql) → **Run**.
   It creates the `faculty` table, the `admin_profiles` table with the
   three roles, the row level security policies and the
   `faculty-photos` storage bucket.
3. Optional but recommended: run [`seed.sql`](seed.sql) the same way to
   load the 19 faculty members of the program.

## 3. Copy the connection details
**Project Settings → API**, copy:
- **Project URL** → `https://xxxx.supabase.co`
- **anon public key** → long string

The anon key is meant to be public (it ships inside front-end code and is
protected by the row level security policies). Never copy the
`service_role` key or the database password into the website.

## 4. Connect the website
- **Locally**: paste both values into `assets/js/supabase-config.js`.
- **On Vercel**: Project → **Settings → Environment Variables**, add
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
  `scripts/build-config.sh` writes the config file during the build.

## 5. Become the first super administrator
1. Open `admin.html` → **Create an account** → confirm the verification
   email that Supabase sends you.
2. Back in the SQL Editor, run (with your own email):

   ```sql
   update public.admin_profiles
      set role = 'super_admin'
    where email = 'you@example.com';
   ```

3. Sign in again. From now on, new people who register appear in the
   **Administrators** tab as `pending`, and you approve or reject them
   from there.

## Roles
| Role | Can do |
|---|---|
| `pending` | Registered and verified, but no access to the back office |
| `admin` | Manage faculty: create, edit, delete, reorder, upload photos |
| `super_admin` | Everything, plus approve or reject other administrators |
