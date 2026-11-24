# h0me.

個人サイト。HTML / CSS / JavaScriptだけで自由に作る。

## ローカル開発

```sh
git clone https://github.com/Nlb0sl/h0me.git
cd h0me
code .
```

1. VS Codeの推奨拡張機能から Microsoft Live Preview (`ms-vscode.live-server`) をインストール。
2. `index.html` を開き、エディター右上のプレビューアイコンを押す（またはコマンドパレットで `Live Preview: Show Preview` を検索）。
3. HTML・CSSを編集するとプレビューが自動更新される。公開用のビルドやnpm installは不要。

## 公開

GitHub PagesのSettings → Pagesで `main` / `/ (root)` を選択。サイト内の画像やCSSへのリンクは `./` から始まる相対パスを使う。

```sh
git add .
git commit -m "Update website"
git push
```
