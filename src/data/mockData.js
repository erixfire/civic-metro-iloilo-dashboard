// Mock data omitted here for brevity in this tool call
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
  currentLevel: 1.4,
  unit: 'm',
  status: 'Normal',
  statusColor: 'text-green-500',
  highTide: { time: '06:42', level: 2.1 },
  lowTide: { time: '13:15', level: 0.3 },
  updatedAt: new Date().toISOString(),
}

export const UTILITY_ALERTS = []

export const TRAFFIC_STATUS = []

export const JEEPNEY_REROUTES = []

export const EMERGENCY_CONTACTS = []

export const CSWDO_SERVICES = []

export const KPI_STATS = []

export const TRAFFIC_CHART_DATA = { labels: [], datasets: [] }

export const ILOILO_CENTER = [10.6965, 122.5654]

export const TRAFFIC_POINTS = []
