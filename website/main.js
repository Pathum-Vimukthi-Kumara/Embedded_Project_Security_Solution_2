let ws;
let audioContext;
let mediaStream;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDiv = document.getElementById("status");
const instructionText = document.getElementById("instructionText");

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
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Microphone access not supported in this browser");
        }
        
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });

        console.log("Microphone access granted");
        console.log("Creating AudioContext...");
        audioContext = new AudioContext();

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
        
        if (error.name === 'NotAllowedError') {
            errorMessage = "Microphone access denied. Please allow microphone access in browser settings.";
        } else if (error.name === 'NotFoundError') {
            errorMessage = "No microphone found. Please connect a microphone.";
        } else if (error.name === 'NotReadableError') {
            errorMessage = "Microphone is in use by another application.";
        }
        
        updateStatus(errorMessage, "error");
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

// Log when script loads
console.log("Voice control script loaded successfully");
console.log("Location:", window.location.href);
console.log("Protocol:", location.protocol);
