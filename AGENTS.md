# Mosaelia

Mobile hybridcasual puzzle. Project root: `D:\OSPanel\home\mosaelia.loc`. Local play: `http://mosaelia.loc` (OSPanel).

**Release targets:** [Yandex Games](https://yandex.ru/games/) and [VK Games / Mini Apps](https://vk.com/apps) (Russia-first). Not App Store / Google Play for v1.

## Why this game

Casual market in H1 2026: puzzle ~$4.9B. Match-3 is huge but closed to newcomers. Merge-2 grows fast. The real opening for a small team is **hybridcasual** (sort / block / screw / tile): 10-second hook plus a meta layer (gallery, rooms, collection).

Mosaelia sits on mosaic + merge-3 + solitaire draw, with a cozy gallery as the long-term reason to return.

## Fantasy

The player is filling a kingdom of mosaic workshops. Each solved picture hangs in a room. Full rooms open the next wing of the realm.

## Distribution (v1)

One HTML5 core, two store wrappers. Platforms **must not** cross-promote: VK forbids funneling players off VK; Yandex forbids external store / site links inside the game.

| | Yandex Games | VK Games (Mini Apps) |
|---|---|---|
| Format | ZIP with `index.html` in the archive root, ≤ 100 MB unzipped | HTTPS URL hosted by us, iframe / WebView |
| SDK | [YaGames](https://yandex.ru/dev/games/doc/ru/sdk) | [VK Bridge](https://dev.vk.com/ru/bridge) |
| Catalog | yandex.ru/games | vk.com/apps |
| Monetization to ship | Ads **or** IAP required ([req 1.12](https://yandex.ru/dev/games/doc/ru/concepts/requirements)) | At least one of: rewarded / interstitial / banner / VK Voices ([rules 4.2.2](https://dev.vk.com/ru/mini-apps-rules/2025-september-22)) |
| Content length | Main path **> 10 min** (10–20 casual levels is the documented example) | Same: **> 10 min** |
| Locale | RU first; auto language from `ysdk.environment.i18n.lang` | RU first; no third-party login |
| Moderation | ~3–5 business days | ~7–14 calendar days + beta |
| Payouts | РСЯ (Yandex Advertising Network) | VK ads offer + Voices (Android) |

v1 monetization: **interstitial after a finished mosaic + rewarded video for extra boosters**. IAP (Yandex purchases / VK Voices) is v2. Lives/energy: skip for v1, or only add with auto-regen (VK 4.2.8).

Do not mention the other store, mosaelia.com, or external social networks inside a store build. Support / privacy copy lives **in-game as text**, not as an outbound tab (Yandex). VK may use a support link only.

## Architecture

Keep the loop engine store-agnostic. Wrap each store behind one adapter:

- `platform/stub` — local OSPanel, no ads, `localStorage`
- `platform/yandex` — `YaGames.init`, `LoadingAPI.ready()`, Player saves, fullscreen / rewarded ads, pause on `game_api_pause`
- `platform/vk` — `VKWebAppInit`, Storage, interstitial / rewarded / banner, theme from `VKWebAppUpdateConfig`

Shared contract: `init`, `ready`, `save` / `load`, `showInterstitial`, `showRewarded`, `onPause` / `onResume`, `locale`.

Yandex ZIP and VK host are **two packaging outputs** of the same source, not two games.

## Identity (no custom registration)

Do **not** build email / password / phone signup. Both stores forbid third-party login and require guest play.

- **Local prototype:** guest progress in `localStorage`. That is enough until the platform adapter exists.
- **Yandex:** play without login. Optional “Войти с Яндекс ID” only after a tap, with a clear benefit (cloud save on other devices). Then `Player.setData` / `getData`. Guest save still works.
- **VK:** the player is already in VK. Identify via launch params / `VKWebAppGetUserInfo` and store progress in VK Storage. Never ask for email, phone, or a password.

Cloud merge (guest → platform account) lands with the adapter, not as a separate registration screen.

## Dev / admin (prototype)

Hidden master mode to preview every mosaic without grinding:

- Five taps on the menu badge **Королевство мозаик**
- Or open `http://mosaelia.loc/?dev=1`

Gallery unlocks all 18 pictures. A small panel can reset progress or turn the mode off. Never put a visible “Админ” button in the player menu.

## Prototype scope (now, mosaelia.loc)

Playable web prototype, phone portrait, **no store SDK yet**:

- One mosaic frame that fills tile by tile
- Bottom stacks + a draw pile
- Merge three identical tiles
- Win screen when the picture is complete
- Enough levels to prove the loop (aim toward 15–20)

Out of scope for this local prototype: lives economy, ads, IAP, live-ops, account, map of the kingdom, VK/Yandex SDK.

## Store-ready scope (first public build)

Needed for **both** catalogs, on top of a fun loop:

- Main menu and a way back to it at any time (VK 4.2.10)
- Short tutorial / “how to play”
- Russian UI strings; Yandex also auto-detects portal language
- 15–20 levels so a first playthrough is over 10 minutes
- Progress saved immediately (guest OK; no forced login)
- Pause + mute on blur / during ads; no page scroll; portrait; tap-only on mobile
- Interstitial in natural pauses (after win, not on first launch / onboarding)
- Rewarded video as an optional extra (undo / shuffle / extra slot) — never the only way to continue
- Desktop click/keyboard for Yandex desktop; VK mobile + desktop WebView
- Disable long-press select / context menu on the playfield

Still later: kingdom map, live-ops, accounts, IAP, ads frequency live-ops, TV.

## Implementation plan

1. **Loop** — one field, merge-3, draw pile, mosaic fill, win screen. Local only.
2. **Session product** — HUD, boosters as finite local items, 15–20 levels, tutorial, main menu, RU copy.
3. **Platform adapter** — stub first, then Yandex, then VK. Core never calls a store SDK directly.
4. **Store UX** — saves, pause/resume, interstitial after win, rewarded on booster buttons, `LoadingAPI.ready` / VK init.
5. **Packaging** — `tools/pack.ps1` writes `dist/mosaelia-yandex.zip` (`index.html` at archive root, ASCII paths, ≤ 100 MB) and `dist/vk/` for HTTPS. VK: fill `app_id` in `vk-hosting-config.json` and `npx @vkontakte/vk-miniapps-deploy`, or upload `dist/vk` to Apache/Nginx with `hosting/` headers (no `X-Frame-Options` DENY). Submit **Yandex first**, then VK. Do not host VK on GitHub Pages (they send `X-Frame-Options: deny`).
6. **Store listing** — copy and art in `docs/store/` (Yandex icon 512, cover 800×470, RU texts, tags, SEO). Still needed: gameplay screenshots, 16:9 video ≤ 28 s, РСЯ / cabinet, legal entity or self-employed.

## Visual references

Mockups live in `docs/mockups/`:

- `mosaic-merge-gameplay.png` — play field
- `mosaic-merge-complete.png` — win
- `mosaic-merge-gallery.png` — gallery meta

## Stack

Static HTML / CSS / JS first so OSPanel serves it with no extra runtime. That same build is what both stores want (HTML5). No Unity/Godot until the loop is fun in the browser.

## Name check (Sep 2026)

- Chosen: **Mosaelia**. No game/app collision found. `mosaelia.com` had no Verisign record.
- Rejected: Mosaic Harbor / Cove (too close to Gossip Harbor), Tesseria (taken), Mosaicrown (EU research leftover), Tilegnum (hard to say).
- `mosaelia.com` is optional later for legal pages; it must **not** be linked from store builds.
