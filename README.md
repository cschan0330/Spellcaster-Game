# My Summer Car fan wiki

## Project overview

This project is an unofficial, single-page fan wiki for **My Summer Car**, a car-building and life-survival game set in the Finnish countryside. It helps new players plan their first day, organize a car build, and find short references for travel, supplies, and maintenance.

The site uses plain JavaScript, HTML, and CSS with Next.js for development and production builds. The MNIST digit recognition page is available at `/mnist/`. It has no backend or account system. Its guides are introductory references; they do not replace a complete assembly manual.

### Main features

- A six-step beginner checklist with progress saved in the current browser.
- A directory of 12 guides with case-insensitive search and category filters.
- A five-stage car-building overview, survival advice, and expandable FAQ answers.
- Responsive navigation, a screenshot viewer, and image-loading fallbacks.
- Static guide content that remains readable without JavaScript.

## Run locally

Install Node.js and npm, then run these commands from the project folder:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Next.js, usually `http://localhost:3000`. Visit `/mnist/` for digit recognition.

To build and preview the production site:

```sh
npm run build
npm run preview
```

The production build is written to `.next/`; `npm run start` serves it. Vercel uses the Next.js preset declared in `vercel.json`. Set its Root Directory to the repository root, where `package.json` lives.

## Code explanation

### File structure

| File | Purpose |
| --- | --- |
| `src/content.js` | Stores the topic categories, guide text, checklist steps, build stages, and FAQ entries as arrays. |
| `src/template.js` | Imports the content and exports the page markup as a template string. Shared helpers generate section headings and screenshot blocks. |
| `render.mjs` | Writes `index.html`, combining the page markup with metadata, font links, and the browser script entry point. |
| `pages/index.jsx`, `pages/mnist.jsx` | Next.js routes for the wiki and digit recognition page. |
| `src/main.js` | Imports the stylesheet and attaches event handlers to the generated HTML. |
| `src/style.css` | Defines colors, typography, layouts, responsive breakpoints, focus styles, and reduced-motion behavior. |
| `package.json` | Defines Next.js, React, and development, build, and production server commands. |
| `responsive-check.mjs` | Runs browser checks against `dist/` using a local Python server and headless Microsoft Edge. |
| `ASSET-CREDITS.md` | Records image sources and asset notes. |
| `VALIDATION.md`, `validation-results.json` | Document existing validation evidence and its limits. |

### How the page is generated

```text
src/content.js -> src/template.js -> render.mjs -> index.html
                                                    |
                                              src/main.js
                                                    |
                                              src/style.css
```

Running `npm run dev` or `npm run build` first runs `scripts/prepare-assets.mjs`, which copies browser scripts, styles, and model weights into `public/`. Next.js renders the wiki template at `/` and the MNIST interface at `/mnist/`. Browser scripts attach after hydration. `render.mjs`, the root `index.html`, and the diagram above describe the retained legacy static renderer; they are not used by Next.js. The older `responsive-check.mjs` and validation files refer to the previous static build. Run `node mnist/browser-check.mjs` after `npm run build` for current production checks, including homepage search and MNIST interaction checks at three screen widths.

### Browser interactions

- **Search and filters:** `filter()` in `src/main.js` combines the selected category with the search query. It compares the lowercase query against each card's `data-search` text, hides cards that do not match, updates the result count, and displays an empty state when needed. Search covers guide titles, descriptions, and keywords.
- **Checklist:** Checkbox states are stored as a JSON array under the `msc-checklist` key in `localStorage`. The page restores saved states on load and updates the progress bar when a box changes. Reset clears the selections and saves the cleared state. Storage errors are caught so the checklist can still work without persistence.
- **Navigation:** The menu button controls the navigation's open state and `aria-expanded` value. Links, Escape, outside clicks, and breakpoint changes close the menu. An `IntersectionObserver` updates the current section's navigation link as the user scrolls.
- **Screenshot viewer:** Links marked with `data-viewer` open a native `<dialog>` with the selected image and caption. Closing the viewer returns focus to the link that opened it.
- **Image fallbacks:** Failed images trigger fallback styling and hide unavailable enlargement controls. If the hero image fails, the page hides it and keeps the background styling.
- **Expandable content:** Guides, troubleshooting advice, and FAQs use native `<details>` and `<summary>` elements, so they can expand without custom JavaScript.

### Editing the project

Change guide text and lists in `src/content.js`, page structure in `src/template.js`, appearance in `src/style.css`, and interactive behavior in `src/main.js`. Change document metadata or external font links in `render.mjs`. Regenerate the page with `node render.mjs`, or run the development or build command. Make lasting markup changes in the source template because regeneration overwrites `index.html`.

## Browser checks

After building, the existing responsive check can be run with:

```sh
node responsive-check.mjs
```

This script expects Python on PATH and Microsoft Edge at its configured Windows installation path. It checks multiple viewport widths and interactive behavior with external HTTPS resources blocked. See `VALIDATION.md` for the scope and limitations of the recorded checks.

## Assets and credits

Screenshots are loaded from the official game website, and web fonts are loaded from Google Fonts; both require internet access. Checklist progress is local to the browser and is not synchronized between devices. See [ASSET-CREDITS.md](ASSET-CREDITS.md) for sources and image notes.

This is an independent fan resource, unaffiliated with Amistech Games. My Summer Car and its game imagery belong to their respective owners.
