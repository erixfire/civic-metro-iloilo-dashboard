/**
 * communityKitchenConfig.js
 * ─────────────────────────
 * Central data file for CSWDO Community Kitchen Feeding Program.
 * Edit this file to update kitchen sites, daily logs, and targets.
 *
 * Tier 4 upgrade path: replace with D1-backed admin form + API endpoint.
 */

// Active kitchen feeding sites
export const KITCHEN_SITES = [
  { id: 'ck1', name: 'Jaro Evacuation Center',       barangay: 'Jaro',          address: 'Jaro Sports Complex, Iloilo City' },
  { id: 'ck2', name: 'La Paz Community Kitchen',      barangay: 'La Paz',        address: 'La Paz Covered Court, La Paz' },
  { id: 'ck3', name: 'Molo Feeding Station',          barangay: 'Molo',          address: 'Molo Plaza Grounds, Molo' },
  { id: 'ck4', name: 'City Proper Feeding Hub',       barangay: 'City Proper',   address: 'CSWDO Main Office, Gen. Luna St.' },
  { id: 'ck5', name: 'Mandurriao Mobile Kitchen',     barangay: 'Mandurriao',    address: 'Mandurriao Barangay Hall' },
  { id: 'ck6', name: 'Arevalo Coastal Kitchen',       barangay: 'Arevalo',       address: 'Arevalo Gym, Arevalo' },
]

// Daily feeding log — last 14 days (April 14–27, 2026)
// families: households served | individuals: total persons fed
export const FEEDING_DAILY_LOG = [
  { date: '2026-04-14', families: 312, individuals: 1248, sites: 4, meals: 'Lunch & Merienda' },
  { date: '2026-04-15', families: 298, individuals: 1192, sites: 4, meals: 'Lunch & Merienda' },
  { date: '2026-04-16', families: 335, individuals: 1340, sites: 5, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-17', families: 341, individuals: 1364, sites: 5, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-18', families: 289, individuals: 1156, sites: 4, meals: 'Lunch & Merienda' },
  { date: '2026-04-19', families: 301, individuals: 1204, sites: 4, meals: 'Lunch & Merienda' },
  { date: '2026-04-20', families: 360, individuals: 1440, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-21', families: 375, individuals: 1500, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-22', families: 390, individuals: 1560, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-23', families: 402, individuals: 1608, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-24', families: 415, individuals: 1660, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-25', families: 428, individuals: 1712, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-26', families: 440, individuals: 1760, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
  { date: '2026-04-27', families: 455, individuals: 1820, sites: 6, meals: 'Breakfast, Lunch & Merienda' },
]

// Per-site breakdown for today (latest day)
export const FEEDING_BY_SITE_TODAY = [
  { siteId: 'ck1', siteName: 'Jaro',          families: 95,  individuals: 380 },
  { siteId: 'ck2', siteName: 'La Paz',         families: 82,  individuals: 328 },
  { siteId: 'ck3', siteName: 'Molo',           families: 70,  individuals: 280 },
  { siteId: 'ck4', siteName: 'City Proper',    families: 88,  individuals: 352 },
  { siteId: 'ck5', siteName: 'Mandurriao',     families: 65,  individuals: 260 },
  { siteId: 'ck6', siteName: 'Arevalo',        families: 55,  individuals: 220 },
]

// Program targets
export const KITCHEN_TARGETS = {
  dailyFamilyTarget:     500,
  dailyIndividualTarget: 2000,
  programStartDate:      '2026-04-14',
  programEndDate:        '2026-05-14',
  fundingSource:         'City Government of Iloilo — DRRMF & CSWDO Budget',
  programName:           'CSWDO Community Kitchen Feeding Program — Heat & Calamity Response 2026',
}

// Cumulative totals (auto-computed from log)
export const KITCHEN_TOTALS = FEEDING_DAILY_LOG.reduce(
  (acc, d) => ({ families: acc.families + d.families, individuals: acc.individuals + d.individuals }),
  { families: 0, individuals: 0 },
)
