# Validation

Production build passed with Vite 8.3.5. JavaScript syntax check passed.

Headless Microsoft Edge checks passed at 320, 768, and 1440 CSS pixels:

- Twelve topic entries render.
- Case-insensitive search and combined category filtering work.
- Empty state and clear-all restore the directory correctly.
- Checklist counts update, persist, and reset.
- Image viewer opens, closes, and returns focus to its trigger.
- No horizontal overflow at the checked widths.

The local server returned HTTP 200. Static HTML checks found one H1, unique IDs, valid internal anchors, and 19 native disclosures. Content remains readable without JavaScript.

External screenshots and fonts are blocked in this execution environment. Browser checks used fallback assets. The hero includes a local illustration; build stages use five local diagrams. Topic guides remain usable when images fail. Lighthouse, manual keyboard review, and gameplay play-testing were not performed.

See validation-results.json for browser results and ASSET-CREDITS.md for image notes.
