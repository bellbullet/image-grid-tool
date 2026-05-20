# image-grid-tool

縦長画像をカットして、自動でグリッド配置するツール。

🌐 [image-grid-tool.vercel.app](https://image-grid-tool.vercel.app)

---

## 📁 ファイル構成

```
image-grid-tool/
├── index.html ← HTML本体(構造とボタンだけ)
├── jspdf.umd.min.js ← PDF生成ライブラリ(さわらない)
├── css/
│ └── style.css ← 見た目すべて
└── js/
├── state.js ← 共有状態とユーティリティ
├── slice.js ← 1枚画像のカット機能
├── library.js ← ライブラリ(画像一覧)
├── grid.js ← グリッド表示・自動配置
├── export.js ← PNG/PDF保存
└── main.js ← 起動スクリプト
```

---

## 🔧 機能とファイルの対応表

「ここをいじりたい」と思ったらこの表を見る。

| やりたいこと / バグの症状 | 開くファイル | 関数 |
|---|---|---|
| **カット系** | | |
| 分割線をドラッグしたら別の線が動く | `js/slice.js` | `renderSliceLines` のドラッグハンドラ |
| 分割線が削除できない | `js/slice.js` | `renderSliceLines` の `doDelete` |
| 自動分割(N等分)の挙動を変えたい | `js/slice.js` | `applyAutoSlice` |
| クリックで分割線が追加されない | `js/slice.js` | `initSliceEvents` の click ハンドラ |
| カット結果のサイズが変 | `js/slice.js` | `applySlices` |
| カット元の画像読み込み | `js/slice.js` | `loadSliceImage` |
| **ライブラリ系** | | |
| サムネが出ない / 重複する | `js/library.js` | `renderLibrary` |
| 画像をクリックして配置されない | `js/library.js` | `placeInFirstEmpty` |
| 全削除ボタンの挙動 | `js/library.js` | `clearLibrary` |
| 複数枚一括追加 | `js/library.js` | `loadMultiImages` |
| **グリッド系** | | |
| 自動配置の列数が変 | `js/grid.js` | `autoFill` |
| 比率変えても見た目変わらない | `js/grid.js` | `renderGrid`(`cellW`/`cellH`計算) |
| ドラッグでセルが入れ替わらない | `js/grid.js` | `renderGrid` の `drop` ハンドラ |
| ギャップ・列数・行数 | `js/grid.js` | `setGap` / `adjCols` / `adjRows` |
| フィットモード(クロップ/余白/高さ合わせ) | `js/grid.js` | `setFitMode` |
| ズームが効かない | `js/grid.js` | `zoom` / `zoomFit` |
| **保存系** | | |
| 保存した画像が画面と違う | `js/export.js` | `buildGridCanvas` |
| PDFのサイズが意図と違う | `js/export.js` | `savePDF`(`pxToMm`換算) |
| プレビューが開かない / 閉じない | `js/export.js` | `exportGrid` / `closePreview` |
| **見た目(色・余白・サイズ)** | `css/style.css` | — |
| **新しいボタンを追加** | `index.html` + 対応する `js/*.js` | — |

---

## 🛠 新しい機能を追加するときの手順

1. **HTMLに要素を追加** → `index.html`
2. **見た目を整える** → `css/style.css`
3. **ロジックを書く** → 該当する `js/*.js`(なければ新しく作る)
4. **新ファイルを作ったら**:
- `window.GC.xxx = { ... }` 形式で公開する
- `index.html` の `<script>` 並びに追加(`main.js` より前)
- 必要なら `main.js` の DOMContentLoaded で初期化を呼ぶ

---

## 📝 開発メモ

- すべての状態は `window.GC.state` に集約されている
- モジュール間の関数呼び出しは `window.GC.<モジュール名>.<関数名>()` 形式
- HTMLの `onclick="xxx()"` 用に、各モジュールは `window.xxx` にも公開している