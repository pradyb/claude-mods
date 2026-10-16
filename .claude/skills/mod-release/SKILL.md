---
name: mod-release
description: Release a new version of one mod in this repo - bump plugin.json, the README table and CHANGELOG, validate and test, open the PR, merge when CI is green, then tag. Use when the user says "release <mod>", "bump <mod>", "ship <mod> X.Y.Z" or "commit, push and tag".
argument-hint: <mod> [patch|minor|major|X.Y.Z]
---

Release `$ARGUMENTS`. Default bump: `patch` for fixes, `minor` if the unreleased changes add a feature or setting. Say which you picked.

1. **Scope.** `git log --oneline <mod>--v<current>..HEAD -- <mod>/` (fall back to the older `<mod>-v<current>` tag form) plus uncommitted changes under `<mod>/`. Nothing changed: stop and say so.
2. **Bump**, all three, same version:
   - `<mod>/.claude-plugin/plugin.json` `version`
   - the mod's row in the root `README.md` table (and its description cell if behaviour changed)
   - `CHANGELOG.md`: a `### X.Y.Z` entry at the top of the mod's section, user-facing wording, one bullet per change. Add a `## <mod>` section if this is the first release.
   If the mod's `README.md` documents changed behaviour or settings, update it.
3. **Check:** `claude plugin validate --strict .`, `claude plugin validate --strict <mod>`, `claude plugin test <mod>`. Any failure: stop and report it.
4. **PR:** on `main`, branch `chore/<mod>-X.Y.Z` (or keep the current feature branch). Commit `<mod> X.Y.Z`, push, `gh pr create --fill`.
5. **Merge:** `gh pr checks <n> --watch --fail-fast` in the background (no sleep loops). Green: `gh pr merge <n> --merge --delete-branch`. Red: report and stop.
6. **Tag:** `git switch main && git pull --ff-only`, then from the clean tree `claude plugin tag <mod> --push`. Report the tag name and the install/update line: `claude plugin update <mod>@pradyb-mods`.

Several mods at once: one PR for all, then one tag per mod after the merge.
