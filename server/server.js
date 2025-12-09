// ---------------------- MODULES ----------------------
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import dgram from "dgram";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import QRCode from "qrcode";
import crypto from "crypto";
import os from "os";

// ---------------------- NETWORK UTILITIES ----------------------
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// ---------------------- PATH HELPERS ----------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- AUTHENTICATION SYSTEM ----------------------
let currentPassword = generatePassword();
let passwordCreatedAt = Date.now();
const PASSWORD_EXPIRY = 5 * 60 * 1000; // 5 minutes

function generatePassword() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function isPasswordValid() {
    return (Date.now() - passwordCreatedAt) < PASSWORD_EXPIRY;
}

function refreshPasswordIfNeeded() {
    if (!isPasswordValid()) {
        currentPassword = generatePassword();
        passwordCreatedAt = Date.now();
        console.log(`🔑 New password generated: ${currentPassword}`);
    }
}

// ---------------------- EXPRESS WEBSITE HOST ----------------------
const app = express();
const PORT = process.env.PORT || 10000;

// Detect production environment
const isProduction = process.env.RAILWAY_ENVIRONMENT !== undefined || process.env.NODE_ENV === 'production';

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isProduction, // Use secure cookies in production (HTTPS)
        maxAge: 30 * 60 * 1000, // 30 minutes
        sameSite: 'lax'
    }
}));

app.use(express.json());

// Serve your website folder statically
app.use(express.static(path.join(__dirname, "../website"))); 

// ---------------------- AUTHENTICATION ROUTES ----------------------

// Login endpoint
app.post('/api/login', (req, res) => {
    refreshPasswordIfNeeded();
    const { password } = req.body;
    
    if (password === currentPassword && isPasswordValid()) {
        req.session.authenticated = true;
        req.session.loginTime = Date.now();
        res.json({ success: true, message: 'Authentication successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid or expired password' });
    }
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
    res.json({ authenticated: req.session.authenticated || false });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Admin endpoint to get current password and QR code
app.get('/api/admin/password', async (req, res) => {
    refreshPasswordIfNeeded();
    
    const loginUrl = `${req.protocol}://${req.get('host')}/login.html?pwd=${currentPassword}`;
    
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(loginUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        const timeRemaining = PASSWORD_EXPIRY - (Date.now() - passwordCreatedAt);
        
        res.json({
            password: currentPassword,
            qrCode: qrCodeDataUrl,
            expiresIn: Math.floor(timeRemaining / 1000),
            createdAt: new Date(passwordCreatedAt).toLocaleString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Regenerate password manually
app.post('/api/admin/regenerate', (req, res) => {
    currentPassword = generatePassword();
    passwordCreatedAt = Date.now();
    console.log(`🔑 Password manually regenerated: ${currentPassword}`);
    res.json({ success: true, password: currentPassword });
});

// Health check for hosting providers
app.get('/health', (req, res) => res.send('ok'));

// Specific routes for pages
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../website/login.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../website/admin.html'));
});

app.get('/app.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../website/app.html'));
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../website/login.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
    // Detect if running on Railway or locally
    const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;
    const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN;
    const localIp = getLocalIpAddress();
    
    let baseUrl;
    let networkUrl;
    
    if (isRailway && railwayUrl) {
        baseUrl = `https://${railwayUrl}`;
        networkUrl = baseUrl;
    } else if (isRailway) {
        baseUrl = `https://your-app.railway.app`;
        networkUrl = baseUrl;
    } else {
        baseUrl = `http://localhost:${PORT}`;
        networkUrl = `http://${localIp}:${PORT}`;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 HTTP + WebSocket Server Running on Port ${PORT}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n🌍 Environment: ${isRailway ? 'Railway (Production)' : 'Local Development'}`);
    
    if (!isRailway) {
        console.log(`\n📱 Local Access URLs:`);
        console.log(`   👤 User Login:  ${baseUrl}/login.html`);
        console.log(`   🔐 Admin Panel: ${baseUrl}/admin.html`);
        console.log(`\n🌐 Network Access URLs (for VM/other devices):`);
        console.log(`   👤 User Login:  ${networkUrl}/login.html`);
        console.log(`   🔐 Admin Panel: ${networkUrl}/admin.html`);
        console.log(`   📡 Local IP:    ${localIp}`);
    } else {
        console.log(`\n📱 Access URLs:`);
        console.log(`   👤 User Login:  ${baseUrl}/login.html`);
        console.log(`   🔐 Admin Panel: ${baseUrl}/admin.html`);
    }
    
    console.log(`\n🔑 Current Password: ${currentPassword}`);
    console.log(`⏰ Password Expires: ${new Date(passwordCreatedAt + PASSWORD_EXPIRY).toLocaleTimeString()}`);
    console.log(`${'='.repeat(60)}\n`);
});

// ---------------------- WEBSOCKET SERVER ----------------------
const wss = new WebSocketServer({ server });

// ---------------------- UDP SETUP ----------------------
const udp = dgram.createSocket("udp4");
const ESP32_IP = "192.168.1.25";  // Change
const UDP_PORT = 5005;

// ---------------------- WS HANDLERS ----------------------
wss.on("connection", (ws) => {
    console.log("Website connected");

    ws.on("message", (data) => {
        udp.send(data, UDP_PORT, ESP32_IP);
    });
});
