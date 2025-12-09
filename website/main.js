let ws;
let audioContext;
let mediaStream;

// Wait for DOM to be ready
function initializeVoiceControl() {
    console.log("Initializing voice control...");
    
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const statusDiv = document.getElementById("status");
    const instructionText = document.getElementById("instructionText");

    if (!startBtn || !stopBtn || !statusDiv) {
        console.error("Required elements not found!");
        return;
    }

    console.log("All elements found, setting up event listeners...");

    function updateStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status-${type}`;
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    startBtn.onclick = async () => {
        try {
            startBtn.disabled = true;
            updateStatus("Connecting to server...", "info");
            console.log("Starting connection process...");

            // Use the current host so the client works regardless of deploy URL
            const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${protocol}://${location.host}`;
            console.log(`WebSocket URL: ${wsUrl}`);
            
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("WebSocket connected successfully");
                updateStatus("Connected! Starting audio...", "connected");
                startAudio();
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                updateStatus("WebSocket connection error. Check server connection.", "error");
                startBtn.disabled = false;
            };

            ws.onclose = (event) => {
                console.log("WebSocket closed:", event.code, event.reason);
                updateStatus("Disconnected from server", "error");
                stopStreaming();
            };

        } catch (error) {
            console.error("Connection error:", error);
            updateStatus("Error: " + error.message, "error");
            startBtn.disabled = false;
        }
    };

    stopBtn.onclick = () => {
        console.log("Stop button clicked");
        stopStreaming();
    };

    async function startAudio() {
        try {
            console.log("Requesting microphone access...");
            console.log("navigator.mediaDevices:", navigator.mediaDevices);
            console.log("getUserMedia:", navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : 'undefined');
            
            // Check if getUserMedia is supported (with fallback for older browsers)
            let getUserMedia = null;
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            } else if (navigator.getUserMedia) {
                getUserMedia = navigator.getUserMedia.bind(navigator);
            } else if (navigator.webkitGetUserMedia) {
                getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
            } else if (navigator.mozGetUserMedia) {
                getUserMedia = navigator.mozGetUserMedia.bind(navigator);
            }
            
            if (!getUserMedia) {
                // Check if it's an HTTPS issue
                if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                    throw new Error("Microphone requires HTTPS. Please access via localhost or use HTTPS.");
                }
                throw new Error("Microphone access not supported in this browser. Try Chrome, Firefox, or Edge.");
            }
            
            console.log("getUserMedia method found, requesting access...");
            
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            // Try modern API first
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            } else {
                // Fallback for older browsers
                mediaStream = await new Promise((resolve, reject) => {
                    getUserMedia(constraints, resolve, reject);
                });
            }

            console.log("Microphone access granted");
            console.log("MediaStream:", mediaStream);
            console.log("Creating AudioContext...");
            
            // Create AudioContext with fallback
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error("AudioContext not supported in this browser");
            }
            
            audioContext = new AudioContextClass();
            console.log("AudioContext state:", audioContext.state);

            console.log("Loading PCM processor...");
            await audioContext.audioWorklet.addModule("PCMProcessor.js");
            
            const source = audioContext.createMediaStreamSource(mediaStream);
            const processor = new AudioWorkletNode(audioContext, "pcm-processor");

            processor.port.onmessage = (event) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                }
            };

            source.connect(processor);
            
            console.log("Audio streaming started successfully");
            updateStatus("🎤 Streaming audio to ESP32...", "connected");
            
            if (instructionText) {
                instructionText.textContent = "Click Stop Streaming to end streaming.";
            }
            
            startBtn.style.display = "none";
            stopBtn.style.display = "inline-block";

        } catch (error) {
            console.error("Audio setup error:", error);
            let errorMessage = "Microphone error: " + error.message;
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = "❌ Microphone access denied. Please:\n1. Click the lock icon in address bar\n2. Allow microphone access\n3. Refresh and try again";
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = "❌ No microphone found. Please connect a microphone and try again.";
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = "❌ Microphone is in use by another application. Close other apps using microphone.";
            } else if (error.message.includes('HTTPS')) {
                errorMessage = "⚠️ HTTPS Required!\n\nMicrophone access requires HTTPS when not on localhost.\n\nOptions:\n1. Access via: http://localhost:10000\n2. Set up HTTPS/SSL certificate\n3. Use Chrome with --unsafely-treat-insecure-origin-as-secure flag";
            } else if (error.message.includes('not supported')) {
                errorMessage = "❌ Browser Not Supported!\n\nYour browser doesn't support microphone access.\n\nPlease use:\n• Google Chrome (recommended)\n• Mozilla Firefox\n• Microsoft Edge\n\nCurrent browser: " + navigator.userAgent;
            }
            
            updateStatus(errorMessage, "error");
            alert(errorMessage); // Show alert for critical errors
            stopStreaming();
        }
    }

    function stopStreaming() {
        console.log("Stopping streaming...");
        
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                track.stop();
                console.log("Audio track stopped");
            });
            mediaStream = null;
        }
        
        if (audioContext) {
            audioContext.close();
            console.log("AudioContext closed");
            audioContext = null;
        }
        
        if (ws) {
            ws.close();
            console.log("WebSocket closed");
            ws = null;
        }
        
        startBtn.style.display = "inline-block";
        startBtn.disabled = false;
        stopBtn.style.display = "none";
        
        if (instructionText) {
            instructionText.textContent = "Click Start Streaming to begin voice control.";
        }
        
        updateStatus("Streaming stopped. Awaiting user input...", "info");
    }

    // Log initialization complete
    console.log("Voice control initialized successfully");
    updateStatus("Ready! Click Start Streaming to begin.", "info");
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVoiceControl);
} else {
    initializeVoiceControl();
}

// Log when script loads
console.log("Voice control script loaded");
console.log("Location:", window.location.href);
console.log("Protocol:", location.protocol);
