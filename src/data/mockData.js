// ─── MOCK DATA — Civic Metro Iloilo Dashboard ───────────────────────────────
// Weather updated: April 27, 2026 — PAGASA heat index bulletin

export const WEATHER = {
  city: 'Iloilo City',
  temp: 34,
  feelsLike: 41,
  heatIndex: 41,
  heatIndexLabel: 'Extreme Caution',
  heatIndexColor: 'text-orange-500',
  condition: 'Partly Cloudy with Isolated Thunderstorms',
  humidity: 71,
  windSpeed: 12,
  windDir: 'SW',
  uvIndex: 10,
  visibility: 10,
  weatherCode: 2,
  updatedAt: '2026-04-27T07:00:00+08:00',
  source: 'PAGASA',
}

export const HEAT_INDEX_ILOILO = [
  { area: 'Dumangas, Iloilo',  hiC: 45, level: 'Danger',          levelColor: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/40',       note: 'Heat cramps/exhaustion likely; heat stroke possible.' },
  { area: 'Iloilo City',       hiC: 41, level: 'Extreme Caution', levelColor: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40', note: 'Heat cramps/exhaustion possible with prolonged activity.' },
  { area: 'Lambunao, Iloilo',  hiC: 40, level: 'Caution',         levelColor: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/40', note: 'Fatigue possible; watch for heat cramps.' },
]

export const HEAT_INDEX_NEWS = [
  { id: 'hin1', date: '2026-04-27', source: 'Inquirer.net', title: '10 areas to sizzle at Danger level on April 27', summary: 'Dumangas, Iloilo logged 45°C. PAGASA warns of heat cramps, exhaustion, and heat stroke risk.', url: 'https://newsinfo.inquirer.net/2218846/heat-index-alert-10-areas-to-sizzle-at-danger-level-on-monday', level: 'Danger', levelColor: 'text-red-600' },
  { id: 'hin2', date: '2026-04-27', source: 'Inquirer.net', title: 'Heat, thunderstorms expected across Visayas — PAGASA', summary: 'Lambunao, Iloilo may reach 40°C. Dangerous heat 9AM–4PM.', url: 'https://newsinfo.inquirer.net/2218881/heat-thunderstorms-expected-across-visayas-pagasa', level: 'Caution', levelColor: 'text-yellow-500' },
  { id: 'hin3', date: '2026-04-26', source: 'Philstar', title: 'PAGASA: 14 areas hit danger-level heat index on April 25', summary: 'Dumangas at 45°C and Iloilo City at 43°C on April 25.', url: 'https://www.philstar.com/headlines/weather/2026/04/25/2523508/pagasa-14-areas-hit-danger-level-heat-index-april-25', level: 'Danger', levelColor: 'text-red-600' },
  { id: 'hin4', date: '2026-04-10', source: 'GMA Network', title: 'Heat index in Dumangas, Iloilo reaches 44°C on April 10', summary: 'Highest in PH. PAGASA Danger level.', url: 'https://www.gmanetwork.com/news/weather/content/983431/heat-index-in-dumangas-iloilo-reaches-44-c-on-april-10-2026/story/', level: 'Danger', levelColor: 'text-red-600' },
  { id: 'hin5', date: '2026-04-01', source: 'CDRRMO Iloilo City', title: 'Heat Index Forecast: Iloilo City expected to reach 38°C', summary: 'Public advised to minimize outdoor activity.', url: 'https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/', level: 'Caution', levelColor: 'text-yellow-500' },
]

// PAGASA tide table — Iloilo Port / Iloilo River (April 27, 2026)
// Source: PAGASA Tide Tables 2026, Station: Iloilo (PAGASA station no. 8)
export const TIDE = {
  river: 'Iloilo River / Port',
  currentLevel: 1.4,
  unit: 'm',
  status: 'Normal',
  statusColor: 'text-green-500',
  highTide:  { time: '06:42', level: 2.1 },
  lowTide:   { time: '13:15', level: 0.3 },
  highTide2: { time: '18:54', level: 1.9 },
  lowTide2:  { time: '01:08', level: 0.2 },
  source: 'PAGASA Tide Tables 2026 — Station: Iloilo',
  updatedAt: '2026-04-27T00:00:00+08:00',
}

// Rain gauges — CDRRMO Iloilo City monitoring stations
// Levels: Normal <10mm/hr, Alarming 10–30mm/hr, Critical >30mm/hr
export const RAIN_GAUGES = [
  { id: 'rg1', name: 'Jaro River Station',        lat: 10.7265, lng: 122.5436, rainfall1h: 2.5,  rainfall24h: 8.2,  level: 'Normal',   levelColor: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/40' },
  { id: 'rg2', name: 'Iloilo River — City Proper', lat: 10.6946, lng: 122.5661, rainfall1h: 0.0,  rainfall24h: 3.0,  level: 'Normal',   levelColor: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/40' },
  { id: 'rg3', name: 'Dungon Creek — La Paz',      lat: 10.7115, lng: 122.5553, rainfall1h: 14.2, rainfall24h: 41.0, level: 'Alarming', levelColor: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/40' },
  { id: 'rg4', name: 'Ingore — Lapaz',             lat: 10.7312, lng: 122.5290, rainfall1h: 5.0,  rainfall24h: 18.5, level: 'Normal',   levelColor: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/40' },
  { id: 'rg5', name: 'Mohon River — Mandurriao',   lat: 10.7210, lng: 122.5480, rainfall1h: 22.0, rainfall24h: 62.5, level: 'Critical', levelColor: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/40' },
]

export const UTILITY_ALERTS = [
  { id: 'ua1', type: 'power',  provider: 'MORE Power', severity: 'warning', title: 'Scheduled Power Interruption',   areas: ['La Paz District', 'Jaro Blvd', 'Ungka Rd'],       date: '2026-04-28', timeFrom: '08:00', timeTo: '17:00', reason: 'Scheduled maintenance of 69KV transmission line.', contactNo: '(033) 509-8888' },
  { id: 'ua2', type: 'water',  provider: 'MIWD',       severity: 'info',    title: 'Low Water Pressure Advisory',     areas: ['Molo', 'Mandurriao', 'Arevalo'],                  date: '2026-04-27', timeFrom: '22:00', timeTo: '06:00', reason: 'Pump rehabilitation works at Sta. Barbara plant.', contactNo: '(033) 337-8888' },
  { id: 'ua3', type: 'power',  provider: 'MORE Power', severity: 'info',    title: 'Restored — City Proper Outage',   areas: ['City Proper', 'Iznart St', 'Quezon St'],          date: '2026-04-27', timeFrom: '00:00', timeTo: '04:30', reason: 'Emergency line repair completed.',                 contactNo: '(033) 509-8888' },
]

export const TRAFFIC_STATUS = [
  { id: 't1', road: 'Diversion Road (Mandurriao–Ungka)', status: 'Heavy',    color: 'bg-red-500',    icon: '🔴', note: 'Bottleneck near SM City Iloilo flyover' },
  { id: 't2', road: 'Sen. Benigno Aquino Ave (SBAAVE)', status: 'Moderate', color: 'bg-yellow-400', icon: '🟡', note: 'School dismissal hours; expect slowdowns' },
  { id: 't3', road: 'Iznart–Aldeguer–Mabini Corridor',  status: 'Clear',    color: 'bg-green-500',  icon: '🟢', note: 'Normal flow' },
  { id: 't4', road: 'Circumferential Road (Jaro–Mandurriao)', status: 'Moderate', color: 'bg-yellow-400', icon: '🟡', note: 'Road works near QC Memorial Hospital' },
  { id: 't5', road: 'Q. Abeto St / Airport Road',       status: 'Clear',    color: 'bg-green-500',  icon: '🟢', note: 'Normal flow' },
  { id: 't6', road: 'Molo–Arevalo Road',                status: 'Heavy',    color: 'bg-red-500',    icon: '🔴', note: 'Market day congestion near Molo Plaza' },
]

export const JEEPNEY_REROUTES = [
  { id: 'jr1', route: 'Route 02 — Jaro–City Proper', status: 'Rerouted',  note: 'Via Lopez Jaena St due to road works on Rizal St.' },
  { id: 'jr2', route: 'Route 07 — Mandurriao–Molo',  status: 'Normal',    note: 'Regular route operational.' },
  { id: 'jr3', route: 'Route 11 — La Paz–Jaro',      status: 'Suspended', note: 'Temporarily suspended; alternative: Route 11A via Diversion Road.' },
]

export const EMERGENCY_CONTACTS = [
  { id: 'ec1', category: 'Disaster & Emergency', contacts: [
    { name: 'ICER (Iloilo City Emergency Response)', number: '(033) 320-0341', number2: '0917-302-7333' },
    { name: 'CDRRMO Iloilo City',                    number: '(033) 336-0226', number2: null },
    { name: 'NDRRMC Hotline',                        number: '911',            number2: '(02) 8911-1406' },
  ]},
  { id: 'ec2', category: 'Police', contacts: [
    { name: 'PNP Iloilo City Station',    number: '(033) 337-1300', number2: '0917-540-0400' },
    { name: 'PNP Emergency Hotline',      number: '911',            number2: null },
    { name: 'Anti-Cybercrime Group — WV', number: '(033) 509-8500', number2: null },
  ]},
  { id: 'ec3', category: 'Fire', contacts: [
    { name: 'BFP Iloilo City',     number: '(033) 337-1160', number2: '160' },
    { name: 'BFP Western Visayas', number: '(033) 508-8004', number2: null },
  ]},
  { id: 'ec4', category: 'Medical', contacts: [
    { name: 'Western Visayas Medical Center', number: '(033) 320-0982', number2: null },
    { name: 'Iloilo Mission Hospital',        number: '(033) 336-2741', number2: null },
    { name: 'St. Paul Hospital Iloilo',       number: '(033) 338-1027', number2: null },
  ]},
  { id: 'ec5', category: 'CSWDO Services', contacts: [
    { name: 'CSWDO Iloilo City (Main)',  number: '(033) 337-8405', number2: null },
    { name: 'CSWDO — Women & Children', number: '(033) 321-7834', number2: null },
    { name: 'CSWDO — PWD Affairs',      number: '(033) 337-8406', number2: null },
    { name: 'CSWDO — Solo Parents',     number: '(033) 337-8407', number2: null },
  ]},
  { id: 'ec6', category: 'Utilities', contacts: [
    { name: 'MORE Power (Emergency)', number: '(033) 509-8888', number2: null },
    { name: 'MIWD (Emergency)',       number: '(033) 337-8888', number2: null },
    { name: 'Iloilo City Gas',        number: '(033) 320-1111', number2: null },
  ]},
]

export const CSWDO_SERVICES = [
  {
    id: 'cs1',
    icon: '👩‍👧',
    name: 'Women & Children Protection',
    desc: 'VAWC case filing, temporary shelter, legal assistance',
    status: 'Open',
    hours: 'Mon–Fri 8AM–5PM (24/7 crisis)',
    contact: '(033) 321-7834',
    requirements: [
      'Valid government-issued ID',
      'Barangay blotter or police report (if available)',
      'Medical certificate (for physical injuries)',
    ],
    link: 'https://iloilocity.gov.ph',
  },
  {
    id: 'cs2',
    icon: '♿',
    name: 'PWD Affairs',
    desc: 'PWD ID issuance, livelihood, assistive devices',
    status: 'Open',
    hours: 'Mon–Fri 8AM–5PM',
    contact: '(033) 337-8406',
    requirements: [
      'Medical certificate from a licensed physician',
      'Recent 1x1 or 2x2 ID photo (2 copies)',
      'Valid government-issued ID of applicant or guardian',
      'Proof of residency (barangay certificate)',
    ],
    link: 'https://iloilocity.gov.ph',
  },
  {
    id: 'cs3',
    icon: '👴',
    name: 'Senior Citizens',
    desc: 'OSCA ID, social pension, assistance packages',
    status: 'Open',
    hours: 'Mon–Fri 8AM–5PM',
    contact: '(033) 337-8405',
    requirements: [
      'Birth certificate (PSA copy)',
      'Recent 1x1 ID photo (2 copies)',
      'Valid government-issued ID',
      'Proof of residency in Iloilo City',
    ],
    link: 'https://iloilocity.gov.ph',
  },
  {
    id: 'cs4',
    icon: '👶',
    name: 'Child & Youth Welfare',
    desc: 'DSWD referrals, Bahay Pag-asa, street children services',
    status: 'Open',
    hours: 'Mon–Fri 8AM–5PM',
    contact: '(033) 337-8405',
    requirements: [
      'Birth certificate of child (PSA copy)',
      'Parent or guardian valid ID',
      'Barangay certificate of indigency (if applicable)',
      'Referral letter (for DSWD-linked programs)',
    ],
    link: 'https://iloilocity.gov.ph',
  },
  {
    id: 'cs5',
    icon: '💼',
    name: 'Solo Parent Support',
    desc: 'Solo Parent ID, livelihood programs, counseling',
    status: 'Open',
    hours: 'Mon–Fri 8AM–5PM',
    contact: '(033) 337-8407',
    requirements: [
      'Duly accomplished Solo Parent application form',
      'Birth certificate of child/children (PSA copy)',
      'Proof of solo parenthood (death certificate, annulment decree, etc.)',
      'Barangay certificate of residency',
    ],
    link: 'https://iloilocity.gov.ph',
  },
  {
    id: 'cs6',
    icon: '🏠',
    name: 'Indigent Burial Assistance',
    desc: 'Financial aid for burial of indigent residents',
    status: 'Open',
    hours: 'Mon–Fri 8AM–5PM',
    contact: '(033) 337-8405',
    requirements: [
      'Death certificate of the deceased',
      'Barangay certificate of indigency',
      'Valid ID of the requesting family member',
      'Funeral home billing statement',
    ],
    link: 'https://iloilocity.gov.ph',
  },
]

export const KPI_STATS = [
  { id: 'k1', label: 'Active Alerts',     value: 2,  delta: '+1', deltaDir: 'up',   unit: '',   color: 'text-red-500' },
  { id: 'k2', label: 'Traffic Incidents', value: 4,  delta: '-2', deltaDir: 'down', unit: '',   color: 'text-yellow-500' },
  { id: 'k3', label: 'CSWDO Cases Today', value: 14, delta: '+3', deltaDir: 'up',   unit: '',   color: 'text-brand-600' },
  { id: 'k4', label: 'Heat Index',        value: 41, delta: '+3', deltaDir: 'up',   unit: '°C', color: 'text-orange-500' },
]

export const TRAFFIC_CHART_DATA = {
  labels: ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'],
  datasets: [
    { label: 'Diversion Road', data: [30,85,55,60,50,90,75,40], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',   tension: 0.4, fill: true },
    { label: 'SBAAVE',         data: [20,60,45,55,48,70,65,30], borderColor: '#eab308', backgroundColor: 'rgba(234,179,8,0.08)',   tension: 0.4, fill: true },
    { label: 'Molo–Arevalo',   data: [15,40,35,70,55,65,80,35], borderColor: '#01696f', backgroundColor: 'rgba(1,105,111,0.08)',   tension: 0.4, fill: true },
  ],
}

export const ILOILO_CENTER  = [10.6965, 122.5654]

export const TRAFFIC_POINTS = [
  { id: 'tp1', lat: 10.7202, lng: 122.5621, road: 'Diversion Road',     status: 'Heavy',    color: 'red',    note: 'Bottleneck near SM flyover' },
  { id: 'tp2', lat: 10.6985, lng: 122.572,  road: 'SBAAVE',             status: 'Moderate', color: 'orange', note: 'School dismissal slowdowns' },
  { id: 'tp3', lat: 10.69,   lng: 122.56,   road: 'Iznart Corridor',    status: 'Clear',    color: 'green',  note: 'Normal flow' },
  { id: 'tp4', lat: 10.71,   lng: 122.548,  road: 'Circumferential Rd', status: 'Moderate', color: 'orange', note: 'Road works near QC Memorial Hospital' },
  { id: 'tp5', lat: 10.683,  lng: 122.549,  road: 'Q. Abeto / Airport', status: 'Clear',    color: 'green',  note: 'Normal flow' },
  { id: 'tp6', lat: 10.675,  lng: 122.564,  road: 'Molo–Arevalo',       status: 'Heavy',    color: 'red',    note: 'Market day congestion near Molo Plaza' },
]
