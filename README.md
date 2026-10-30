# minpark830.github.io

Minwoo Park's portfolio, live at **https://minpark830.github.io**.

A static site built with [Astro](https://astro.build) and TypeScript. The home
page opens on a live PID servo you can tune (Figure 1), and project write-ups go
deeper than the cards. Every change is type-checked, unit-tested, checked in a
real browser for accessibility and behavior, and held to Lighthouse budgets
before GitHub Actions deploys it.

## What is tested

| Check | Tool | What it catches |
| --- | --- | --- |
| Types | `astro check` | Type errors in pages, components, and scripts |
| Servo model | Vitest | The published numbers, the 2% steady error without integral action, no derivative kick, actuator limits, RK4 against the exact solution, and the tuning hints converging from 300 random starts |
| C++ parity | Vitest + g++ | Compiles `firmware/pid.hpp` with `-Wall -Wextra -Wpedantic -Werror`, runs it on the same plant, and requires agreement with the browser model to 1e-6 rad; also compiles `firmware/control_loop.cpp` |
| The build | Vitest | Every internal link, anchor, and asset resolves; every page has its title, description, canonical address, and Open Graph tags; the sitemap is complete; JS, CSS, and HTML stay inside gzip budgets |
| The browser | Playwright | Figure 1 responds to sliders, keyboard, and reset; the role filter and `?for=` links; videos load only when played; sheets link in a loop; the 404 page |
| Accessibility | axe-core | WCAG 2.2 AA on every page, in light and dark themes, on desktop and phone |
| Performance | Lighthouse CI | Scores, layout shift, and page weight budgets |

## Layout

```
src/
  pages/               index.astro (sheet 1), projects/[slug].astro (write-ups), 404.astro
  layouts/             Base.astro (head, nav, title block), WriteUp.astro
  components/          Hero, Bench (Figure 1), Experience, Projects (with the role filter), …
  components/figures/  each diagram as a component
  content/projects/    one MDX file per project: frontmatter for the card, body for the write-up
  content/excerpts/    verbatim code quoted on the write-ups
  content.config.ts    the schema every project file must satisfy
  data/                experience, skills, education, results, and site-wide facts
  lib/servo.ts         the servo model, shared by Figure 1 and the tests
  scripts/             browser code for Figure 1 and the role filter
firmware/              pid.hpp, gains.hpp, control_loop.cpp: the C++ shown beside Figure 1
tests/
  unit/                servo model and C++ parity
  dist/                checks on the built site
  e2e/                 browser and accessibility tests
  cpp/                 the C++ test harness and a stand-in STM32 header
public/assets/         resume PDF, fonts, video posters, icons
.github/workflows/     deploy.yml: check, test, build, deploy
lighthouserc.json      Lighthouse assertions and budgets
```

## Run it

Needs Node 22.23 or newer, and g++ for the parity test.

```sh
npm ci
npm run dev                         # http://localhost:4321
```

## Test it

```sh
npm run check                       # types
npm run test:unit                   # servo model and C++ parity
npm run build
npm run test:dist                   # links, metadata, sizes
npx playwright install chromium     # once
npm run test:e2e                    # browser and accessibility
npm run lhci                        # Lighthouse budgets
```

`npm test` runs everything except Lighthouse.

## Edit the content

- **Experience, skills, education, and the results table:** `src/data/`.
- **A project:** add `src/content/projects/<slug>.mdx`. The frontmatter fills
  the card; the schema in `src/content.config.ts` lists the fields, and the
  build fails if one is wrong. Add a `writeup` block and a body to publish a
  sheet at `/projects/<slug>/`. Sheet numbers run 2, 3, 4, and so on.
- **The resume:** replace `public/assets/Minwoo_Park_Resume.pdf`. The address
  stays the same, so links already sent out keep working.
- **A shareable filtered view:** `https://minpark830.github.io/?for=controls`
  (or `embedded`, `electrical`, `software`) opens the projects filtered to that
  kind of role.

## Deploy

Pushes to `main` deploy through GitHub Actions once every check passes. Pull
requests run the same checks without deploying. Pages must be set to deploy from
Actions: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The Ohm practice app at `/ohm/` lives in its own repository and deploys
separately.

## Design notes

- The site is drawn like an engineering drawing set: numbered figures, and a
  title block on every page giving the sheet number and the commit it was
  built from.
- Text is set in B612, the typeface designed for Airbus cockpit displays. Code
  and math use system faces, because B612's parentheses and brackets look
  alike at small sizes.
- Color is semantic, as on a glass cockpit: cyan for what you can change,
  magenta for targets, green for measured values and passing checks, amber for
  failures. Nothing is colored for decoration.
- There is no tracking, and the page makes no third-party requests until a
  visitor plays a video, which then loads from youtube-nocookie.com.
