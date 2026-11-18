# おうちイタリアン手帖

家庭で作るイタリア料理を、レシピと作るときのコツと一緒に紹介するコラムサイトです。

> **ポートフォリオ用のデモサイトです。**
> Web制作の業務委託案件への応募用に、実際の業務で作った「AIで記事作成を自動化する仕組み」を、架空の内容で再現しています。

- 公開ページ：https://ichiry-matsushita.github.io/ouchi-italian-techo/
- 仕組みの紹介ページ：https://ichiry-matsushita.github.io/ouchi-italian-techo/how-it-works/

## このデモで見せたいこと

1. **記事ページのテンプレート化**
   どの記事も同じ部品・同じ順番（リード → 材料 → 手順 → ポイント → まとめ）で組まれ、見た目がそろいます。
2. **AIによる記事作成の自動化**
   料理の原稿（メモ書き程度のテキスト）と写真をフォルダに入れて Claude Code のコマンドを1つ実行すると、テンプレートに沿った記事ファイルが完成します。

## 作業時間の比較

| 作り方 | 1記事あたりの作業時間 |
|---|---|
| 人の手で作る | 約4時間 |
| この仕組み（AI）で作る | 約1時間 |

実際の業務で、この仕組みを使って短縮できた時間です。

## 使用技術

| 用途 | 技術 |
|---|---|
| 静的サイトジェネレーター | [Eleventy（11ty）](https://www.11ty.dev/) 3 |
| テンプレート | Nunjucks |
| スタイル | SCSS（`sass` を npm scripts でビルド） |
| 画像 | `@11ty/eleventy-img`（WebP 変換・リサイズ）、`sharp`（メタデータ削除） |
| JavaScript | なし（HTML と CSS だけで動作） |
| 記事の自動作成 | Claude Code のカスタムコマンド、変換ルールのプロンプト |
| チェック | Node.js のスクリプト |
| 公開 | GitHub Actions → GitHub Pages |
| パッケージ管理 | npm |

## 記事の追加手順

### 1. 原稿を置く

`drafts/` に記事1本につき1つフォルダを作り、原稿と写真を入れます（詳しくは [drafts/README.md](drafts/README.md)）。

```
drafts/
  2026-11-amatriciana/
    draft.txt   ← メモ書きの原稿（箇条書き・話し言葉でOK）
    01.jpg      ← 完成写真
    02.jpg      ← 手順の写真（あれば）
```

### 2. `/new-article` を実行する

Claude Code で次のコマンドを実行します。

```
/new-article drafts/2026-11-amatriciana
```

AI が次の作業を行います。

1. 原稿と写真を読み込む
2. 写真の位置情報などのメタデータを消して、記事フォルダにコピーする（`scripts/import-photos.js`）
3. 変換ルール（[prompts/convert-article.md](prompts/convert-article.md)）に沿って `src/articles/<スラッグ>/index.md` を作る
4. チェックスクリプトとビルドを実行し、結果を報告する

原稿に書かれていない分量や時間は、AI が推測で埋めずに `TODO:` として残します。

### 3. チェックする

```
npm run check:articles
```

全記事について次を確認し、問題があれば「どの記事の何行目か」を一覧で表示します。

- フロントマターの必須項目がそろっているか
- カテゴリが「前菜・パスタ・メイン・ドルチェ」のどれかか
- 見出しの順番がテンプレートどおりか
- 画像に代替テキストがあるか
- `TODO:` が残っていないか

`TODO:` を埋め、内容を確認します。

### 4. 公開する

`main` ブランチに push すると、GitHub Actions がチェックとビルドを行い、GitHub Pages に公開します。チェックでエラーがあると公開されません。

## 開発

```
npm install
npm start               # 開発サーバー（http://localhost:8080）
npm run build           # 本番用のビルド（_site/ に出力）
npm run check:articles  # 記事のチェック
```

> **Windows での注意**：Eleventy 3.1 の不具合で、開発サーバーを動かしたまま新しい記事フォルダを追加すると、サーバーを起動し直すまで表示されません。

## フォルダ構成

```
.claude/commands/new-article.md  記事を作るカスタムコマンド
prompts/convert-article.md       原稿 → 記事 の変換ルール
scripts/import-photos.js         写真の取り込み（メタデータ削除）
scripts/check-articles.js        記事のチェック
drafts/                          原稿の置き場所
src/articles/<スラッグ>/          記事（index.md と images/）
src/_includes/                   レイアウトと部品
src/pages/                       一覧・カテゴリ・仕組みのページ
src/scss/                        スタイル
lib/                             ショートコードと画像処理
```

## 制作について

このサイト自体も、[Claude Code](https://claude.com/claude-code) を使って制作しました。
指示書をもとに、プロジェクトの作成からデザイン、自動化の仕組み、公開までを Claude Code と進めています。
各ステップの作業時間は [WORKLOG.md](WORKLOG.md) に記録しています。

写真はすべて仮の画像です。デザイン・文言はすべてオリジナルです。
