# Supabase setup (not yet connected)

AquaTrace can run in local demonstration mode without a backend. Setting both Vite variables below switches authentication and community reports to Supabase. No project URL or key has been supplied or embedded in this repository; the shared schema migration is prepared but has **not** been applied.

## Project-owner setup

1. Create or select an AquaTrace Supabase project and keep its database credentials private.
2. Copy `.env.example` to `.env.local` and fill in the project URL and the public client/publishable key from that project. Do not put a `service_role` or secret key in any `VITE_` variable; Vite exposes those values to browsers.
3. In the Supabase SQL editor, review and apply `supabase/migrations/20261031000000_aquatrace_shared_platform.sql` once. The migration enables row-level security and installs the tables, profile trigger and role-checked RPCs. It has not been tested against a live Supabase project; inspect it and back up any existing project before applying.
4. Configure Supabase Auth email confirmation, password policy and redirect URLs for the exact local and deployed app origins. Use HTTPS for deployed origins.
5. Register the intended administrator through the app. Find that user ID in Supabase Auth, copy the migration's commented first-administrator bootstrap block into the SQL editor, remove its comment prefixes, replace the placeholder UUID, and run it as the project owner. Check that the administrator role and role-history row were created before inviting reviewers.
6. Restart Vite after changing environment variables. Test registration, sign-in, recovery, each role, RLS denials, report submission, review history, role changes and sign-out using non-production test accounts.
7. Add water points only when an inspectable original HTTPS source supports the location. New records start unverified and availability unknown; the schema intentionally contains no seeded points.

New registrations receive only the resident role. Reviewers and administrators must be granted by an administrator. The browser's public Supabase key is not a secret; RLS and server-side role checks are the security boundary. Never ship service-role credentials.

## Data preservation and migration

The local demo reports remain in `localStorage` and are never uploaded automatically. A signed-in user can explicitly import their own saved reports from the app. The import operation is idempotent by the original local report ID, creates shared records as Unverified, and does not import local review notes as authenticated evidence. It retains original date fields and the demo-account label where available, separately from the authenticated importing account and shared creation timestamp. Reports saved by older versions did not record reporter identity, so that identity cannot be reconstructed; the importer is the shared record's accountable reporter. Back up browser data before testing imports.

Historical incidents remain a separate, read-only source-backed dataset and are not imported as community reports. Existing demo water points are fictional and are not seeded to Supabase.

## Current limitations

Until a project is configured and the migration is applied, cross-user sharing, Supabase Auth, database-enforced roles, shared water-point review and account-role management cannot be demonstrated end-to-end. Migration syntax, policies, and RPC behavior still need validation in a disposable Supabase project. No deployment, database, integration tests, or credentials are provided by this repository.
