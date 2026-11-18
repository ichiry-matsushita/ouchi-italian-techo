---
description: 原稿フォルダ（draft.txt と写真）から、テンプレートに沿った記事ファイルを作る
argument-hint: drafts/<原稿フォルダ>
allowed-tools: Read, Write, Glob, Bash(node scripts/import-photos.js:*), Bash(npm run check:articles), Bash(npm run build), Bash(ls:*)
---

原稿フォルダ `$ARGUMENTS` から、このサイトの記事を1本作ってください。
手順は次のとおりです。途中で止める条件に当てはまったら、何も書き込まずに理由を伝えて止まってください。

## 1. 準備（読むだけ）

1. `$ARGUMENTS` が空なら、「使い方：`/new-article drafts/<原稿フォルダ>`」と伝えて止まる。
2. `$ARGUMENTS/draft.txt` を読む。なければ止まる。
3. `$ARGUMENTS` の中の写真（.jpg / .jpeg / .png / .webp）を一覧にする。HEIC があれば「JPG に書き出してから置いてください」と伝えて止まる。
4. 変換ルール `prompts/convert-article.md` を読む。
5. 見本の記事 `src/articles/cacio-e-pepe/index.md` を読む。
6. ルールの「4. スラッグ」に沿ってスラッグを決める。`src/articles/<スラッグ>/` がすでにあれば止まる（上書きしない）。

## 2. 写真の取り込み

次のコマンドで、写真のメタデータ（位置情報など）を消しながら記事フォルダにコピーする。

```
node scripts/import-photos.js $ARGUMENTS src/articles/<スラッグ>
```

- 出力された JSON で、`01.jpg` `02.jpg` … とコピー元の対応を確認する。
- コピーした写真（`src/articles/<スラッグ>/images/*.jpg`）を1枚ずつ見て、何が写っているかを確かめる。代替テキストと、どの手順の写真かの判断に使う。
- 原稿フォルダの写真を直接コピーしたり、ほかの方法で動かしたりしない。

## 3. 記事ファイルを書く

`prompts/convert-article.md` のルールに沿って `src/articles/<スラッグ>/index.md` を書く。

特に次を守る：
- 原稿に書かれていない分量・時間・人数などは作らず、`TODO:` で残す
- 部品は「lead → ingredients → steps → point → summary」の順に1回ずつ
- です・ます調、短い文、1文1行
- すべての写真に具体的な代替テキスト

## 4. 確認

1. `npm run check:articles` を実行する。
   - `TODO:` 以外の問題（見出しの順番、代替テキストなど）が出たら、この記事の中だけ直して、もう一度実行する。ほかの記事は直さない。
2. `npm run build` を実行して、エラーなくページが作られることを確かめる。

## 5. 報告

`prompts/convert-article.md` の「7. 変換が終わったら」の5項目を、短く箇条書きで伝える。
最後に次の2点を添える：
- 記事のURL：`/articles/<スラッグ>/`
- 開発サーバー（`npm start`）を動かしている場合は、一度止めてから起動し直すと新しい記事が表示されること（Windows で動かす Eleventy 3.1 の不具合のため）
