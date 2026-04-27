/**
 * Deduplicate advisory/news items.
 * Two items are considered duplicates if:
 *   - same title (case-insensitive), OR
 *   - same date + same source + first 40 chars of summary match.
 * Prefers CDRRMO source over mirrored social/news copies.
 */
export function dedupeAdvisories(items = []) {
  const seen = new Map()

  // Sort so CDRRMO items come first (preferred)
  const sorted = [...items].sort((a, b) => {
    const aIsCdrrmo = (a.source || '').toLowerCase().includes('cdrrmo') ? 0 : 1
    const bIsCdrrmo = (b.source || '').toLowerCase().includes('cdrrmo') ? 0 : 1
    return aIsCdrrmo - bIsCdrrmo
  })

  return sorted.filter((item) => {
    const titleKey = (item.title || '').toLowerCase().trim()
    const dateSourceKey = [
      item.date ?? '',
      (item.source || '').toLowerCase(),
      (item.summary || '').slice(0, 40).toLowerCase(),
    ].join('|')

    if (seen.has(titleKey) || seen.has(dateSourceKey)) return false
    seen.set(titleKey, true)
    seen.set(dateSourceKey, true)
    return true
  })
}
