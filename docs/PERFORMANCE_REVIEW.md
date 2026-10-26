# Performance review — 26 October 2026

Scope: frontend startup, route loading, home animations, budget ledger rendering/subscriptions, day numbering, and mobile viewport handlers. This is a targeted review, not a claim that every backend and frontend path has been profiled.

## Changes

- Secondary routes load through React.lazy rather than loading all page implementations on home.
- Removed four unused render-blocking Mapbox/Unicons stylesheets; source search found no consumers.
- Removed unused Material Tailwind import from the shared navbar.
- Home displays its public content without waiting for Firebase authentication. Authenticated controls still depend on authentication.
- Feature tour imports when visible, with space reserved for its contents.
- Full budget page reuses the shared ledger; removed obsolete expense UI and its duplicate Firestore expense listener.
- Ledger totals are memoized by trip/expense snapshot instead of recomputing on every amount-field keystroke.
- Destination-day indexing uses a WeakMap keyed by immutable day-array identity: O(n) construction plus O(1) lookups, replacing O(n) scans for each card (O(n²) over the list). Existing code must continue to replace day arrays immutably.
- Viewport listeners coalesce updates with requestAnimationFrame and skip unchanged heights. Removed global zoom blocking and body scroll locking.
- Decorative hero vehicles and wheels use CSS transforms for motion rather than changing SVG transform attributes.
- Measure hero dimensions before paint, avoiding a first frame sized for desktop on mobile.
- Corrected preview-badge contrast. Analytics is opt-in via VITE_ENABLE_ANALYTICS=true, avoiding requests to unavailable Vercel analytics on other hosts.

## Verification

- `npm run build`
- `node --test tests/performance.test.mjs`
- Lighthouse 12.8.2 against local production preview, default simulated mobile, guest `/home`.
- Initial production HTML JS references reduced from 31 to 15. External blocking stylesheets reduced from 4 to 0. These counts do not include later dynamic downloads.
- No valid pre-change production Lighthouse baseline was collected: the initial development-server audit timed out. The subsequent production audits compare iterations within this optimization pass, not the original app.

## Recorded Lighthouse results

Guest production `/home`, default simulated mobile, local preview:

| Audit | First production iteration | Latest measured iteration |
|---|---:|---:|
| Performance | 33 | 47 |
| Accessibility | 96 | 100 |
| Best Practices | 96 | 100 |
| SEO | 100 | 100 |
| Total blocking time | 2,090 ms | 2,160 ms |
| Cumulative layout shift | 0.393 | 0.001 |

These are single-run measurements within this pass, not a pre-change production baseline. Latest measured LCP was 4.8 s and CLS 0.001; startup CPU performance still needs work. Recent iterations scored 47–61 for Performance, with blocking time ranging from 140 to 2,160 ms. These runs used different optimization iterations and are not a repeated-run median. Local CPU contention and network variability may explain some variance. The summary is stored in `docs/lighthouse-home.json`.

## Remaining recommendations

1. Share auth/profile state in one provider. Navbar and page components currently register separate observers and profile reads across route mounts.
2. Paginate large trip, community, and expense collections with Firestore cursors; avoid downloading all historical records solely to render one screen. Use stored aggregates when data volume warrants them.
3. Profile authenticated routes on representative accounts. Guest home audits do not exercise Firestore data-heavy pages or prove their performance.
4. Reduce the decorative hero's runtime work if animation startup remains costly; keep Remotion for the interactive tutorial, and consider a static poster/lightweight CSS animation for the hero.
5. Replace large GIF illustrations with compressed video or static WebP/AVIF where animation is unnecessary. Do not remove image dimensions or accessibility text.
6. The planner currently estimates day costs through sequential provider requests. Move this to a validated batched backend response or bounded concurrency with provider rate limits and retries. Do not send an unbounded Promise.all across 30 days.
7. Revisit per-package manualChunks after measuring request waterfalls. Many tiny vendor chunks can trade reduced duplication for extra network overhead.
8. Run Lighthouse in CI against a production server and track repeated-run medians on the deployment host. Local CPU contention, network, theme, and saved browser state affect results.

AI estimates and logged expenses remain stored separately; performance changes do not migrate or delete database records.
