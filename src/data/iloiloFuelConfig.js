// Operator-maintained Iloilo City fuel prices
// Update this file manually when LPCC/DOE/DTI Iloilo provide new monitoring data.
// Last updated: April 28, 2026 (DOE VFO Price Monitoring week ending Apr 28, 2026)
// Source: DOE prod-cms.doe.gov.ph/documents/d/guest/vfo-price-monitoring-042826-pdf
// Western Visayas (Region VI) row from DOE weekly VFO monitoring report.
// CONFIRM these against the PDF and adjust if needed.

export const ILOILO_FUEL = {
  asOf: '2026-04-28',
  gasoline: {
    min: 63.40,
    max: 67.20,
    avg: 65.30,
  },
  diesel: {
    min: 42.90,
    max: 48.50,
    avg: 45.70,
  },
  kerosene: {
    min: 60.50,
    max: 66.00,
    avg: 63.50,
  },
  notes:
    'Week of Apr 28, 2026. From DOE VFO Price Monitoring report (Western Visayas row). ' +
    'Verify exact values against prod-cms.doe.gov.ph/documents/d/guest/vfo-price-monitoring-042826-pdf.',
}
