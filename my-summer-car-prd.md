# Product Requirements Document: My Summer Car Wiki Landing Page

Version: 1.1  
Date: November 5, 2026  
Status: Ready for design and implementation

## 1. Product overview

Create a single-page, unofficial fan wiki for **My Summer Car**. The page should help new players understand the game and help returning players quickly find practical reference information. Combine the atmosphere of a Finnish summer garage with the clarity of a useful reference site. Make the page picture-rich and easy to browse: visitors should recognize topics through screenshots, icons, short labels, and clear actions before reading detailed text.

This is one complete landing page with useful information on the page itself. It must not depend on future article pages or an unfinished wiki backend.

**Core promise:** “Build your car. Survive the summer.”

My Summer Car combines car assembly, repair, tuning, maintenance, and life survival. Use the official game website and Steam listing to ground the introduction; verify detailed gameplay guidance before publication.

## 2. Audience and user needs

| Audience | Need | Intended outcome |
| --- | --- | --- |
| First-time players | Understand where to begin | Find the beginner checklist immediately |
| Players building their car | Locate assembly and troubleshooting guidance | Open the relevant reference without leaving the page |
| Returning players | Refresh knowledge of survival, vehicles, and places | Find a concise answer through navigation or search |

## 3. Goals and scope

### Goals

- Explain the game and the purpose of the fan wiki within the first screen.
- Make beginner guidance reachable in one click from the hero.
- Organize reference content around player tasks.
- Fill the page with relevant game imagery and visual entry points while keeping answers easy to scan.
- Work comfortably on desktop and mobile.
- Deliver a distinctive, polished page with no dead controls or placeholder content.

### Included in version one

- Responsive single-page layout.
- Sticky section navigation.
- Hero, beginner checklist, topic directory, car-building reference, survival guidance, FAQ, and source links.
- Client-side topic search and category filters.
- Expandable reference details and FAQ answers.
- Image-led topic cards, illustrated build stages, survival icons, and an accessible screenshot viewer.
- Optional local persistence of beginner checklist progress.

### Out of scope

- Separate article routes or a full editable wiki.
- Accounts, comments, community editing, or an admin dashboard.
- Interactive world map, live game data, multiplayer features, or a mod manager.
- Shop, newsletter signup, or unrelated promotional sections.

## 4. Page structure and content

| Order | Section / anchor | Requirements |
| --- | --- | --- |
| 1 | Header | Text wordmark, “Unofficial fan wiki” label, and links to Start Here, Explore, Build Guide, Survival, and FAQ |
| 2 | Hero / `#top` | Large game title, concise introduction, garage/car imagery, primary “Start Here” button, secondary “Explore the Wiki” button |
| 3 | Start Here / `#start` | Short introduction, relevant tools/garage image, and six icon-labeled checklist items with a completion indicator |
| 4 | Explore / `#explore` | Prominent search input, category chips, result count, and screenshot-led topic cards with expandable details |
| 5 | Build Guide / `#build` | Five illustrated stages: preparation, engine, chassis, installation and connections, checks and troubleshooting |
| 6 | Survival / `#survival` | Picture cards and labeled icons for player needs, supplies, travel preparation, and avoiding preventable setbacks |
| 7 | FAQ / `#faq` | At least five expandable questions with direct answers |
| 8 | Footer | Unofficial status, sources, asset credits, content review date, and back-to-top link |

### Hero copy direction

- Eyebrow: “Unofficial fan wiki”
- Heading: “MY SUMMER CAR”
- Supporting line: “Your garage companion for building, maintaining, and surviving.”
- Keep the introduction to two short sentences.
- Use a real, appropriately usable game screenshot or a clearly illustrative garage image. Do not present invented imagery as an actual game screenshot.

### Beginner checklist

Cover learning the controls, locating tools, planning supplies, organizing parts, approaching assembly in stages, and understanding saving and death settings. Verify instructions against the game before writing the final copy. Keep each item to a short action with one supporting sentence.

If persistence is implemented, provide a visible “Reset checklist” control. Checklist progress is a convenience, not required to access any content.

### Topic directory

Provide at least 12 substantive entries across these categories:

- Getting Started
- Car Building
- Vehicles & Travel
- Survival & Supplies
- Locations & Services

Suggested subjects include tools, parts organization, engine assembly, fluids, wiring, starting problems, vehicle roles, trip preparation, player needs, supply runs, services, and saving. These are editorial topics, not claims about exact mechanics.

Each entry contains a relevant image, descriptive alt text, title, category badge, one-sentence summary, keywords, and a useful expanded explanation. Use consistent 16:10 thumbnails and a clearly labeled “Open guide” disclosure control. Expanded content stays within the page and can be closed without losing the current search or category. Detailed instructions must be verified; omit uncertain torque values, schedules, prices, and mechanical steps rather than guessing.

### Build and survival references

The build overview should communicate order and dependencies without claiming to replace a complete workshop manual. Include a short troubleshooting checklist with verified checks. Survival cards should help users prepare and recover, using short paragraphs or practical bullets.

### FAQ topics

Cover what the game is, where to begin, how to use this page, whether the site is official, and where to find official information. Add gameplay questions only when their answers can be verified.

## 5. Functional requirements

| ID | Requirement | Acceptance condition |
| --- | --- | --- |
| F1 | Section navigation | Every internal navigation link moves to a real, uniquely identified section; sticky header does not obscure headings |
| F2 | Hero actions | “Start Here” targets `#start`; “Explore the Wiki” targets `#explore` |
| F3 | Topic search | Case-insensitive search matches titles, summaries, and keywords; updates without reload |
| F4 | Category filters | One selected category at a time; “All” clears the category restriction; selected state is visible |
| F5 | Combined filtering | Search and category use AND logic; visible result count stays accurate |
| F6 | Empty state | Show “No topics found” with a clear-all action that restores all entries |
| F7 | Topic details | Every topic card opens meaningful inline content; no dead “Read more” links |
| F8 | Accordions | FAQ and reference details support keyboard interaction and expose expanded state |
| F9 | Mobile navigation | Navigation remains accessible at narrow widths; any menu closes after selection and supports Escape |
| F10 | External resources | Official links and credits have descriptive labels and valid destinations |
| F11 | Screenshot viewer | An explicit “Enlarge image” button opens the full image with caption; close button, Escape, focus containment, and focus return work; tapping the backdrop may close it |
| F12 | Beginner progress | Checked steps update a visible “X of 6 complete” label; reset clears the steps; any saved progress is restored safely |
| F13 | Search feedback | Input has a persistent label, example placeholder, and clear button; result changes are announced politely to assistive technology |
| F14 | Friendly controls | Interactive targets are at least 44×44 CSS pixels; icon-only actions have accessible names; hover is never required to discover content |
| F15 | Image failure | Missing images show a styled fallback with a topic label; card text and guide controls remain usable |

Use native anchors and disclosure elements where appropriate. Avoid adding a global keyboard shortcut for search in the initial release.

## 6. Visual direction

**Mood:** summer light, worn workshop materials, practical car manuals, and a slightly rough enthusiast character.

- Palette: charcoal, warm cream, faded yellow, muted forest green, with restrained rust-orange accents.
- Typography: condensed display face for major headings; highly readable sans serif for body copy; optional monospace for small reference labels.
- Composition: cinematic hero, generous spacing, clear section numbering, and image-led reference cards. Alternate photo panels with short practical content to create visual rhythm.
- Imagery: a large hero screenshot, images on all 12 or more topic cards, five build-stage images, and supporting beginner and survival pictures. Aim for at least 16 distinct relevant images across the page; thoughtful reuse is allowed when the subject genuinely matches. Every major content section except FAQ and footer should contain meaningful imagery. Reserve image dimensions to avoid layout shift.
- Texture: subtle paper grain or workshop detail behind content; never reduce text legibility.
- Interactions: restrained hover and focus feedback. Avoid autoplay media, heavy parallax, and decorative loading screens.

Desktop uses a centered content width around 1200px and two- or three-column reference grids. Mobile uses a single column, readable spacing, and full-width primary actions where helpful. The page must work from 320px upward without horizontal overflow.

### Picture plan

| Placement | Image direction | Presentation |
| --- | --- | --- |
| Hero | Car and garage or Finnish summer road scene | Full-width 16:9 crop with a dark gradient behind text; keep the car visible on mobile |
| Start Here | Tools, garage workspace, or organized parts | Photo beside a checklist on desktop; above it on mobile |
| Topic cards | Subject-specific vehicles, parts, supplies, and locations | Consistent 16:10 thumbnail; short title and category beneath |
| Build Guide | Preparation, engine, chassis, connections, final checks | Five numbered illustrated cards; stacked in reading order on mobile |
| Survival | Relevant supplies, travel scenes, and player-need subjects | Compact picture cards with labeled icons and one practical takeaway |

Prefer authentic, appropriately usable game screenshots. Do not use generic stock cars as substitutes for specific in-game vehicles. Avoid repeated unrelated pictures and decorative images that make instructions harder to understand. Do not bake navigation or instructional text into images.

### UI and reading experience

- Put a prominent search field at the start of Explore, with a placeholder such as “Search tools, vehicles, survival…”.
- Use rounded category chips, concise badges, clear headings, and high-contrast buttons with visible active states.
- Keep card summaries to one or two short lines where practical; disclose detailed guidance on demand.
- Give checklist items clear checkboxes, labeled icons, and an accurate progress indicator. Keep progress in memory if local storage is unavailable.
- Show the active navigation section through both styling and an accessible state. Use smooth scrolling only when reduced motion is not requested.
- Use one coherent icon family. Always pair category and survival icons with text labels; do not communicate meaning through color alone.
- Make guide-opening and image-enlarging separate, clearly labeled controls. Avoid nested interactive controls or ambiguous whole-card click behavior.
- Keep captions brief and useful. Put lengthy asset credits in the footer so browsing remains comfortable.
- No automatic image carousel. Visitors control image enlargement and disclosure interactions.

## 7. Content, trust, and assets

- Write original, concise English copy. Do not copy existing wiki articles wholesale.
- Clearly identify the page as an unofficial fan resource.
- Include source attribution for factual guidance and credits for imagery where required.
- Use only assets with an appropriate basis for use; retain attribution and permission notes in the project.
- Do not invent patch notes, player counts, community statistics, reviews, or contributor activity.
- Show an honest content review date; list a tested game version only if actually checked.
- Keep spoilers out of the introduction; label any later spoiler content clearly.

## 8. Technical and quality requirements

- Implement as a static page with small client-side interactions; no backend is needed.
- Framework is flexible. Prefer semantic HTML, CSS, and minimal JavaScript or the project's existing frontend stack.
- Store reference entries in a structured local data file or collection so content can be maintained independently of layout.
- All essential content must remain readable if JavaScript fails; enhanced search may require JavaScript.
- Provide a descriptive title, meta description, one H1, logical heading hierarchy, favicon, and social sharing metadata.
- Target WCAG 2.2 AA: sufficient contrast, labeled controls, visible focus, keyboard access, descriptive alt text, and reduced-motion support.
- Target Lighthouse performance and accessibility scores of at least 90 on a production build; treat these as test targets, not guaranteed results.
- Compress images to WebP or AVIF with suitable fallbacks; provide responsive sources and explicit width/height. Load the hero eagerly and lazy-load below-the-fold media. Target roughly 100–200 KB per card thumbnail and a hero below 500 KB where visual quality permits. Keep font downloads modest.
- Keep initial mobile transfer near or below 1.5 MB where practical; do not preload the entire picture collection. Load full-size viewer images only when requested.
- Store image paths, alt text, captions, source credits, and mobile crop positions with each content entry.
- Use native disclosure controls when JavaScript is unavailable; image links should still open a readable full-size asset without the enhanced viewer.
- No console errors, broken assets, or broken internal links in the production build.

## 9. Success measures and release checks

The release succeeds when a new visitor can identify the page's purpose, reach beginner guidance in one click, and find relevant reference content without leaving the page.

- [ ] All eight page sections are implemented with finished copy.
- [ ] At least 12 image-led topic entries and five FAQ answers are available.
- [ ] At least 16 distinct relevant images are included, with all five build stages illustrated.
- [ ] Hero and card crops preserve their subjects on mobile; no text is obscured by imagery.
- [ ] Screenshot viewer, keyboard dismissal, focus return, and image-error fallbacks work.
- [ ] Checklist progress, reset, and unavailable-storage fallback work.
- [ ] Controls have clear labels, visible selected states, and comfortable touch targets.
- [ ] Search, category filters, combined filtering, reset, and empty states work.
- [ ] All navigation, hero actions, disclosures, and resource links work.
- [ ] Layout is checked at 320px, 768px, and 1440px widths.
- [ ] Keyboard navigation and visible focus are checked manually.
- [ ] Reduced motion is respected and imagery has appropriate alternative text.
- [ ] Gameplay claims and asset credits are reviewed before publication.
- [ ] Production build passes the agreed performance and accessibility checks.

Analytics are optional and not required for version one. Do not display fabricated usage metrics.

## 10. Source starting points

- Official website: https://amistech.com/msc/
- Official Steam listing: https://store.steampowered.com/app/516750/My_Summer_Car/

These sources support the broad game description. Detailed gameplay entries require additional verification during content preparation.

## 11. Implementation handoff

Deliver one finished, responsive, picture-rich landing page with local content, screenshot-led cards, illustrated build stages, friendly labeled controls, working search and filters, inline reference details, an accessible screenshot viewer, and credited assets. The main experience should feel like a useful fan reference from the first visit. Do not expand the scope into a multi-page wiki or add controls that imply unavailable functionality.
