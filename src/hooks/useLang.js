/**
 * useLang — Hiligaynon / English language toggle hook.
 *
 * Usage:
 *   const { lang, t } = useLang()
 *   <h2>{t('Weather', 'Panahon')}</h2>
 *
 * t(en, hil) returns:
 *   - hil string when lang === 'hil' AND hil is provided
 *   - en string otherwise (safe fallback)
 *
 * Components that already carry both strings inline (KpiBar, WeatherCard, etc.)
 * simply pass them through t() — no separate dictionary needed.
 */
import useStore from '../store/useStore'

export function useLang() {
  const lang = useStore((s) => s.lang)
  const t = (en, hil) => (lang === 'hil' && hil) ? hil : en
  return { lang, t }
}
