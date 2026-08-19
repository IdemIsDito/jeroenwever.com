# CLAUDE.md — jeroenwever.com

## Prose standard

This is a resume. Recruiters read it, and copy that reads as machine-written
undermines it regardless of whether the facts are right. Content changes go
through the `stop-slop` skill.

**Em dashes are banned in anything a reader sees.** They were the loudest tell
here: 28 across 926 words before the 2026-08 cleanup, about 3 per 100 words,
where natural prose runs near zero. `tests/site/prose.test.ts` asserts zero em
dashes in the rendered HTML of every page and fails the build otherwise.

Use instead, depending on the job the dash was doing:

| Dash was doing | Use |
|---|---|
| Joining two complete thoughts | A full stop |
| Introducing a list or expansion | A colon |
| A parenthetical aside | Commas or parentheses |
| A date or number range | An en dash (`–`), which is the correct character |
| Separating title parts | A middot (`·`), matching the rest of the site |

Also avoided, and covered by the same test: negative-contrast constructions
(`not just X but Y`, `isn't X, it's Y`). State the positive directly.

Source-code comments are exempt. The test reads rendered HTML, so comments
never reach it.

**Do not sand off specifics.** The strength of this copy is concrete detail:
"100,000 active users a night", "six weeks against a six-month budget", "4,000
logins and 2,000 bets per minute". Cutting a tell must never cost a number, a
client name, or a claim. If a rewrite loses a fact, it is wrong.

Both locales stay in parity. A change to `resume.en.json` needs the matching
change in `resume.nl.json`.

## Content is the source of truth

`src/content/*.json` drives the pages, the PDFs, the OG images and `llms.txt`.
Zod validates it at build time, so a shape change means a schema change. Never
hardcode resume facts into components.
