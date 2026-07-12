# Candy Shop Redesign — Design Spec

**Date:** 2026-07-12
**Status:** Approved via visual mockups (companion session 43680); supersedes the visual-design sections of the 2026-07-10 spec. All non-visual guarantees of that spec remain binding (WCAG 2.2 AA, bilingual, tokens-only colors, PDF/OG generation, tests, CI).

## Direction

"Candy shop precision" — playful-professional. Jeroen-first identity; **Sugar Rush Development** appears as flavor (footer line), not as the site brand. The prior editorial look (cream/serif/amber, sticky sidebar) is fully replaced.

## Identity

- **Wordmark:** lowercase `jeroenwever.` — Bricolage Grotesque ExtraBold, the trailing dot in raspberry. Used large in the hero, small in the collapsed bar, and echoed in the favicon (raspberry rounded square, white "jw.").
- **Footer line (both locales, slogan untranslated as a brand line):** "Jeroen Wever operates as **Sugar Rush Development** — *coding with the speed of sweet*" followed by three sprinkle dots (raspberry/grape/blueberry). NL: "Jeroen Wever werkt als …" same slogan.

## Type

- **Display (headings, wordmark):** Bricolage Grotesque (variable, self-hosted via @fontsource-variable/bricolage-grotesque).
- **Body:** Inter (variable, self-hosted via @fontsource-variable/inter).
- Fraunces is removed entirely.

## Color (tokens, light-dark() pairs; exact values may be nudged only to satisfy AA)

| Token | Light | Dark ("chocolate") |
|---|---|---|
| bg | `#fffdfa` | `#1c1517` |
| surface | `#f6ebe0` | `#251c1f` |
| text | `#241d21` | `#efe6e0` |
| muted (must pass 4.5:1) | `#6b6065` | `#a89ba0` |
| border | `#eee2d9` | `#372b2e` |
| accent / raspberry (links, dots) | `#c2145c` (dot may use `#e0186c`) | `#ff4f96` |
| accent-2 / grape | `#6d28d9` (dot `#7c3aed`) | `#b794ff` |
| accent-3 / blueberry | `#2456d6` (dot `#2f6bff`) | `#7ea6ff` |

Sprinkle assignment: About = raspberry, Experience = grape, Skills = blueberry, Education = raspberry (cycle). Raspberry remains the only accent used for interactive elements.

## Layout

- **Sidebar and mobile bottom bar are removed.** Single-column content (max ~44rem) under a horizontal header.
- **Hero header (top of page):** wordmark large, "Freelance staff engineer", tagline in italic, contact row with icons (Email, LinkedIn, GitHub, Download CV) + locale & theme toggles. Hairline border-bottom; same background as page.
- **Collapsed bar:** fixed top bar (small wordmark left; icon-only contact links, locale toggle, theme toggle right; hairline bottom). Hidden until the hero's contact row scrolls out of view, then slides in (IntersectionObserver + CSS transition; `prefers-reduced-motion` respected; without JS the bar simply never appears — the hero carries all links). Bar nav uses the "quick contact" aria-label; duplicate-landmark labels stay distinct.
- **Sections:** uppercase label + colored sprinkle dot, hairline top border. Experience/skills/education content unchanged structurally.
- **Footer:** contact nudge (email link) + SRD flavor line + sprinkles.

## Icons

Inline stroke-style SVGs (mail envelope, LinkedIn, GitHub mark, file-download), `aria-hidden` with visible text labels in the hero; icon-only links in the collapsed bar get `aria-label`s.

## Print CV & OG images

Same generation pipeline. Print CV: accent switches to raspberry, name set in Bricolage Grotesque, otherwise conservative. OG image: new palette + wordmark treatment.

## Acceptance

- Full existing gate green: typecheck, unit, build (PDFs/OG), site tests, axe zero violations on both locales × both schemes (contrast per the table above must pass AA — adjust token values, not components, if axe objects).
- Review via Cloudflare Pages branch preview before merging to main.
