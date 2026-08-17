/**
 * Run worker tasks over an array of items with bounded concurrency limit.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function next(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++
      results[idx] = await worker(items[idx], idx)
    }
  }

  const workerCount = Math.min(limit, items.length)
  const workers: Promise<void>[] = []
  for (let i = 0; i < workerCount; i++) {
    workers.push(next())
  }

  await Promise.all(workers)
  return results
}
