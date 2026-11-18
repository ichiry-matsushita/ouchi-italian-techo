import { HtmlBasePlugin } from "@11ty/eleventy";
import site from "./src/_data/site.js";
import shortcodes from "./lib/shortcodes.js";

const CATEGORIES = site.categories;
const PER_PAGE = site.perPage;

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  // sass が書き出したCSSの変更でもブラウザを再読み込みする
  eleventyConfig.setServerOptions({ watch: ["_site/css/**/*.css"] });
  // 記事の写真が変わったら再ビルド
  eleventyConfig.addWatchTarget("src/articles/**/*.{jpg,jpeg,png}");
  // 「このサイトの仕組み」ページは原稿（drafts/）も読むので、原稿の変更でも再ビルド
  eleventyConfig.addWatchTarget("drafts/**/draft.txt");

  // 記事本文の部品（lead / ingredients / steps / point / figure / summary）
  eleventyConfig.addPlugin(shortcodes);

  // 記事コレクション（新しい順）
  eleventyConfig.addCollection("articles", (api) =>
    api.getFilteredByGlob("src/articles/*/index.md").sort((a, b) => b.date - a.date)
  );

  // カテゴリ別一覧のページ送り用：カテゴリ × 9件ごとのチャンクを作る
  eleventyConfig.addCollection("categoryPages", (api) => {
    const articles = api
      .getFilteredByGlob("src/articles/*/index.md")
      .sort((a, b) => b.date - a.date);
    const pages = [];
    for (const cat of CATEGORIES) {
      const items = articles.filter((a) => a.data.category === cat.name);
      const total = Math.max(1, Math.ceil(items.length / PER_PAGE));
      for (let i = 0; i < total; i++) {
        pages.push({
          category: cat,
          items: items.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
          pageNumber: i + 1,
          totalPages: total,
        });
      }
    }
    return pages;
  });

  // 日付表示（2026年11月20日）
  eleventyConfig.addFilter("jpDate", (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  });
  // ISO日付（<time datetime>用）
  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));
  // 配列の先頭 n 件
  eleventyConfig.addFilter("head", (arr, n) => (arr || []).slice(0, n));
  // 関連記事：同じカテゴリから自分以外を新しい順に n 件
  eleventyConfig.addFilter("relatedArticles", (articles, category, url, n = 3) =>
    (articles || []).filter((a) => a.data.category === category && a.url !== url).slice(0, n)
  );
  // カテゴリ名 → スラッグ
  eleventyConfig.addFilter("categorySlug", (name) => CATEGORIES.find((c) => c.name === name)?.slug ?? "");

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    // GitHub Pages のリポジトリ名に合わせる（例：PATH_PREFIX=/ouchi-italian-techo/）
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
