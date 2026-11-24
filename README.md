# h0me.

静的な個人サイト。トップページは HTML / CSS のみ。
ビルド、npm、外部CDN、音声入力は不要。

## 編集
- `index.html`: トップページ、名前、リンク、回転するグラフィック。
- `styles/site.css`: レイアウト、配色、アニメーション。
- `shaders/` と `scripts/components/`: 将来再利用できる写真・WebGL用の部品（トップでは読み込まない）。

## プレビュー
VS Codeの Live Preview を利用するか、プロジェクトルートで `python -m http.server 8000` を実行し http://localhost:8000 を開く。

公開: GitHub Pages / main / (root)。
