import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '../withRetry'

describe('withRetry', () => {
  it('resolves immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValue('recovered')

    const result = await withRetry(fn, { retries: 3, baseDelayMs: 0 })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 0 })).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
  })

  it('does not retry when retries=0', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(withRetry(fn, { retries: 0, baseDelayMs: 0 })).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('respects shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Not Found'))
    // 404s should not be retried
    const shouldRetry = (err) => !err.message.includes('Not Found')
    await expect(
      withRetry(fn, { retries: 5, baseDelayMs: 0, shouldRetry })
    ).rejects.toThrow('Not Found')
    expect(fn).toHaveBeenCalledTimes(1) // no retries for 404
  })
})
