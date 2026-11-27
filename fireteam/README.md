# fireteam

A military-shooter HUD theme for the Claude Code desktop app, ported from the [Fireteam layout for Herdr](https://github.com/pradyb/herdr-fireteam). Claude is your operator, each of your prompts is a contract, and the space beside the conversation becomes a game HUD: a minimap radar, an operator card with ammo and fuel gauges, a squad of your subagents, scorestreaks, a kill feed, daily challenges, banners for big moments, ranks, a loadout with perks, and weapon mastery, all earned from Claude's real tool calls. Send a prompt and your weapon fires a burst of tracers across the window. Requires Claude Code 2.1.287 or later.

This is an unofficial look inspired by modern military shooters. It is not affiliated with any game publisher and uses no official names, art, logos, fonts, characters or sounds.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install fireteam@pradyb-mods
```

Or in one step, from a session: `/plugin install fireteam --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## The HUD

| Where | What |
|---|---|
| **Left column** | A minimap radar with a slow sweep (hostiles pulse on it while Claude works, and each running subagent lights a friendly blip); the operator card (callsign and squad, weapon in its camo, live action such as `FIRING · EDIT`, git branch, minutes on the current contract, session cost, armour plates, **AMMO** and **FUEL** gauges, damage, accuracy, recon and drones); and a banner for big events. |
| **Right column** | Rank, XP and career kills; the UAV, AIRSTRIKE, GUNSHIP and ARMOR charge tiles; the kill feed; today's three challenges. |
| **Top centre** | A drifting compass strip with objective markers. |
| **Messages** | Your orders in a panel with a bright accent border, Claude's replies in a dark panel with a thin accent border, tool rows in mono, headings in bold wide-spaced caps. |
| **Prompt fire** | When Claude accepts your prompt, your weapon fires from the left edge across to the right gutter, level with the prompt box: a burst of tracers (a rocket for the RPG-7, a spread of pellets for the M870, one fast round for the SVD), with a muzzle flash and a hitmarker where it lands. The prompt itself is untouched. Slash commands and prompts another mod blocks don't fire. Behind the chat column the tracer is out of sight, so you see it leave and land. |
| **Sound** | A low field hum with the odd far radio blip; a radio key-up on send, a hitmarker tick per tool, a thump on done, a buzz on error. Press the speaker in the session's title bar to hear it. |

The columns sit in the space beside the chat column. In a window under 1400 px wide the operator card and challenges are hidden; under 1260 px both columns are hidden, and banners show under the compass instead.

## The panel: `/fireteam`

`/fireteam` opens a panel beside the chat:

- **Scorestreaks**: a ready streak shows a CALL button. Calling it spends its charge and plays its effect: UAV pings the radar and reveals every hostile, AIRSTRIKE sends a missile across the window, GUNSHIP sweeps a thermal reticle, ARMOR deploys with a banner. Each cleared contract adds 1 charge, and a failed turn resets it.
- **Daily challenges**: three a day (always "clear 5 contracts", plus two of tests, pushes, commits, flawless clears, medals and drones), worth 50 XP each. They reset at midnight.
- **Loadout**: a weapon (M4A1, AK-47, AUG, MP7, M249, SVD, M870, M1911, RPG-7), a camo, and three perk slots.
- **Colour pack**: MODERN (amber), NVG (green), ARCTIC (ice blue), TOXIC (violet and lime), HAZARD (black and yellow). The whole theme follows the pack: app colours, borders and the HUD.

`/fireteam debrief` prints your rank and session score, contracts (session, today, career), loadout, stats and challenge progress, then the squad: each subagent's damage, damage taken and accuracy, with an MVP.

**Weapon mastery**: the weapon you carry levels up (1 to 10) with each successful edit or command, and a level-up shows a banner. Levels unlock camos for that weapon: Desert 2, Arctic 3, Digital 4, Tiger 5, Gold 7, Nebula 10.

**Perks** (one per slot, each changes the HUD):

| Slot | Perk | Effect |
|---|---|---|
| 1 | Low Profile | Your blip fades from the radar |
| 1 | Iron Nerves | Failed tools do no damage: no red flash, no hit on accuracy |
| 1 | Extra Plate | +1 armour plate on the operator card |
| 2 | Supply Run | Each cleared contract adds 1 extra streak charge |
| 2 | High Yield | Banner XP counts double |
| 2 | Speed Loader | A RELOADED banner when a compaction ends |
| 3 | Spotter | Every hostile shows on the radar while Claude works |
| 3 | Radio Silence | No banners and no sound cues |
| 3 | Logistics | Scorestreaks cost 1 contract less |

## Ammo, fuel and the squad

- **AMMO** is the context window as a magazine: the share of it still free. It goes amber below 35% and red below 15%, and a compaction is your reload (the Speed Loader perk adds a RELOADED banner).
- **FUEL** is what is left of your 5-hour usage limit. It shows `--` when your plan reports none.
- The card also shows the git branch of the folder, the minutes the running contract has taken, and the session cost in dollars.
- **Squad**: each subagent Claude starts joins as a squadmate with a NATO callsign (ALPHA, BRAVO, ...). While it runs it lights a blip on the radar and adds `SQUAD n` to the card. Its tool calls count for its own record, not yours.

## What counts

Only your own prompts make contracts. Task notifications, scheduled runs and prompts from other plugins run turns that score nothing.

| Event | What happens |
|---|---|
| An edit or shell command succeeds | A hit: damage and accuracy go up, your weapon gains mastery, and a hitmarker shows in the right gutter (at most one every 1.5 s) |
| A tool fails | Damage taken: accuracy drops and the window edges fade red (at most once every 3 s) |
| A test run passes or fails, `git commit`, `git push`, a subagent | A kill-feed line: RANGE CLEAR or TARGETS MISSED, INTEL SECURED, EXFIL CONFIRMED, DRONE DEPLOYED (a drone also flies across) |
| You send a prompt and it is accepted | Your weapon fires across the window |
| A subagent starts | It joins the squad and lights a radar blip |
| Your turn ends with an answer | A kill: kill-feed line named from your prompt, a red hitmarker with +100, and a banner (CONTRACT CLEAR, or the medals, a promotion or a completed challenge) |
| Your turn ends on an error | MISSION FAILED, and the streak resets |
| You click the backdrop | A hitmarker at the click and a radar ping |

**Medals**: DOUBLE and TRIPLE CLEAR (several contracts within a minute), FLAWLESS (no tool failures and at least one hit), BOSS DOWN (3 or more failures), FIRST BLOOD (first of the day). **Rank** goes PVT to GEN, one rank per 4 cleared contracts, where a challenge counts as 2.

Career kills, challenge progress, mastery, the loadout and the pack are kept across sessions in the mod's own store. Several sessions at once add to the same totals.

## Limits

- The backdrop and its effects draw on the desktop and mobile apps. In the terminal, `/fireteam debrief` and the panel work, and nothing else is visible.
- Dark theme only. It replaces any other theme mod's look, so turn off `justice-league` while you use it.
- The columns assume a chat column about 800 px wide; on a narrower screen they hide rather than cover the conversation.
- If your build refuses the sound or style settings, the mod falls back to a plainer look and shows a toast saying why.

## Credits

By pradyb, MIT licensed. Ported from [herdr-fireteam](https://github.com/pradyb/herdr-fireteam), including its weapon silhouettes. The tool classifier comes from that layout's hook, which is derived from [World of Codecraft](https://github.com/kevinpardo/world-of-codecraft) by Kevin Pardo (MIT). The sounds are synthesised by the app from the theme's numbers.
