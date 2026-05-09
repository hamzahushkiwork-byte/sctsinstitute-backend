# Railway Deployment Guide

## MongoDB Atlas + Railway: Fix 500 Errors / Connection Timeout

**If you see `MongoServerSelectionError: Socket 'secureConnect' timed out` or 500 errors on API routes**, Railway cannot reach MongoDB Atlas. Fix it in Atlas:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/) → your project → **Network Access** (left sidebar).
2. Click **Add IP Address**.
3. Click **Allow Access from Anywhere** (adds `0.0.0.0/0`).
4. Click **Confirm**.
5. Wait 1–2 minutes for the rule to apply.
6. In Railway, redeploy the service (or it will reconnect automatically).

Railway uses dynamic IPs, so you must allow all IPs (`0.0.0.0/0`) for Atlas to accept connections. Your database remains protected by username/password in `MONGODB_URI`.

---

## Deployment Steps
1. **Push your changes** to your GitHub repository.
2. **Link Railway to your Repository**:
   - Go to [Railway](https://railway.app/) and create a new project.
   - Select "Deploy from GitHub repo".
   - Choose your repository and the `backend` service.
3. **Environment Variables**:
   In Railway, go to **Service > Settings > Variables** and add:
   - `MONGODB_URI`: Your MongoDB connection string (e.g., MongoDB Atlas).
   - `NODE_ENV`: `production`
   - `PORT`: `8080` (Railway usually provides this automatically).
   - `CORS_ORIGIN`: Your frontend URL (e.g., `https://your-frontend-domain.up.railway.app`).
   - `JWT_ACCESS_SECRET`: A secure random string.
   - `JWT_REFRESH_SECRET`: A secure random string.
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `FRONTEND_URL` — **required for signup welcome emails** (Hostinger-style: port `465` + `EMAIL_SECURE=true`, or port `587` + `EMAIL_SECURE=false` with STARTTLS).
   - `FRONTEND_URL`: Public site URL used in the welcome email sign-in link (must match your deployed frontend).
   - `TEST_EMAIL_SECRET` (optional): If set in production, enables `GET /test-email?to=you@example.com&secret=<value>` for SMTP smoke tests. If unset in production, `/test-email` returns 403.
4. **Networking**:
   - Go to **Service > Settings > Domains**.
   - Click **Generate Domain**.
   - Railway will provide a public URL like `https://sctsinstitute-backend-production.up.railway.app`.

## Validation
Confirm the following endpoints work:
- `https://<your-railway-domain>/health` -> Returns `{ status: "ok" }`
- `https://<your-railway-domain>/` -> Returns service info.
- `https://<your-railway-domain>/api/v1` -> Should show your API routes or 404 (depending on routes).

## Logs
Check the Railway logs for:
- `🚀 Server running on port 8080`
- `✅ MongoDB connected`
- After signup: `Welcome email sent successfully:` or `Email configuration missing. Cannot send welcome email.` / `Failed to send welcome email:`## SMTP smoke test (optional)
After setting all `EMAIL_*` variables, redeploy, then:
- **Development**: `GET https://<backend>/test-email?to=your@email.com`
- **Production**: same URL plus `&secret=<TEST_EMAIL_SECRET>` when `TEST_EMAIL_SECRET` is set.