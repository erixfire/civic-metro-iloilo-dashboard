# Cloudflare Access Setup — Admin Route Protection

## Goal
Protect `/admin*` and `/api/*` write operations so only authorized Iloilo City operators can access them.

---

## Step-by-Step

### 1. Enable Zero Trust
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select your account → **Zero Trust** (left sidebar)
3. If first time: choose a team name e.g. `iloilocity`

### 2. Create an Application
1. Zero Trust → **Access** → **Applications** → **Add an application**
2. Choose **Self-hosted**
3. Fill in:
   - **Name:** `Civic Dashboard Admin`
   - **Session duration:** `24 hours`
   - **Application domain:** `civic-metro-iloilo-dashboard.pages.dev`
   - **Path:** `admin` (protects `/admin*` only)
4. Click **Next**

### 3. Create a Policy
1. **Policy name:** `Iloilo City Operators`
2. **Action:** Allow
3. **Include rule:** Emails ending in `@iloilocity.gov.ph`
   - OR add specific personal emails for testing
4. Click **Save**

### 4. API Write Protection (Optional)
To also protect `/api/` write endpoints behind a service token:
1. Zero Trust → **Access** → **Service Auth** → **Create Service Token**
2. Name: `civic-dashboard-api-write`
3. Copy the **Client ID** and **Client Secret**
4. In each write handler, check for the `CF-Access-Client-Id` header:

```js
// In any POST/PATCH handler
const clientId = request.headers.get('CF-Access-Client-Id')
if (clientId !== env.CF_ACCESS_CLIENT_ID) {
  return new Response('Unauthorized', { status: 401 })
}
```

5. Add to `wrangler.toml`:
```toml
[vars]
CF_ACCESS_CLIENT_ID = "your-client-id-here"
```

### 5. Test
1. Open a private browser tab
2. Navigate to `https://civic-metro-iloilo-dashboard.pages.dev/admin`
3. You should see the Cloudflare Access email OTP screen
4. Enter an authorized email → receive OTP → access granted

---

## Notes
- The Pages deployment itself is still public for the main dashboard
- Only `/admin*` path is behind Access — the public dashboard remains open
- Session cookies last 24h by default; adjust in the application settings
- No code changes needed for the Access gate — Cloudflare handles it at the edge
