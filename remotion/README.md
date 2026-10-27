# Travel With Us launch video

42 seconds · 1920 × 1080 · 30 fps. Original animated product illustrations and an original instrumental bed; no private user data, external assets or live API calls.

Preview: `npm run video:studio`

Render: `npm run video:render`

Edit captions, colors and demonstrations in `remotion/index.jsx`. The sample destinations, stays, costs and poll results are illustrative. The video does not promise confirmed prices. No public URL has been invented; the final CTA uses the product name.

Soundtrack source: `remotion/soundtrack.py`; regenerate with `python3 remotion/soundtrack.py`.

The Zod override uses a patched 4.x release. Remotion may print a version warning because it pins an older release; this composition does not use Zod schemas. Keep the security override rather than downgrading to the vulnerable version.

## Launch V2 — kinetic product film

26 seconds, 1920 × 1080, 30 fps. Cream, ink and lime art direction with fast type edits, an animated illustrative planning interface, itinerary, expense summary, and essentials montage. This first creative pass has not yet been compared with the user's earlier ihatepdf reference, which was unavailable in the current chat.

Source: `remotion/launch-v2.jsx`. Score: `remotion/soundtrack-v2.py` → `remotion/public/launch-v2.wav`. All music is synthesized locally, including accents at scene cuts.

Render with `npx remotion render remotion/index.jsx TravelWithUsLaunchV2 out/travel-with-us-launch-v2.mp4 --public-dir=remotion/public --concurrency=2`. If Chrome is already installed, add `--browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'` to avoid a browser download.

The interface is a stylized product demonstration, not a screen recording. Trip dates, destinations and amounts are sample data. The original 42-second composition remains available.

## 30-second story cut

`TravelWithUsStory` / `out/travel-with-us-story-30s.mp4`: 900 frames, 1080p, 30 fps. Fictional WhatsApp group chat → introduction → planner → saved itinerary → saved stay → budget → animated packing checkboxes → weather update → community poll → group-chat payoff. Chat is an illustrative conversation, not a WhatsApp integration. Weather and trip details are sample data.

Edit `remotion/launch-story.jsx`. Original synthesized soundtrack: `remotion/soundtrack-story.py`. Render using the V2 command above with composition `TravelWithUsStory` and output `out/travel-with-us-story-30s.mp4`.

## Continuous motion film

Composition `TravelWithUsMotion`, source `remotion/motion-film.jsx`, 30 seconds. A single spatial canvas connects the fictional chat, planner, route, stay, expense, packing, weather, community, and final replies. Camera travel follows dotted route connectors with an airplane; animated cursors, click rings, typing, drawing routes, sliding cards, changing totals, checkbox strokes, and rain carry the story. Previous cuts remain available.

Outputs: `out/travel-with-us-motion-30s.mp4` and `out/travel-with-us-motion-15s.mp4`. The 15-second version plays the full animation at double speed with pitch-preserving audio tempo conversion.

## Vertical Reel

`TravelWithUsReel` in `remotion/reel.jsx` renders native 1080 × 1920 portrait layouts. Chat bubbles, dates, itinerary days, budget, packing and weather are stacked for vertical reading. A continuous vertical camera move links the scenes. Branding and main content have top and bottom breathing room. Outputs: `out/travel-with-us-reel-30s.mp4` and `out/travel-with-us-reel-15s.mp4` (full story at double speed, audio tempo matched).
