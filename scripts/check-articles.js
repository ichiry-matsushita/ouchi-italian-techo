#!/usr/bin/env node
// 記事のチェック
//
//   npm run check:articles                  … 全記事をチェック
//   npm run check:articles -- amatriciana   … 指定したスラッグの記事だけチェック
//
// チェックすること（エラー）
//   1. フロントマターの必須項目がそろっているか（型も確認）
//   2. カテゴリが「前菜・パスタ・メイン・ドルチェ」のどれかか
//   3. 見出しの順番がテンプレートどおりか（リード → 材料 → 手順 → ポイント → まとめ）
//   4. 画像に代替テキストがあるか（あわせて画像ファイルがあるか）
//   5. TODO: が残っていないか
//   ＋ スラッグ（フォルダ名）がURLとして使える形か
//
// 気づいたこと（警告。公開は止めない）
//   説明文や代替テキストの長さ、本文に手書きの見出しがある、など
//
// エラーが1つでもあれば終了コード 1 を返す（GitHub Actions で公開を止めるため）。

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import site from "../src/_data/site.js";

const ARTICLES_DIR = "src/articles";
const CATEGORIES = site.categories.map((c) => c.name);
const RESERVED_SLUGS = [...site.categories.map((c) => c.slug), "page"];

// 本文の部品。この順番で1回ずつ使う
const PARTS = [
  { tag: "lead", label: "リード" },
  { tag: "ingredients", label: "材料" },
  { tag: "steps", label: "手順" },
  { tag: "point", label: "ポイント" },
  { tag: "summary", label: "まとめ" },
];

// フロントマターの必須項目と型
const REQUIRED = {
  title: "text",
  description: "text",
  date: "date",
  category: "text",
  tags: "list",
  cookingTime: "number",
  servings: "number",
  eyecatch: "text",
  eyecatchAlt: "text",
};
const OPTIONAL = { region: "text" };

// ── 1記事をチェックする ───────────────────────
export function checkArticle(slug, raw, articleDir) {
  const errors = [];
  const warnings = [];
  const err = (line, message) => errors.push({ line, message });
  const warn = (line, message) => warnings.push({ line, message });

  const lines = raw.split(/\r?\n/);

  // スラッグ
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    err(null, `フォルダ名「${slug}」はURLに使えません（半角英小文字・数字・ハイフンだけにしてください）`);
  }
  if (RESERVED_SLUGS.includes(slug)) {
    err(null, `フォルダ名「${slug}」はカテゴリ一覧などのURLとぶつかるので使えません`);
  }

  // ── フロントマター ──
  if (lines[0] !== "---") {
    err(1, "ファイルの先頭にフロントマター（--- で囲んだ項目）がありません");
    return { errors, warnings };
  }
  const fmEnd = lines.indexOf("---", 1);
  if (fmEnd === -1) {
    err(1, "フロントマターの終わりの --- がありません");
    return { errors, warnings };
  }
  const bodyStartLine = fmEnd + 2; // 本文1行目の行番号（1始まり）
  const fmLineOf = (key) => {
    const i = lines.slice(0, fmEnd).findIndex((l) => l.startsWith(`${key}:`));
    return i === -1 ? null : i + 1;
  };

  let data = {};
  try {
    data = yaml.load(lines.slice(1, fmEnd).join("\n")) ?? {};
  } catch (e) {
    err(e.mark ? e.mark.line + 2 : 1, `フロントマターの書き方に誤りがあります（${e.reason ?? e.message}）`);
    return { errors, warnings };
  }

  const isTodo = (v) => typeof v === "string" && v.includes("TODO:");

  for (const [key, type] of Object.entries({ ...REQUIRED, ...OPTIONAL })) {
    const required = key in REQUIRED;
    const value = data[key];
    const line = fmLineOf(key);

    if (value === undefined || value === null || value === "") {
      if (required) err(line, `必須項目「${key}」がありません`);
      continue;
    }
    if (isTodo(value)) continue; // TODO はあとでまとめて報告する

    if (type === "text" && typeof value !== "string") err(line, `「${key}」は文字で書いてください`);
    if (type === "number" && !(Number.isInteger(value) && value > 0))
      err(line, `「${key}」は 1 以上の整数で書いてください（今は ${JSON.stringify(value)}）`);
    if (type === "date" && !(value instanceof Date && !isNaN(value)))
      err(line, `「${key}」は 2026-11-20 の形の日付で書いてください`);
    if (type === "list" && (!Array.isArray(value) || value.length === 0))
      err(line, `「${key}」は ["トマト", "ローマ料理"] の形で1つ以上書いてください`);
  }

  const unknown = Object.keys(data).filter((k) => !(k in REQUIRED) && !(k in OPTIONAL));
  for (const key of unknown) warn(fmLineOf(key), `決まっていない項目「${key}」があります`);

  // カテゴリ
  if (typeof data.category === "string" && !isTodo(data.category) && !CATEGORIES.includes(data.category)) {
    err(fmLineOf("category"), `カテゴリ「${data.category}」は使えません（${CATEGORIES.join("・")} のどれか）`);
  }

  // 説明文の長さ（目安）
  if (typeof data.description === "string" && !isTodo(data.description)) {
    const len = [...data.description].length;
    if (len < 60 || len > 140) warn(fmLineOf("description"), `説明文が ${len} 文字です（目安は 100 文字前後）`);
  }

  // アイキャッチ
  if (typeof data.eyecatch === "string" && !isTodo(data.eyecatch)) {
    checkImageFile(data.eyecatch, fmLineOf("eyecatch"));
  }
  if (typeof data.eyecatchAlt === "string" && data.eyecatchAlt.trim()) checkAltLength(data.eyecatchAlt, fmLineOf("eyecatchAlt"));

  // ── 本文 ──
  const body = lines.slice(fmEnd + 1);
  const lineOfBody = (i) => bodyStartLine + i;

  // 部品の順番（見出しの順番）
  const found = [];
  body.forEach((l, i) => {
    for (const m of l.matchAll(/\{%-?\s*(lead|ingredients|steps|point|summary)\b[^%]*-?%\}/g)) {
      found.push({ tag: m[1], line: lineOfBody(i) });
    }
  });
  for (const part of PARTS) {
    const hits = found.filter((f) => f.tag === part.tag);
    if (hits.length === 0) err(null, `「${part.label}」（{% ${part.tag} %}）がありません`);
    if (hits.length > 1) err(hits[1].line, `「${part.label}」（{% ${part.tag} %}）が ${hits.length} 回あります（1回だけ）`);
  }
  const order = found.map((f) => f.tag);
  const expected = PARTS.map((p) => p.tag).filter((t) => order.includes(t));
  const firstOccurrence = [...new Set(order)];
  if (firstOccurrence.join() !== expected.join()) {
    const label = (t) => PARTS.find((p) => p.tag === t).label;
    err(
      found[0]?.line ?? null,
      `見出しの順番が違います。今：${firstOccurrence.map(label).join(" → ")}／正しい順：${PARTS.map((p) => p.label).join(" → ")}`
    );
  }

  // 終わりのタグの付け忘れ
  for (const part of PARTS) {
    const open = body.filter((l) => new RegExp(`\\{%-?\\s*${part.tag}\\b`).test(l)).length;
    const close = body.filter((l) => new RegExp(`\\{%-?\\s*end${part.tag}\\b`).test(l)).length;
    if (open !== close) err(null, `{% ${part.tag} %} と {% end${part.tag} %} の数が合いません`);
  }

  // 手書きの見出し（部品が見出しを出すので、本文には書かない）
  body.forEach((l, i) => {
    if (/^#{1,2}\s/.test(l)) warn(lineOfBody(i), `本文に見出し「${l.trim()}」が書かれています（見出しは部品が自動で出します）`);
  });

  // 画像の代替テキスト：Markdown の画像記法
  body.forEach((l, i) => {
    for (const m of l.matchAll(/!\[(.*?)\]\((.*?)\)/g)) {
      const [, alt, src] = m;
      if (!alt.trim()) err(lineOfBody(i), `画像 ${src} に代替テキストがありません（![ここに説明](${src})）`);
      else checkAltLength(alt, lineOfBody(i));
      checkImageFile(src, lineOfBody(i));
    }
  });

  // 画像の代替テキスト：{% figure "src", "alt", "caption" %}
  body.forEach((l, i) => {
    for (const m of l.matchAll(/\{%-?\s*figure\s+(.*?)-?%\}/g)) {
      const args = [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)].map((a) => a[1] ?? a[2]);
      const [src, alt] = args;
      if (!src) err(lineOfBody(i), "{% figure %} に画像のパスがありません");
      else checkImageFile(src, lineOfBody(i));
      if (!alt || !alt.trim()) err(lineOfBody(i), `{% figure %} の画像 ${src ?? ""} に代替テキストがありません`);
      else checkAltLength(alt, lineOfBody(i));
    }
  });

  // TODO が残っていないか（ファイル全体）
  lines.forEach((l, i) => {
    const idx = l.indexOf("TODO:");
    if (idx !== -1) {
      const note = l.slice(idx).replace(/["']?\s*$/, "").slice(0, 60);
      err(i + 1, `TODO が残っています：${note}`);
    }
  });

  // 行番号順に並べる（ファイル全体に関わるもの＝行番号なし は先頭）
  const byLine = (a, b) => (a.line ?? 0) - (b.line ?? 0);
  return { errors: errors.sort(byLine), warnings: warnings.sort(byLine) };

  function checkImageFile(src, line) {
    if (/^https?:\/\//.test(src)) {
      warn(line, `外部の画像 ${src} は使えません（記事フォルダに写真を置いてください）`);
      return;
    }
    if (!fs.existsSync(path.join(articleDir, src))) err(line, `画像ファイルが見つかりません：${src}`);
  }

  function checkAltLength(alt, line) {
    const len = [...alt.trim()].length;
    if (/^(写真|画像|image|photo|手順\s*\d*)$/i.test(alt.trim())) {
      err(line, `代替テキスト「${alt}」では写真の内容がわかりません`);
    } else if (len < 8) {
      warn(line, `代替テキスト「${alt}」が短すぎるかもしれません（写っているものを具体的に）`);
    }
  }
}

// ── 実行 ──────────────────────────────────────
function main() {
  const only = process.argv.slice(2);
  const slugs = fs
    .readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((s) => only.length === 0 || only.includes(s))
    .sort();

  if (only.length && slugs.length === 0) {
    console.error(`記事が見つかりません：${only.join(", ")}`);
    process.exit(1);
  }

  let errorCount = 0;
  let warningCount = 0;
  const report = [];

  for (const slug of slugs) {
    const dir = path.join(ARTICLES_DIR, slug);
    const file = path.join(dir, "index.md");
    const rel = file.split(path.sep).join("/");
    if (!fs.existsSync(file)) {
      report.push({ rel, errors: [{ line: null, message: "index.md がありません" }], warnings: [] });
      errorCount++;
      continue;
    }
    const { errors, warnings } = checkArticle(slug, fs.readFileSync(file, "utf8"), dir);
    errorCount += errors.length;
    warningCount += warnings.length;
    report.push({ rel, errors, warnings });
  }

  console.log(`\n記事のチェック（${slugs.length} 本）\n`);
  for (const { rel, errors, warnings } of report) {
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`  OK  ${rel}`);
      continue;
    }
    const mark = errors.length ? "NG" : "OK";
    console.log(`  ${mark}  ${rel}`);
    const fmt = (line) => (line ? `${rel}:${line}`.padEnd(rel.length + 5) : " ".repeat(rel.length + 5));
    for (const e of errors) console.log(`      エラー  ${fmt(e.line)}  ${e.message}`);
    for (const w of warnings) console.log(`      注意    ${fmt(w.line)}  ${w.message}`);
  }
  console.log(`\nエラー ${errorCount} 件／注意 ${warningCount} 件`);

  if (errorCount > 0) {
    console.log("エラーを直してから公開してください。\n");
    process.exit(1);
  }
  console.log("公開できる状態です。\n");
}

// import されたときは実行しない（テストなどで checkArticle だけ使えるように）
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
