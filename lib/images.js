// 記事の写真を WebP に変換・リサイズする。
// sharp（eleventy-img の内部）は既定で EXIF・GPS などのメタデータを書き出さないため、
// 出力画像から位置情報は取り除かれる。元の JPG は _site にコピーしない。
import fs from "node:fs";
import path from "node:path";
import Image from "@11ty/eleventy-img";

const escapeAttr = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// 用途ごとの幅と sizes
export const PRESETS = {
  eyecatch: { widths: [640, 1080, 1600], sizes: "(min-width: 1112px) 1080px, 100vw" },
  card: { widths: [400, 800], sizes: "(min-width: 1112px) 340px, (min-width: 700px) 45vw, 100vw" },
  step: { widths: [400, 800], sizes: "(min-width: 768px) 280px, 100vw" },
  figure: { widths: [640, 1080], sizes: "(min-width: 752px) 720px, 100vw" },
};

/**
 * @param {string} src       記事フォルダからの相対パス（例 "./images/01.jpg"）
 * @param {string} alt       代替テキスト
 * @param {string} inputPath 記事ファイルのパス（page.inputPath）
 * @param {keyof PRESETS} preset
 * @param {object} attrs     img に付ける追加属性
 */
export async function imageHtml(src, alt, inputPath, preset = "figure", attrs = {}) {
  if (!src) return "";
  const { widths, sizes } = PRESETS[preset];
  const fullPath = path.join(path.dirname(inputPath), src);

  // 写真が見つからないとき：
  //   本番ビルド（npm run build）→ エラーで止める（壊れたページを公開しないため）
  //   開発サーバー（npm start）  → 警告を出して仮の枠を表示し、ほかのページの更新は止めない
  if (!fs.existsSync(fullPath)) {
    const message = `[images] 写真が見つかりません: ${src}（${inputPath}）`;
    if (process.env.ELEVENTY_RUN_MODE === "build") throw new Error(message);
    console.warn(message);
    return `<span class="img-missing" role="img" aria-label="${escapeAttr(alt ?? "")}">写真が見つかりません：${escapeAttr(src)}</span>`;
  }
  const metadata = await Image(fullPath, {
    widths,
    formats: ["webp"],
    outputDir: "_site/img/",
    urlPath: "/img/",
  });
  return Image.generateHTML(metadata, {
    alt: alt ?? "",
    sizes,
    loading: preset === "eyecatch" ? "eager" : "lazy",
    decoding: "async",
    ...attrs,
  });
}
