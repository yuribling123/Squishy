<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project architecture

- Start every component and important source or configuration file with one concise English sentence describing its responsibility; keep it accurate when the file changes.

- Organize product code by feature. Keep the squish experience under `src/features/squish` with separate `components`, `scene`, `physics`, `store`, `domain`, and `services` folders.
- Keep files in `src/app` thin. Route files should compose feature entry points and contain no 3D physics, browser storage, audio, or complex client state.
- Keep shared, genuinely reusable controls in `src/components/ui`. Do not move feature-specific components into the shared UI folder.
- Keep domain types, defaults, and configuration separate from React components. Prefer data-driven presets over conditionals embedded in JSX.
- Keep browser integrations behind small services. Audio, haptics, storage, future APIs, and future database access must not be implemented directly inside presentation components.
- Use Server Components by default. Add `"use client"` only at the smallest practical interactive boundary. Keep secrets, AI calls, and future database access on the server.
- Use Zustand for cross-component product and UI state. Keep per-frame Three.js animation and physics state in refs or focused hooks; never send 60-fps simulation data through React state.
- Keep 3D rendering, avatar composition, and deformation physics independently replaceable. Scene components describe appearance; physics hooks describe motion; feature components connect them.
- Prefer readable, focused components and descriptive names. Avoid compressed one-line JSX, oversized components, speculative abstractions, and barrel files that obscure dependency direction.

## Styling and responsive layout

- Use Tailwind CSS utilities for all component and page styling by default.
- Use `src/app/globals.css` only when a style is genuinely global or clearer there, such as Tailwind theme tokens, resets, document-level defaults, or browser behavior that cannot be expressed cleanly with utilities.
- Do not add feature-specific class selectors to `globals.css`. Do not introduce CSS Modules, CSS-in-JS, or a second styling system without an explicit product need.
- Reuse theme tokens for product colors, typography, spacing, and borders instead of scattering slightly different values through the codebase.
- Every user-facing change must produce a deliberate layout on both mobile and desktop. Treat neither viewport as a scaled copy of the other.
- Check narrow mobile layouts around 390px and desktop layouts around 1440px. Prevent horizontal overflow, keep touch targets comfortable, preserve readable type, and ensure the 3D canvas and editor remain usable at both sizes.
- Use responsive Tailwind variants intentionally. Mobile behavior should be the base; add larger-screen layout with `sm`, `md`, and `lg` only where the design needs it.
- Preserve keyboard focus styles, semantic controls, reduced-motion preferences, and accessible names while styling.

## Change discipline

- Preserve current behavior during structural refactors unless the task explicitly requests a product change.
- Run a production build after material changes. Add focused unit tests for pure domain and physics logic, and browser coverage for critical create-save-squeeze flows as those areas mature.
