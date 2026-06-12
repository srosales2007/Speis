# Project: SPEIS — Real Estate Website

Static marketing site for SPEIS, a Costa Rican real estate company. Plain
HTML/CSS/JS — no framework, no build step. Copy is in Spanish.

## How to read this file
Read every rule literally and apply it to every file/section it names. Don't add
scope I didn't ask for. Work at high effort and reason deeply on your own. Stop and
ask before anything under "Approval required."

## Files
- `index.html` — home page: company intro, staff, logros (propiedades vendidas),
  misión/visión, testimonios, blogs.
- `propiedades.html` — property listings.
- `styles.css` — all styling. Keep styling here; don't inline styles in the HTML.
- `script.js` — all behavior. Keep JS here.
- `frames/`, `extract_frames.py` — unrelated leftovers. Don't touch unless I ask.

## Stack & conventions
- Vanilla HTML5 + CSS + JS. **IMPORTANT: do not introduce React, Tailwind, a bundler,
  or any build step unless I explicitly ask.** Edit the existing files in place.
- Mobile-first and responsive. Verify layout at **390px, 768px, and 1440px** — all three.
- Spanish-language copy throughout; match the existing tone.
- Accessibility: semantic HTML, labeled controls, visible focus, AA contrast, alt text
  on every image.

## Content rules (IMPORTANT)
- **Do not invent SPEIS business facts** — staff names, number of properties sold,
  testimonials, mission/vision text, or contact details. Use a clearly marked
  placeholder like `[POR CONFIRMAR CON SPEIS]` and ask me, rather than fabricating.

## Known to-dos
- The **Contacto** button should scroll to the footer contact section; remove the
  duplicate contact info currently at the top.
- Reconsider the nav dropdowns — team/projects info already lives on the home page.

## Approval required (stop and ask first)
- Adding any dependency, framework, or build tooling.
- Restructuring the project (new folders, moving to a framework).
- Changing deploy or hosting config.
- Fabricating or guessing any SPEIS business data.

## Done / verify
- Pages render correctly at all three breakpoints, no console errors, all links work.
- My personal preferences (model, effort, language) live in `CLAUDE.local.md`.
