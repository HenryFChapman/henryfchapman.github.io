# Henry F. Chapman — Portfolio Website

Personal portfolio for Henry F. Chapman, Sales Engineer @ Datadog. Covers a career spanning violent crime analysis in New York, social intelligence for Fortune 500 brands, and infrastructure observability at enterprise scale.

**Live site:** [henryfchapman.github.io](https://henryfchapman.github.io)

## Sections

- **About** — Background, career narrative, and key stats
- **Social Intelligence** — Insight briefs, presentations, and technical projects
- **Criminal Intelligence** — Notable cases, technical projects, and talks
- **Resume** — Experience, education, technical skills, and memberships
- **Interests** — Personal interests and activities
- **Contact** — Targeted outreach for observability and data infrastructure roles

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript — no frameworks, no build step
- Canvas-based particle network animation (hero section)
- CSS custom properties for theming and gradients
- IntersectionObserver for scroll-triggered fade-ins
- Responsive layout with hamburger nav at ≤960px

## File Structure

```
index.html          Main page
styles.css          All styles (CSS variables, responsive design)
script.js           All JS (nav, scroll, canvas animation, mobile menu)
aboutme/            Redirect page → /
images/             Image assets
images/webp/        WebP versions of images
```

## Development

No build process required — open `index.html` directly in a browser or serve with any static file server.

```bash
git clone https://github.com/henryfchapman/henryfchapman.github.io.git
cd henryfchapman.github.io
open index.html
```
