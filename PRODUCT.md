# Plugin Hub

Desktop-first Web plugin for DeepSeek Harness. Real Cordis equip, tool execution and cleanup. Marketplace discovery and profile installation are supported.

## Current approved direction

The user explicitly replaced the earlier dense equipment workspace with a minimal, Apple-like interface. English only. Three sections: Equipped Plugins, Available Plugins, Quick Output. The first two use rounded dashed trays. Only short titles, plugin names and essential input/run controls are visible. Remove the prior runtime cards, sidebar, metadata captions, activity feed and explanatory paragraphs.

A plugin icon exists in exactly one section at a time. Move actual DOM nodes without drag clones. Available ↔ Equipped changes true Harness registration. Available → Quick Output prepares a temporary tryout; Run mounts, executes and disposes through the real tool pipeline. Replacing the tryout returns the previous plugin to Available. Click/keyboard actions provide alternatives to dragging.

Icons are jelly-morphic rounded squares, softly colored and approximately 45% transparent. Use real Three.js geometry, glass materials and lighting, with a CSS fallback. Cute squash/stretch, springy landing and interactive tilt are explicitly requested. Keep the overall canvas quiet and minimalist. Respect reduced motion; no infinite animation loops.

## Stack

Independent ESM Harness bundle, official npm Harness 0.1.2-rc.1. Browser-native UI and Web Animations API. Three.js 0.180.0 browser modules shipped locally with MIT license. Visual assets are local. The installer reads npm metadata and downloads packages. Local loopback HTTP only. Temporary process state, not persistent profile editing.

## Marketplace

Browse beside Available opens a minimal English drawer with search, category filters, progressive results and expandable details. The bundled catalog is an English snapshot from awesome-dsh-plugin.com (3,196 entries on 2026-09-06); scripts/sync-marketplace.py refreshes it. Registry package entries can be installed through the official Harness CLI into the explicit DSH_HOME/profile. Only verified npm Harness bundles are accepted, pinned to the resolved version, with build scripts disabled. Git-only entries link to source instructions. Installation progress and errors are real. Installed bundles appear once per package, in Equipped when a module is confirmed loaded and Available otherwise, with real drag/equip/unload for registered package modules; Quick Output remains tool-specific. New bundle layers may require restart for activation; generic live loading and custom configuration are future work. No profile/status badge is visible in the header.

Installed icons share the Three.js jelly default and finite animations with included tools. A Restart quick action appears for newly installed, unloaded bundles. The project launcher manages its child via IPC, restarts gracefully, and the browser reconnects after PID changes. No restart action runs automatically. Unsupported launchers cannot be terminated through this route.

Registered installed plugins share the demo icon component and actions. Unload toggles Loader entry disabled state and disposes its effects; Equip reuses the entry and config. These are process-only operations with rollback on failure, serialized against package installation. The menu hides unsupported Quick Output and provides Details plus Restart when necessary.

Drops render optimistically in the destination while the real operation runs, and remain busy until acknowledged. Failed changes restore confirmed placement. Only one continuous drop/landing animation plays; runtime response timing does not trigger another bounce.

## Main application extension

The native main Harness UI includes a narrow vertical Hub rail immediately right of the existing sidebar. Preserve the original sidebar and conversations. Use the additive shell.overlay slot; reserve center space through a scoped attribute and observe sidebar geometry on resize/collapse. All installed and demo icons are listed; equipped icons have stronger opacity and a small indicator. Icon menus use real Equip/Unload endpoints and link to the full Hub. This extension is English, keyboard-accessible and responsive.

The native extension now uses an overlapping card stack, not a permanent vertical rail. Hover unfolds Equipped and Available dashed zones with enlarged jelly icons. Click/tap and keyboard activation provide equivalent access. Hub and Main Interface have reciprocal navigation; the stack footer opens Hub marketplace search.

Current sidebar interaction: partly hidden dimensional stack; hover reveals transparent single-column dashed Equipped/Available trays, without a background plate. Dragging into Equipped loads the plugin, dragging back unloads it. Keep menu actions available for keyboard users.
