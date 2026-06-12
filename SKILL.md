---
name: pitstop
description: Use when working on Pitstop — a phone-first Next.js PWA that catalogs a diecast-car collection via UPC barcode scanning and in-browser visual matching (DINOv2 embeddings), with Supabase auth/storage and MongoDB persistence. Covers env setup, the architecture map, and the gotchas that bite.
---

# Pitstop

Phone-first PWA for diecast collectors: scan a UPC on a carded car, or photo-match a loose one
against your own library, and browse the collection offline.

## When to reach for this

User asks for:
- "add a feature to / fix a bug in Pitstop"
- "why isn't the barcode scanner / visual match / photo upload working"
- "set up Pitstop locally" or "deploy Pitstop"

Not this skill:
- ❌ Building a *global* car-recognition model — Pitstop deliberately does retrieval against the
  user's own library + human confirmation, not top-1 classification.
- ❌ Marketplace/pricing features — out of scope by design (PRD §3).

## Env setup

```bash
pnpm install
cp .env.example .env.local   # then fill in
pnpm dev
```

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth (email+password) and Storage |
| `MONGODB_URI` | Collection data (db name in the URI path) |
| `UPCITEMDB_BASE` | Optional override; trial endpoint needs no key |

Supabase side: email provider enabled, a **private** bucket named `photos`, and the three RLS
policies from the README (insert/select/delete under own `{userId}/` prefix). The app builds
and runs with no env vars — everything degrades to "not configured" states.

## Architecture map

```
middleware.ts                 → @supabase/ssr session refresh + route protection
lib/supabase/{client,server,middleware}.ts → the only places Supabase clients are made
lib/auth.ts                   → getSessionUser(); user.id (UUID) = Mongo userId
lib/db.ts                     → lazy Mongo client + ensureIndexes() (no users collection!)
lib/upcitemdb.ts              → pure lookup wrapper; returns status values, never throws
lib/similarity.ts             → cosine, topK(12), duplicate threshold 0.85
lib/embedding.ts              → DINOv2-small via transformers.js (client, lazy, memoized)
lib/bg-removal.ts             → @imgly wrapper (client, dynamic import)
lib/image-compress.ts         → canvas downscale to 1600px / ~1MB JPEG
lib/photos.ts                 → client-direct upload to Supabase Storage + signed URL
app/api/upc/[code]            → cache → upcitemdb → cache forever; logs misses
app/api/collection[...]       → CRUD, list w/ search+filters, embeddings projection
app/api/duplicate-check       → UPC exact + visual ≥0.85
components/scanner|match|add  → ScanFlow, VisualSearch, ItemForm (the three add paths)
public/sw.js                  → hand-rolled SW: shell cache-first, /api/collection network-first
```

Add-with-photo flow is **item first, photo second**: POST creates the item, the client uploads
to `photos/{userId}/{itemId}/{timestamp}.jpg`, then PATCHes the URL onto the item. A failed
upload never loses the car.

## Commands

```bash
pnpm test        # vitest run --coverage — must stay 100/100/100/100
pnpm typecheck   # tsc --noEmit (strict)
pnpm build       # must pass with zero env vars
pnpm icons       # regenerate PWA PNGs (dependency-free generator)
```

## Gotchas

1. **Never import `@huggingface/transformers` or `@imgly/background-removal` statically** —
   they're dynamic-imported in client code and listed in `serverExternalPackages`. A static
   import drags ~30 MB of ONNX into the shell bundle or breaks the server build.
2. **Tests must never download model weights.** `tests/unit/embedding.test.ts` mocks the
   transformers import; keep it that way.
3. **`userId` is a string UUID** (Supabase), not an ObjectId. Only item `_id`s are ObjectIds.
4. **upc_cache never expires** — a UPC's metadata is immutable. Don't add TTLs.
5. **Rate-limit copy is contractual** (PRD §10): 429/5xx must show "Daily lookup limit reached —
   try again tomorrow, or enter the car's details manually." It lives in `RATE_LIMIT_MESSAGE`.
6. **Don't run code between `createServerClient` and `auth.getUser()` in middleware** — the
   @supabase/ssr docs warn this causes random logouts.
7. **Camera needs HTTPS** (or localhost). On-device testing requires a tunnel or deploy.
8. **The product never says the trademarked brand name** of the toy cars — copy says
   "diecast cars". Keep it that way in UI strings, metadata, and docs.

## Links

- PRD: product framing — UPC path, visual retrieval path, offline-first
- README: Supabase bucket + RLS SQL, deploy steps, roadmap
