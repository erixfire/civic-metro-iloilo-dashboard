// ─── MOCK DATA — Civic Metro Iloilo Dashboard ───────────────────────────────

export const WEATHER = {
  city: 'Iloilo City',
  temp: 32,
  feelsLike: 38,
  heatIndex: 'Danger',
  heatIndexColor: 'text-red-500',
  condition: 'Partly Cloudy',
  humidity: 78,
  windSpeed: 14,
  windDir: 'NE',
  uvIndex: 9,
  visibility: 10,
  updatedAt: new Date().toISOString(),
}

export const TIDE = {
  river: 'Iloilo River',
  currentLevel: 1.4,  // meters
  unit: 'm',
  status: 'Normal',
  statusColor: 'text-green-500',
  highTide: { time: '06:42', level: 2.1 },
  lowTide: { time: '13:15', level: 0.3 },
  updatedAt: new Date().toISOString(),
}

export const UTILITY_ALERTS = [
  {
    id: 'ua1',
    type: 'power',
    provider: 'MORE Power',
    severity: 'warning',
    title: 'Scheduled Power Interruption',
    areas: ['La Paz District', 'Jaro Blvd', 'Ungka Rd'],
    date: '2026-04-18',
    timeFrom: '08:00',
    timeTo: '17:00',
    reason: 'Scheduled maintenance of 69KV transmission line.',
    contactNo: '(033) 509-8888',
  },
  {
    id: 'ua2',
    type: 'water',
    provider: 'MIWD',
    severity: 'info',
    title: 'Low Water Pressure Advisory',
    areas: ['Molo', 'Mandurriao', 'Arevalo'],
    date: '2026-04-17',
    timeFrom: '22:00',
    timeTo: '06:00',
    reason: 'Pump rehabilitation works at Sta. Barbara treatment plant.',
    contactNo: '(033) 337-8888',
  },
  {
    id: 'ua3',
    type: 'power',
    provider: 'MORE Power',
    severity: 'info',
    title: 'Restored — City Proper Outage',
    areas: ['City Proper', 'Iznart St', 'Quezon St'],
    date: '2026-04-17',
    timeFrom: '00:00',
    timeTo: '04:30',
    reason: 'Emergency line repair completed.',
    contactNo: '(033) 509-8888',
  },
]

export const TRAFFIC_STATUS = [
  { id: 't1', road: 'Diversion Road (Mandurriao–Ungka)', status: 'Heavy', color: 'bg-red-500', icon: '🔴', note: 'Bottleneck near SM City Iloilo flyover' },
  { id: 't2', road: 'Sen. Benigno Aquino Ave (SBAAVE)', status: 'Moderate', color: 'bg-yellow-400', icon: '🟡', note: 'School dismissal hours; expect slowdowns' },
  { id: 't3', road: 'Iznart–Aldeguer–Mabini Corridor', status: 'Clear', color: 'bg-green-500', icon: '🟢', note: 'Normal flow' },
  { id: 't4', road: 'Circumferential Road (Jaro–Mandurriao)', status: 'Moderate', color: 'bg-yellow-400', icon: '🟡', note: 'Road works near QC Memorial Hospital' },
  { id: 't5', road: 'Q. Abeto St / Airport Road', status: 'Clear', color: 'bg-green-500', icon: '🟢', note: 'Normal flow' },
  { id: 't6', road: 'Molo–Arevalo Road', status: 'Heavy', color: 'bg-red-500', icon: '🔴', note: 'Market day congestion near Molo Plaza' },
]

export const JEEPNEY_REROUTES = [
  { id: 'jr1', route: 'Route 02 — Jaro–City Proper', status: 'Rerouted', note: 'Via Lopez Jaena St due to road works on Rizal St.' },
  { id: 'jr2', route: 'Route 07 — Mandurriao–Molo', status: 'Normal', note: 'Regular route operational.' },
  { id: 'jr3', route: 'Route 11 — La Paz–Jaro', status: 'Suspended', note: 'Temporarily suspended; alternative: Route 11A via Diversion Road.' },
]

export const EMERGENCY_CONTACTS = [
  {
    id: 'ec1',
    category: 'Disaster & Emergency',
    contacts: [
      { name: 'ICER (Iloilo City Emergency Response)', number: '(033) 320-0341', number2: '0917-302-7333' },
      { name: 'CDRRMO Iloilo City', number: '(033) 336-0226', number2: null },
      { name: 'NDRRMC Hotline', number: '911', number2: '(02) 8911-1406' },
    ],
  },
  {
    id: 'ec2',
    category: 'Police',
    contacts: [
      { name: 'PNP Iloilo City Station', number: '(033) 337-1300', number2: '0917-540-0400' },
      { name: 'PNP Emergency Hotline', number: '911', number2: null },
      { name: 'Anti-Cybercrime Group — WV', number: '(033) 509-8500', number2: null },
    ],
  },
  {
    id: 'ec3',
    category: 'Fire',
    contacts: [
      { name: 'BFP Iloilo City', number: '(033) 337-1160', number2: '160' },
      { name: 'BFP Western Visayas', number: '(033) 508-8004', number2: null },
    ],
  },
  {
    id: 'ec4',
    category: 'Medical',
    contacts: [
      { name: 'Western Visayas Medical Center', number: '(033) 320-0982', number2: null },
      { name: 'Iloilo Mission Hospital', number: '(033) 336-2741', number2: null },
      { name: 'St. Paul Hospital Iloilo', number: '(033) 338-1027', number2: null },
    ],
  },
  {
    id: 'ec5',
    category: 'CSWDO Services',
    contacts: [
      { name: 'CSWDO Iloilo City (Main)', number: '(033) 337-8405', number2: null },
      { name: 'CSWDO — Women & Children', number: '(033) 321-7834', number2: null },
      { name: 'CSWDO — PWD Affairs', number: '(033) 337-8406', number2: null },
      { name: 'CSWDO — Solo Parents', number: '(033) 337-8407', number2: null },
    ],
  },
  {
    id: 'ec6',
    category: 'Utilities',
    contacts: [
      { name: 'MORE Power (Emergency)', number: '(033) 509-8888', number2: null },
      { name: 'MIWD (Emergency)', number: '(033) 337-8888', number2: null },
      { name: 'Iloilo City Gas', number: '(033) 320-1111', number2: null },
    ],
  },
]

export const CSWDO_SERVICES = [
  { id: 'cs1', icon: '👩‍👧', name: 'Women & Children Protection', desc: 'VAWC case filing, temporary shelter, legal assistance', status: 'Open', hours: 'Mon–Fri 8AM–5PM (24/7 crisis)' },
  { id: 'cs2', icon: '♿', name: 'PWD Affairs', desc: 'PWD ID issuance, livelihood, assistive devices', status: 'Open', hours: 'Mon–Fri 8AM–5PM' },
  { id: 'cs3', icon: '👴', name: 'Senior Citizens', desc: 'OSCA ID, social pension, assistance packages', status: 'Open', hours: 'Mon–Fri 8AM–5PM' },
  { id: 'cs4', icon: '👶', name: 'Child & Youth Welfare', desc: 'DSWD referrals, Bahay Pag-asa, street children services', status: 'Open', hours: 'Mon–Fri 8AM–5PM' },
  { id: 'cs5', icon: '💼', name: 'Solo Parent Support', desc: 'Solo Parent ID, livelihood programs, counseling', status: 'Open', hours: 'Mon–Fri 8AM–5PM' },
  { id: 'cs6', icon: '🏠', name: 'Indigent Burial Assistance', desc: 'Financial aid for burial of indigent residents', status: 'Open', hours: 'Mon–Fri 8AM–5PM' },
]

export const KPI_STATS = [
  { id: 'k1', label: 'Active Alerts', value: 2, delta: '+1', deltaDir: 'up', unit: '', color: 'text-red-500' },
  { id: 'k2', label: 'Traffic Incidents', value: 4, delta: '-2', deltaDir: 'down', unit: '', color: 'text-yellow-500' },
  { id: 'k3', label: 'CSWDO Cases Today', value: 14, delta: '+3', deltaDir: 'up', unit: '', color: 'text-brand-600' },
  { id: 'k4', label: 'Temp (°C)', value: 32, delta: '+1', deltaDir: 'up', unit: '°C', color: 'text-orange-500' },
]

export const TRAFFIC_CHART_DATA = {
  labels: ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'],
  datasets: [
    {
      label: 'Diversion Road',
      data: [30, 85, 55, 60, 50, 90, 75, 40],
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239,68,68,0.08)',
      tension: 0.4,
      fill: true,
    },
    {
      label: 'SBAAVE',
      data: [20, 60, 45, 55, 48, 70, 65, 30],
      borderColor: '#eab308',
      backgroundColor: 'rgba(234,179,8,0.08)',
      tension: 0.4,
      fill: true,
    },
    {
      label: 'Molo–Arevalo',
      data: [15, 40, 35, 70, 55, 65, 80, 35],
      borderColor: '#01696f',
      backgroundColor: 'rgba(1,105,111,0.08)',
      tension: 0.4,
      fill: true,
    },
  ],
}

export const ILOILO_CENTER = [10.6965, 122.5654] // Iloilo City coordinates

export const TRAFFIC_POINTS = [
  { id: 'tp1', lat: 10.7202, lng: 122.5621, road: 'Diversion Road', status: 'Heavy', color: 'red' },
  { id: 'tp2', lat: 10.6985, lng: 122.572, road: 'SBAAVE', status: 'Moderate', color: 'orange' },
  { id: 'tp3', lat: 10.69, lng: 122.56, road: 'Iznart Corridor', status: 'Clear', color: 'green' },
  { id: 'tp4', lat: 10.71, lng: 122.548, road: 'Circumferential Rd', status: 'Moderate', color: 'orange' },
  { id: 'tp5', lat: 10.683, lng: 122.549, road: 'Q. Abeto / Airport', status: 'Clear', color: 'green' },
  { id: 'tp6', lat: 10.675, lng: 122.564, road: 'Molo–Arevalo', status: 'Heavy', color: 'red' },
]
