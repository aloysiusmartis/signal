# COORDINATION.md — aloysiusmartis/signal fork layer

This file is fork-specific. It does NOT exist in upstream (jay-sahnan/signal).
`CLAUDE.md` is upstream-owned — put nothing personal there. Put it here instead.

After any rebase sync that drops the `@COORDINATION.md` line from `CLAUDE.md`,
re-add it: insert `@COORDINATION.md` as line 2 of `CLAUDE.md` and you're back.

---

## Fork identity

- **This repo:** `aloysiusmartis/signal` (personal fork)
- **Upstream:** `jay-sahnan/signal`
- **Relationship:** Additive extensions only. Core logic tracks upstream.

---

## Upstream sync

```bash
./scripts/sync-upstream.sh           # rebase + push
./scripts/sync-upstream.sh --dry-run # preview only
```

Strategy: `git rebase upstream/main` (never merge).
Your additive files survive rebase untouched. Only files modified in both
upstream and your branch will produce conflicts.

**After a conflict during rebase:**
1. Fix the conflicted file (keep upstream's version + your changes)
2. `git add <file> && git rebase --continue`
3. Check that `@COORDINATION.md` is still line 2 of `CLAUDE.md` — if not, add it back

---

## Extension rules (what survives every sync)

| Extension type | Where to put it | Conflict risk |
|---|---|---|
| New skills / scripts | New file in `scripts/` | Zero |
| New features | New file or new subdir | Low |
| Modifications to upstream files | Mark line with `// FORK:` comment | High — minimize |
| Personal Claude instructions | This file (`COORDINATION.md`) | Zero |
| Personal Claude instructions | `~/.claude/CLAUDE.md` (global) | Zero |

**Never modify `CLAUDE.md` with personal content.** It will be overwritten on
the next upstream sync. Use this file instead.

---

## Contributing back to upstream

```bash
# Branch off upstream — NOT your main (no personal stuff leaks in)
git checkout -b feat/my-feature upstream/main

# Implement cleanly. PR to jay-sahnan/signal.
# Once merged upstream, your next sync picks it up. Drop the branch.
```

Only contribute code that has no dependency on your personal extensions.

---

## Personal extensions in this fork

_No active extensions yet._
