const { JSDOM } = require("jsdom");
const { chromium } = require("playwright");
const { AsyncCaller } = require("@langchain/core/utils/async_caller");
const { BaseDocumentLoader } = require("@langchain/core/document_loaders/base");
const { log } = require('@nodebug/logger')

const { convert } = require('html-to-text');

class RecursiveWebLoader extends BaseDocumentLoader {
  constructor(url, options) {
    super();

    this.caller = new AsyncCaller({
      maxConcurrency: 64,
      maxRetries: 0,
      ...options.callerOptions,
    });

    this.url = url;
    this.excludeDirs = options.excludeDirs ?? [];
    // this.extractor = options.extractor ?? ((s) => s);
    this.maxDepth = options.maxDepth ?? 2;
    this.timeout = options.timeout ?? 10000;
    this.preventOutside = options.preventOutside ?? true;

    this.visited = new Set();
  }

  extractor(html){
    return convert(html, {
      // wordwrap: 130, // Optional: Adjusts word wrapping
      selectors: [{ selector: 'a', format: 'inline' }], // Converts links inline
    });
  }

  async fetchWithTimeout(url) {
    log.info(`Fetching content from ${url}`)
    return this.caller.call(async () => {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: this.timeout });
        const content = await page.content();;
        await browser.close();
        return content
      } catch (error) {
        await browser.close();
        throw error;
      }
    });
  }

  getChildLinks(html, baseUrl) {
    const allLinks = Array.from(
      new JSDOM(html).window.document.querySelectorAll("a")
    ).map((a) => a.href);
    const absolutePaths = [];
    const invalidPrefixes = ["javascript:", "mailto:", "#", "about:blank"];
    const invalidSuffixes = [".css", ".js", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg"];

    for (const link of allLinks) {
      if (
        invalidPrefixes.some((prefix) => link.startsWith(prefix)) ||
        invalidSuffixes.some((suffix) => link.endsWith(suffix))
      )
        continue;

      let standardizedLink;

      if (link.startsWith("http")) {
        standardizedLink = link;
      } else if (link.startsWith("//")) {
        const base = new URL(baseUrl);
        standardizedLink = base.protocol + link;
      } else {
        standardizedLink = new URL(link, baseUrl).href;
      }

      if (this.excludeDirs.some((exDir) => standardizedLink.startsWith(exDir))) continue;

      if (link.startsWith("http")) {
        const isAllowed = !this.preventOutside || link.startsWith(baseUrl);
        if (isAllowed) absolutePaths.push(link);
      } else if (link.startsWith("//")) {
        const base = new URL(baseUrl);
        absolutePaths.push(base.protocol + link);
      } else {
        const newLink = new URL(link, baseUrl).href;
        absolutePaths.push(newLink);
      }
    }

    return Array.from(new Set(absolutePaths));
  }

  extractMetadata(rawHtml, url) {
    const metadata = { source: url };
    const { document } = new JSDOM(rawHtml).window;

    const title = document.getElementsByTagName("title")[0];
    if (title) {
      metadata.title = title.textContent;
    }

    const description = document.querySelector("meta[name=description]");
    if (description) {
      metadata.description = description.getAttribute("content");
    }

    const html = document.getElementsByTagName("html")[0];
    if (html) {
      metadata.language = html.getAttribute("lang");
    }

    return metadata;
  }

  async getUrlAsDoc(url) {
    let res;
    try {
      res = await this.fetchWithTimeout(url);
    } catch (e) {
      return null;
    }

    return {
      pageContent: this.extractor(res),
      metadata: this.extractMetadata(res, url),
    };
  }

  async getChildUrlsRecursive(inputUrl, visited = new Set(), depth = 0) {
    if (depth >= this.maxDepth) return [];
    let url = inputUrl;
    if (!inputUrl.endsWith("/")) url += "/";

    if (this.excludeDirs.some((exDir) => url.startsWith(exDir))) return [];

    let res;
    try {
      res = await this.fetchWithTimeout(url);
    } catch (e) {
      return [];
    }

    const childUrls = this.getChildLinks(res, url);

    const results = await Promise.all(
      childUrls.map(async (childUrl) => {
        if (visited.has(childUrl)) return null;

        const childDoc = await this.getUrlAsDoc(childUrl);
        if (!childDoc) return null;

        const childUrlResponses = await this.getChildUrlsRecursive(childUrl, visited, depth + 1);
        return [childDoc, ...childUrlResponses];
      })
    );

    return results.flat().filter((docs) => docs !== null);
  }

  async load() {
    const rootDoc = await this.getUrlAsDoc(this.url);
    if (!rootDoc) return [];

    const docs = [rootDoc];
    docs.push(...(await this.getChildUrlsRecursive(this.url, new Set([this.url]))));
    return docs;
  }
}

module.exports = { RecursiveWebLoader };
