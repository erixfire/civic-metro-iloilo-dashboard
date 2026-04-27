// Operator-maintained Iloilo City fuel prices
// Update this file manually when LPCC/DOE/DTI Iloilo provide new monitoring data.
// Last updated: April 27, 2026 — reflecting post-April 14, 2026 major rollback prices.
// Source: DOE advisory + Inquirer/GMA Network price reports

export const ILOILO_FUEL = {
  asOf: '2026-04-27',
  gasoline: {
    min: 64.30,
    max: 67.50,
    avg: 65.80,
  },
  diesel: {
    min: 43.50,
    max: 48.90,
    avg: 46.20,
  },
  kerosene: {
    min: 61.00,
    max: 66.50,
    avg: 64.10,
  },
  notes:
    'Post-April 14, 2026 major rollback. Diesel down ~₱20.89/L, Gasoline down ~₱4.43/L, Kerosene down ~₱8.50/L (DOE/Marcos announcement). Ranges reflect typical Iloilo City pump variance.',
}
