/* ============================================================
 * export.js — PNG/PDF出力とプレビューモーダル
 * ------------------------------------------------------------
 * 担当範囲:
 *   - 配置済みグリッドを Canvas に再描画(buildGridCanvas)
 *   - プレビューモーダルの開閉
 *   - PNG保存(ダウンロードリンクとして提供)
 *   - PDF保存(jsPDF経由)
 *
 * バグを直すならまずここを見る:
 *   - 「保存した画像のレイアウトが画面と違う」→ buildGridCanvas()
 *   - 「PDFのサイズが意図と違う」→ savePDF() の pxToMm 換算
 *   - 「プレビューが開かない/閉じない」→ exportGrid() と closePreview()
 * ============================================================ */

(function() {
  const S = window.GC.state;
  const showToast = window.GC.showToast;
  const isMobile = window.GC.isMobile;

  // ===== Canvas にグリッドを再描画 =====
  async function buildGridCanvas() {
    const BASE_CELL_W = 400;
    const cellW = BASE_CELL_W;
    const baseCellH = Math.round(cellW * (S.grid.ratioH / S.grid.ratioW));

    let rowHeights = Array(S.grid.rows).fill(baseCellH);

    // auto-heightモード: 各行の画像の最大高さに合わせる
    if (S.fitMode === 'auto-height') {
      const imgCache = {};
      for (let i = 0; i < S.cells.length; i++) {
        if (!S.cells[i]) continue;
        const item = S.library.find(l => l.id === S.cells[i]);
        if (!item) continue;
        if (!imgCache[S.cells[i]]) {
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = item.dataUrl; });
          imgCache[S.cells[i]] = img;
        }
      }
      for (let row = 0; row < S.grid.rows; row++) {
        let maxH = 0;
        for (let col = 0; col < S.grid.cols; col++) {
          const idx = row * S.grid.cols + col;
          if (!S.cells[idx]) continue;
          const img = imgCache[S.cells[idx]];
          if (!img) continue;
          const h = Math.round(cellW * img.naturalHeight / img.naturalWidth);
          if (h > maxH) maxH = h;
        }
        rowHeights[row] = maxH > 0 ? maxH : baseCellH;
      }
    }

    const totalW = cellW * S.grid.cols + S.grid.gap * (S.grid.cols - 1);
    const totalH = rowHeights.reduce((s, h) => s + h, 0) + S.grid.gap * (S.grid.rows - 1);

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, totalW, totalH);

    const rowY = [];
    let yAcc = 0;
    for (let r = 0; r < S.grid.rows; r++) {
      rowY[r] = yAcc;
      yAcc += rowHeights[r] + S.grid.gap;
    }

    for (let i = 0; i < S.cells.length; i++) {
      const col = i % S.grid.cols;
      const row = Math.floor(i / S.grid.cols);
      const x = col * (cellW + S.grid.gap);
      const y = rowY[row];
      const cH = rowHeights[row];

      if (S.cells[i]) {
        const item = S.library.find(l => l.id === S.cells[i]);
        if (item) {
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = item.dataUrl; });

          if (S.fitMode === 'contain' || S.fitMode === 'auto-height') {
            // contain: 余白あり
            const iR = img.naturalWidth / img.naturalHeight;
            const cR = cellW / cH;
            let dw, dh, dx, dy;
            if (iR > cR) {
              dw = cellW; dh = Math.round(cellW / iR);
              dx = x; dy = y + Math.round((cH - dh) / 2);
            } else {
              dh = cH; dw = Math.round(cH * iR);
              dx = x + Math.round((cellW - dw) / 2); dy = y;
            }
            ctx.fillStyle = '#0a0909';
            ctx.fillRect(x, y, cellW, cH);
            ctx.drawImage(img, dx, dy, dw, dh);
          } else {
            // cover: トリミング
            const iR = img.naturalWidth / img.naturalHeight;
            const cR = cellW / cH;
            let sw, sh, sx, sy;
            if (iR > cR) {
              sh = img.naturalHeight; sw = sh * cR;
              sx = (img.naturalWidth - sw) / 2; sy = 0;
            } else {
              sw = img.naturalWidth; sh = sw / cR;
              sx = 0; sy = (img.naturalHeight - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cH);
          }
        }
      } else {
        ctx.fillStyle = '#1a1917';
        ctx.fillRect(x, y, cellW, cH);
      }
    }
    return canvas;
  }

  // ===== プレビューモーダルを表示して保存準備 =====
  async function exportGrid() {
    const filled = S.cells.filter(c => c !== null).length;
    if (filled === 0) { showToast('グリッドに画像を配置してください'); return; }

    showToast('レンダリング中...');

    const canvas = await buildGridCanvas();
    const dataUrl = canvas.toDataURL('image/png');

    document.getElementById('preview-img').src = dataUrl;

    const ts = new Date();
    const defaultName = `gridcut_${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}`;
    document.getElementById('filename-input').value = defaultName;

    updateSaveLink(dataUrl, defaultName);

    document.getElementById('filename-input').oninput = e => {
      updateSaveLink(dataUrl, e.target.value || 'gridcut');
    };

    const hint = document.getElementById('save-hint');
    if (isMobile()) {
      hint.innerHTML = `📱 <strong>PNG</strong>：画像を長押し → 「写真に保存」または💾ボタン<br>📄 <strong>PDF</strong>：PDF保存ボタンで直接ダウンロード`;
    } else {
      hint.innerHTML = `🖥️ <strong>PNG</strong>：💾ボタンでダウンロード / 右クリック → 名前を付けて保存<br>📄 <strong>PDF</strong>：PDF保存ボタンで直接ダウンロード`;
    }

    document.getElementById('preview-modal').classList.add('open');
  }

  function updateSaveLink(dataUrl, name) {
    const link = document.getElementById('save-link');
    link.href = dataUrl;
    link.download = (name || 'gridcut').replace(/\.png$/i, '') + '.png';
  }

  // ===== PDF保存 =====
  function savePDF() {
    const dataUrl = document.getElementById('preview-img').src;
    if (!dataUrl || dataUrl === window.location.href) { showToast('先にプレビューを生成してください'); return; }

    if (!window.jspdf) { showToast('jsPDFの読み込み中です。少し待って再試行してください'); return; }

    const name = (document.getElementById('filename-input').value || 'gridcut').replace(/\.pdf$/i, '');
    const { jsPDF } = window.jspdf;

    const img = new Image();
    img.onload = () => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      const isLandscape = imgW > imgH;
      const orientation = isLandscape ? 'landscape' : 'portrait';

      // 96dpi基準で px → mm 換算(画像サイズ=ページサイズで余白なし)
      const pxToMm = px => px * 25.4 / 96;
      const mmW = pxToMm(imgW);
      const mmH = pxToMm(imgH);

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [mmW, mmH],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, mmW, mmH, '', 'FAST');
      pdf.save(name + '.pdf');
      showToast('PDFを保存しました！');
    };
    img.src = dataUrl;
  }

  // ===== モーダル閉じる =====
  function closePreview() {
    document.getElementById('preview-modal').classList.remove('open');
  }

  // ===== モーダル関連のイベント登録 =====
  function initExportEvents() {
    document.getElementById('modal-close-btn').addEventListener('click', closePreview);
    document.getElementById('modal-cancel-btn').addEventListener('click', closePreview);
    document.getElementById('save-pdf-btn').addEventListener('click', savePDF);
    document.getElementById('preview-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('preview-modal')) closePreview();
    });
  }

  // 公開API
  window.GC.exportMod = {
    buildGridCanvas, exportGrid, savePDF, closePreview, initExportEvents,
  };

  // インラインonclick用
  window.exportGrid = exportGrid;
  window.savePDF = savePDF;
})();
