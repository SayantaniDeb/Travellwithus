# Security and performance review — 27 October 2026

## Scope and limits

Reviewed local React/Vite code, the FastAPI proxy, the service worker, AI cache/routing, external links, dependency advisories, and startup performance. Applied fixes and ran local tests. This is a source review and dependency audit, not a proof that all vulnerabilities have been eliminated. Live Firebase rules, hosting configuration, credentials, production authorization, and distributed denial-of-service resistance were not verified. No production data/rules were changed and no paid model requests were made for benchmarks.

## Measured results

Three sequential Lighthouse 13.5.0 default simulated mobile runs per version, guest `/` on a local production build, using the same Python static server without compression. Chrome profile is fresh per audit. Scores will differ on hosting with compression/CDN caching or on authenticated, data-heavy routes. Other local machine activity may affect timing; these are local measurements, not real-user production telemetry.

| Metric (median) | Before | Final |
| --- | ---: | ---: |
| Lighthouse performance | 35 | 65 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| LCP | 9.55 s | 6.66 s |
| CLS | 0.635 | 0.001 |
| Total blocking time | 0 ms | 152 ms |
| JavaScript transferred (local uncompressed server) | 1259 kB | 828 kB |

Individual performance scores: before **[35, 35, 35]**, final **[68, 65, 64]**. An intermediate build scored 53/58/57 before Firebase modules were split. CLS improved substantially, but final TBT is higher than the initial zero-TBT runs; the Lottie animation still has runtime CPU work. Performance is not yet in Lighthouse's green band, and LCP remains a follow-up target.

Dependency reports: npm **71 findings → 0 known findings**, including removal of all 4 initial critical findings; pip-audit **10 advisory records in the installed pip tooling → 0 known findings** after upgrading that virtual environment's pip to 26.2.2. These are advisory database results for the checked versions, not a guarantee against undiscovered vulnerabilities. The pip tooling upgrade is local to `backend/.venv`, so CI/deployment build images must update pip separately.

## Security fixes

| Finding | Change | Validation / limit |
| --- | --- | --- |
| Public cache invalidation, router metrics/status and direct provider proxy | Require a constant-time checked server-only `X-Admin-Key`; deny when `ADMIN_API_KEY` is unset | Unauthorized routes tested to return 403; never expose this key to Vite/frontend code |
| Unbounded public AI proxy requests | Validate roles, message lengths/counts, aggregate prompt length, token/temperature bounds; cap request body at 256 KB, body-read timeout at 15s, active AI requests at 8, and requests at 120/min/IP | Validation, body handling, and per-client limit covered by tests. Limits are per process; shared edge limits remain necessary |
| Cache can reuse answers from different prompts/features | Hash complete messages, feature and generation parameters; preserve caller dictionaries | Tests distinguish changed instructions and features; cache stores responses in process memory |
| Wildcard credentialed CORS | Exact origins from `CORS_ORIGINS`; no credentialed wildcard; limited methods/headers | Configure the actual deployed frontend origin. CORS is not authentication |
| Untrusted external booking/profile URLs | Only navigate to parsed HTTP/HTTPS URLs without embedded credentials/control characters | Malicious-scheme tests pass; remote content itself is not audited |
| Browser-side Gemini provider key path | Remove inactive direct browser-provider branch; keep model calls behind the server | No VITE Gemini secret is used by that branch anymore; rotate any provider key previously shipped publicly |
| Service worker can cache API responses and serve stale shell at `/` | API requests bypass caching; navigation uses network-first; scope cache cleanup; repair missing offline fallback await | Executable service-worker tests cover API bypass, navigation strategy and offline 503 |
| Service worker forces reloads while a user is editing | Replace automatic reloads with an update-available event | A new deployment no longer deliberately reloads in-progress work via these handlers |
| Duplicate Firebase initialization entry point | Use one environment-configured initializer and compatibility re-exports | Build and public-route smoke checks passed |
| Missing basic hosting headers | Add nosniff, referrer policy, anti-framing and minimal object/base CSP to Vercel and Netlify header files | Source configured only; deployment response headers not verified. CSP is deliberately minimal, not a complete script allowlist |
| Vulnerable and unused dependency trees | Remove 614 packages in the first install pass, including old image optimization/Material Tailwind/Mapbox/Flowbite trees; upgrade Firebase, React Router, Vite and compatible packages; constrain gRPC to patched versions | Final npm audit reports zero. Major SDK/tool upgrades still need authenticated production smoke testing |

## Latency and complexity changes

- Destination autocomplete now builds a sorted GeoNames index once, seeks a prefix with binary search and examines only matching candidates. Query complexity changes from **O(N)** scan to **O(log N + K)** with constant-size top-result selection; initial sorting is **O(N log N)** and memory is O(N). On 161,914 warm indexed records, median query time was **19.02 ms scanning → 0.067 ms indexed** over ten documented prefixes. The old scan timing excludes ranking, so this is conservative. See `destination-benchmark.json`.
- Hotel deduplication now uses a Set, **O(n)** instead of nested `findIndex` **O(n²)**. Sorting the full hotel list is still O(n log n).
- Daily AI cost calls use **two workers** rather than one sequential loop. Request count remains O(n); with similar provider latency the dependency chain is roughly ceil(n/2) rounds rather than n. This is bounded concurrency, not a measured end-to-end provider speedup. Failed estimates remain missing rather than fabricated prices.
- Public home no longer initializes/downloads Firestore and Storage before they are needed. Authentication, database and storage initialization are split; profile subscriptions load only after a signed-in user exists.
- Use the Lottie light player (animation has no expressions) and serve the existing animation JSON locally. Keep its animated region absolutely positioned from the first render, removing the large insertion shift without changing the illustration.
- Remove Material Tailwind and Flowbite wrappers/plugins that added unused styles/runtime. CSS is approximately **169 kB → 85 kB** uncompressed. Keep a small React vendor chunk instead of dozens of per-package startup chunks.
- Make bundle analysis opt-in with `ANALYZE=true npm run build` and remove the old binary image plugin that slowed builds and brought vulnerable dependencies.

## Validation

- `npm test`: **8 tests passed**, including auth return, immutable day indexing, viewport scheduling, safe URLs, bounded concurrency and service-worker behavior.
- `backend/.venv/bin/python -m unittest discover -s backend/tests -v`: **15 tests passed**, including moderation/image handling, cache separation, indexed search equivalence, admin deny-by-default and input bounds.
- `npm run build`: passed with Vite 7.3.7. A remaining chunk-size warning concerns the deferred Firestore bundle; it is not eagerly downloaded by the guest home page.
- Final npm audit and installed-environment pip-audit: zero known findings.
- Restarted local frontend/backend; live smoke checks returned destination search 200 (10 suggestions), admin metrics 403, and oversized token request 422.
- Public production home/Lottie rendering, planner route and login route smoke checked in the app browser. No actual sign-in or paid itinerary generation was performed in this review.

## Required deployment checks / remaining work

1. Set **CORS_ORIGINS** to the actual frontend origins before deploying the backend. Set **ADMIN_API_KEY** only if private diagnostic/admin routes are needed; otherwise they stay disabled. Example: `backend/.env.example`.
2. The public guest planner is intentionally still callable without an account. Per-process limits mitigate simple abuse but do not replace distributed, identity-aware quotas, global provider spend limits or a trusted edge limiter. Multiple workers/instances multiply the current per-process allowance. Configure trusted client IP forwarding at the hosting layer; the application does not trust arbitrary `X-Forwarded-For` headers.
3. Check deployed **Firestore and Storage security rules** with emulator tests for cross-account trip/expense reads and writes, profile ownership, poll-vote integrity and post deletion. The repo contains only community photo rule fragments, so owner enforcement for the whole deployed database cannot be certified here. The Firestore client API key is public configuration, not an authorization boundary.
4. Check Firebase auth authorized domains, provider API restrictions/quotas, hosting TLS and headers, and secret rotation/history using the actual deployment configuration. Ignored local env files are not tracked in the current Git index; full history or external secret exposure was not audited.
5. Large community/trip/expense collections still use live collection subscriptions without pagination. Add cursor pagination and aggregate counts when scaling; doing so requires product decisions about summary semantics and live updates. No existing records were hidden or dropped during this pass.
6. Keep the Lottie illustration but consider a server-rendered/static first frame and more deferred auth work for further LCP gains. Lighthouse 65 is an improvement, not the final performance ceiling.
7. Redeploy frontend and restart/redeploy backend to apply server fixes. Run authenticated smoke tests (Google popup/redirect, email sign-in, save/resume trip, add/edit expense, upload moderation and polls) before publishing the dependency upgrades to users.

Raw evidence and reproducible local results are alongside this report. No production deployment was performed.
