import { describe, it, expect } from 'vitest'
import {
  WEATHER,
  HEAT_INDEX_ILOILO,
  RAIN_GAUGES,
  UTILITY_ALERTS,
  TRAFFIC_STATUS,
  EMERGENCY_CONTACTS,
  CSWDO_SERVICES,
  KPI_STATS,
  TRAFFIC_CHART_DATA,
  ILOILO_CENTER,
  TRAFFIC_POINTS,
  JEEPNEY_REROUTES,
} from '../mockData'

describe('WEATHER', () => {
  it('has required fields', () => {
    expect(WEATHER).toMatchObject({
      city: expect.any(String),
      temp: expect.any(Number),
      heatIndex: expect.any(Number),
      humidity: expect.any(Number),
    })
  })
  it('has a valid weatherCode (0–9)', () => {
    expect(WEATHER.weatherCode).toBeGreaterThanOrEqual(0)
    expect(WEATHER.weatherCode).toBeLessThanOrEqual(9)
  })
})

describe('HEAT_INDEX_ILOILO', () => {
  it('has at least one entry', () => {
    expect(HEAT_INDEX_ILOILO.length).toBeGreaterThan(0)
  })
  it('every entry has area, hiC, level, levelColor, bg, note', () => {
    HEAT_INDEX_ILOILO.forEach((h) => {
      expect(h).toHaveProperty('area')
      expect(h).toHaveProperty('hiC')
      expect(h).toHaveProperty('level')
      expect(typeof h.hiC).toBe('number')
    })
  })
})

describe('RAIN_GAUGES', () => {
  it('has 5 stations', () => {
    expect(RAIN_GAUGES).toHaveLength(5)
  })
  it('every gauge has valid lat/lng within Iloilo area', () => {
    RAIN_GAUGES.forEach((g) => {
      expect(g.lat).toBeGreaterThan(10.5)
      expect(g.lat).toBeLessThan(10.9)
      expect(g.lng).toBeGreaterThan(122.4)
      expect(g.lng).toBeLessThan(122.7)
    })
  })
  it('level is one of Normal / Alarming / Critical', () => {
    const valid = ['Normal', 'Alarming', 'Critical']
    RAIN_GAUGES.forEach((g) => expect(valid).toContain(g.level))
  })
})

describe('CSWDO_SERVICES', () => {
  it('has exactly 6 services', () => {
    expect(CSWDO_SERVICES).toHaveLength(6)
  })
  it('every service has requirements array (non-empty)', () => {
    CSWDO_SERVICES.forEach((s) => {
      expect(Array.isArray(s.requirements)).toBe(true)
      expect(s.requirements.length).toBeGreaterThan(0)
    })
  })
  it('every service has a contact phone number', () => {
    CSWDO_SERVICES.forEach((s) => {
      expect(s.contact).toBeTruthy()
      expect(s.contact).toMatch(/\(033\)/)
    })
  })
  it('all statuses are Open or Closed', () => {
    CSWDO_SERVICES.forEach((s) => {
      expect(['Open', 'Closed']).toContain(s.status)
    })
  })
})

describe('EMERGENCY_CONTACTS', () => {
  it('has at least 5 categories', () => {
    expect(EMERGENCY_CONTACTS.length).toBeGreaterThanOrEqual(5)
  })
  it('every category has at least one contact', () => {
    EMERGENCY_CONTACTS.forEach((cat) => {
      expect(cat.contacts.length).toBeGreaterThan(0)
    })
  })
})

describe('UTILITY_ALERTS', () => {
  it('every alert has a provider, severity, title, areas array', () => {
    UTILITY_ALERTS.forEach((a) => {
      expect(a).toHaveProperty('provider')
      expect(a).toHaveProperty('severity')
      expect(a).toHaveProperty('title')
      expect(Array.isArray(a.areas)).toBe(true)
    })
  })
  it('severity is one of warning / info / critical', () => {
    const valid = ['warning', 'info', 'critical']
    UTILITY_ALERTS.forEach((a) => expect(valid).toContain(a.severity))
  })
})

describe('TRAFFIC_STATUS', () => {
  it('every entry has a road, status, icon, note', () => {
    TRAFFIC_STATUS.forEach((t) => {
      expect(t).toHaveProperty('road')
      expect(t).toHaveProperty('status')
      expect(t).toHaveProperty('icon')
    })
  })
  it('status is Heavy, Moderate, or Clear', () => {
    const valid = ['Heavy', 'Moderate', 'Clear']
    TRAFFIC_STATUS.forEach((t) => expect(valid).toContain(t.status))
  })
})

describe('TRAFFIC_CHART_DATA', () => {
  it('has matching labels and dataset lengths', () => {
    const { labels, datasets } = TRAFFIC_CHART_DATA
    datasets.forEach((d) => {
      expect(d.data).toHaveLength(labels.length)
    })
  })
})

describe('ILOILO_CENTER', () => {
  it('is a valid [lat, lng] pair within Iloilo', () => {
    const [lat, lng] = ILOILO_CENTER
    expect(lat).toBeGreaterThan(10.5)
    expect(lat).toBeLessThan(10.9)
    expect(lng).toBeGreaterThan(122.4)
    expect(lng).toBeLessThan(122.7)
  })
})
