/* ============================================================
 * grid.js — グリッド表示・設定・自動配置
 * ------------------------------------------------------------
 * 担当範囲:
 *   - グリッドの描画(renderGrid)
 *   - 列数/行数/比率/ギャップ/フィットモードの調整
 *   - ズーム
 *   - 自動配置(autoFill) ※画像枚数に合わせて列・行を自動算出
 *   - グリッドクリア
 *   - セル間のドラッグ&ドロップ(入れ替え)
 *
 * バグを直すならまずここを見る:
 *   - 「自動配置の列数が変」→ autoFill()
 *   - 「比率変えても見た目が変わらない」→ renderGrid() の cellW/cellH 計算
 *   - 「ドラッグでセルが入れ替わらない」→ renderGrid() の drop ハンドラ
 *   - 「ズームが効かない」→ zoom()
 * ============================================================ */

(function() {
  const S = window.GC.state;
  const showToast = window.GC.showToast;

  // ===== 初期化 =====
  function initGrid() {
    const total = S.grid.cols * S.grid.rows;
    S.cells = Array(total).fill(null);
    renderGrid();
    updateInfo();
  }

  // ===== 列・行の調整 =====
  function adjCols(d) {
    S.grid.cols = Math.max(1, Math.min(10, S.grid.cols + d));
    document.getElementById('col-display').textContent = S.grid.cols;
    document.getElementById('info-cols').textContent = S.grid.cols;
    resizeCells();
  }

  function adjRows(d) {
    S.grid.rows = Math.max(1, Math.min(20, S.grid.rows + d));
    document.getElementById('row-display').textContent = S.grid.rows;
    document.getElementById('info-rows').textContent = S.grid.rows;
    resizeCells();
  }

  function resizeCells() {
    const total = S.grid.cols * S.grid.rows;
    if (S.cells.length < total) {
      S.cells = [...S.cells, ...Array(total - S.cells.length).fill(null)];
    } else {
      S.cells = S.cells.slice(0, total);
    }
    renderGrid();
    updateInfo();
  }

  // ===== 比率/ギャップ/フィットモード =====
  function setRatio(w, h, btn) {
    S.grid.ratioW = w; S.grid.ratioH = h;
    document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGrid();
  }

  function setGap(v) {
    S.grid.gap = parseInt(v);
    document.getElementById('gap-display').textContent = v;
    document.documentElement.style.setProperty('--grid-gap', v + 'px');
    renderGrid();
  }

  function setFitMode(mode, btn) {
    S.fitMode = mode;
    document.querySelectorAll('#fit-btns .ratio-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGrid();
  }

  // ===== グリッドの描画 =====
  function renderGrid() {
    const canvas = document.getElementById('grid-canvas');
    const emptyState = document.getElementById('empty-state');

    const total = S.grid.cols * S.grid.rows;
    if (S.cells.length !== total) {
      S.cells = Array(total).fill(null).map((_, i) => S.cells[i] || null);
    }

    canvas.style.display = 'grid';
    emptyState.style.display = 'none';

    const availW = Math.min(800, document.getElementById('grid-area').clientWidth - 48);
    const cellW = Math.floor((availW - S.grid.gap * (S.grid.cols - 1)) / S.grid.cols);
    const cellH = Math.round(cellW * (S.grid.ratioH / S.grid.ratioW));

    canvas.style.gridTemplateColumns = `repeat(${S.grid.cols}, ${cellW}px)`;
    if (S.fitMode === 'auto-height') {
      canvas.style.gridTemplateRows = `repeat(${S.grid.rows}, auto)`;
      canvas.classList.add('fit-auto-height');
    } else {
      canvas.style.gridTemplateRows = `repeat(${S.grid.rows}, ${cellH}px)`;
      canvas.classList.remove('fit-auto-height');
    }
    canvas.style.gap = S.grid.gap + 'px';
    canvas.style.transform = `scale(${S.zoomLevel})`;
    canvas.style.transformOrigin = 'top left';

    canvas.innerHTML = '';

    S.cells.forEach((imgId, idx) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.idx = idx;

      const imgItem = imgId ? S.library.find(l => l.id === imgId) : null;

      if (imgItem) {
        const img = document.createElement('img');
        img.src = imgItem.dataUrl;
        if (S.fitMode === 'contain') cell.classList.add('fit-contain');
        cell.appendChild(img);

        const badge = document.createElement('div');
        badge.className = 'cell-badge';
        badge.textContent = idx + 1;
        cell.appendChild(badge);

        const rm = document.createElement('button');
        rm.className = 'cell-remove';
        rm.textContent = '×';
        rm.onclick = e => { e.stopPropagation(); S.cells[idx] = null; renderGrid(); updateInfo(); };
        cell.appendChild(rm);
      } else {
        const emp = document.createElement('div');
        emp.className = 'cell-empty';
        emp.textContent = (idx + 1).toString().padStart(2, '0');
        cell.appendChild(emp);
      }

      // ----- ライブラリからのドロップ受け / セル同士の入れ替え -----
      cell.addEventListener('dragover', e => {
        e.preventDefault();
        cell.classList.add('drop-target');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drop-target'));
      cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('drop-target');
        if (S.draggingThumb) {
          S.cells[idx] = S.draggingThumb;
          renderGrid();
          updateInfo();
        } else if (S.draggingCell !== null && S.draggingCell !== idx) {
          [S.cells[S.draggingCell], S.cells[idx]] = [S.cells[idx], S.cells[S.draggingCell]];
          S.draggingCell = null;
          renderGrid();
          updateInfo();
        }
      });

      // ----- セルをドラッグ(並び替え) -----
      cell.draggable = true;
      cell.addEventListener('dragstart', e => {
        if (imgId) {
          S.draggingCell = idx;
          e.dataTransfer.effectAllowed = 'move';
        } else {
          e.preventDefault();
        }
      });

      canvas.appendChild(cell);
    });

    updateInfo();
  }

  // ===== ステータス表示更新 =====
  function updateInfo() {
    const total = S.grid.cols * S.grid.rows;
    const filled = S.cells.filter(c => c !== null).length;
    document.getElementById('info-cols').textContent = S.grid.cols;
    document.getElementById('info-rows').textContent = S.grid.rows;
    document.getElementById('info-filled').textContent = filled;
    document.getElementById('info-total').textContent = total;
  }

  // ===== 自動配置 =====
  // 画像の枚数とセル比率から、見た目が一番1:1に近くなる列×行を探して配置する
  function autoFill() {
    if (S.library.length === 0) { showToast('先にライブラリへ画像を追加してください'); return; }

    const n = S.library.length;

    let bestCols = 1, bestRows = n, bestScore = Infinity;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c);
      const displayW = c * S.grid.ratioW;
      const displayH = r * S.grid.ratioH;
      const ratio = displayW / displayH;
      const score = Math.abs(ratio - 1.0);
      if (score < bestScore) {
        bestScore = score;
        bestCols = c;
        bestRows = r;
      }
    }

    const cols = bestCols;
    const rows = bestRows;
    const total = cols * rows;

    S.grid.cols = cols;
    S.grid.rows = rows;
    document.getElementById('col-display').textContent = cols;
    document.getElementById('row-display').textContent = rows;

    S.cells = Array(total).fill(null);
    for (let i = 0; i < n; i++) {
      S.cells[i] = S.library[i].id;
    }

    renderGrid();
    updateInfo();
    const blank = total - n;
    showToast(`${n}枚を ${cols}列×${rows}行 に配置${blank > 0 ? `（空き${blank}マス）` : ''}`);
  }

  // ===== クリア =====
  function clearGrid() {
    S.cells = Array(S.grid.cols * S.grid.rows).fill(null);
    renderGrid();
    updateInfo();
    showToast('グリッドをクリアしました');
  }

  // ===== ズーム =====
  function zoom(delta) {
    S.zoomLevel = Math.max(0.3, Math.min(2.5, S.zoomLevel + delta));
    document.getElementById('zoom-display').textContent = Math.round(S.zoomLevel * 100) + '%';
    renderGrid();
  }

  function zoomFit() {
    S.zoomLevel = 1.0;
    document.getElementById('zoom-display').textContent = '100%';
    renderGrid();
  }

  // 公開API
  window.GC.grid = {
    initGrid, adjCols, adjRows, setRatio, setGap, setFitMode,
    renderGrid, updateInfo, autoFill, clearGrid, zoom, zoomFit,
  };

  // インラインonclick用
  window.adjCols = adjCols;
  window.adjRows = adjRows;
  window.setRatio = setRatio;
  window.setGap = setGap;
  window.setFitMode = setFitMode;
  window.autoFill = autoFill;
  window.clearGrid = clearGrid;
  window.zoom = zoom;
  window.zoomFit = zoomFit;
})();
