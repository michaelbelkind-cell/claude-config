// Bounded-concurrency worker pool. Spawns `concurrency` workers that each pull
// the next index (0..total-1) and run `task(i)` until the work is exhausted or
// the abort signal fires. `task` is expected to handle its own errors; any throw
// is swallowed here so one bad item never kills a worker.
export async function runPool(total, concurrency, task, { signal } = {}) {
  let next = 0;
  const workerCount = Math.max(1, Math.min(concurrency, total));

  async function worker() {
    while (true) {
      if (signal?.aborted) return;
      const i = next++;
      if (i >= total) return;
      try {
        await task(i);
      } catch {
        // task is responsible for recording failures; guard against unexpected throws.
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
