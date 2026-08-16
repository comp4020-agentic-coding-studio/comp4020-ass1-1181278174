# Harness log

Every time a correction lands in the **harness** — a rule in `CLAUDE.md`, a
check wired up, a threshold derived, an attempt thrown away — it gets an entry
here.

This file is feedstock for `PROCESS.md`, not a substitute for it. `PROCESS.md`
carries three or four moments; this log carries all of them, so the three or
four can be *chosen* rather than remembered.

Why the distinction is worth the file: re-prompting until something passes is the
routine case. Changing what the work is held against is the skilled one, and it
is the thing the assignment's largest criterion is looking for. Entries here are
the second kind only.

## Format

Each entry answers four questions. Two of them the repo cannot answer on its own,
and those two are where the marks are.

```markdown
### <date> — <one-line title>

**What happened.** The failure, or the thing that went wrong. Concrete.

**What I did instead of the obvious thing.** The obvious thing was usually to
fix the instance. What was changed instead, and why that beat the obvious one.

**How I knew it was right.** The check that went red then green, the viewport
looked at, what was read before the diff was accepted. Not "it worked".

**Citation.** Commit or range, and which file the rule landed in.
```

## Entries

<!-- Newest last. Nothing here yet — the first entry is expected from slice 0,
     when the working agreement and the facts-that-bite land in CLAUDE.md. -->
