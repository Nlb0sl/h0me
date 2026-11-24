# h0me.

静的HTMLとネイティブJavaScript（ES Modules）による個人サイト。
フレームワーク、npm、ビルド、サーバー側処理は不要。

## ローカル開発

```sh
git clone https://github.com/Nlb0sl/h0me.git
cd h0me
code .
```

すでにclone済みなら `git pull` で更新。
推奨拡張機能 Microsoft Live Preview (ms-vscode.live-server) をインストールし、index.html を開いて右上のプレビューアイコンを押す。編集に合わせてプレビューが更新される。
ES Modules を使うので file:// で直接開かず、Live Preview の HTTP サーバーを使う。

## 構成

- index.html: トップページ
- pages/: 独立した静的HTMLページ
- styles/tokens.css: 色・デザイントークン
- styles/main.css: 共通スタイル
- scripts/main.js: JSコンポーネントの登録・起動
- scripts/components/: UI単位のJSモジュール
- assets/: 画像・音声など

## ページを増やす

pages/notes/index.html をコピーし、タイトル、本文、相対パスを調整する。
トップページに通常の a タグでリンクを追加する。ページ間移動はブラウザ標準のナビゲーションを使用する。

## JS機能を増やす

scripts/components/hello.js などを作成する。

```js
export function mount(element) {
  element.textContent = "Hello!";
}
```

scripts/main.js の components に `hello: () => import("./components/hello.js")` を追加する。
HTMLに `<div data-component="hello"></div>` を置く。
JSなしでも本文とリンクを利用できるようにする。JSが不要なページではscriptを省略してもよい。

## 公開

GitHub Pages: Settings → Pages → main / (root)。
プロジェクトサイトなのでルート絶対パスではなく、HTMLの位置からの相対パスを使う。

```sh
git add .
git commit -m "Update website"
git push
```
