// 記事本文の部品（ショートコード）。
// 記事の型を固定するため、見出し（h2）は部品側で出力し、記事ファイルには書かない。
// 並び順は「リード → 材料 → 手順 → ポイント → まとめ」。
//
// 注意：出力する HTML には空行を含めない。Markdown の HTML ブロックは空行で終わるため、
// 空行があると以降が Markdown として再解釈されて崩れる。
import markdownIt from "markdown-it";
import { imageHtml } from "./images.js";

const md = markdownIt({ html: false, linkify: false, typographer: false });

// 原稿は「1文1行」で書くことが多い。日本語では段落内の改行がスペースとして表示されてしまうので、
// 文字と文字の間の改行（ソフト改行）は取り除いてつなげる。
const joinSoftBreaks = (html) => html.replace(/([^>\n])\n(?=[^<\n])/g, "$1");
const block = (text) => joinSoftBreaks(md.render(text.trim()));
const inline = (text) => md.renderInline(text.trim());
const noBlankLines = (html) => html.split("\n").filter((l) => l.trim() !== "").join("\n");

// Markdown の画像記法 ![代替テキスト](パス)
const IMAGE_LINE = /^!\[(.*?)\]\((.+?)\)\s*$/;

export default function shortcodes(eleventyConfig) {
  // ── リード文 ─────────────────────────────
  // {% lead %}どんな料理か、作ってみたきっかけ{% endlead %}
  eleventyConfig.addPairedShortcode("lead", (content) =>
    noBlankLines(`<div class="article-lead" data-part="lead">${block(content)}</div>`)
  );

  // ── 材料リスト ───────────────────────────
  // 1行に1つ：「材料名 | 分量 | 代わりの食材（任意）」
  // 「[ソース]」のように角かっこだけの行は小見出し（グループ）になる
  eleventyConfig.addPairedShortcode("ingredients", function (content) {
    const servings = this.ctx?.servings;
    const rows = [];
    for (const raw of content.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const group = line.match(/^\[(.+)\]$/);
      if (group) {
        rows.push(`<tr class="ingredients__group"><th colspan="2" scope="rowgroup">${inline(group[1])}</th></tr>`);
        continue;
      }
      const [name = "", amount = "", sub = ""] = line.split("|").map((s) => s.trim());
      const subHtml = sub
        ? `<span class="ingredients__sub">代わりに：${inline(sub)}</span>`
        : "";
      rows.push(
        `<tr><th scope="row"><span class="ingredients__name">${inline(name)}</span>${subHtml}</th><td>${inline(amount)}</td></tr>`
      );
    }
    const heading = servings ? `材料<span class="section-heading__note">（${servings}人分）</span>` : "材料";
    return noBlankLines(`<section class="article-section article-ingredients" data-part="ingredients" aria-labelledby="h-ingredients">
<h2 id="h-ingredients" class="section-heading">${heading}</h2>
<table class="ingredients">
<thead class="visually-hidden"><tr><th scope="col">材料</th><th scope="col">分量</th></tr></thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>
</section>`);
  });

  // ── 手順 ─────────────────────────────────
  // 空行で区切った1かたまりが1手順。写真は ![代替テキスト](./images/02.jpg) の行で1枚まで。
  eleventyConfig.addPairedShortcode("steps", async function (content) {
    const inputPath = this.page.inputPath;
    const chunks = content.trim().split(/\n\s*\n/).filter((c) => c.trim());
    const items = [];
    for (const chunk of chunks) {
      let photo = "";
      const textLines = [];
      for (const raw of chunk.split("\n")) {
        const m = raw.trim().match(IMAGE_LINE);
        if (m && !photo) {
          photo = await imageHtml(m[2], m[1], inputPath, "step");
        } else {
          textLines.push(raw.trim().replace(/^\d+[.)．]\s*/, ""));
        }
      }
      items.push(
        `<li class="step${photo ? " step--has-photo" : ""}"><div class="step__text">${block(textLines.join("\n"))}</div>${
          photo ? `<div class="step__photo">${photo}</div>` : ""
        }</li>`
      );
    }
    return noBlankLines(`<section class="article-section article-steps" data-part="steps" aria-labelledby="h-steps">
<h2 id="h-steps" class="section-heading">作り方</h2>
<ol class="steps">
${items.join("\n")}
</ol>
</section>`);
  });

  // ── ポイント枠 ───────────────────────────
  // 「### コツのタイトル」の行で区切ると、コツごとに枠が分かれる
  eleventyConfig.addPairedShortcode("point", (content) => {
    const parts = content.trim().split(/^###\s+/m).filter((p) => p.trim());
    const boxes = parts.map((part) => {
      const hasTitle = /^###\s+/m.test(content);
      const [first, ...rest] = part.split("\n");
      const title = hasTitle ? first.trim() : "";
      const body = hasTitle ? rest.join("\n") : part;
      return `<div class="point">${title ? `<p class="point__title">${inline(title)}</p>` : ""}<div class="point__body">${block(body)}</div></div>`;
    });
    return noBlankLines(`<section class="article-section article-points" data-part="point" aria-labelledby="h-points">
<h2 id="h-points" class="section-heading">おいしく作るポイント</h2>
${boxes.join("\n")}
</section>`);
  });

  // ── 写真＋キャプション ───────────────────
  // {% figure "./images/03.jpg", "代替テキスト", "キャプション" %}
  eleventyConfig.addShortcode("figure", async function (src, alt, caption = "") {
    const img = await imageHtml(src, alt, this.page.inputPath, "figure");
    return noBlankLines(
      `<figure class="article-figure">${img}${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}</figure>`
    );
  });

  // ── まとめ ───────────────────────────────
  eleventyConfig.addPairedShortcode("summary", (content) =>
    noBlankLines(`<section class="article-section article-summary" data-part="summary" aria-labelledby="h-summary">
<h2 id="h-summary" class="section-heading">まとめ</h2>
${block(content)}
</section>`)
  );

  // ── レイアウト・カード用の画像 ───────────
  // {% articleImage src, alt, inputPath, "card" %}
  eleventyConfig.addShortcode("articleImage", async (src, alt, inputPath, preset = "card") =>
    imageHtml(src, alt, inputPath, preset)
  );
}
