// ここに写真を追加。URLはこのファイルからの相対パス。
export const photos = [
  { src: new URL("../../assets/photos/sample-01.svg", import.meta.url).href, alt: "仮の画像 1" },
  { src: new URL("../../assets/photos/sample-02.svg", import.meta.url).href, alt: "仮の画像 2" },
  { src: new URL("../../assets/photos/sample-03.svg", import.meta.url).href, alt: "仮の画像 3" },
];

// 0 = 手動のみ。5000 = 5秒ごとに自動切り替え。
export const autoplayMs = 0;
