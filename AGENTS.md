<!-- BEGIN:nextjs-agent-rules -->



## Next.js
- This project uses a newer Next.js version with breaking changes. Before coding, consult the relevant docs in `node_modules/next/dist/docs/` and follow deprecation notices.
- Do not remove the auto-generated `nextjs-agent-rules` block; `next dev` will recreate it.
## Architecture
- Start important source/config files with one concise English sentence describing their responsibility.
- Organize Squish code under `src/features/squish/{components,scene,physics,store,domain,services}`.
- Keep `src/app` thin: routes only compose features; no physics, storage, audio, or complex client state.
- Put only genuinely reusable controls in `src/components/ui`.
- Keep domain/config separate from React; prefer data-driven presets.
- Wrap browser APIs (audio, haptics, storage, etc.) in services.
- Prefer Server Components; use `"use client"` only at the smallest interactive boundary. Keep secrets, AI, and DB access server-side.
- Use Zustand for shared state. Keep per-frame Three.js/physics state in refs/hooks, not React state.
- Keep rendering/avatar composition/physics decoupled and replaceable.
- Prefer small readable components; avoid oversized files, compressed JSX, unnecessary abstractions, and barrel files.
## Styling
- Use Tailwind by default. Reserve `globals.css` for truly global styles; no feature-specific selectors or additional styling systems without need.
- Reuse theme tokens.
- Design intentionally for mobile (~390px) and desktop (~1440px); prevent overflow and keep the 3D/editor UI usable.
- Mobile-first; use responsive variants only when needed.
- Preserve accessibility, focus states, semantic controls, and reduced-motion support.
## Changes
- Preserve behavior during refactors unless a product change is requested.
- Run a production build after material changes.
- Add focused tests for domain/physics logic and critical create-save-squeeze flows as needed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
