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

## GLSL シェーダー

WebGL 2 / GLSL ES 3.00 を使用。外部ライブラリ不要。
`shaders/photo.frag` を編集すると、表示中の写真にエフェクトをかけられる。
標準は薄いフィルムグレイン。Live Preview の再読み込みで反映する。
GLSL コンパイルエラーはブラウザの開発者ツールの Console で確認。
GPU非対応・初期化失敗の場合は元のHTML画像が表示される。

- `v_uv`: 0〜1の画面座標（左下原点）
- `u_photo`: 現在の写真（sampler2D）
- `u_resolution`: キャンバス解像度
- `u_photoResolution`: 写真テクスチャ解像度
- `u_time`: 経過秒
- `u_mouse`: 正規化したマウス座標（左下原点）
- `photoUV(v_uv)`: cover / contain 補正済みUV
- `scripts/data/shader.js`: 有効/無効、連続描画、解像度の設定

`shaders/fullscreen.vert` は全画面描画用。通常は編集不要。
アニメーション不要なら animated: false で連続描画を止める。

## 公開

GitHub Pages の Settings → Pages で main / (root) を指定。

```sh
git add .
git commit -m "Update photos"
git push
```
