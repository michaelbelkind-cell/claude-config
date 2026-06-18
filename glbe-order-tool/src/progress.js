// Throttled progress reporter with rate + ETA. Safe for very large runs: it
// prints at most once per `intervalMs` (plus a final forced line).
export function createProgress(total, { intervalMs = 2000 } = {}) {
  const start = Date.now();
  let lastPrint = 0;
  let done = 0;
  let ok = 0;
  let fail = 0;

  function print(force) {
    const now = Date.now();
    if (!force && now - lastPrint < intervalMs) return;
    lastPrint = now;
    const elapsed = (now - start) / 1000;
    const ratePerMin = elapsed > 0 ? (done / elapsed) * 60 : 0;
    const remaining = total - done;
    const etaSec = done > 0 ? (elapsed / done) * remaining : Infinity;
    console.log(
      `progress: ${done}/${total} (ok ${ok}, fail ${fail}) | ${ratePerMin.toFixed(1)}/min | ETA ${fmtDuration(etaSec)}`,
    );
  }

  return {
    update(record) {
      done++;
      if (record.ok) ok++;
      else fail++;
      print(false);
    },
    finish() {
      print(true);
    },
    stats() {
      return { done, ok, fail, elapsedSec: (Date.now() - start) / 1000 };
    },
  };
}

function fmtDuration(sec) {
  if (!isFinite(sec)) return '—';
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}
