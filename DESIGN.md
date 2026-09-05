---
name: Plugin Hub — minimal jelly workspace
description: A quiet English workspace with translucent tool icons, a compact marketplace drawer, and an additive native sidebar rail.
colors:
  action: "#34353b"
  canvas: "#fafafa"
  surface: "#fff"
  text: "#303137"
  muted: "#74757e"
  focus: "#7a98d1"
  tray-border: "#d3d5db"
  field: "#f7f7f9"
  market-field: "#f4f4f7"
  error: "#a34c40"
typography:
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'
    fontSize: "17px"
    fontWeight: 550
    letterSpacing: "-.025em"
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'
    fontSize: "12px"
  output:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.7"
rounded:
  surface: "25px"
  drawer: "24px"
  control: "12px"
  market-control: "10px"
spacing:
  control-gap: "8px"
  panel: "24px"
components:
  run:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    width: "80px"
  install:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.market-control}"
    padding: "9px 15px"
---

# Plugin Hub — minimal jelly workspace

## Overview

**Creative North Star: "Minimal jelly workspace"**

English-only Apple-like workspace: Equipped Plugins and Available Plugins in dashed trays, with Quick Output alongside. Soft blue, lavender, and honey translucent Three.js icons provide the expressive decoration. Marketplace discovery extends Available through a quiet Browse control and temporary drawer, preserving the incumbent three-section composition. The native main application adds a compact vertical plugin rail beside its existing sidebar; the standalone `/plugin-hub` route stays sidebar-free.

**Key Characteristics:**

- Three areas, spacious neutral canvas
- One original DOM node per tool or installed package in the standalone Hub; no drag clones
- Real rounded Three.js forms with opacity 0.55 and CSS fallback
- Finite jelly motion with reduced-motion support
- Quiet marketplace drawer with collapsible details and real installation status
- Additive native rail that preserves the original sidebar and conversations

## Colors

Dark action buttons and neutral surfaces keep the canvas quiet. Pale blue, lavender and honey pigments belong to the included tool icons; subdued blue monograms distinguish catalog marks, while installed packages share the jelly renderer. The native rail inherits Harness text, sidebar fill, border and base-surface variables with neutral fallbacks. Available rail art uses .64 opacity; equipped or hovered art uses full opacity, with a small muted-green equipped indicator. Error text uses the warm error color. Pale destination fills and blue focus outlines communicate interaction without adding decoration.

## Typography

Native Apple/system type carries the entire interface. Section titles use the title token; the wordmark is compact (15px, weight 590). Plugin names and controls use small English labels (12px); marketplace names are slightly larger (13px), and state/setup labels are smaller (10–11px). Quick Output uses wrapping system text with tabular elapsed time. Package identifiers use the browser monospace face and wrap long strings. The native rail uses 12px system type, 11px action-panel links and explanations, and 10px status text.

## Layout

A centered container (1120px maximum, 40px side padding) holds a two-column grid (1.15fr / 1fr, 36px row and 44px column gaps). Equipped and Available occupy the left; Quick Output spans both rows on the right. The header contains only the small wordmark. Trays start at 233px tall; Quick Output starts at 534px. At 950px, gaps and padding tighten; at 720px the three sections stack in logical order within a 560px container. Additional compact adjustments apply at 390px; wide-screen spacing increases at 1500px.

Browse sits opposite the Available heading. Its right-hand drawer is independently scrollable, 440px wide with 20px viewport insets and 24px padding. At 720px and below it uses 12px viewport insets and 20px padding. Search and category share one row (58% / 42%). Results appear in batches of 24 through Show more, with descriptions and actions revealed by expanding a row.

The main `/` application mounts the rail through the additive `shell.overlay` slot immediately right of the native sidebar. It reserves 68px in the adjacent center column using `data-hub-rail-offset`, narrowing to 54px at 600px and below. A ResizeObserver tracks sidebar and frame geometry, including sidebar collapse; unmount removes the reserved offset. The original sidebar and conversations remain intact. The vertical icon list scrolls independently with 16px gaps; its scenes are 58px, reducing to 50px on narrow screens. The standalone `/plugin-hub` layout does not gain a sidebar.

## Elevation & Depth

Main surfaces rely on borders and neutral fills. Soft shadows distinguish temporary action popovers and the marketplace drawer. Three.js 0.180.0 renders rounded extruded physical forms with opacity .55, clearcoat and studio reflections; translucent sculpted CSS icons remain when WebGL is unavailable. Catalog monograms use restrained inset highlights; installed packages share the full jelly scene with a stable pastel derived from their package name. The rail reuses local jelly scenes at smaller dimensions, with an inset-highlight fallback and a shadowed action panel. Exact shadow values live in the sidecar.

## Shapes

Rounded dashed trays and the white output panel share broad surface corners. The drawer uses a closely related rounded rectangle. Fields and action buttons use smaller curved corners; the drawer close control is circular (32px). Catalog marks are compact rounded squares (38px, 12px radius); installed packages use the same 110px scene as included tools. Rail icon buttons use 15px corners, its Home link 12px, and the action panel 16px.

## Components

**The One plugin, one node Rule.** In the standalone Hub, reuse each original tool or installed-package button across refreshes and moves. Included tools can occupy Equipped, Available, or the single Quick Output seat; manageable installed packages move between Equipped and Available. A pending drop places the original button immediately; backend acknowledgement confirms placement and failure restores the confirmed state.

Included tools use a 110px icon scene and short name. Click/keyboard opens the compact Equip / Try out / Return popover; pointer drag moves the original button and highlights its destination. Quick Output holds one tool seat above Input and Run, with real output, elapsed time and an error treatment. The dark Run action becomes pale when disabled. Focus uses a visible blue outline (3px, normally 5px offset; marketplace summaries and category use 3px offset).

Jelly hover squeeze lasts 620ms and landing bounce lasts 680ms, with per-keyframe cubic-bezier(.4,0,.2,1). Independent scale animation preserves the Quick Output transform; retriggers begin from the computed current scale before canceling the prior animation. Mesh tilt uses a finite 32-frame settle with .16 interpolation. Reduced motion suppresses tilt and bounce, and disables CSS transitions. There is no endless animation loop.

Browse opens the marketplace aside and focuses search; Close or Escape hides it and restores Browse focus. Native details rows expose the English description, wrapping package identifier, Source link and eligible Install control, followed by a setup note. The note is visible in expanded details before installation and explains third-party code, restart, disabled build scripts and unsupported Quick Output. Installing, Installed, Retry install, loading, empty, unavailable and error states reflect real catalog/install responses. Background refresh preserves expanded rows and the install button's focus. Git-only entries offer source instructions. Installed bundles appear once per package: confirmed loaded modules in Equipped, others in Available. Manageable modules share the original-node drag handler and expose Unload / Equip plus Details in their action menu. Unsupported Quick Output is hidden. Unloaded bundle layers expose Restart when required; restart status remains until reconnection or a recoverable error.


Installed package icons use the common 110px Three.js jelly scene and default four-module SVG mark. Live Equip / Unload preserves package installation and existing Loader configuration; these toggles last for the process. A Restart action is available for bundles requiring composition at startup, without implying every package requires restart.

Drag handoff uses the original node’s release rectangle and a 300ms ease-out transform into its layout slot. Jelly landing begins on drop and does not repeat on network completion. Pending placement survives refreshes, exposes aria-busy and disables follow-up actions. Failed operations transition back to confirmed placement; reduced motion bypasses spatial animation.

The native rail lists included tools and deduplicated installed packages. Its top SVG module link opens the full Hub in a new tab. Each named icon opens an anchored 210px action panel with the plugin name, Close, and Open in Hub. Manageable entries expose real Equip / Unload actions; other entries explain restart or missing runtime control. Opening focuses an action; outside click and Escape dismiss the panel. Focus rings use a 2px blue outline with 2px offset. Actions disable while pending and return focus to the initiating icon after completion. State refresh runs every three seconds while the document is visible, skipping pending mutations and rejecting stale responses. Errors appear in the panel or a compact rail status. Rail CSS inherits native Harness surfaces and scopes controls to the extension.

## Do's and Don'ts

### Do

- Use the system font and compact English names.
- Keep keyboard actions equivalent to included-tool drag destinations.
- Return a replaced Quick Output occupant to Available.
- Keep catalog descriptions and setup notes inside expanded marketplace rows.
- Use the common jelly icon and action menu for installed packages; base equipment state on confirmed runtime data.

### Don’t

- Keep `/plugin-hub` sidebar-free and preserve the native main application sidebar beside its additive rail. Do not restore the Hub profile/status badge, runtime foundation cards, subtitles, or activity feed.
- Do not duplicate icons while dragging.
- Do not introduce infinite animation.
- Do not offer live Equip / Unload without a manageable runtime entry, or Quick Output without a tool-specific adapter.

## Overlapping sidebar equipment stack

The native main UI extension rests as overlapping, individually rotated 100px jelly cards beside the sidebar. On hover, keyboard activation or tap, the same card wrappers unfold into an upper Equipped and lower Available dashed tray inside a 250px panel. Main content reserves 100px on desktop; narrow screens overlay the panel and clamp it within the viewport. Each opening transition lasts 680ms with a spring-like overshoot, at most 190ms of stagger, and a finite shared jelly landing. Closing takes 320ms; reduced motion removes spatial transitions. Hover departure has a 380ms grace period; focus and open actions keep the panel usable. Header links to Hub; footer opens its searchable Awesome Plugins marketplace. Hub adds a native DeepSeek logo linking back to /. This supersedes the earlier straight 68px/54px rail.

### Current sidebar stack refinement

Supersedes the 250px two-column panel: use a 146px transparent extension, with single-column 100px icons in two dashed trays and no shared background or shadow plate. Clip the collapsed card stack at the sidebar edge so about half each card remains hidden. Solid pastel underlayers, beveled inset lighting, and a short directional edge shadow make the overlapping material legible; suppress rear glyphs while collapsed. Pointer capture moves the original card without clones, highlights valid drop zones, and auto-scrolls near edges. Drop uses optimistic equipment placement with the existing live lifecycle endpoints; rollback restores confirmed state after a failed call. Escape, cancellation, or a drop outside trays returns the card. Preserve keyboard menu actions and reduced-motion support.
