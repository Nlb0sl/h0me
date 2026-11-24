# h0me.

静的な個人サイト。ビルド不要。

- `index.html`: 名前、リンク、作品の表示。
- `styles/site.css`: レイアウトと色。
- `scripts/teapot.js`: Three.js の Utah teapot と文字のインスタンス描画。
- `scripts/teapot-layout.js`: 文字の配置、密度、回転速度。
- `assets/photos/teapot.svg`: WebGLが利用できない場合の静止画。

Three.js r180 を固定バージョンで CDN から読み込む（MIT）。ティーポットの形状データは同ライブラリの TeapotGeometry / Martin Newell の Utah teapot に由来する。ライセンスは [licenses/three.txt](licenses/three.txt) を参照。

ローカルで `python -m http.server 8000` を実行し http://localhost:8000 を開く。

公開: GitHub Pages / main / (root)。
