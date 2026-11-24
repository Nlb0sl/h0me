# h0me.

静的な個人サイト。HTML / CSS / JavaScript。WebGL2 による雲描画と Canvas 2D のフォールバック。

- `index.html`: ヘッダー、メイン、フッター。
- `styles/site.css`: レイアウトと配色。
- `scripts/cloud-runtime.js`: 共通の描画座標、診断モード、アニメーション制御。
- `scripts/clouds.js`: 丸いドットで構成する3層の雲、段階的な陰影、自動生成と移動。外部ライブラリ不使用。
- `assets/clouds.svg`: 以前の固定背景（現在未使用）。

初期の雲は固定シードから生成し、すべての端末で 1920 × 1080 の論理座標を使用する。画面の縦横比に合わせて中央から切り抜く（引き伸ばしなし）。GPU 描画は 1440 × 810 に固定。縦長画面では左右が見切れる。WebGL2 が利用できない場合は Canvas 2D に切り替わるため、レンダラー間の雲形状は異なる。画面外から入る雲は順次生成する。3層の移動速度は clouds.js の speed（論理 px/秒）で調整できる。アニメーション中は生成済みのキャンバスを再利用し、非表示タブと視覚効果を減らす設定では移動を停止する。

ローカルでは `python -m http.server 8000` を実行し http://localhost:8000 を開く。

公開: GitHub Pages / main / (root)。

## Volumetric clouds

`scripts/volumetric-clouds.js` uses Takram's three-clouds with Three.js and postprocessing, then maps the cloud buffer to a circular halftone. WebGL2 and network access to the pinned CDN modules and upstream textures are required. The existing Canvas 2D generator remains the fallback. See [third-party notices](THIRD_PARTY_NOTICES.md). No npm or build step is required.
