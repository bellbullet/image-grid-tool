/* ============================================================
 * slice.js — 1枚画像のカット機能
 * ------------------------------------------------------------
 * 担当範囲:
 *   - 縦長画像の読み込み
 *   - 分割線の追加/移動/削除(マウス・タッチ両対応)
 *   - 自動分割(N等分)
 *   - 実際のカット処理 → ライブラリへ追加
 *
 * バグを直すならまずここを見る:
 *   - 「分割線をドラッグしたら別の線が動く」→ ドラッグハンドラ
 *   - 「カット位置が想定と違う」→ applySlices()
 *   - 「自動分割が等分にならない」→ applyAutoSlice()
 * ============================================================ */

(function() {
  const S = window.GC.state;
  const showToast = window.GC.showToast;

  // ===== 自動分割の等分数を調整 =====
  function adjAutoN(d) {
    S.autoN = Math.max(2, Math.min(20, S.autoN + d));
    document.getElementById('auto-n-display').textContent = S.autoN;
  }

  // ===== 自動分割を適用 =====
  function applyAutoSlice() {
    if (!S.sliceImg) { showToast('先に画像を読み込んでください'); return; }
    S.sliceLines = [];
    for (let i = 1; i < S.autoN; i++) {
      S.sliceLines.push(Math.round((i / S.autoN) * 1000) / 10);
    }
    renderSliceLines();
    showToast(`${S.autoN}等分の分割線を追加しました`);
  }

  // ===== ファイル選択から画像読み込み =====
  function loadSliceImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById('slice-img');
      img.src = e.target.result;
      S.sliceImg = { name: file.name, dataUrl: e.target.result };
      S.sliceLines = [];
      document.getElementById('slice-controls').classList.add('active');
      renderSliceLines();
    };
    reader.readAsDataURL(file);
  }

  // ===== 分割線の再描画 =====
  // ※ ドラッグ処理のバグ修正済み:
  //    旧コードは「現在値に近い要素」を sliceLines から探していたため、
  //    ドラッグ中に別の線とすれ違うと別の線を更新してしまっていた。
  //    現在は描画時のインデックス i を直接使う方式に変更している。
  function renderSliceLines() {
    const sliceWrap = document.getElementById('slice-wrap');
    sliceWrap.querySelectorAll('.slice-line').forEach(el => el.remove());

    S.sliceLines.forEach((pct, i) => {
      const line = document.createElement('div');
      line.className = 'slice-line';
      line.style.top = pct + '%';

      // ----- 削除ボタン -----
      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '×';
      const doDelete = e => {
        e.preventDefault();
        e.stopPropagation();
        S.sliceLines.splice(i, 1);
        renderSliceLines();
      };
      del.addEventListener('click', doDelete);
      del.addEventListener('touchend', doDelete);
      line.appendChild(del);

      // ----- ラベル -----
      const label = document.createElement('span');
      label.className = 'slice-line-label';
      label.textContent = `cut ${i+1}  ${pct.toFixed(1)}%`;
      line.appendChild(label);

      // ----- マウスドラッグ -----
      line.addEventListener('mousedown', e => {
        if (e.target === del) return;
        e.stopPropagation();
        e.preventDefault();
        const startY = e.clientY;
        const startPct = parseFloat(line.style.top);
        const rect = sliceWrap.getBoundingClientRect();

        const onMove = ev => {
          const delta = ((ev.clientY - startY) / rect.height) * 100;
          const newPct = Math.max(0.5, Math.min(99.5, startPct + delta));
          const rounded = Math.round(newPct * 10) / 10;
          // ドラッグ中はsortしないので、描画時のインデックスiが有効
          S.sliceLines[i] = rounded;
          line.style.top = rounded + '%';
          label.textContent = `cut ${i+1}  ${rounded.toFixed(1)}%`;
        };
        const onUp = () => {
          S.sliceLines.sort((a, b) => a - b);
          renderSliceLines();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // ----- タッチドラッグ -----
      line.addEventListener('touchstart', e => {
        if (e.target === del) return;
        e.stopPropagation();
        e.preventDefault();
        const touch = e.touches[0];
        const startY = touch.clientY;
        const startPct = parseFloat(line.style.top);
        const rect = sliceWrap.getBoundingClientRect();

        const onMove = ev => {
          const t = ev.touches[0];
          const delta = ((t.clientY - startY) / rect.height) * 100;
          const newPct = Math.max(0.5, Math.min(99.5, startPct + delta));
          const rounded = Math.round(newPct * 10) / 10;
          S.sliceLines[i] = rounded;
          line.style.top = rounded + '%';
          label.textContent = `cut ${i+1}  ${rounded.toFixed(1)}%`;
        };
        const onEnd = () => {
          S.sliceLines.sort((a, b) => a - b);
          renderSliceLines();
          line.removeEventListener('touchmove', onMove);
          line.removeEventListener('touchend', onEnd);
        };
        line.addEventListener('touchmove', onMove, { passive: false });
        line.addEventListener('touchend', onEnd);
      }, { passive: false });

      sliceWrap.appendChild(line);
    });
  }

  // ===== カットの実行 → ライブラリ追加 =====
  async function applySlices() {
    if (!S.sliceImg) return;
    const img = new Image();
    img.src = S.sliceImg.dataUrl;
    await new Promise(r => { img.onload = r; });

    // 念のためソート済みでカット(順序不正でも安全)
    const sortedLines = [...S.sliceLines].sort((a, b) => a - b);
    const cuts = [0, ...sortedLines.map(p => (p / 100) * img.height), img.height];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let added = 0;
    for (let i = 0; i < cuts.length - 1; i++) {
      const y0 = cuts[i], y1 = cuts[i + 1];
      const h = Math.round(y1 - y0);
      if (h < 2) continue;
      canvas.width = img.width;
      canvas.height = h;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, -y0);
      const dataUrl = canvas.toDataURL('image/png');
      window.GC.library.addToLibrary(`${S.sliceImg.name}_cut${i+1}`, dataUrl);
      added++;
    }

    showToast(`${added}枚のカットをライブラリへ追加しました`);
  }

  // ===== プレビュー画像のクリック(分割線追加)とドロップ受け =====
  function initSliceEvents() {
    const sliceWrap = document.getElementById('slice-wrap');

    sliceWrap.addEventListener('click', e => {
      if (e.target.closest('.slice-line')) return;
      const rect = sliceWrap.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      if (pct < 0.5 || pct > 99.5) return;
      S.sliceLines.push(Math.round(pct * 10) / 10);
      S.sliceLines.sort((a, b) => a - b);
      renderSliceLines();
    });

    const dzSlice = document.getElementById('dz-slice');
    dzSlice.addEventListener('dragover', e => { e.preventDefault(); dzSlice.classList.add('drag-over'); });
    dzSlice.addEventListener('dragleave', () => dzSlice.classList.remove('drag-over'));
    dzSlice.addEventListener('drop', e => {
      e.preventDefault();
      dzSlice.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => {
          const img = document.getElementById('slice-img');
          img.src = ev.target.result;
          S.sliceImg = { name: file.name, dataUrl: ev.target.result };
          S.sliceLines = [];
          document.getElementById('slice-controls').classList.add('active');
          renderSliceLines();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ===== タブ切り替え =====
  function switchTab(tab) {
    document.getElementById('tab-slice').classList.toggle('active', tab === 'slice');
    document.getElementById('tab-multi').classList.toggle('active', tab === 'multi');
    document.getElementById('pane-slice').style.display = tab === 'slice' ? '' : 'none';
    document.getElementById('pane-multi').style.display = tab === 'multi' ? '' : 'none';
  }

  // 公開API
  window.GC.slice = {
    adjAutoN, applyAutoSlice, loadSliceImage,
    renderSliceLines, applySlices, initSliceEvents, switchTab,
  };

  // インラインonclick用にwindowにも露出
  window.adjAutoN = adjAutoN;
  window.applyAutoSlice = applyAutoSlice;
  window.loadSliceImage = loadSliceImage;
  window.applySlices = applySlices;
  window.switchTab = switchTab;
})();
