/* ============================================================
 * library.js — ライブラリ(画像一覧)の管理
 * ------------------------------------------------------------
 * 担当範囲:
 *   - 画像の追加/削除/全削除
 *   - サムネイル一覧の描画
 *   - 複数枚一括追加(MULTIタブ)
 *   - サムネからのドラッグ&ドロップ → グリッドへ
 *
 * バグを直すならまずここを見る:
 *   - 「サムネが出ない/重複する」→ renderLibrary()
 *   - 「画像をクリックしても配置されない」→ placeInFirstEmpty()
 *   - 「ドラッグで配置できない」→ dragstart/dragend ハンドラ
 * ============================================================ */

(function() {
  const S = window.GC.state;
  const showToast = window.GC.showToast;

  // ===== ライブラリへ追加 =====
  function addToLibrary(name, dataUrl) {
    const id = ++S.libIdCounter;
    S.library.push({ id, name, dataUrl });
    renderLibrary();
  }

  // ===== サムネイル一覧の描画 =====
  function renderLibrary() {
    const list = document.getElementById('thumb-list');
    document.getElementById('lib-count').textContent = S.library.length;

    if (S.library.length === 0) {
      list.innerHTML = '<div style="font-size:0.75rem; color:var(--muted); text-align:center; padding:12px;">画像を追加してください</div>';
      return;
    }

    list.innerHTML = '';
    S.library.forEach(item => {
      const el = document.createElement('div');
      el.className = 'thumb-item';
      el.draggable = true;
      el.dataset.id = item.id;
      el.innerHTML = `
        <img src="${item.dataUrl}" alt="">
        <div class="thumb-info">
          <div class="thumb-name">${item.name}</div>
        </div>
        <button class="thumb-del" onclick="removeFromLibrary(${item.id})" title="削除">×</button>
      `;

      el.addEventListener('dragstart', e => {
        S.draggingThumb = item.id;
        e.dataTransfer.effectAllowed = 'copy';
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        S.draggingThumb = null;
      });

      el.addEventListener('click', () => placeInFirstEmpty(item.id));
      list.appendChild(el);
    });
  }

  // ===== ライブラリから削除 =====
  function removeFromLibrary(id) {
    S.library = S.library.filter(l => l.id !== id);
    S.cells = S.cells.map(c => c === id ? null : c);
    renderLibrary();
    window.GC.grid.renderGrid();
    window.GC.grid.updateInfo();
  }

  // ===== ライブラリ全削除 =====
  function clearLibrary() {
    if (S.library.length === 0) return;
    S.library = [];
    S.cells = S.cells.map(() => null);
    renderLibrary();
    window.GC.grid.renderGrid();
    window.GC.grid.updateInfo();
    showToast('ライブラリを全削除しました');
  }

  // ===== 最初の空きセルへ配置 =====
  function placeInFirstEmpty(imgId) {
    const idx = S.cells.indexOf(null);
    if (idx === -1) { showToast('空きセルがありません'); return; }
    S.cells[idx] = imgId;
    window.GC.grid.renderGrid();
    window.GC.grid.updateInfo();
  }

  // ===== 複数枚一括読み込み =====
  function loadMultiImages(input) {
    const files = Array.from(input.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => addToLibrary(file.name, e.target.result);
      reader.readAsDataURL(file);
    });
    showToast(`${files.length}枚を追加しました`);
  }

  // ===== MULTIタブのドロップゾーン =====
  function initMultiEvents() {
    const dzMulti = document.getElementById('dz-multi');
    dzMulti.addEventListener('dragover', e => { e.preventDefault(); dzMulti.classList.add('drag-over'); });
    dzMulti.addEventListener('dragleave', () => dzMulti.classList.remove('drag-over'));
    dzMulti.addEventListener('drop', e => {
      e.preventDefault();
      dzMulti.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => addToLibrary(file.name, ev.target.result);
        reader.readAsDataURL(file);
      });
    });
  }

  // 公開API
  window.GC.library = {
    addToLibrary, renderLibrary, removeFromLibrary,
    clearLibrary, placeInFirstEmpty, loadMultiImages, initMultiEvents,
  };

  // インラインonclick用
  window.removeFromLibrary = removeFromLibrary;
  window.clearLibrary = clearLibrary;
  window.loadMultiImages = loadMultiImages;
})();
