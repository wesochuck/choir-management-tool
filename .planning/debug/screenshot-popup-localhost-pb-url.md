---
status: investigating
trigger: "Investigate the screenshot popup: Chrome at https://choir-manager.pockethost.io/login says the site wants to 'Access other apps and services on this device' while the React PocketBase app login fails. Repo path: /Users/wesosborn/Downloads/choir-management-tool. Determine likely cause from code/config. Focus on whether deployed bundle is calling localhost/private network because VITE_PB_URL was missing/wrong at build time. Do not edit files. Return concise diagnosis and verification steps."
created: 2026-05-19T04:00:07Z
updated: 2026-05-19T04:01:12Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: "The deployed Vite bundle was built without a valid VITE_PB_URL, so frontend PocketBase client falls back to localhost/private origin and Chrome prompts for local/private network access."
test: "Read PocketBase client initialization, auth login call path, env files, and any built/deployed JS bundle references for localhost/private URLs."
expecting: "If true, source or built output will contain fallback http://127.0.0.1:8090 or localhost in the production JS path used for PocketBase API calls."
next_action: "Read src/lib/pocketbase.ts, AuthContext/LoginView, env files, and inspect deployed HTML/JS bundle for localhost or 127.0.0.1."

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: "At https://choir-manager.pockethost.io/login, login should call the deployed PocketBase backend over the public HTTPS origin without Chrome local/private network access prompts."
actual: "Chrome displays a popup saying the site wants to 'Access other apps and services on this device' and the React PocketBase app login fails."
errors: "Chrome local/private network access prompt; login failure."
reproduction: "Open Chrome at https://choir-manager.pockethost.io/login and attempt React PocketBase app login."
started: "Unknown."

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-05-19T04:01:12Z
  checked: "Codebase search for VITE_PB_URL, PocketBase, localhost, 127.0.0.1, and pockethost"
  found: "src/lib/pocketbase.ts is the only source hit for VITE_PB_URL and initializes PocketBase with a fallback to http://127.0.0.1:8090. vite.config.ts has no build-time env defaults or validation."
  implication: "Environment/config missing or wrong at Vite build time can embed the localhost fallback into the production bundle."

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause:
fix:
verification:
files_changed: []
