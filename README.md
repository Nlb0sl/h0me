# h0me.

写真だけの静的サイト。HTML / CSS / ES Modules。ビルド・npm不要。

## 編集とプレビュー

VS Codeでフォルダを開き、推奨拡張機能 Microsoft Live Preview をインストール。
index.html を開き、コマンドパレットの Live Preview: Show Preview から HTTP プレビューを開始。
file:// で直接開くと ES Modules が動かないことがある。

## 写真の追加

1. assets/photos/ に JPG、PNG、WebP などを入れる。
2. scripts/data/photos.js の photos に追加する。例:

```js
{ src: new URL("../../assets/photos/my-photo.webp", import.meta.url).href, alt: "写真の説明" },
```

3. 最初の写真を変更したら index.html の img の src と alt も変更すると JS 無効時にも表示される。

sample-01〜03.svg は動作確認用の抽象的な仮画像。自分の写真で置き換える。
左右キー、マウスを乗せたときの矢印、スマホのスワイプで切り替え。
autoplayMs を 5000 などにすると自動再生。標準は手動。
styles/main.css の --photo-fit を contain にすると全体表示、cover にすると画面いっぱいに表示。

## 公開

GitHub Pages の Settings → Pages で main / (root) を指定。

```sh
git add .
git commit -m "Update photos"
git push
```
