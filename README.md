# AI Whiteboard

Production-ready Next.js 14 internal whiteboard with:

- Supabase Google OAuth auth
- Admin-only access via `admins` table
- Excalidraw canvas with local + Supabase persistence
- NVIDIA NIM-powered diagram generation
- Per-user AI execution logs

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- `@excalidraw/excalidraw`
- Supabase (Auth + Postgres)
- NVIDIA NIM API
- Vercel deployment

## Folder Structure

```text
.
├── app
│   ├── api
│   │   └── generate
│   │       └── route.ts
│   ├── auth
│   │   └── callback
│   │       └── route.ts
│   ├── login
│   │   └── page.tsx
│   ├── logout
│   │   └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── AIPanel.tsx
│   ├── SceneManager.tsx
│   └── Whiteboard.tsx
├── lib
│   ├── auth.ts
│   ├── diagramBuilder.ts
│   ├── nimClient.ts
│   └── supabaseClient.ts
├── types
│   └── diagram.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NVIDIA_NIM_API_KEY=
```

## Supabase Setup

1. Create a Supabase project.
2. Enable Google provider in `Authentication -> Providers -> Google`.
3. Add redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://<your-vercel-domain>/auth/callback`

4. Run the SQL below in Supabase SQL Editor.
5. Insert allowed emails into `public.admins`.

### SQL Schema + RLS Policies

```sql
-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- Admin allowlist
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admins_email_lowercase check (email = lower(email))
);

alter table public.admins enable row level security;

drop policy if exists "service_role_manage_admins" on public.admins;
create policy "service_role_manage_admins"
on public.admins
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Whiteboard scenes
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  scene_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scenes_user_id_idx on public.scenes(user_id);
create index if not exists scenes_updated_at_idx on public.scenes(updated_at desc);

-- AI execution logs
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  model_used text not null,
  response_json jsonb,
  created_at timestamptz not null default now(),
  duration_ms integer not null
);

create index if not exists ai_logs_user_id_idx on public.ai_logs(user_id);
create index if not exists ai_logs_created_at_idx on public.ai_logs(created_at desc);

-- Update timestamp trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scenes_updated_at on public.scenes;
create trigger set_scenes_updated_at
before update on public.scenes
for each row
execute function public.set_updated_at();

-- RLS
alter table public.scenes enable row level security;
alter table public.ai_logs enable row level security;

-- Scenes policies

drop policy if exists "scenes_select_own" on public.scenes;
create policy "scenes_select_own"
on public.scenes
for select
using (auth.uid() = user_id);

drop policy if exists "scenes_insert_own" on public.scenes;
create policy "scenes_insert_own"
on public.scenes
for insert
with check (auth.uid() = user_id);

drop policy if exists "scenes_update_own" on public.scenes;
create policy "scenes_update_own"
on public.scenes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "scenes_delete_own" on public.scenes;
create policy "scenes_delete_own"
on public.scenes
for delete
using (auth.uid() = user_id);

-- AI logs policies

drop policy if exists "ai_logs_select_own" on public.ai_logs;
create policy "ai_logs_select_own"
on public.ai_logs
for select
using (auth.uid() = user_id);

drop policy if exists "ai_logs_insert_own" on public.ai_logs;
create policy "ai_logs_insert_own"
on public.ai_logs
for insert
with check (auth.uid() = user_id);

drop policy if exists "ai_logs_delete_own" on public.ai_logs;
create policy "ai_logs_delete_own"
on public.ai_logs
for delete
using (auth.uid() = user_id);
```

### Seed Admin Emails

```sql
insert into public.admins (email)
values
  ('your.email@company.com')
on conflict (email) do nothing;
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## NVIDIA NIM Integration

- API key is read only on server from `NVIDIA_NIM_API_KEY`
- Route: `POST /api/generate`
- Server validates model output against strict diagram schema
- Invalid JSON/schema is rejected
- Valid nodes/edges are converted into Excalidraw rectangle + arrow elements
- Every run is logged to `public.ai_logs`

## Excalidraw Features Included

- Full toolbar + drawing tools
- Image upload
- Undo/Redo + keyboard shortcuts
- Dark mode
- Export PNG/SVG (Excalidraw built-in export UI)
- Export JSON (custom button)
- Load from JSON (custom button)
- Viewport-height canvas

## Vercel Deployment

1. Push repo to GitHub.
2. Import project in Vercel.
3. Configure environment variables in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NVIDIA_NIM_API_KEY`

4. Ensure Supabase Google OAuth redirect includes your Vercel domain callback.
5. Deploy.

## Security Notes

- `NVIDIA_NIM_API_KEY` never reaches client code.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and used only for admin-allowlist checks.
- Scene and log data are protected by RLS and scoped to `auth.uid()`.
