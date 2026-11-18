export default {
  name: "おうちイタリアン手帖",
  description: "家で作るイタリア料理を、レシピと作るときのコツと一緒に紹介するコラムです。",
  lang: "ja",
  perPage: 9,
  // GitHub のリポジトリURL（ステップ8で公開したら入れる。空ならリンクを出さない）
  repoUrl: "https://github.com/ichiry-matsushita/ouchi-italian-techo",
  categories: [
    { name: "前菜", slug: "antipasto", note: "食事のはじまりに" },
    { name: "パスタ", slug: "pasta", note: "毎日でも食べたい" },
    { name: "メイン", slug: "secondo", note: "肉と魚の一皿" },
    { name: "ドルチェ", slug: "dolce", note: "食後のおたのしみ" },
  ],
};
