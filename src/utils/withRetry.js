/**
 * withRetry — exponential-backoff retry utility.
 *
 * @param {Function} fn          — async function to call
 * @param {object}   opts
 * @param {number}   opts.retries      — max retry attempts (default 3)
 * @param {number}   opts.baseDelayMs  — base delay in ms; doubles each attempt (default 500)
 * @param {number}   opts.maxDelayMs   — cap on delay (default 10_000)
 * @param {Function} opts.shouldRetry  — (err, attempt) => bool; return false to abort early
 * @returns {Promise<any>}
 *
 * @example
 * const data = await withRetry(() => fetch('/api/scrape').then(r => r.json()))
 */
export async function withRetry(
  fn,
  {
    retries    = 3,
    baseDelayMs = 500,
    maxDelayMs  = 10_000,
    shouldRetry = () => true,
  } = {}
) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === retries) break
      if (!shouldRetry(err, attempt)) break

      const jitter = Math.random() * 0.2 // ±20% jitter
      const delay  = Math.min(baseDelayMs * 2 ** attempt * (1 + jitter), maxDelayMs)
      await sleep(delay)
    }
  }
  throw lastErr
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
