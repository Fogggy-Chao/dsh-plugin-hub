# Development handoff

Current checkpoint: Plugin Hub 0.6.4.

## Implemented

- Standalone `/plugin-hub`: equipped, available and quick output areas, marketplace browsing/install, and a DeepSeek return link.
- Native `/` sidebar extension: dimensional cards partly hidden behind the sidebar edge; hover reveals transparent, single-column dashed Equipped and Available trays.
- Original-card pointer dragging, destination highlighting, live load/unload, optimistic placement and rollback on failure. Both drag directions verified in the browser.
- Keyboard action menus, reduced-motion behavior, Hub and marketplace shortcuts.

## Resume

Use Node.js 24+ and pnpm. Run `pnpm install --ignore-scripts`, then `pnpm start`. Local runtime state is generated in `.runtime/` and is intentionally untracked. Default address: http://127.0.0.1:3080/ . See README.md for installation and test commands.

The current development machine already has the preview running on port 3080. Check it before launching another process. Do not commit profiles, API keys, authentication tokens, dependency directories, or generated archives.

## Known limits

- Equipment changes are process-only; restart can restore persisted bundle settings.
- Installed bundles may need a restart to join the host's boot-time bundle composition.
- External plugins need an adapter for Quick Output.
- The mascot 0.1.0 browser bundle was incompatible in the development preview; do not assume arbitrary third-party bundles can activate without checking their compatibility.
- No model API key is configured in this preview. Direct demo tools work without one.

No additional feature scope has been selected for the next session.

Latest changes: global marketplace home/CLI resolution, normal dsh web restart via execve and boot-ID reconnection, brighter sidebar icons with expanded-only names and identical collapsed colors. Verified real marketplace installation of dsh-better-sidebar 0.18.0 and a browser Restart click. Eleven focused regression tests pass. Global profile uses pnpm 10.9 and archives in ~/.dsh/bundles; avoid installing through the bundled pnpm 11.
