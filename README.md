# Vechtsportschool Rijswijk Website

Static conversion-focused website for Vechtsportschool Rijswijk.

Open `index.html` locally, or deploy the folder to any static host such as GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

## Local Preview

From this folder, run:

```bash
npm run preview
```

Then open `http://localhost:8000`.

## Quality Control Before Deployment

This site includes automated checks for the main deployment risks:

- broken internal links and missing section anchors
- missing images, scripts, stylesheets, icons, and CSS assets
- basic HTML structure and JavaScript syntax
- SEO title and meta description presence on every page
- required Open Graph tags
- basic accessibility issues such as missing image alt text and unlabeled controls
- incorrect Dutch/English language-path configuration
- obvious unused assets or dead files
- detectable mobile layout risks such as a missing viewport tag or suspicious fixed widths
- Lighthouse performance, accessibility, best-practices, and SEO baseline

Run the serious local checks:

```bash
npm run check
```

Run the custom site audit only:

```bash
npm run qc
```

Run the full pre-deployment suite, including HTML validation and Lighthouse:

```bash
npm run check:full
```

`npm run check:full` uses `npx` for third-party tools, so it may download packages the first time it runs. The GitHub Action runs these checks automatically on pull requests, pushes to `main`, and manual workflow runs. The deployment gate fails for serious issues only; less certain dead-file or mobile-layout findings are reported as warnings by the custom checker.

## Pages

- `index.html`
- `gratis-proefles.html`
- Sport pages for MMA, kickboxing, bokszak training, grappling, Wing Chun, kids/youth, women, strength and personal training
- `contributie.html`
- `lestijden.html`
- `coaches.html`
- `over-ons.html`
- `contact.html`
- `bedankt.html`

## Launch Notes

Before publishing, replace these required live values:

- `TODO_REAL_PHONE_NUMBER`
- `TODO_REAL_PHONE_E164`
- `TODO_REAL_WHATSAPP_NUMBER`
- `TODO_FORMSPREE_ID`
- `TODO_GTM_CONTAINER_ID`
- Google reviews URL in `work/generate-vechtsportschool-site.js`

The gallery currently uses distinct temporary facility placeholders. Replace them with real gym photos when available.
