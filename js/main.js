/* ============================================================
 * main.js — アプリの起動
 * ------------------------------------------------------------
 * 担当範囲:
 *   - DOMContentLoaded のタイミングで各モジュールの初期化関数を呼ぶ
 *
 * ※ ここに新しい機能ロジックは書かない。
 *    機能を増やすときは:
 *      - 新しい js/xxx.js を作って window.GC.xxx に公開する
 *      - index.html に <script src="js/xxx.js"></script> を追加する
 *      - 必要ならここで init を呼ぶ
 * ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 各モジュールのイベント登録
  window.GC.slice.initSliceEvents();
  window.GC.library.initMultiEvents();
  window.GC.exportMod.initExportEvents();

  // グリッドの初期化(空セル状態で描画)
  window.GC.grid.initGrid();
});
