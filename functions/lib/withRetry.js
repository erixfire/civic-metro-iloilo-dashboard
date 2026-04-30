/**
 * withRetry — exponential-backoff retry for Cloudflare Workers.
 * (Workers do not have Node.js; uses native Promise + setTimeout polyfill via cf-wait)
 *
 * @param {Function} fn           async function to execute
 * @param {object}   opts
 * @param {number}   opts.retries       max retry attempts (default 3)
 * @param {number}   opts.baseDelayMs   base delay in ms (default 500)
 * @param {number}   opts.maxDelayMs    max delay cap (default 8000)
 * @param {Function} opts.shouldRetry   (err, attempt) => bool
 */
export async function withRetry(
  fn,
  {
    retries     = 3,
    baseDelayMs = 500,
    maxDelayMs  = 8_000,
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

      const jitter = Math.random() * 0.3
      const delay  = Math.min(baseDelayMs * 2 ** attempt * (1 + jitter), maxDelayMs)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

/**
 * fetchWithRetry — convenience wrapper for fetch() with retry logic.
 * Retries on network errors and 5xx responses.
 *
 * @param {string|URL} url
 * @param {RequestInit} init
 * @param {object} retryOpts   same as withRetry opts
 */
export async function fetchWithRetry(url, init = {}, retryOpts = {}) {
  return withRetry(
    async () => {
      const res = await fetch(url, init)
      // Retry on server errors
      if (res.status >= 500) {
        throw Object.assign(new Error(`HTTP ${res.status} from ${url}`), { status: res.status })
      }
      return res
    },
    {
      ...retryOpts,
      // Don't retry client errors (4xx)
      shouldRetry: (err, attempt) => {
        if (err.status && err.status >= 400 && err.status < 500) return false
        return retryOpts.shouldRetry ? retryOpts.shouldRetry(err, attempt) : true
      },
    }
  )
}
