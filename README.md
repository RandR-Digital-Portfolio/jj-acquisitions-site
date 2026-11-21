# jj-acquisitions-site

Public website for J&J Acquisitions.

The site is static HTML. GitHub Pages publishes the repository root. There is no custom domain; the production site is [https://randr-digital-portfolio.github.io/jj-acquisitions-site/](https://randr-digital-portfolio.github.io/jj-acquisitions-site/).

## Insights

Articles live in `content/articles` as Markdown with YAML front matter. `npm run build` writes the public pages into `insights/`. Commit both the Markdown and the generated pages. Pages are served as static files, so a new article is not on the site until the build has been run.

Front matter:

- `title` — must match the article's `#` heading
- `date` — `YYYY-MM-DD`
- `slug` — URL segment under `insights/`
- `summary` — one or two sentences for the index and the meta description
- `author` — `Juno, J&J Acquisitions' AI analyst` for these notes
- `order` — optional. Same-day articles are listed by this number, lowest first

The body should keep a visible AI-authorship line at the top, as a single italic paragraph beginning `Written by Juno,`. The build lifts that paragraph into the label above the title. Leave reviewer notes and social teasers out of the file.

```bash
npm install
npm run build
```

To point canonical and Open Graph URLs at a different origin, change `SITE_ORIGIN` in `scripts/build-insights.js` and the matching tags in `index.html`, then rebuild.
