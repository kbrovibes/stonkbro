# Custom Domain Setup: stonkbro.app

How we wired up `stonkbro.app` with SSL, Supabase auth, and Google SSO.

## What was done (automated)

### 1. Vercel — domain added

```bash
vercel domains add stonkbro.app
vercel domains add www.stonkbro.app
```

Both `stonkbro.app` and `www.stonkbro.app` are now registered to the Vercel project. SSL certificates provision automatically once DNS resolves.

### 2. Supabase — site URL and redirect allowlist updated

Via the Supabase Management API:

- **Site URL** set to `https://stonkbro.app`
- **URI allow list** set to:
  ```
  https://stonkbro.app/**
  https://www.stonkbro.app/**
  https://snobaddy.vercel.app/**
  ```

The `/auth/callback` route in the app uses `window.location.origin` dynamically — no code change was needed.

---

## Manual steps required

### 3. Cloudflare DNS — add A records

In the Cloudflare dashboard for `stonkbro.app`, add:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` (root) | `76.76.21.21` | Proxied (orange cloud) |
| A | `www` | `76.76.21.21` | Proxied (orange cloud) |

Once these propagate (~1–2 min on Cloudflare), Vercel will issue the SSL cert automatically.

### 4. Google Cloud Console — add authorized origin

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click the OAuth 2.0 Client ID used for stonkbro
3. Under **Authorized JavaScript origins**, add:
   - `https://stonkbro.app`
   - `https://www.stonkbro.app`
4. Save

> The redirect URI for Google OAuth points at Supabase (`https://zwwkcwdqsplztlmyfpyf.supabase.co/auth/v1/callback`) — it does **not** need to be updated.

---

## Architecture note

The Google SSO flow goes:

```
Browser → Supabase (signInWithOAuth) → Google → Supabase callback → App (/auth/callback)
```

Only Supabase's URL needs to be in Google's **redirect URIs**. Your app's domain only needs to be in **Authorized JavaScript origins** (for the initial OAuth request from the browser).

---

## Credentials involved

| Service | What changed |
|---------|-------------|
| Vercel | Domains added via CLI |
| Supabase project `zwwkcwdqsplztlmyfpyf` | `site_url`, `uri_allow_list` |
| Google Cloud OAuth client | JS origins (manual) |
| Cloudflare DNS | A records (manual) |
