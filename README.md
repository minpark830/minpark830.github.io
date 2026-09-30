# Minwoo Park, personal site

A single-page portfolio for embedded software and controls roles. Plain HTML, CSS, and JavaScript: no build step, no frameworks, no trackers. It deploys to GitHub Pages for free.

The hero is a live position servo under PID control, simulated at 1 kHz in the browser. Visitors can tune the gains and watch the step response, three requirement checks, and the C++ gain constants update together. The simulation mirrors `pid.hpp` as shown on the page; the two were checked against each other and agree to within 1e-6 rad.

## What's in the folder

| Path | What it is |
| --- | --- |
| `index.html` | The whole site: content, styles, and the servo simulation |
| `404.html` | Shown by GitHub Pages for any missing address |
| `assets/Minwoo_Park_Resume.pdf` | The resume linked from the site |
| `assets/video/` | Poster frames for the three demo videos |
| `assets/og-image.png` | Preview image shown when the link is shared on LinkedIn, Slack, and so on |
| `assets/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | Browser and phone icons |
| `assets/fonts/` | B612 and B612 Mono, self-hosted (SIL Open Font License, see `LICENSE-OFL.txt`) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## 1. Links

Every link is filled in: GitHub (`minpark830`), LinkedIn (`minwoo-park1`), and the site address `https://minpark830.github.io/`, which the page's preview metadata uses.

The embedded-foundations card has its GitHub link commented out, because that repository isn't public yet. Once it is, remove the comment markers around the link in `index.html`.

## 2. Publish on GitHub Pages

1. On GitHub, create a new **public** repository named exactly `minpark830.github.io`.
2. Upload everything in this folder to it, including the hidden `.nojekyll` file. With git:

   ```sh
   git init
   git add .
   git commit -m "Personal site"
   git branch -M main
   git remote add origin https://github.com/minpark830/minpark830.github.io.git
   git push -u origin main
   ```

3. In the repository, open **Settings**, then **Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, and click **Save**.
4. Wait a few minutes (GitHub says up to 10), then open `https://minpark830.github.io`.

If you already have a `minpark830.github.io` repository, replace its contents with these files instead.

If you publish from a repository with any other name, the site lives at `https://minpark830.github.io/repo-name/`. Everything on the main page still works. The 404 page's home link and font paths assume the site is at the root, so change `/` to `/repo-name/` in `404.html`, and update the URLs in the `<head>` of `index.html` to match.

## 3. Preview on your computer

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly from the file system also works, but some browsers block the fonts that way.

## 4. Editing

Everything lives in `index.html`, with each section marked by a comment such as `<!-- ===== Experience ===== -->`.

- **Experience, projects, education:** each entry is a small `<article>` block. Copy one to add another.
- **Resume:** replace `assets/Minwoo_Park_Resume.pdf` with a new file of the same name.
- **Demo videos:** each video is a `<div class="video" data-yt="VIDEO_ID">` holding a poster image from `assets/video/`. The YouTube player loads only when someone presses play, so the page makes no requests to YouTube until then. To swap a video, change the ID in `data-yt` and in the card's two YouTube links, then replace the poster with any frame from the new video. For a video that isn't 16:9, set `--ar` on the poster to its width / height (the RC car video uses `350 / 720`).
- **The servo demo:** the plant, the scenario, and the requirement limits are at the top of the last `<script>` (`P`, `DEF`, `REQ`). The slider ranges are on the `<input type="range">` elements. If you change the default gains, change them in both places.
- **Colors and type:** all colors are tokens at the top of the `<style>` block, with dark-theme values beneath them.

## 5. After it's live

- Paste the URL into [LinkedIn's Post Inspector](https://www.linkedin.com/post-inspector/) to check the preview image.
- Add the URL to your resume header, LinkedIn profile, and GitHub profile.
- Pin `CPSquare-crazyflie-firmware` on your GitHub profile. Right now the profile leads with older repositories, and recruiters who click through from the site land there first.
- Your `@engineering.upenn.edu` address may stop working after graduation. Consider switching the site to an address you'll keep.
