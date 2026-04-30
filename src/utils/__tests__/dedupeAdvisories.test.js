import { describe, it, expect } from 'vitest'
import { dedupeAdvisories } from '../dedupeAdvisories'

describe('dedupeAdvisories', () => {
  it('returns empty array for no input', () => {
    expect(dedupeAdvisories()).toEqual([])
    expect(dedupeAdvisories([])).toEqual([])
  })

  it('returns all unique items unchanged', () => {
    const items = [
      { title: 'Flood in La Paz', date: '2026-04-27', source: 'CDRRMO', summary: 'Flooding near Dungon Creek.' },
      { title: 'Fire in Jaro', date: '2026-04-27', source: 'BFP', summary: 'Structure fire in Brgy Rizal.' },
      { title: 'Heat Index Alert', date: '2026-04-26', source: 'PAGASA', summary: '45 degrees in Dumangas.' },
    ]
    expect(dedupeAdvisories(items)).toHaveLength(3)
  })

  it('removes exact title duplicates (case-insensitive)', () => {
    const items = [
      { title: 'Flood Warning', date: '2026-04-27', source: 'CDRRMO', summary: 'Watch out for floods.' },
      { title: 'flood warning', date: '2026-04-27', source: 'GMA News', summary: 'Floods expected tonight.' },
    ]
    const result = dedupeAdvisories(items)
    expect(result).toHaveLength(1)
  })

  it('removes same-date + same-source + matching summary prefix duplicates', () => {
    const items = [
      { title: 'Advisory A', date: '2026-04-27', source: 'MORE Power', summary: 'Scheduled interruption in La Paz district.' },
      { title: 'Advisory B', date: '2026-04-27', source: 'more power', summary: 'Scheduled interruption in La Paz district — extra detail.' },
    ]
    const result = dedupeAdvisories(items)
    expect(result).toHaveLength(1)
  })

  it('prefers CDRRMO source over non-CDRRMO when titles match', () => {
    const items = [
      { title: 'Flood Advisory', date: '2026-04-27', source: 'Panay News', summary: 'Flooding advisory issued.' },
      { title: 'Flood Advisory', date: '2026-04-27', source: 'CDRRMO Iloilo City', summary: 'Official flood advisory.' },
    ]
    const result = dedupeAdvisories(items)
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('CDRRMO Iloilo City')
  })

  it('does NOT deduplicate items with different titles on the same date', () => {
    const items = [
      { title: 'Morning Advisory', date: '2026-04-27', source: 'CDRRMO', summary: 'Flood watch issued for La Paz.' },
      { title: 'Evening Advisory', date: '2026-04-27', source: 'CDRRMO', summary: 'Flood watch lifted for La Paz.' },
    ]
    expect(dedupeAdvisories(items)).toHaveLength(2)
  })

  it('handles items missing optional fields gracefully', () => {
    const items = [
      { title: 'No Date Item' },
      { title: 'No Source Item', date: '2026-04-27' },
      { title: 'No Date Item' }, // duplicate of first
    ]
    const result = dedupeAdvisories(items)
    expect(result).toHaveLength(2)
  })
})
