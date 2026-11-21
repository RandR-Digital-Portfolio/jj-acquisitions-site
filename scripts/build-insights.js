const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const ROOT = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content", "articles");
const OUTPUT_DIR = path.join(ROOT, "insights");
const SITE_ORIGIN = "https://randr-digital-portfolio.github.io/jj-acquisitions-site";
const SITE_NAME = "J&J Acquisitions";
const REQUIRED = ["title", "date", "slug", "summary", "author"];
const FORBIDDEN = [
  "X teaser",
  "Found via:",
  "Word count:",
  "DRAFT for Joe",
  "TLDR ",
  "AI-generated",
  "reviewed by a human",
  "This is my opinion",
  "This post was drafted",
  "not legal or security advice",
  "not investment advice",
  "What follows is my opinion",
  "Corrections welcome",
];
const KICKER = "Analysis";

marked.setOptions({ gfm: true, breaks: false });

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseFrontmatter(raw, file) {
  if (!raw.startsWith("---\n")) {
    throw new Error(`${file}: missing front matter`);
  }
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error(`${file}: unterminated front matter`);
  }
  const data = {};
  for (const line of raw.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) throw new Error(`${file}: bad front matter line: ${line}`);
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[match[1]] = value;
  }
  const body = raw.slice(end + 5).replace(/^\n/, "");
  return { data, body };
}

function formatDate(iso) {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`invalid date: ${iso}`);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function loadArticles() {
  if (!fs.existsSync(CONTENT_DIR)) {
    throw new Error(`missing content directory: ${CONTENT_DIR}`);
  }
  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
  if (files.length === 0) throw new Error("no articles in content/articles");

  const seen = new Set();
  const articles = files.map((name) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, name), "utf8");
    const { data, body } = parseFrontmatter(raw, name);
    for (const key of REQUIRED) {
      if (!data[key] || !String(data[key]).trim()) {
        throw new Error(`${name}: missing ${key}`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error(`${name}: date must be YYYY-MM-DD`);
    }
    formatDate(data.date);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug) || data.slug === "index") {
      throw new Error(`${name}: slug must be lowercase words separated by hyphens`);
    }
    if (seen.has(data.slug)) throw new Error(`${name}: duplicate slug ${data.slug}`);
    seen.add(data.slug);
    if (data.summary.length > 240) {
      throw new Error(`${name}: summary is longer than 240 characters`);
    }
    const heading = body.match(/^# (.+)\r?\n/);
    if (!heading || heading[1] !== data.title) {
      throw new Error(`${name}: title must match the markdown H1 exactly`);
    }
    return {
      file: name,
      title: data.title,
      date: data.date,
      displayDate: formatDate(data.date),
      slug: data.slug,
      summary: data.summary,
      author: data.author,
      order: Number(data.order || 0),
      body,
    };
  });

  articles.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.order !== b.order) return a.order - b.order;
    return a.file.localeCompare(b.file);
  });
  return articles;
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function htmlText(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function markdownChunks(markdown) {
  return markdown
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*[-*]\s+/, "")
        .replace(/^\s*\d+\.\s+/, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        .replace(/[*_`]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line && line !== "---");
}

function rootPrefix(depth) {
  return "../".repeat(depth);
}

function renderHeader(depth, current) {
  const root = rootPrefix(depth);
  const insights = depth === 1 ? "./" : "../";
  const item = (href, label, key) => {
    const aria = current === key ? ' aria-current="page"' : "";
    return `<a href="${href}"${aria}>${label}</a>`;
  };
  return `<header>
    <div class="shell">
      <nav aria-label="Primary navigation">
        <a class="brand" href="${root}">J&amp;J Acquisitions</a>
        <div class="navlinks">
          ${item(`${root}#about`, "About", "about")}
          ${item(`${root}#products`, "Products", "products")}
          ${item(`${root}#delivery`, "Delivery &amp; policies", "delivery")}
          ${item(insights, "Insights", "insights")}
          ${item(`${root}#contact`, "Contact", "contact")}
        </div>
      </nav>
    </div>
  </header>`;
}

function renderFooter(insightsHref) {
  return `<footer>
    <div class="shell">
      <strong>J&amp;J Acquisitions</strong><br />
      Digital business tools, templates, acquisition-analysis resources, and software-related products.
      <nav class="footer-links" aria-label="Footer">
        <a href="${insightsHref}">Insights</a>
      </nav>
    </div>
  </footer>`;
}

function renderDocument({ depth, title, description, ogDescription, canonical, ogType, author, published, main, current }) {
  const publishedMeta = published
    ? `\n  <meta property="article:published_time" content="${escapeHtml(published)}" />`
    : "";
  const authorMeta = author ? `\n  <meta name="author" content="${escapeHtml(author)}" />` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />${authorMeta}
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />${publishedMeta}
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <link rel="stylesheet" href="${rootPrefix(depth)}styles.css" />
</head>
<body>
  ${renderHeader(depth, current)}
  <main>
    ${main}
  </main>
  ${renderFooter(depth === 1 ? "./" : "../")}
</body>
</html>
`;
}

function renderArticleBody(article) {
  const html = marked.parse(article.body);
  if (typeof html !== "string") {
    throw new Error(`${article.file}: markdown parser did not return HTML`);
  }
  const heading = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>\n?/);
  if (!heading) throw new Error(`${article.file}: missing rendered title`);
  const rest = html.replace(heading[0], "");
  const dateline = `<p class="dateline"><time datetime="${article.date}">${escapeHtml(article.displayDate)}</time></p>\n`;
  const byline = `<p class="byline">Written by ${escapeHtml(article.author)}.</p>\n`;
  return `<div class="article-body">\n<p class="kicker">${escapeHtml(KICKER)}</p>\n${heading[0]}${dateline}${rest}${byline}</div>`;
}

function assertArticle(article, pageHtml, bodyHtml) {
  const text = htmlText(pageHtml).replace(/\s+([,.;:!?])/g, "$1");
  for (const chunk of markdownChunks(article.body)) {
    const expected = chunk.replace(/\s+([,.;:!?])/g, "$1");
    if (!text.includes(expected)) {
      throw new Error(`${article.file}: rendered page is missing: ${expected.slice(0, 140)}`);
    }
  }
  for (const phrase of FORBIDDEN) {
    if (pageHtml.includes(phrase)) {
      throw new Error(`${article.file}: page contains reviewer-only text (${phrase.trim()})`);
    }
  }
  const urls = article.body.match(/https?:\/\/\S+/g) || [];
  for (const url of urls) {
    const clean = url.replace(/[),.;]+$/, "");
    if (!pageHtml.includes(clean)) {
      throw new Error(`${article.file}: missing source link ${clean}`);
    }
  }
  const byline = `Written by ${article.author}.`;
  if (!htmlText(bodyHtml).endsWith(byline)) {
    throw new Error(`${article.file}: byline is not at the end of the article`);
  }
  if (!bodyHtml.includes('class="byline"') || !bodyHtml.includes('class="kicker"')) {
    throw new Error(`${article.file}: missing kicker or byline markup`);
  }
}

function renderIndex(articles) {
  const description =
    "Analysis of vendor risk, security incidents, and the small software products worth owning.";
  const cards = articles
    .map(
      (article) => `<article class="card">
          <p class="kicker">${escapeHtml(KICKER)}</p>
          <time datetime="${article.date}">${escapeHtml(article.displayDate)}</time>
          <h2><a href="${article.slug}/">${escapeHtml(article.title)}</a></h2>
          <p>${escapeHtml(article.summary)}</p>
          <a class="read-more" href="${article.slug}/">Read article</a>
        </article>`,
    )
    .join("\n");
  const main = `<section>
      <div class="shell">
        <p class="breadcrumb"><a href="../">Home</a> <span aria-hidden="true">/</span> Insights</p>
        <p class="kicker">${escapeHtml(KICKER)}</p>
        <h1 class="page-title">Insights</h1>
        <p class="lead">Notes on vendor risk, security incidents, and the small software products worth owning.</p>
        <div class="insights-list">
          ${cards}
        </div>
      </div>
    </section>`;
  const page = renderDocument({
    depth: 1,
    title: `Insights | ${SITE_NAME}`,
    description,
    ogDescription: description,
    canonical: `${SITE_ORIGIN}/insights/`,
    ogType: "website",
    main,
    current: "insights",
  });
  if (/\bAI\b|AI-generated|AI analyst/i.test(htmlText(page))) {
    throw new Error("insights index contains AI wording");
  }
  return page;
}

function renderArticle(article) {
  const canonical = `${SITE_ORIGIN}/insights/${article.slug}/`;
  const body = renderArticleBody(article);
  const main = `<article class="prose">
      <p class="breadcrumb"><a href="../../">Home</a> <span aria-hidden="true">/</span> <a href="../">Insights</a></p>
      ${body}
    </article>`;
  const page = renderDocument({
    depth: 2,
    title: `${article.title} | ${SITE_NAME}`,
    description: article.summary,
    ogDescription: article.summary,
    canonical,
    ogType: "article",
    author: article.author,
    published: article.date,
    main,
    current: "insights",
  });
  assertArticle(article, page, body);
  return page;
}

function main() {
  const articles = loadArticles();
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const indexHtml = renderIndex(articles);
  for (const phrase of FORBIDDEN) {
    if (indexHtml.includes(phrase)) {
      throw new Error(`insights index contains reviewer-only text (${phrase.trim()})`);
    }
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), indexHtml);
  for (const article of articles) {
    const dir = path.join(OUTPUT_DIR, article.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), renderArticle(article));
    console.log(`${SITE_ORIGIN}/insights/${article.slug}/`);
  }
  console.log(`${SITE_ORIGIN}/insights/`);
  console.log(`built ${articles.length} articles`);
}

main();
