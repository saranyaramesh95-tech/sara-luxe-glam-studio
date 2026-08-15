# Sara Luxe Glam Studio

Your client-pipeline app, as a plain website you open on your phone or
laptop — no Claude chat needed. Client data lives in a private Supabase
database, so both devices show the same thing.

## How it fits together

- **GitHub** — hosts the code (this repo, kept private).
- **GitHub Pages** — turns the code into a real URL you open on any device.
- **Supabase** — a free cloud database that stores your client data, and a
  login so only you can see it.

The app itself (`app.jsx`) is your original file, basically untouched —
only its two storage functions (`load`/`save`) were pointed at Supabase
instead of the Claude-only API it used before.

**This repo is public.** GitHub Pages needs that on a free plan. That's
fine here because the repo only ever contains app *code* — your real
client names, dates, and notes are never committed to it. They live only
in Supabase, reachable solely through your login (see step 6).

## One-time setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), sign up (free), and create a
new project. Pick any name/region/password — you won't need that database
password day-to-day, Supabase just asks for one at creation.

### 2. Create the data table

In your Supabase project, open **SQL Editor** → **New query**, paste this,
and run it:

```sql
create table app_state (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table app_state enable row level security;

create policy "Users manage their own rows"
  on app_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

This makes a simple key→value table, and locks it down so each signed-in
user can only ever see their own rows.

### 3. Create your login

In Supabase, go to **Authentication → Users → Add user → Create new user**.
Enter the email and password you want to sign in with (this is separate
from your Supabase account password). Turn "Auto Confirm User" on so it's
ready immediately.

Also worth doing: **Authentication → Providers → Email** and turn **off**
"Allow new users to sign up" — since this app has no public sign-up form,
this just closes the door on anyone else ever creating an account.

### 4. Connect the app to your project

In Supabase, go to **Project Settings → API**. Copy the **Project URL**
and the **anon / public** key (not the `service_role` key — that one must
never leave Supabase).

Open [config.js](config.js) in this repo and paste them in:

```js
window.SUPABASE_URL = "https://xxxxxxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";
```

Commit and push. (The anon key is designed to be public in client-side
code like this — the Row Level Security policy above is what actually
protects your data, not secrecy of this key.)

### 5. Turn on GitHub Pages

In this repo on GitHub: **Settings → Pages → Source → Deploy from a
branch → main → / (root) → Save**. GitHub gives you a URL like:

```
https://<your-username>.github.io/<repo-name>/
```

That's the link to open on your phone and laptop. On your phone, open it
in Safari/Chrome and use "Add to Home Screen" so it sits like an app icon.

### 6. Load your existing client data in

This repo is **public** (it's just app code — no real client data in it).
Your actual client data lives only in Supabase, behind your login.

Open the site, sign in, then go to the app's **Backup / your data**
section and use **Restore** to upload the JSON backup file from your own
computer (the one you already have, e.g. in Downloads). That one-time step
copies your existing clients, rates, templates, and notes into Supabase.
From then on, every device you sign into stays in sync automatically.

## Day to day

- Open the GitHub Pages URL on your phone or laptop, sign in once (it'll
  stay signed in), and use the app as normal.
- Every save now goes straight to Supabase, so the other device sees it
  next time it loads.
- Keep downloading occasional backups from inside the app (its built-in
  **Download backup** button) as a safety net — cheap insurance, costs you
  one tap.

## If something looks broken

- **"Supabase isn't set up yet"** on screen → `config.js` still has the
  placeholder values; finish step 4.
- **Can't sign in** → double check the email/password you created in
  Supabase Authentication → Users, and that "Auto Confirm User" was on.
- **Signed in but no clients show up** → you haven't done step 6 (Restore)
  yet, or you're signed in with a different Supabase user than the one you
  restored the backup under.
