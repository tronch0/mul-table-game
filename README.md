# אלופי הכפל · Multiply Club

**[Play the game](https://tronch0.github.io/mul-table-game/)** · [Source](https://github.com/tronch0/mul-table-game)

A responsive, installable multiplication game for third grade and up. Hebrew opens by default; an English switch changes both the language and reading direction.

## Play

Enter a name or nickname and answer one randomly selected equation at a time. A round covers all 100 ordered pairs from 1×1 through 10×10, including both 3×4 and 4×3. No earlier answers or table coordinates are shown. The progress board only shows how many questions were solved.

Wrong answers stay on the same question and the clock continues. There is no countdown. Finish all 100 questions or end early and save a partial score. Every competition attempt appears separately. Ranking is **correct answers descending, then elapsed milliseconds ascending**, with creation time and ID providing deterministic order for exact ties. Times on the board include tenths of a second. Names are display labels, not authenticated identities.

Practice works offline after the app has loaded once. Practice scores are never uploaded. Competition requires a connection because PostgreSQL issues each question, checks every answer, and owns the clock. Reloading does not pause a round. A failed request can be retried safely without awarding duplicate points. Progress is saved on the device when browser storage is available.

## Development

Requires Node.js 22.13+ and npm.

```sh
npm ci
npm run dev
npm test
npm run test:database
npm run build
```

Without Supabase environment variables, the app clearly offers practice and displays a pending shared-leaderboard state. There are no invented scores and no device-local substitute for the shared competition.

## Connect Supabase

Supabase's Free plan is suitable for a small class. Check [current pricing](https://supabase.com/pricing); inactive Free projects can pause after a week. Resume them in the dashboard before a new competition.

1. Create a **Free** organization/project in [Supabase](https://supabase.com/dashboard). Choose a nearby region. Save your database password privately.
2. Open the project's **SQL Editor**, paste [`supabase/migrations/001_game.sql`](supabase/migrations/001_game.sql), and run it once. This creates private data tables and the restricted game API.
3. Copy the **Project URL** and **publishable API key** from the project's Connect/API settings. The legacy `anon` key also works. Never use a secret key, database password, or `service_role` key in this app.
4. For local development, copy `.env.example` to `.env.local` and populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Use `VITE_BASE_PATH=/` locally if desired.
5. In the GitHub repository, add these two values as **Settings → Secrets and variables → Actions → Variables** with the same names. They are public browser configuration; database permissions provide the protection.
6. Run **Actions → Test and deploy to GitHub Pages → Run workflow**, or push to `main`.

### Parent/teacher access

The app's administrator account is separate from your Supabase dashboard/GitHub login.

1. In Supabase **Authentication → Users → Add user → Create new user**, create an email/password user and enable email confirmation for that manually created user. Choose a strong password and keep it private.
2. Copy that user's UUID and run:

```sql
insert into game_private.admins (user_id)
values ('PASTE-THE-AUTH-USER-UUID-HERE');
```

3. Open **For parents & teachers / כניסת הורים ומורים** in the game footer and sign in.
4. You can delete an individual completed attempt or reset the competition. Reset removes all scores **and active games** so previous rounds cannot repopulate a cleared board. Both actions require confirmation in the UI.

Only the server's allowlist grants administration. Client-side state or a publicly visible API key cannot grant deletion rights. If you no longer need an admin, remove their row from `game_private.admins` through the dashboard.

### GitHub Pages

The `main` branch deploys automatically after tests and the production build pass. In repository **Settings → Pages**, select **GitHub Actions** as the source. The workflow uses `/mul-table-game/` as its base path; update that value if you rename the repository. The expected URL is:

https://tronch0.github.io/mul-table-game/

To use a custom domain at its root, change `VITE_BASE_PATH` to `/` and configure the domain in Pages.

### Install and offline use

- Android/desktop Chrome or Edge: use **Install game** or the browser's install option.
- iPhone/iPad: open the site in Safari, then **Share → Add to Home Screen**.
- The app caches its own code, fonts, and icons. It does not cache Supabase API responses. Shared rankings and competition answers require internet access.
- An update prompt appears between rounds; the app does not force-refresh during an active round.

## Data and trust model

- Private PostgreSQL tables store a display name, random question deck, solved count, timestamps, and an unguessable per-round capability token. The token is stored only on the player's device and the private server row, and is never returned by the leaderboard.
- Public RPCs reveal only the current equation and sanitized leaderboard columns. Clients cannot insert scores, choose the next question, or submit a claimed duration. Row locks and idempotent retry handling prevent double counting.
- Administrator deletion requires Supabase Auth plus a private allowlist. `security definer` functions use an empty search path and explicitly restricted execution grants. Direct table access is revoked and RLS is enabled.
- A nullable `classroom_id` is reserved for future class-scoped competitions. There is currently one shared public board, with no class codes or player accounts, as requested.
- This is a friendly classroom competition, not a proctored exam: anyone may enter any nickname, and determined users can automate arithmetic. Server checks protect the recorded rules and timing, not the identity of the person answering. Add authenticated rosters and rate limiting before widening access significantly.
- Incomplete rounds abandoned for seven days are cleaned up when a new round starts. Completed attempts remain until an administrator removes them. The database contains no emails for children; only parent/teacher Auth accounts require email.

## Verification

`npm test` covers deck completeness, mirrored equations, wrong-answer behavior, completion, ordering, multilingual names, and clock formatting. `npm run test:database` executes the actual migration in PGlite/Postgres and verifies the complete 100-question lifecycle, retries, unfinished/zero-score rounds, private table denial, restricted administration, deleting an entry, resetting the board, and invalidating old games. Supabase supplies the production `auth` schema; the integration test provides a minimal equivalent for role checks.
