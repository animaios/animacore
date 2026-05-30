# Knip Cleanup Extended — Requirements

## Overview

This spec covers all remaining Knip cleanup work across three phases: configuration refinements, dependency pruning, and export cleanup. It also carries over 4 unfinished tasks from the existing [`knip-cleanup`](.roo/specs/knip-cleanup/tasks.md) spec (T2C.1–T2C.4: adding `entry` arrays to 4 workspaces).

## Carry-Over: Phase 2C — Add Package Entry Points

### R0: Add Entry Arrays to 4 Workspaces in knip.json

Four workspace configurations in [`knip.json`](knip.json) only define `project` patterns but lack `entry` arrays. Without an entry point, Knip treats every exported symbol as potentially unused because it cannot determine the package's public API surface.

| Workspace | Entry to Add | Current State |
|-----------|-------------|---------------|
| `packages/plugin-sdk` | `"entry": ["src/index.ts"]` | Has `project` + negation pattern, no `entry` |
| `packages/core-agent` | `"entry": ["src/index.ts"]` | Has `project` only, no `entry` |
| `packages/stage-ui-three` | `"entry": ["src/index.ts"]` | Has `project` only, no `entry` |
| `packages/ccc` | `"entry": ["src/index.ts"]` | Has `project` only, no `entry` |

**Requirement:** Add `"entry": ["src/index.ts"]` to each of these 4 workspace configurations in [`knip.json`](knip.json).

---

## Phase 1: Configuration Refinements & Quick Fixes

### R1: Remove Redundant `*.vue` Project Patterns from knip.json

Knip warns that `.vue` files are already registered via compiler configurations. The `"src/**/*.vue"` patterns in the `project` arrays of 6 workspaces are redundant and should be removed.

Affected workspaces in [`knip.json`](knip.json):

| Workspace | Line(s) to Remove |
|-----------|-------------------|
| `apps/stage-tamagotchi` | `"src/**/*.vue"` at project[1] |
| `packages/stage-ui` | `"src/**/*.vue"` at project[1] |
| `packages/ui-transitions` | `"src/**/*.vue"` at project[1] |
| `packages/stage-ui-three` | `"src/**/*.vue"` at project[1] |
| `packages/stage-ui-live2d` | `"src/**/*.vue"` at project[1] |
| `packages/stage-layouts` | `"src/**/*.vue"` at project[1] |

**Requirement:** Remove `"src/**/*.vue"` from the `project` array in each of these 6 workspace configurations. The `project` array should retain only `"src/**/*.ts"` (and any existing negation patterns).

### R2: Remove Redundant Entry Point in ui-transitions

[`knip.json`](knip.json:38) lists `"playground/src/main.ts"` in the `entry` array for `packages/ui-transitions`. Knip flagged this as redundant because the playground entry is already covered or not needed for the library's Knip analysis.

**Requirement:** Remove `"playground/src/main.ts"` from the `entry` array of the `packages/ui-transitions` workspace in [`knip.json`](knip.json). The workspace should retain only its `project` patterns.

### R3: Fix Broken Export Path in stage-layouts/package.json

[`packages/stage-layouts/package.json`](packages/stage-layouts/package.json:22) defines:

```json
"./components/Layouts/ViewControls/*": "./src/components/Layouts/ViewControls/*.vue"
```

However, no `ViewControls/` directory exists under `src/components/Layouts/`. The actual file is [`ViewControls.vue`](packages/stage-layouts/src/components/Layouts/InteractiveArea/Actions/ViewControls.vue) located at `src/components/Layouts/InteractiveArea/Actions/ViewControls.vue`. This export path points to a non-existent location.

**Requirement:** Remove the broken `"./components/Layouts/ViewControls/*"` export entry from [`packages/stage-layouts/package.json`](packages/stage-layouts/package.json:22). The `ViewControls.vue` component is already reachable via the `"./components/Layouts/InteractiveArea/Actions/*"` export path at [line 21](packages/stage-layouts/package.json:21).

### R4: Remove Unused chess.js Catalog Entry

[`pnpm-workspace.yaml`](pnpm-workspace.yaml:49) contains `chess.js: ^1.4.0` in the `catalog` section. The `chess.js` package was removed from `apps/stage-tamagotchi/package.json` during the original Phase 1 cleanup, and no other workspace in the monorepo references it.

**Requirement:** Remove the `chess.js: ^1.4.0` entry from the `catalog` section of [`pnpm-workspace.yaml`](pnpm-workspace.yaml:49) and run `pnpm install` to update the lockfile.

---

## Phase 2: Dependency Pruning

### R5: Prune Unused Dependencies Incrementally

Knip identified 88 unused dependencies and 66 unused devDependencies across the monorepo. Removing all at once risks build/compilation failures if some are implicitly resolved elsewhere.

**Requirement:** Prune unused dependencies in two incremental steps:

1. **R5.1: Prune root/dev dependencies first** — Remove verified devDependencies at the root and in individual packages where build tools are no longer used. This includes `@iconify-json/*` packages in `apps/stage-tamagotchi` and `@types/*` packages that are no longer imported anywhere.

2. **R5.2: Prune package-level unused dependencies** — Run targeted removals using `pnpm --filter` under the respective workspace scope. After pruning each major workspace group, run `pnpm test` and `pnpm build` to verify no breakage.

**Specific high-confidence removals for `packages/stage-ui`:**

The following packages in [`packages/stage-ui/package.json`](packages/stage-ui/package.json) have zero imports in the `src/` tree:

| Package | Category |
|---------|----------|
| `@proj-airi/audio` | Unused dependency |
| `@proj-airi/core-character` | Unused dependency |
| `@proj-airi/font-chillroundm` | Unused dependency |
| `@ricky0123/vad-web` | Unused dependency |
| `@shopify/draggable` | Unused dependency |
| `d3` | Unused dependency |
| `embla-carousel-autoplay` | Unused dependency |
| `gpuu` | Unused dependency |
| `hono` | Unused dependency |
| `rehype-parse` | Unused dependency |
| `splitpanes` | Unused dependency |
| `unist-builder` | Unused dependency |
| `unist-util-visit` | Unused dependency |

**Requirement:** Remove these 13 packages from [`packages/stage-ui/package.json`](packages/stage-ui/package.json) using `pnpm --filter @proj-airi/stage-ui remove <packages>` and verify with typecheck + build.

**Note:** A full list of all 88 unused dependencies and 66 unused devDependencies should be extracted from the latest Knip run output before implementation. The implementer should group removals by workspace and run verification after each group.

---

## Phase 3: Export Cleanup

### R6: Internalize Unused Exports

Knip identified 58 unused code exports — functions/values that are exported but never imported by any other file. For exports only used within their declaring file, the `export` keyword is unnecessary and broadens the bundle entry surface.

**Requirement:** For each unused export that is only consumed internally within its own file, remove the `export` keyword. This limits scope and cleans up bundle entry points without breaking any inter-module dependencies.

**Examples:**
- `prepareVrmOutlineRuntime` in [`packages/stage-ui-three/src/composables/vrm/outline.ts`](packages/stage-ui-three/src/composables/vrm/outline.ts:464) — only called internally within the same file's `onLoad` callback
- Other exports identified by Knip should be reviewed individually before removing `export`

### R7: Retain Workspace API Boundaries

Some unused exports may be intentionally kept as part of a public SDK/API surface for future external consumers. These should not be removed.

**Requirement:** If any identified unused exports are intended for future use by external packages as part of a public SDK/API, they can be kept. To prevent Knip from flagging them:
- Document them with an `@internal` or `@public` JSDoc tag
- Or configure Knip's `exports` ignore rules in [`knip.json`](knip.json) for public library workspaces such as `packages/plugin-sdk` or `packages/core-agent`

### R8: Prune Orphaned Types

Knip identified 112 unused exported types/interfaces. Since types are erased during compilation, removing them does not impact runtime behavior but reduces codebase noise.

**Requirement:** Safely remove unused exported types that have zero import references across the entire monorepo. Each type should be verified before removal to ensure it is not:
- Referenced in Vue template type inference
- Used as a generic parameter constraint in an otherwise-used type
- Part of a planned public API surface

---

## Verification Requirements

### R9: Verify Clean State After Each Phase

**Requirement:** After completing each phase, run the following verification commands:

1. `pnpm install` — ensure lockfile consistency
2. `pnpm -F @proj-airi/stage-tamagotchi typecheck` — confirm no type errors
3. `pnpm -F @proj-airi/stage-ui typecheck` — confirm no type errors in stage-ui
4. `pnpm knip` — verify the report improves with each phase
5. `pnpm lint` — confirm no lint issues from changes

After all phases are complete, the Knip report should show:
- Zero configuration warnings
- Significantly reduced unused dependency counts
- Significantly reduced unused export/type counts
- Any remaining items are genuine and documented

## Out of Scope

- Refactoring or rewriting any of the deleted/orphaned code
- Adding new features or functionality
- Changes to build pipeline or CI configuration beyond Knip config
- Removing dependencies that may be implicitly used by bundler plugins or Vite config