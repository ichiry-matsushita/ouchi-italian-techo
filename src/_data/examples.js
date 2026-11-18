// 「このサイトの仕組み」ページ用：原稿（drafts/）と、そこから作った記事ファイルを読み込む。
// ビルドのたびに実際のファイルを読むので、記事を作り直すとページの中身も自動で変わる。
import fs from "node:fs";
import path from "node:path";

const DRAFTS_DIR = "drafts";
const ARTICLES_DIR = "src/articles";

export default function () {
  if (!fs.existsSync(DRAFTS_DIR)) return [];

  return fs
    .readdirSync(DRAFTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const folder = d.name;
      const slug = folder.replace(/^\d{4}-\d{2}(-\d{2})?-/, "");
      const draftPath = path.join(DRAFTS_DIR, folder, "draft.txt");
      const articlePath = path.join(ARTICLES_DIR, slug, "index.md");
      if (!fs.existsSync(draftPath) || !fs.existsSync(articlePath)) return null;

      const draft = fs.readFileSync(draftPath, "utf8").replace(/\r\n/g, "\n").trim();
      const article = fs.readFileSync(articlePath, "utf8").replace(/\r\n/g, "\n").trim();
      const title = article.match(/^title:\s*"(.*)"/m)?.[1] ?? slug;
      const photos = fs
        .readdirSync(path.join(DRAFTS_DIR, folder))
        .filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length;

      return {
        folder,
        slug,
        title,
        url: `/articles/${slug}/`,
        draft,
        article,
        photos,
        draftChars: [...draft.replace(/\s/g, "")].length,
        draftLines: draft.split("\n").length,
        articleLines: article.split("\n").length,
      };
    })
    .filter(Boolean);
}
