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

### 7. Turn on automatic backups (optional but recommended)

In Supabase SQL Editor, run this once to create a private storage bucket
for backups:

```sql
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

create policy "Users manage their own backup files"
on storage.objects
for all
using (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);
```

That's it — no further setup. From then on, every time you open the app
and it's been 7+ days since the last automatic backup, it quietly saves a
fresh dated snapshot to that bucket, and deletes any of its own backups
older than 90 days. It's silent — no button, no popup — check
**Supabase → Storage → backups** if you ever want to see what's there.

### 8. Website inquiries → straight into the pipeline (optional)

In Supabase SQL Editor, run this once to create the `inquiries` table
website visitors submit into:

```sql
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  answers jsonb not null,
  imported boolean not null default false
);

alter table inquiries enable row level security;

create policy "Anyone can submit an inquiry"
on inquiries
for insert
to anon
with check (true);

create policy "Owner can view inquiries"
on inquiries for select
using (auth.role() = 'authenticated');

create policy "Owner can update inquiries"
on inquiries for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Owner can delete inquiries"
on inquiries for delete
using (auth.role() = 'authenticated');
```

This repo now also has [`inquiry.html`](inquiry.html) — a standalone
inquiry form styled to match saraluxeglam.com (black background, Cormorant
serif font, the same 12 questions your Portfoliobox form currently asks).
It's live at:

```
https://<your-username>.github.io/<repo-name>/inquiry.html
```

Put that link on your website — either as a plain link/button ("Send an
inquiry"), or embedded directly on the page with an iframe:

```html
<iframe
  src="https://<your-username>.github.io/<repo-name>/inquiry.html"
  style="width:100%; height:1400px; border:0;"
></iframe>
```

(Portfoliobox may call this an "Embed" or "HTML" block when adding it to
a page — check its block/widget menu.)

Every submission goes straight into Supabase — not through your app, and
not through Portfoliobox's own contact form. Next time you open the app
signed in, it automatically pulls in any new ones as fresh pipeline cards
(stage: Inquiry), with her name/email/phone/date/location filled in and
everything else — message, preferred contact time, service counts, how
she heard about you — written into the card's notes so nothing's lost.
This checks quietly every time you open the app; no button to press.

### 9. Phone notifications (optional)

Real push notifications — new inquiry, follow-ups due, and a once-a-day
morning digest (today's routine focus + overdue follow-ups) — sent
straight to your phone, free, no separate service.

**Step A — database.** Run this in SQL Editor:

```sql
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "Owner can manage subscriptions" on push_subscriptions;
create policy "Owner can manage subscriptions"
on push_subscriptions
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

alter table inquiries add column if not exists notified boolean not null default false;

create table if not exists notification_state (
  key text primary key,
  value text
);
alter table notification_state enable row level security;
-- No policies added on purpose — only the notify function (service role)
-- ever touches this table.

NOTIFY pgrst, 'reload schema';
```

**Step B — the Edge Function.** In the Supabase dashboard, go to
**Edge Functions → Deploy a new function**, name it `notify`, and paste
in the contents of [`supabase-functions/notify/index.ts`](supabase-functions/notify/index.ts)
from this repo.

Then, in that function's **Settings → Secrets**, add:

| Secret | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | (given to you separately — keep both keys private) |
| `VAPID_PRIVATE_KEY` | (given to you separately — keep both keys private) |

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already provided
automatically to every Edge Function — nothing to add for those.)

**Step C — the schedule.** In SQL Editor, run the scheduling SQL you were
given separately (it checks for anything to notify every 10 minutes).

**Step D — turn it on for your phone.** Open the app, signed in, and tap
**"Enable notifications"** in the top-right corner. Your browser will ask
to allow notifications — say yes. Do this on each device you want
notified (e.g., separately on your phone and laptop).

That's it — from then on you'll get a push notification the moment a new
inquiry comes in, and once each morning (after 8am Central) with today's
routine focus and any follow-ups due.

## Day to day

- Open the GitHub Pages URL on your phone or laptop, sign in once (it'll
  stay signed in), and use the app as normal.
- Every save now goes straight to Supabase, so the other device sees it
  next time it loads.
- Automatic weekly backups happen on their own (see step 7). You can still
  use the app's built-in **Download backup** button any time you want a
  copy in hand immediately.

## If something looks broken

- **"Supabase isn't set up yet"** on screen → `config.js` still has the
  placeholder values; finish step 4.
- **Can't sign in** → double check the email/password you created in
  Supabase Authentication → Users, and that "Auto Confirm User" was on.
- **Signed in but no clients show up** → you haven't done step 6 (Restore)
  yet, or you're signed in with a different Supabase user than the one you
  restored the backup under.
