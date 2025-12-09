# Voice Control Water Fountain - Secure Access System

## 🔐 Authentication System

This application now features a **dynamic one-time password system** with QR code authentication. Only authenticated users can access the voice control functionality.

## 📋 Features

- **Dynamic Password Generation**: Automatically generates secure 8-character passwords
- **QR Code Authentication**: Users can scan QR codes for instant login
- **Auto-Expiry**: Passwords expire after 5 minutes for enhanced security
- **Admin Dashboard**: Real-time password monitoring and management
- **Session Management**: Secure session handling with 30-minute timeout

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- All dependencies installed in both `/server` and `/website` folders

### Installation

1. Install server dependencies:
```bash
cd server
npm install
```

2. Install website dependencies (if any):
```bash
cd website
npm install
```

### Running the Application

Start the server:
```bash
cd server
npm start
```

The server will run on `http://localhost:10000`

## 📱 How to Use

### For Administrators:

1. **Access Admin Dashboard**
   - Navigate to: `http://localhost:10000/admin.html`
   - You'll see:
     - Current dynamic password (changes every 5 minutes)
     - QR code for quick user access
     - Password expiration timer
     - Password creation timestamp

2. **Share Access with Users**
   - Option 1: Show the QR code - users scan it with their phone camera
   - Option 2: Share the password manually
   - Option 3: Send the login URL with password parameter

3. **Manage Passwords**
   - **Refresh**: Update the display with current password info
   - **Generate New Password**: Immediately create a new password (invalidates current one)

### For Users:

1. **Login via QR Code**
   - Scan the QR code shown on admin dashboard
   - Automatically redirects to login page with password pre-filled
   - Click "Login" to access the app

2. **Manual Login**
   - Navigate to: `http://localhost:10000/login.html`
   - Enter the password provided by admin
   - Click "Login"

3. **Using the Voice Control**
   - After successful login, you'll be redirected to the voice control app
   - Click "Start Streaming" to begin voice control
   - Click "Stop Streaming" to end the session
   - Click "Logout" when done

## 🔒 Security Features

### Password System
- **Auto-Generation**: 8-character alphanumeric passwords
- **Time-Limited**: 5-minute expiration window
- **Single User**: Designed for one-user-at-a-time access
- **Session Cookies**: Secure session management

### Access Control
- All routes except login/admin require authentication
- Sessions expire after 30 minutes of inactivity
- Expired passwords are automatically rejected
- Logout invalidates session immediately

## 📂 File Structure

```
voice_05_12/
├── server/
│   ├── server.js           # Main server with authentication
│   └── package.json
├── website/
│   ├── login.html          # User login page
│   ├── admin.html          # Admin dashboard
│   ├── app.html            # Voice control application (protected)
│   ├── main.js             # Voice control logic
│   └── PCMProcessor.js     # Audio processing
├── package.json
└── README.md
```

## 🌐 Routes

| Route | Description | Authentication Required |
|-------|-------------|------------------------|
| `/` | Redirects to login | No |
| `/login.html` | User login page | No |
| `/admin.html` | Admin dashboard | No |
| `/app.html` | Voice control app | Yes |
| `/api/login` | Login endpoint | No |
| `/api/auth-status` | Check auth status | No |
| `/api/logout` | Logout endpoint | No |
| `/api/admin/password` | Get current password & QR | No |
| `/api/admin/regenerate` | Generate new password | No |

## 🛠️ API Endpoints

### POST `/api/login`
Login with password
```json
Request: { "password": "ABC12345" }
Response: { "success": true, "message": "Authentication successful" }
```

### GET `/api/auth-status`
Check if user is authenticated
```json
Response: { "authenticated": true }
```

### POST `/api/logout`
Logout current session
```json
Response: { "success": true }
```

### GET `/api/admin/password`
Get current password and QR code
```json
Response: {
  "password": "ABC12345",
  "qrCode": "data:image/png;base64,...",
  "expiresIn": 245,
  "createdAt": "12/9/2025, 10:30:45 AM"
}
```

### POST `/api/admin/regenerate`
Force generate new password
```json
Response: { "success": true, "password": "XYZ67890" }
```

## ⚙️ Configuration

### Password Expiry Time
Edit in `server/server.js`:
```javascript
const PASSWORD_EXPIRY = 5 * 60 * 1000; // 5 minutes (in milliseconds)
```

### Session Duration
Edit in `server/server.js`:
```javascript
cookie: { 
  maxAge: 30 * 60 * 1000 // 30 minutes (in milliseconds)
}
```

### Server Port
Edit in `server/server.js`:
```javascript
const PORT = process.env.PORT || 10000;
```

Or set environment variable:
```bash
$env:PORT=8080
npm start
```

## 🎯 Workflow Example

1. **Admin opens dashboard** → `http://localhost:10000/admin.html`
2. **Admin sees password**: `ABC12345` (expires in 4:58)
3. **User scans QR code** → Opens `http://localhost:10000/login.html?pwd=ABC12345`
4. **User clicks Login** → Authenticated ✓
5. **Redirected to app** → `http://localhost:10000/app.html`
6. **User controls fountain** → Voice streaming active
7. **User clicks Logout** → Session terminated

## 🔄 Auto-Refresh Features

### Admin Dashboard
- Password data refreshes every 30 seconds automatically
- Countdown timer updates every second
- Auto-regenerates password when expired

### Login Page
- Checks authentication status on load
- Auto-redirects if already logged in

### App Page
- Checks authentication before loading
- Redirects to login if not authenticated

## 🚨 Troubleshooting

### "Invalid or expired password"
- Password may have expired (5-minute limit)
- Check admin dashboard for current password
- Request admin to generate new password

### Cannot access app.html
- Ensure you're logged in via `/login.html`
- Check if session hasn't expired (30 minutes)
- Clear browser cookies and login again

### Server not starting
- Check if port 10000 is already in use
- Kill process using port: `netstat -ano | findstr :10000`
- Change PORT in server.js or use environment variable

## 📝 Notes

- Passwords are case-insensitive (converted to uppercase)
- QR codes contain direct login URLs with password parameter
- Session data is stored server-side (not in database)
- Restarting server will invalidate all active sessions
- Password changes every 5 minutes automatically

## 🔐 Security Best Practices

1. **For Production**:
   - Enable HTTPS and set `cookie.secure = true`
   - Use stronger password generation algorithm
   - Store sessions in database (e.g., Redis)
   - Add rate limiting for login attempts
   - Implement admin authentication
   - Use environment variables for secrets

2. **Current Implementation**:
   - Suitable for local/demo environments
   - Single-user access model
   - Time-limited passwords
   - Session-based authentication

## 📞 Support

For issues or questions, check the console logs:
- Server logs: Terminal running `node server.js`
- Client logs: Browser Developer Console (F12)

---

**Created**: December 2025  
**Version**: 1.0.0  
**License**: ISC
