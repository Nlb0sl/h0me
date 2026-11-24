# h0me.

静的な個人サイト。HTML / CSS / JavaScript（Canvas 2D）のみ。

- `index.html`: ヘッダー、メイン、フッター。
- `styles/site.css`: レイアウトと配色。
- `scripts/clouds.js`: 丸いドットで構成する3層の雲、段階的な陰影、自動生成と移動。外部ライブラリ不使用。
- `assets/clouds.svg`: 以前の固定背景（現在未使用）。

初期の雲は固定シードから生成し、同じ画面サイズでの再読み込みでも構図を維持する。画面外から入る雲は順次生成する。3層の移動速度は clouds.js の speed（CSS px/秒）で調整できる。アニメーション中は生成済みのキャンバスを再利用し、非表示タブと視覚効果を減らす設定では移動を停止する。

ローカルでは `python -m http.server 8000` を実行し http://localhost:8000 を開く。

公開: GitHub Pages / main / (root)。
