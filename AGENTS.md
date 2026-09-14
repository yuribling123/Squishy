<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version may contain breaking changes. Before modifying Next.js-specific APIs or conventions, read the relevant documentation under `node_modules/next/dist/docs/`.

<!-- END:nextjs-agent-rules -->

# Project Architecture

This is an interactive 3D squishy character built with Next.js, React, Three.js, and runtime mesh deformation.

Keep squish-specific code under `src/features/squish`:

- `components/` — React UI and experience composition
- `scene/` — Three.js scene, character, camera, lighting, and interaction
- `physics/` — deformation, dragging, pressing, recovery, collision, and constraints
- `domain/` — shared types, constants, and character definitions
- `store/` — application and interaction state
- `services/` — model and asset loading

Reusable UI belongs in `src/components/ui`.

Before adding code, decide which existing layer owns the responsibility. Do not create new top-level folders unless necessary.

# Maintainability & Readability

- Keep files and functions focused on one responsibility.
- Prefer small, clearly named modules over large components or monolithic files.
- Keep physics, Three.js scene logic, and React UI separated.
- Extract reusable logic instead of duplicating it.
- Use descriptive names; avoid vague `utils`, `helpers`, or `manager` abstractions.
- Keep complex math and deformation logic out of React components.
- Add dependencies only when they provide clear value.
- Prefer simple, readable solutions over clever abstractions.
- Preserve existing architecture and conventions when extending features.

# Squish System

- Treat the Basis mesh as the canonical undeformed shape.
- Runtime deformation should reference the original Basis positions and recover toward them.
- Keep deformation logic independent from the character's visual design where possible.
- Character parts may be deformable, rigid, colliders, or attached to deforming surfaces.
- Prevent obvious penetration, self-intersection, triangle flipping, and permanent mesh drift.
- Avoid unnecessary allocations or React state updates inside the render loop.

Blender owns the base character appearance and topology.
Three.js owns runtime interaction and deformation.