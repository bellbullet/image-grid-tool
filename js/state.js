/* ============================================================
 * state.js — グローバル状態の管理
 * ------------------------------------------------------------
 * このファイルが扱うもの:
 *   - library         : 追加された画像の一覧
 *   - grid            : 列数/行数/比率/ギャップ
 *   - cells           : グリッドの各セルに何の画像が入っているか
 *   - sliceLines      : カット時の分割線の位置(%)
 *   - sliceImg        : カット対象の元画像
 *   - autoN           : 自動分割の等分数
 *   - fitMode         : 画像フィットモード(cover/contain/auto-height)
 *   - zoomLevel       : グリッド表示のズーム倍率
 *   - draggingThumb   : ドラッグ中のサムネのID
 *   - draggingCell    : ドラッグ中のセルのインデックス
 *   - libIdCounter    : ライブラリのID採番
 *
 * すべて window.GC 名前空間にぶら下げて、他ファイルから参照できるようにする。
 * ============================================================ */

window.GC = window.GC || {};

window.GC.state = {
  library: [],
  grid: { cols: 3, rows: 4, ratioW: 4, ratioH: 6, gap: 4 },
  cells: [],
  zoomLevel: 1.0,
  sliceLines: [],
  sliceImg: null,
  autoN: 4,
  draggingThumb: null,
  draggingCell: null,
  libIdCounter: 0,
  fitMode: 'cover', // 'cover' | 'contain' | 'auto-height'
};

// ===== トースト通知(他ファイルからも呼ばれる汎用ユーティリティ) =====
window.GC.showToast = function(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
};

// ===== モバイル判定 =====
window.GC.isMobile = function() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};
