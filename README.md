# Pitstop — phone-first catalog for diecast collectors

![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![Tests 100% coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![License MIT](https://img.shields.io/badge/license-MIT-a78bfa)

Pitstop is an installable **PWA** that lets a diecast-car collector catalog their personal
collection from a phone:

- **Carded cars** — scan the UPC barcode, metadata is looked up and cached forever.
- **Loose cars** — snap a photo; the background is trimmed and a DINOv2 embedding is matched
  against your own library, fully in-browser. Tap the right card from the top-12 grid.
- **Browse anywhere** — your library syncs to the cloud and stays readable offline.

No marketplace, no social features — just *"what do I own, and am I about to buy a duplicate?"*

## Features

| | |
|---|---|
| UPC scanning | Live camera decode via `@zxing/browser` (UPC-A / EAN-13), manual digits fallback |
| Metadata lookup | upcitemdb trial API (free, 100/day) with a **permanent** `upc_cache` in MongoDB |
| Visual search | `@imgly/background-removal` → DINOv2-small (`transformers.js`) → cosine top-12, all client-side |
| Duplicate detection | Exact UPC match + visual cosine ≥ 0.85 → "You may already own this" |
| Collection | Responsive grid, full-text search, year/series filter chips, detail view with photo carousel, notes, statuses (owned / wanted / sold / duplicate) |
| Photos | Client-compressed (~1 MB, 1600 px max edge) and uploaded straight to Supabase Storage |
| Auth | Supabase email + password, with sign-up confirmation and forgot-password flows |
| PWA | Hand-rolled service worker: offline browsing, cached model weights, install to home screen |
| CSV export | One tap in Settings |

## Architecture

```
Next.js 15 App Router (TypeScript strict, Tailwind)
 ├─ Supabase Auth      — identity (email + password); user UUID = Mongo userId
 ├─ Supabase Storage   — `photos` bucket, {userId}/{itemId}/{timestamp}.jpg
 ├─ MongoDB (raw driver) — collection_items, upc_cache, upc_misses
 ├─ upcitemdb          — UPC → title/brand/images (cached forever)
 └─ In-browser ML      — @imgly background removal + DINOv2-small embeddings
```

There is **no `users` collection** — Supabase owns identity and every Mongo document carries
the Supabase user UUID as `userId`.

## Setup

### 1. Supabase project (auth + photos)

1. Create a project at [supabase.com](https://supabase.com) and copy the **Project URL** and
   **anon key** from *Project Settings → API*.
2. Auth → Providers → Email: keep **Email + Password** enabled. (Disable "Confirm email" if you
   want instant sign-ins during development.)
3. Storage → **New bucket** named `photos`. Leave it **private** (not public).
4. Run these RLS policies in the SQL editor so each signed-in user can only touch files under
   their own `{userId}/` prefix:

```sql
-- Allow authenticated users to upload into their own folder
create policy "users upload own photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own photos
create policy "users read own photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own photos
create policy "users delete own photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Pitstop stores a long-lived **signed URL** per photo, so private-bucket images render with a
plain `<img>`. If the bucket is missing you'll get a clear in-app error
(*"Photo storage not configured — create a 'photos' bucket in Supabase"*) and the car still
saves without its photo.

### 2. MongoDB

Any MongoDB 6+ works; [Railway](https://railway.app) is a one-click option. Include the db name
in the URI path, e.g. `mongodb://user:pass@host:port/pitstop?authSource=admin`. Indexes are
created lazily on first use — no migration step.

### 3. Env vars

Copy `.env.example` to `.env.local` and fill in:

| Var | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `MONGODB_URI` | MongoDB connection string |
| `UPCITEMDB_BASE` | *(optional)* override for the upcitemdb base URL |

The app **builds and runs with no env vars** — every integration degrades to a clear
"not configured" state.

### 4. Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest + coverage (100% on covered lib modules)
pnpm build        # production build
```

> Camera APIs require HTTPS (or localhost). On a phone, test via a tunnel or the Vercel deploy.

## Deploy to Vercel

1. Push the repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo (framework auto-detects Next.js).
3. Add the three env vars above in *Project → Settings → Environment Variables*.
4. Deploy. In Supabase, add your Vercel URL to *Auth → URL Configuration → Redirect URLs*
   (e.g. `https://your-app.vercel.app/auth/confirm`) so confirmation/reset emails land correctly.
5. Open the site on your phone → share menu → **Add to Home Screen**.

## Roadmap

- Offline mutation queue (adds made offline replay on reconnect; today reads work offline and
  writes show a clear offline message)
- Multi-angle capture → averaged embeddings for stronger matches
- Community reference catalog as a visual-search fallback when your library has no match
- Estimated value display from last-seen listings
- Bulk import from a photo of multiple cars
- Shareable read-only collection link

## License

[MIT](LICENSE) © 2026 kea0811
