import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { logger } from '../../logging/logger.js';

// One-off admin script, never called from an HTTP request handler (see ARCHITECTURE.md §6
// and sync-schools.js for the same pattern) — NOT a runtime data pipeline and does not write
// to the database. Its output is a research artifact for a human/agent to read and manually
// fold into sopRubric.js's hardcoded rubric text, the same way GradPilot's rubric pages and
// the Common App's prompt text were originally read and transcribed by hand. A JS-model-driven
// summarizer (like WebFetch) paraphrases a page down to a few bullet points and can flatten or
// drop the concrete detail a rubric needs; this fetches and section-parses the actual page HTML
// so the real text is available verbatim.
//
// Run: node src/data-ingestion/jobs/scrape-essay-guidance.js [outputPath]
//
// Scope is deliberately narrow: SEED_URLS below plus RESOURCE_LINK_KEYWORDS-matched links
// found on the personal-statement-resources hub page — not a general same-domain crawler. This
// keeps the run to a small, human-reviewable set of essay-craft pages instead of pulling in a
// marketing site's unrelated blog/product content.

const USER_AGENT = 'StudyAbroadApp-EssayRubricResearch/1.0 (+https://github.com/shujamukhtar-ops/studyabroad; one-off manual research fetch, not a recurring crawl)';
const REQUEST_DELAY_MS = 750;
const REQUEST_TIMEOUT_MS = 15000;

const SEED_URLS = [
  'https://www.collegeessayguy.com/blog/common-app-essay-prompts',
  'https://www.collegeessayguy.com/blog/how-to-write-a-college-essay',
  'https://www.collegeessayguy.com/personal-statement-resources',
];

// Only links whose anchor text matches one of these (case-insensitive substring) get followed
// from the resources hub page — narrows an otherwise large hub page down to the handful of
// articles actually relevant to grading criteria (hooks, endings, vulnerability, voice), not
// every linked course/product/testimonial on the page.
const RESOURCE_LINK_KEYWORDS = [
  'how to end a college essay',
  'how to start a college essay',
  'vulnerability',
  'sound smart',
  'brag in your college essay',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${url} responded ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

// Parses robots.txt for a single `User-agent: *` block and returns its Disallow prefixes.
// Deliberately minimal (no wildcard/`$`/Allow-precedence handling) — sufficient for checking
// a handful of specific paths against a normal blog's robots.txt, not a general-purpose parser.
function parseDisallowedPaths(robotsTxt) {
  const lines = robotsTxt.split('\n').map((l) => l.trim());
  const disallowed = [];
  let inWildcardBlock = false;
  for (const line of lines) {
    if (/^user-agent:\s*\*/i.test(line)) {
      inWildcardBlock = true;
      continue;
    }
    if (/^user-agent:/i.test(line)) {
      inWildcardBlock = false;
      continue;
    }
    if (inWildcardBlock) {
      const match = line.match(/^disallow:\s*(\S+)/i);
      if (match) disallowed.push(match[1]);
    }
  }
  return disallowed;
}

async function isAllowedByRobots(url, origin) {
  try {
    const robotsTxt = await fetchText(`${origin}/robots.txt`);
    const disallowed = parseDisallowedPaths(robotsTxt);
    const path = new URL(url).pathname;
    return !disallowed.some((prefix) => prefix !== '' && path.startsWith(prefix));
  } catch (err) {
    logger.warn('Could not fetch/parse robots.txt, proceeding cautiously', { origin, err: err.message });
    return true;
  }
}

// Groups the page's real body text under its own headings (h1-h4), so a fragment identifier
// like "#D" in a source URL can be matched against the section it actually names, and so a
// long guide reads as a table of named sections rather than one undifferentiated text blob.
function extractSections(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, noscript, form').remove();

  const container = $('article').length
    ? $('article')
    : $('main').length
      ? $('main')
      : $('body');

  const sections = [];
  let current = { heading: null, level: 0, id: null, paragraphs: [] };

  container.find('h1, h2, h3, h4, p, li').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) return;

    if (/^h[1-4]$/.test(tag)) {
      if (current.heading || current.paragraphs.length) sections.push(current);
      current = { heading: text, level: Number(tag[1]), id: $(el).attr('id') ?? null, paragraphs: [] };
    } else {
      current.paragraphs.push(text);
    }
  });
  if (current.heading || current.paragraphs.length) sections.push(current);

  return sections;
}

function extractMatchingLinks(html, baseUrl, keywords) {
  const $ = cheerio.load(html);
  const found = new Map();
  $('a[href]').each((_, el) => {
    const anchorText = $(el).text().replace(/\s+/g, ' ').trim().toLowerCase();
    if (!anchorText) return;
    const matchesKeyword = keywords.some((kw) => anchorText.includes(kw));
    if (!matchesKeyword) return;
    try {
      const absolute = new URL($(el).attr('href'), baseUrl).toString().split('#')[0];
      if (new URL(absolute).hostname === new URL(baseUrl).hostname) {
        found.set(absolute, anchorText);
      }
    } catch {
      // Malformed href (mailto:, javascript:, etc.) — not a page to follow.
    }
  });
  return [...found.keys()];
}

async function scrapeUrl(url, origin) {
  const allowed = await isAllowedByRobots(url, origin);
  if (!allowed) {
    logger.warn('Skipping URL disallowed by robots.txt', { url });
    return null;
  }
  const html = await fetchText(url);
  const sections = extractSections(html);
  return { url, sections, html };
}

export async function scrapeEssayGuidance() {
  const origin = new URL(SEED_URLS[0]).origin;
  const pages = [];
  const visited = new Set();

  for (const url of SEED_URLS) {
    if (visited.has(url)) continue;
    visited.add(url);
    logger.info('Scraping page', { url });
    const page = await scrapeUrl(url, origin);
    if (page) pages.push(page);
    await sleep(REQUEST_DELAY_MS);
  }

  const resourcesHub = pages.find((p) => p.url.endsWith('/personal-statement-resources'));
  if (resourcesHub) {
    const links = extractMatchingLinks(resourcesHub.html, resourcesHub.url, RESOURCE_LINK_KEYWORDS);
    for (const url of links) {
      if (visited.has(url)) continue;
      visited.add(url);
      logger.info('Scraping linked resource', { url });
      try {
        const page = await scrapeUrl(url, origin);
        if (page) pages.push(page);
      } catch (err) {
        logger.warn('Failed to scrape linked resource, skipping', { url, err: err.message });
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // The raw HTML was only needed for link discovery on the hub page — the output artifact is
  // the section text a human/agent reviews, not a second copy of the page's markup.
  return pages.map(({ url, sections }) => ({ url, sections }));
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const outputPath = process.argv[2] ?? './essay-guidance-scrape.json';
  scrapeEssayGuidance()
    .then((pages) => {
      fs.writeFileSync(path.resolve(outputPath), JSON.stringify(pages, null, 2));
      console.log(`Scraped ${pages.length} page(s) -> ${outputPath}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
