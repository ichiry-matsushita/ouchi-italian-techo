// src/articles/<スラッグ>/index.md すべてに適用される共通設定
export default {
  layout: "layouts/article.njk",
  permalink: (data) => `/articles/${data.page.fileSlug}/`,
};
