# 🚂 Railway Deployment Guide

## Automatic URL Detection

The server automatically detects whether it's running locally or on Railway and displays the correct URLs in the logs.

### Local Development
When running locally, you'll see:
```
🌍 Environment: Local Development

📱 Access URLs:
   👤 User Login:  http://localhost:10000/login.html
   🔐 Admin Panel: http://localhost:10000/admin.html
```

### Railway Production
When deployed on Railway, you'll see:
```
🌍 Environment: Railway (Production)

📱 Access URLs:
   👤 User Login:  https://your-app.up.railway.app/login.html
   🔐 Admin Panel: https://your-app.up.railway.app/admin.html
```

## Railway Environment Variables

Railway automatically provides:
- `RAILWAY_ENVIRONMENT` - Indicates Railway environment
- `RAILWAY_PUBLIC_DOMAIN` - Your app's public domain
- `PORT` - The port Railway assigns (usually dynamic)

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Add authentication system"
git push origin master
```

### 2. Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `Embedded_Project_Security_Solution_2`
4. Railway will automatically detect Node.js and deploy

### 3. Configure Settings (Optional)
Railway will use the `railway.json` configuration:
- Build Command: `cd server && npm install`
- Start Command: `cd server && npm start`
- Restart Policy: ON_FAILURE with 10 retries

### 4. Get Your URLs
After deployment, check the Railway logs to see:
- Your app's public URL
- Current admin password
- Admin panel and user login links

## QR Code Behavior

The QR code automatically adjusts based on environment:

**Local:**
```
QR Code → http://localhost:10000/login.html?pwd=ABC12345
```

**Railway:**
```
QR Code → https://your-app.up.railway.app/login.html?pwd=ABC12345
```

The server detects the request protocol and hostname to generate the correct QR code URL.

## WebSocket Connection

The client (`main.js`) automatically uses the correct WebSocket protocol:

**Local:**
```javascript
ws://localhost:10000
```

**Railway (HTTPS):**
```javascript
wss://your-app.up.railway.app
```

This is handled automatically in `main.js`:
```javascript
const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
const wsUrl = `${protocol}://${location.host}`;
```

## Session Cookies

For Railway (HTTPS), update `server.js` session config:

```javascript
cookie: { 
    secure: process.env.RAILWAY_ENVIRONMENT ? true : false,
    maxAge: 30 * 60 * 1000
}
```

This ensures cookies work properly over HTTPS on Railway.

## Testing Railway Deployment Locally

You can test Railway-like behavior locally by setting environment variables:

```powershell
$env:RAILWAY_ENVIRONMENT="production"
$env:RAILWAY_PUBLIC_DOMAIN="localhost:10000"
cd server
node server.js
```

You should see:
```
🌍 Environment: Railway (Production)
```

## Troubleshooting

### Issue: URLs show localhost on Railway
**Solution:** Railway should automatically set `RAILWAY_PUBLIC_DOMAIN`. Check Railway dashboard → Variables.

### Issue: WebSocket connection fails on Railway
**Solution:** Ensure your Railway service has WebSocket support enabled (it's enabled by default).

### Issue: Session cookies not working on Railway
**Solution:** Make sure `cookie.secure` is set to `true` for production:
```javascript
cookie: { 
    secure: process.env.RAILWAY_ENVIRONMENT !== undefined,
    maxAge: 30 * 60 * 1000
}
```

## Accessing Your App on Railway

Once deployed, Railway provides a URL like:
- `https://your-app-name.up.railway.app`
- `https://your-custom-domain.com` (if you added a custom domain)

### Quick Access Links:
- **Admin Dashboard:** `https://your-app.up.railway.app/admin.html`
- **User Login:** `https://your-app.up.railway.app/login.html`
- **Voice Control:** `https://your-app.up.railway.app/app.html` (requires login)

## Security Notes for Production

When deploying to Railway, consider:

1. **HTTPS Only:** Railway provides HTTPS by default
2. **Environment Variables:** Store sensitive data in Railway environment variables
3. **Session Secret:** Use a strong random secret:
   ```javascript
   secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
   ```
4. **Rate Limiting:** Consider adding rate limiting for login attempts
5. **Admin Protection:** Add admin authentication for production

## Monitoring

Check Railway logs to see:
- Server startup with URLs
- Password generation events
- User login attempts
- WebSocket connections
- Any errors or issues

Access logs via:
- Railway Dashboard → Your Service → Logs
- Or use Railway CLI: `railway logs`

---

**Note:** The server automatically adapts to the environment, so the same code works both locally and on Railway without any changes!
