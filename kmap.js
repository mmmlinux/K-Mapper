// K-map logic: layout (Gray code ordering) and minimisation (Quine–McCluskey
// prime implicants + exact minimum cover). No DOM code lives here so it can be
// tested under node.
(function (root) {
  'use strict';

  function gray(bits) {
    const out = [];
    for (let i = 0; i < (1 << bits); i++) out.push(i ^ (i >> 1));
    return out;
  }

  // Up to 4 variables fit one map. Beyond that the top 1 or 2 variables pick
  // one of several 4-variable sub-maps. Within a map the row variables are the
  // high bits and the column variables the low bits, so cell (r, c) of
  // sub-map s holds minterm (s << inner) | (rows[r] << colBits) | cols[c].
  function layout(n) {
    const selBits = Math.max(0, n - 4), inner = n - selBits;
    const rowBits = Math.floor(inner / 2);
    const colBits = inner - rowBits;
    return { selBits, inner, rowBits, colBits, rows: gray(rowBits), cols: gray(colBits) };
  }

  function popcount(x) {
    let c = 0;
    while (x) { x &= x - 1; c++; }
    return c;
  }

  // A term is { v, m }: m has a 1 for every eliminated variable, v holds the
  // values of the remaining bits (and 0 in the eliminated ones).
  function primeImplicants(minterms) {
    let current = new Map();
    for (const t of minterms) current.set(t + '|0', { v: t, m: 0 });
    const primes = [];
    while (current.size) {
      const list = [...current.values()];
      const next = new Map();
      const used = new Array(list.length).fill(false);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (a.m !== b.m) continue;
          const diff = a.v ^ b.v;
          if (diff && (diff & (diff - 1)) === 0) {
            const v = a.v & ~diff, m = a.m | diff;
            next.set(v + '|' + m, { v, m });
            used[i] = used[j] = true;
          }
        }
      }
      list.forEach((t, i) => { if (!used[i]) primes.push(t); });
      current = next;
    }
    return primes;
  }

  function covers(term, x) {
    return (x & ~term.m) === term.v;
  }

  // Minimal sum of products covering `ones`, free to use `dcs`.
  // Ties are broken by fewest terms, then fewest literals. The search is exact
  // unless it runs past `budget` steps (only plausible for big, awkward
  // 6-variable maps); then the best cover found so far is returned and the
  // result has exact = false.
  function minimize(n, ones, dcs, budget = 300000) {
    const result = [];
    result.exact = true;
    if (!ones.length) return result;

    // Cover sets are BigInt bitsets over positions in `ones`.
    const k = ones.length;
    const bit = ones.map((_, i) => 1n << BigInt(i));
    let target = 0n;
    for (const b of bit) target |= b;

    let cand = [];
    for (const p of primeImplicants([...ones, ...dcs])) {
      let cov = 0n;
      ones.forEach((x, i) => { if (covers(p, x)) cov |= bit[i]; });
      if (cov) cand.push({ v: p.v, m: p.m, cov, lits: n - popcount(p.m) });
    }
    // Drop a prime when another covers all of its 1s with no more literals.
    cand = cand.filter((p, i) => !cand.some((q, j) => j !== i &&
      (p.cov & q.cov) === p.cov && q.lits <= p.lits &&
      (q.cov !== p.cov || q.lits < p.lits || j < i)));

    const opts = bit.map(b => cand.filter(p => p.cov & b).sort((a, c) => a.lits - c.lits));
    // Everything any option for position i could also cover.
    const reach = opts.map(o => o.reduce((acc, p) => acc | p.cov, 0n));
    const minLits = Math.min(...cand.map(p => p.lits));

    // Start from a greedy cover so there is always an answer.
    let best = [], bestLits = 0;
    for (let left = target; left;) {
      let pick = null, pickN = -1;
      for (const p of cand) {
        let c = p.cov & left, cnt = 0;
        while (c) { c &= c - 1n; cnt++; }
        if (cnt > pickN || (cnt === pickN && p.lits < pick.lits)) { pick = p; pickN = cnt; }
      }
      best.push(pick);
      bestLits += pick.lits;
      left &= ~pick.cov;
    }

    // Lower bound on how many more terms are needed: positions that no
    // single prime can cover together each need a term of their own.
    function lowerBound(uncovered) {
      let lb = 0;
      for (let i = 0; i < k && uncovered; i++) {
        if (uncovered & bit[i]) { lb++; uncovered &= ~reach[i]; }
      }
      return lb;
    }

    let steps = 0;
    const chosen = [];
    (function search(uncovered, litSum) {
      if (!uncovered) {
        if (chosen.length < best.length || (chosen.length === best.length && litSum < bestLits)) {
          best = chosen.slice();
          bestLits = litSum;
        }
        return;
      }
      if (++steps > budget) { result.exact = false; return; }
      const lb = lowerBound(uncovered);
      const terms = chosen.length + lb;
      if (terms > best.length || (terms === best.length && litSum + lb * minLits >= bestLits)) return;
      // Branch on the uncovered position with the fewest options.
      let pick = -1;
      for (let i = 0; i < k; i++) {
        if ((uncovered & bit[i]) && (pick < 0 || opts[i].length < opts[pick].length)) pick = i;
      }
      for (const p of opts[pick]) {
        chosen.push(p);
        search(uncovered & ~p.cov, litSum + p.lits);
        chosen.pop();
        if (steps > budget) return;
      }
    })(target, 0);

    for (const p of best) result.push({ v: p.v, m: p.m, lits: p.lits });
    result.sort((a, b) => a.lits - b.lits || a.m - b.m || a.v - b.v);
    return result;
  }

  // values: array of 0, 1 or 2 (2 = don't care). mode: 'sop' or 'pos'.
  // For POS the returned terms are the groups of 0s (implicants of F').
  function solve(n, values, mode) {
    const ones = [], zeros = [], dcs = [];
    values.forEach((v, i) => (v === 1 ? ones : v === 0 ? zeros : dcs).push(i));
    return minimize(n, mode === 'pos' ? zeros : ones, dcs);
  }

  // Literals of a term, in variable order. neg = complemented in the product.
  function literals(n, term) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const bit = n - 1 - k;
      if ((term.m >> bit) & 1) continue;
      out.push({ k, neg: !((term.v >> bit) & 1) });
    }
    return out;
  }

  function cellsOf(n, term) {
    const out = [];
    for (let x = 0; x < (1 << n); x++) if (covers(term, x)) out.push(x);
    return out;
  }

  // Plain-text expressions using ' for NOT.
  function sopText(n, terms, names) {
    if (!terms.length) return '0';
    return terms.map(t => {
      const l = literals(n, t);
      return l.length ? l.map(x => names[x.k] + (x.neg ? "'" : '')).join('') : '1';
    }).join(' + ');
  }

  function posText(n, terms, names) {
    if (!terms.length) return '1';
    const sums = terms.map(t => {
      const l = literals(n, t);
      if (!l.length) return '0';
      const s = l.map(x => names[x.k] + (x.neg ? '' : "'")).join(' + ');
      return l.length > 1 && terms.length > 1 ? '(' + s + ')' : s;
    });
    return sums.join('');
  }

  const KMap = { gray, layout, primeImplicants, minimize, solve, literals, cellsOf, covers, sopText, posText };
  if (typeof module !== 'undefined' && module.exports) module.exports = KMap;
  else root.KMap = KMap;
})(this);
