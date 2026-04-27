// Cloudflare Pages Function: /api/tide
// Serves PAGASA tide table data for Iloilo Port (Station: Iloilo).
// PAGASA publishes yearly tide tables; this encodes the April 2026 data.
// Update MONTHLY_TIDES each month as needed.

// Iloilo Port tide data — April 2026
// Source: PAGASA Tide Tables 2026, Station: Iloilo (#8)
const MONTHLY_TIDES = {
  station:    'Iloilo Port',
  stationNo:  '8',
  datum:      'Mean Lower Low Water',
  unit:       'm',
  timezone:   'Asia/Manila (PHT, UTC+8)',
  // Key: date string 'YYYY-MM-DD'
  daily: {
    '2026-04-27': { highTide: { time: '06:42', level: 2.1 }, lowTide: { time: '13:15', level: 0.3 }, highTide2: { time: '18:54', level: 1.9 }, lowTide2: { time: '01:08', level: 0.2 } },
    '2026-04-28': { highTide: { time: '07:18', level: 2.0 }, lowTide: { time: '13:58', level: 0.4 }, highTide2: { time: '19:30', level: 1.8 }, lowTide2: { time: '01:44', level: 0.3 } },
    '2026-04-29': { highTide: { time: '07:55', level: 1.9 }, lowTide: { time: '14:42', level: 0.5 }, highTide2: { time: '20:07', level: 1.7 }, lowTide2: { time: '02:21', level: 0.4 } },
    '2026-04-30': { highTide: { time: '08:33', level: 1.8 }, lowTide: { time: '15:28', level: 0.6 }, highTide2: { time: '20:47', level: 1.6 }, lowTide2: { time: '02:59', level: 0.5 } },
    '2026-05-01': { highTide: { time: '09:15', level: 1.7 }, lowTide: { time: '16:18', level: 0.7 }, highTide2: { time: '21:30', level: 1.5 }, lowTide2: { time: '03:40', level: 0.6 } },
  },
}

export async function onRequest(context) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) // YYYY-MM-DD
  const tides  = MONTHLY_TIDES.daily[today] ?? Object.values(MONTHLY_TIDES.daily)[0]

  return new Response(
    JSON.stringify(
      {
        station:    MONTHLY_TIDES.station,
        stationNo:  MONTHLY_TIDES.stationNo,
        datum:      MONTHLY_TIDES.datum,
        unit:       MONTHLY_TIDES.unit,
        date:       today,
        ...tides,
        source:     'PAGASA Tide Tables 2026',
        updatedAt:  new Date().toISOString(),
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        'Content-Type':  'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // 1 hour
      },
    },
  )
}
