#!/usr/bin/env node
// 原稿フォルダの写真を記事フォルダにコピーする。
//
//   node scripts/import-photos.js <原稿フォルダ> <記事フォルダ>
//   例）node scripts/import-photos.js drafts/2026-11-amatriciana src/articles/amatriciana
//
// コピーするときに次を行う：
//   - 位置情報（GPS）・撮影機材などのメタデータをすべて削除する
//     （リポジトリを GitHub で公開するため、リポジトリに入る写真の時点で消しておく）
//   - スマホ写真の向き情報を画素に反映してから削除する（横倒しにならないように）
//   - 長辺を 2000px までに縮小する（リポジトリを軽くするため。公開用の WebP はビルド時に別途作る）
//   - ファイル名は番号順を保ったまま 01.jpg, 02.jpg … にそろえる
//
// 結果は JSON で標準出力に書き出す（/new-article コマンドが読み取る）。

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , draftDir, articleDir] = process.argv;
if (!draftDir || !articleDir) {
  console.error("使い方: node scripts/import-photos.js <原稿フォルダ> <記事フォルダ>");
  process.exit(1);
}
if (!fs.existsSync(draftDir)) {
  console.error(`原稿フォルダが見つかりません: ${draftDir}`);
  process.exit(1);
}

// iPhone の HEIC は sharp の標準ビルドで読めないため、JPG に書き出してから置く
const PHOTO = /\.(jpe?g|png|webp)$/i;
// ファイル名に含まれる最初の数字で並べる（01.jpg, 2.jpg, 10.jpg も正しい順になる）
const numberOf = (name) => {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
};

const photos = fs
  .readdirSync(draftDir)
  .filter((f) => PHOTO.test(f))
  .sort((a, b) => numberOf(a) - numberOf(b) || a.localeCompare(b));

const outDir = path.join(articleDir, "images");
fs.mkdirSync(outDir, { recursive: true });

const result = [];
for (const [i, name] of photos.entries()) {
  const outName = `${String(i + 1).padStart(2, "0")}.jpg`;
  const outPath = path.join(outDir, outName);
  const input = sharp(path.join(draftDir, name));
  const before = await input.metadata();

  await input
    .rotate() // 向き情報を画素に反映
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true }) // withMetadata() を呼ばないのでメタデータは書き出されない
    .toFile(outPath);

  const after = await sharp(outPath).metadata();
  const clean = !after.exif && !after.xmp && !after.iptc;
  if (!clean) {
    console.error(`メタデータを削除できませんでした: ${outPath}`);
    process.exit(1);
  }

  result.push({
    source: name,
    file: `./images/${outName}`,
    role: i === 0 ? "eyecatch" : "step",
    hadLocation: hasGps(before),
    width: after.width,
    height: after.height,
  });
}

console.log(JSON.stringify({ articleDir, photos: result }, null, 2));

// EXIF の中に GPS の IFD があるかをざっくり判定する（報告用。削除の判定には使わない）
function hasGps(meta) {
  if (!meta.exif) return false;
  // GPS IFD ポインタのタグ番号 0x8825 がリトルエンディアン／ビッグエンディアンで含まれているか
  const buf = meta.exif;
  for (let i = 0; i < buf.length - 1; i++) {
    if ((buf[i] === 0x25 && buf[i + 1] === 0x88) || (buf[i] === 0x88 && buf[i + 1] === 0x25)) return true;
  }
  return false;
}
