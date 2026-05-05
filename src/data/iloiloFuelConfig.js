// Iloilo City fuel prices — sourced directly from DOE VFO Price Monitoring Report
// Date of Monitoring: April 28 – May 4, 2026
// Source: DOE Oil Industry Management Bureau
//   prod-cms.doe.gov.ph/documents/d/guest/vfo-price-monitoring-042826-pdf
// Reference: ILOILO CITY row, page 2 of the PDF.
//
// RON 95 (Gasoline)  — Overall Range ₱76.00–₱91.00 | Common Price ₱79.00
// RON 91             — Overall Range ₱75.50–₱90.00 | Common Price ₱78.00
// Diesel             — Overall Range ₱76.50–₱83.90 | Common Price ₱78.30
// Diesel Plus        — ₱81.30–₱97.00
// Kerosene           — Petron ₱123.90 / Independent ₱131–₱132

export const ILOILO_FUEL = {
  asOf: '2026-04-28',

  // Gasoline = RON 95 (most common unleaded grade at pump)
  gasoline: {
    min: 76.00,   // cheapest observed (Total)
    max: 91.00,   // most expensive (Caltex RON 95)
    avg: 79.00,   // DOE Common Price for RON 95 Iloilo City
  },

  diesel: {
    min: 76.50,   // cheapest observed (Flying V)
    max: 83.90,   // most expensive (Shell)
    avg: 78.30,   // DOE Common Price for Diesel Iloilo City
  },

  kerosene: {
    min: 123.90,  // Petron
    max: 132.00,  // Independent dealers
    avg: 127.95,  // midpoint
  },

  notes:
    'Iloilo City row — DOE VFO Price Monitoring, April 28–May 4 2026 (PDF page 2). ' +
    'Gasoline avg = RON 95 DOE Common Price. Diesel avg = Diesel DOE Common Price. ' +
    'Kerosene avg = midpoint of Petron (₱123.90) and independent range (₱131–132).',
}
