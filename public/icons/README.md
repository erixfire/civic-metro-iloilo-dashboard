# PWA Icons

Place the following icon files in this directory before deploying to production:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192×192 px | Android home screen, PWA install prompt |
| `icon-512.png` | 512×512 px | Splash screen, high-DPI displays |

## Design guidelines
- Use the brand teal color `#01696f` as background.
- Place the "IC" (Iloilo City) or city seal in the center.
- Save as PNG with transparency mask so `maskable` icons look correct.

## Quick generation (Node)
```bash
npx pwa-asset-generator logo.svg public/icons \
  --icon-only --maskable --background "#01696f" \
  --padding "15%"
```

Until real icons are placed, the PWA will still install but show a default browser icon.
