# Savour · AR food transparency

Next.js App Router + TypeScript customer-menu prototype backed by Supabase Postgres.

## Run

Requires Node.js 20.9+ and npm. From this directory:

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and supply the Supabase project URL and **publishable** key. Never put a secret or service-role key in a `NEXT_PUBLIC_` variable. The current local environment points to the dedicated `cafe-ar` project in Mumbai, reference `pswwchqwflodewkgfxwe`.

## Implemented

- Responsive customer menu, categories, search, vegetarian filter, ingredient and allergen details.
- Supabase menu reads with explicit demo-data fallback and an anonymous order Edge Function.
- Accessible native modal dialogs, a persistent browser-local bag, and transactional order submission.
- Lazy-loaded model-viewer with 3D controls and native AR handoff on supported devices.
- Original procedural GLB burger, pizza and pancake assets. Regenerate using `node scripts/generate-models.mjs`.
- Published-menu RLS and cafe-member-scoped dish mutation policies. No public writes.
- Table-aware routes such as `/table/7`, which prefill the table during checkout.
- `/admin` cafe-member sign-in, live order queue, status updates, and price/publication editing. Sessions are kept only in memory; sign in again after reload or expiry.
- A safe demo-admin workspace at `/admin` using `manager@demo.savour.cafe`; its sample data and changes never touch Supabase.

## Database

`supabase/schema.sql` records the initial hosted schema applied as migration `initial_cafe_menu`. `supabase/seed.sql` contains demo seed data. Do not reapply the schema blindly to the existing project. Memberships must be provisioned by a trusted administrator; customers cannot assign themselves access.

## Current limits

This is a cafe pilot prototype. Orders are submitted through the deployed `submit-order` Edge Function with server-calculated live prices and an idempotency token, but payment is handled by the cafe. Admin account provisioning, complete menu editing, abuse/rate limiting, model uploads, QR artwork generation, analytics, and web-app deployment remain to be implemented. No cafe-verified models or nutrition data are claimed.

The procedural models are illustrative and deliberately labelled. The scale is authored in metres but must be checked on physical Android and iPhone devices before making portion-accuracy claims. Native AR requires HTTPS (ordinary LAN HTTP is not sufficient). iOS model conversion and all platform fallbacks require physical-device QA.

Remote resources: Google Fonts, Unsplash illustrative image URLs, and the pinned Google model-viewer 4.1.0 module. Replace demo photographs with cafe-owned photographs and bundle the viewer before production. External requests require internet access. The model viewer loads only when requested.

## Validation

```sh
npm run typecheck
npm run build
node scripts/check-models.mjs
```

TypeScript and a Next.js production build passed on this development machine. The production server returned HTTP 200 for `/`, `/admin`, and a GLB asset; `/table/7` returned the expected redirect to `/?table=7`. Supabase anonymous reads returned six dishes, the `submit-order` Edge Function is active, direct anonymous order-table access is disabled, and security advisors returned no issues. Transaction and idempotency tests were rolled back, leaving zero test orders. Browser visual QA and physical-phone AR testing are still outstanding.

This agent's execution sandbox blocks outbound server connections, so the local HTTP check rendered the explicitly labelled demo fallback. Hosted database access was verified separately using the Supabase connector. Verify the application's live REST integration in a network-enabled runtime before deployment. Performance advisors report only an unused membership index on the new, empty membership table; retain it for member lookups.

The `prepare-offline-cache.cjs` and `verify-from-cache.cjs` scripts are temporary, environment-specific recovery helpers for the restricted development machine, not an alternative production installation workflow. A package lock is included; verify a clean installation before deployment.
