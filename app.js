(function () {
  'use strict';
  const K = window.KMap;
  const COLORS = ['#e6194b', '#2e9e45', '#4363d8', '#f58231', '#911eb4', '#0aa6a6', '#c79a00', '#e632c8'];
  const DEFAULT_NAMES = 'ABCDEF';
  const SHOW = ['0', '1', 'X'];

  const state = { n: 4, values: new Array(16).fill(0), mode: 'sop', names: DEFAULT_NAMES, flipped: false };
  const $ = id => document.getElementById(id);
  let hovered = null, pinned = null; // highlighted group in the legend

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Each name is { base, sub }. One typed letter numbers every variable from
  // it (a0 a1 a2 a3). Two letters, with more than two variables, split them
  // with the smaller half first (a0 a1 b0 b1, a0 b0 b1, a0 a1 b0 b1 b2).
  function names() {
    const typed = state.names.replace(/\s/g, '');
    const n = state.n, out = [];
    if (typed.length === 1) {
      for (let k = 0; k < n; k++) out.push({ base: typed, sub: String(k) });
    } else if (typed.length === 2 && n > 2) {
      const first = Math.floor(n / 2);
      for (let k = 0; k < n; k++) {
        out.push(k < first ? { base: typed[0], sub: String(k) } : { base: typed[1], sub: String(k - first) });
      }
    } else {
      for (let k = 0; k < n; k++) out.push({ base: typed[k] || DEFAULT_NAMES[k], sub: '' });
    }
    return out;
  }

  function plainName(v) {
    return v.base + v.sub;
  }

  function nameNodes(parent, list) {
    for (const v of list) {
      parent.append(v.base);
      if (v.sub) parent.append(el('sub', null, v.sub));
    }
    return parent;
  }

  function bits(x, width) {
    return width ? x.toString(2).padStart(width, '0') : '';
  }

  // ---------- rendering ----------

  function render() {
    $('err').textContent = '';
    hovered = pinned = null;
    const terms = K.solve(state.n, state.values, state.mode);
    renderMap(terms);
    renderTruthTable();
    renderResult(terms);
    syncControls();
    saveHash();
  }

  // Split sorted positions on a circular axis into contiguous runs. A group
  // that wraps around the edge comes back as two runs whose outer sides are
  // left open.
  function runs(positions, len) {
    const out = [];
    for (const p of positions) {
      const last = out[out.length - 1];
      if (last && last.start + last.len === p) last.len++;
      else out.push({ start: p, len: 1, openStart: false, openEnd: false });
    }
    if (out.length === 2 && out[0].start === 0 && out[1].start + out[1].len === len) {
      out[0].openStart = true;
      out[1].openEnd = true;
    }
    return out;
  }

  // The two axes of each map. Normally the high bits run down the rows and
  // the low bits across the columns; flipping swaps them.
  function axes(L, nm) {
    const hi = { bits: L.rowBits, gray: L.rows, shift: L.colBits, vars: nm.slice(L.selBits, L.selBits + L.rowBits) };
    const lo = { bits: L.colBits, gray: L.cols, shift: 0, vars: nm.slice(L.selBits + L.rowBits) };
    return state.flipped ? { row: lo, col: hi } : { row: hi, col: lo };
  }

  // Positions along an axis covered by a term.
  function axisPositions(axis, t) {
    const mask = (1 << axis.bits) - 1;
    const v = (t.v >> axis.shift) & mask, m = (t.m >> axis.shift) & mask;
    const out = [];
    axis.gray.forEach((g, p) => { if ((g & ~m) === v) out.push(p); });
    return out;
  }

  // 5 and 6 variables use 2 or 4 sub-maps, chosen by the top variables:
  // side by side for 5, a 2×2 grid for 6 (rows by A, columns by B).
  function renderMap(terms) {
    const n = state.n, nm = names(), L = K.layout(n), { row, col } = axes(L, nm);
    const maps = $('kmap');
    maps.innerHTML = '';
    maps.classList.toggle('multi', L.selBits > 0);
    maps.style.setProperty('--mapcols', L.selBits ? 2 : 1);

    // Give each group the smallest inset level not used by an earlier group
    // that shares a cell, so overlapping loops stay visible.
    const levels = [], cellSets = terms.map(t => K.cellsOf(n, t));
    terms.forEach((t, i) => {
      const taken = new Set();
      for (let j = 0; j < i; j++) {
        if (cellSets[j].some(x => cellSets[i].includes(x))) taken.add(levels[j]);
      }
      let lv = 0;
      while (taken.has(lv)) lv++;
      levels.push(lv);
    });
    const maxLevel = Math.max(0, ...levels);

    const selMask = (1 << L.selBits) - 1, selGray = K.gray(L.selBits);
    for (let sel = 0; sel <= selMask; sel++) {
      const sub = el('div', 'submap');
      // Stacked in one column on narrow screens, keep Gray order so
      // neighbouring maps stay adjacent.
      sub.style.setProperty('--gray-order', selGray.indexOf(sel));
      if (L.selBits) {
        const label = nameNodes(el('div', 'sel-label'), nm.slice(0, L.selBits));
        label.append(' = ' + bits(sel, L.selBits));
        sub.append(label);
      }
      const map = el('div', 'kmap');
      map.style.setProperty('--cols', col.gray.length);
      map.style.setProperty('--rows', row.gray.length);

      const corner = el('button', 'corner');
      corner.title = 'Flip the map (swap rows and columns)';
      corner.setAttribute('aria-label', corner.title);
      corner.append(nameNodes(el('span', 'rv'), row.vars),
                    nameNodes(el('span', 'cv'), col.vars));
      corner.addEventListener('click', () => {
        state.flipped = !state.flipped;
        render();
      });
      map.append(corner);

      col.gray.forEach((g, c) => {
        const h = el('div', 'chdr', bits(g, col.bits));
        h.style.gridColumn = c + 2;
        map.append(h);
      });
      row.gray.forEach((g, r) => {
        const h = el('div', 'rhdr', bits(g, row.bits));
        h.style.gridRow = r + 2;
        map.append(h);
      });

      const cells = el('div', 'cells');
      row.gray.forEach(rg => {
        col.gray.forEach(cg => {
          const idx = (sel << L.inner) | (rg << row.shift) | (cg << col.shift);
          const v = state.values[idx];
          const b = el('button', 'cell v' + v);
          b.title = 'm' + idx;
          b.append(el('span', 'val', SHOW[v]), el('span', 'idx', idx));
          b.addEventListener('click', () => {
            state.values[idx] = (state.values[idx] + 1) % 3;
            render();
          });
          cells.append(b);
        });
      });

      terms.forEach((t, i) => {
        const tm = (t.m >> L.inner) & selMask, tv = (t.v >> L.inner) & selMask;
        if ((sel & ~tm) !== tv) return;
        const rowPos = axisPositions(row, t), colPos = axisPositions(col, t);
        // Some maps nest loops several deep, so shrink the step to keep the
        // innermost loop at least about a third of a cell wide.
        const inset = `(3px + ${levels[i]} * min(5px, (var(--cell) * 0.32 - 3px) / ${maxLevel || 1}))`;
        const side = open => (open ? '0px' : inset);
        for (const rr of runs(rowPos, row.gray.length)) {
          for (const cr of runs(colPos, col.gray.length)) {
            const d = el('div', 'loop');
            d.dataset.group = i;
            d.style.setProperty('--c', COLORS[i % COLORS.length]);
            d.style.left = `calc(${cr.start} * var(--cell) + ${side(cr.openStart)})`;
            d.style.top = `calc(${rr.start} * var(--cell) + ${side(rr.openStart)})`;
            d.style.width = `calc(${cr.len} * var(--cell) - ${side(cr.openStart)} - ${side(cr.openEnd)})`;
            d.style.height = `calc(${rr.len} * var(--cell) - ${side(rr.openStart)} - ${side(rr.openEnd)})`;
            if (cr.openStart) d.classList.add('open-l');
            if (cr.openEnd) d.classList.add('open-r');
            if (rr.openStart) d.classList.add('open-t');
            if (rr.openEnd) d.classList.add('open-b');
            cells.append(d);
          }
        }
      });

      map.append(cells);
      sub.append(map);
      maps.append(sub);
    }
  }

  function renderTruthTable() {
    const n = state.n, nm = names(), tt = $('tt');
    tt.innerHTML = '';
    const head = el('tr');
    head.append(el('th', 'mcol', 'm'));
    nm.forEach(v => head.append(nameNodes(el('th'), [v])));
    head.append(el('th', 'fcol', 'F'));
    tt.append(head);
    for (let x = 0; x < (1 << n); x++) {
      const tr = el('tr');
      tr.append(el('td', 'mcol', x));
      for (const ch of bits(x, n)) tr.append(el('td', null, ch));
      const td = el('td', 'fcol');
      const b = el('button', 'fbtn v' + state.values[x], SHOW[state.values[x]]);
      b.addEventListener('click', () => {
        state.values[x] = (state.values[x] + 1) % 3;
        render();
      });
      td.append(b);
      tr.append(td);
      tt.append(tr);
    }
  }

  // Builds the expression with overbars for complemented variables.
  function renderResult(terms) {
    const n = state.n, nm = names(), pos = state.mode === 'pos';
    const expr = $('expr');
    expr.innerHTML = '';

    const lit = (k, neg) => nameNodes(el('span', neg ? 'lit bar' : 'lit'), [nm[k]]);
    const termNode = (t, i) => {
      const span = el('span', 'term');
      span.dataset.group = i;
      span.style.setProperty('--c', COLORS[i % COLORS.length]);
      const ls = K.literals(n, t);
      if (!pos) {
        if (!ls.length) span.append('1');
        ls.forEach(l => span.append(lit(l.k, l.neg)));
      } else {
        if (!ls.length) { span.append('0'); return span; }
        const paren = ls.length > 1 && terms.length > 1;
        if (paren) span.append('(');
        ls.forEach((l, j) => {
          if (j) span.append(' + ');
          span.append(lit(l.k, !l.neg));
        });
        if (paren) span.append(')');
      }
      return span;
    };

    if (!terms.length) {
      expr.append(pos ? '1' : '0');
    } else {
      terms.forEach((t, i) => {
        if (i && !pos) expr.append(el('span', 'op', ' + '));
        expr.append(termNode(t, i));
      });
    }

    $('approx').hidden = terms.exact !== false;
    $('plain').textContent = 'F = ' + (pos ? K.posText(n, terms, nm.map(plainName)) : K.sopText(n, terms, nm.map(plainName)));

    const list = $('groups');
    list.innerHTML = '';
    terms.forEach((t, i) => {
      const li = el('li');
      li.dataset.group = i;
      const sw = el('span', 'swatch');
      sw.style.background = COLORS[i % COLORS.length];
      li.append(sw, termNode(t, i), el('span', 'cov', (pos ? 'covers M(' : 'covers m(') + K.cellsOf(n, t).join(', ') + ')'));
      // Hovering with a mouse previews a group; tapping (or clicking) pins it
      // until it's tapped again, since touch screens have no hover.
      li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = i; showFocus(); } });
      li.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovered = null; showFocus(); } });
      li.addEventListener('click', () => { pinned = pinned === i ? null : i; showFocus(); });
      list.append(li);
    });
    if (!terms.length) {
      list.append(el('li', 'none', pos ? 'No 0s to group.' : 'No 1s to group.'));
    }
  }

  function showFocus() {
    const i = hovered != null ? hovered : pinned;
    document.querySelectorAll('#groups li').forEach(li => li.classList.toggle('pinned', li.dataset.group === String(pinned)));
    const map = $('kmap');
    map.classList.toggle('focusing', i != null);
    map.querySelectorAll('.loop').forEach(d => d.classList.toggle('focus', d.dataset.group === String(i)));
  }

  function listOf(v) {
    const out = [];
    state.values.forEach((x, i) => { if (x === v) out.push(i); });
    return out.join(', ');
  }

  function syncControls() {
    document.querySelectorAll('#nSeg button').forEach(b => b.classList.toggle('on', +b.dataset.n === state.n));
    document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === state.mode));
    if (document.activeElement !== $('names')) $('names').value = state.names;
    $('mInput').value = listOf(1);
    $('dInput').value = listOf(2);
  }

  // ---------- input ----------

  // Parses "0, 2 5-7" into a list of minterms. Throws on bad input.
  function parseList(text, max) {
    const out = [];
    for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
      const m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) throw new Error(`"${part}" isn't a number`);
      const a = +m[1], b = m[2] != null ? +m[2] : a;
      if (b < a) throw new Error(`"${part}" is backwards`);
      if (b >= max) throw new Error(`${b} is out of range (0–${max - 1})`);
      for (let x = a; x <= b; x++) out.push(x);
    }
    return out;
  }

  function applyLists() {
    const size = 1 << state.n;
    try {
      const ms = parseList($('mInput').value, size);
      const ds = parseList($('dInput').value, size);
      const clash = ds.find(x => ms.includes(x));
      if (clash != null) throw new Error(`${clash} is in both Σm and d`);
      state.values = new Array(size).fill(0);
      ds.forEach(x => { state.values[x] = 2; });
      ms.forEach(x => { state.values[x] = 1; });
        render();
    } catch (e) {
      $('err').textContent = e.message;
    }
  }

  function setN(n) {
    if (n === state.n) return;
    state.n = n;
    state.values = new Array(1 << n).fill(0);
    render();
  }

  // ---------- URL hash (so a map can be bookmarked or shared) ----------

  function saveHash() {
    const p = new URLSearchParams();
    p.set('n', state.n);
    const m = listOf(1).replace(/ /g, ''), d = listOf(2).replace(/ /g, '');
    if (m) p.set('m', m);
    if (d) p.set('d', d);
    if (state.mode !== 'sop') p.set('form', state.mode);
    if (state.names !== DEFAULT_NAMES) p.set('names', state.names);
    if (state.flipped) p.set('flip', '1');
    history.replaceState(null, '', '#' + p.toString());
  }

  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const n = +p.get('n');
    if (n >= 2 && n <= 6) state.n = n;
    const size = 1 << state.n;
    state.values = new Array(size).fill(0);
    if (p.get('form') === 'pos') state.mode = 'pos';
    if (p.get('names')) state.names = p.get('names').slice(0, 6);
    state.flipped = p.get('flip') === '1';
    try {
      parseList(p.get('d') || '', size).forEach(x => { state.values[x] = 2; });
      parseList(p.get('m') || '', size).forEach(x => { state.values[x] = 1; });
    } catch (e) { /* ignore a bad link */ }
  }

  // ---------- wiring ----------

  document.querySelectorAll('#nSeg button').forEach(b => b.addEventListener('click', () => setN(+b.dataset.n)));
  document.querySelectorAll('#modeSeg button').forEach(b => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    render();
  }));
  $('names').addEventListener('input', e => { state.names = e.target.value; render(); });
  ['mInput', 'dInput'].forEach(id => {
    $(id).addEventListener('change', applyLists);
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') applyLists(); });
  });
  $('clearBtn').addEventListener('click', () => {
    state.values = new Array(1 << state.n).fill(0);
    render();
  });
  $('randomBtn').addEventListener('click', () => {
    state.values = state.values.map(() => {
      const r = Math.random();
      return r < 0.45 ? 0 : r < 0.9 ? 1 : 2;
    });
    render();
  });
  $('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('plain').textContent).then(() => {
      $('copyBtn').textContent = 'Copied';
      setTimeout(() => { $('copyBtn').textContent = 'Copy'; }, 1200);
    });
  });

  // Safari ignores user-scalable=no, so block pinch zoom directly.
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

  $('version').textContent = 'v' + window.APP_VERSION;
  loadHash();
  render();
})();
