let ws;
let audioContext;
let mediaStream;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDiv = document.getElementById("status");

function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status-${type}`;
    console.log(message);
}

startBtn.onclick = async () => {
    try {
        startBtn.disabled = true;
        updateStatus("Connecting to server...", "info");

        // Use the current host so the client works regardless of deploy URL
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${location.host}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            updateStatus("Connected! Starting audio...", "connected");
            startAudio();
        };

        ws.onerror = (error) => {
            updateStatus("WebSocket error occurred", "error");
            console.error("WebSocket error:", error);
            startBtn.disabled = false;
        };

        ws.onclose = () => {
            updateStatus("Disconnected from server", "error");
            stopStreaming();
        };

    } catch (error) {
        updateStatus("Error: " + error.message, "error");
        console.error(error);
        startBtn.disabled = false;
    }
};

stopBtn.onclick = () => {
    stopStreaming();
};

async function startAudio() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });

        audioContext = new AudioContext();

        await audioContext.audioWorklet.addModule("PCMProcessor.js");
        const source = audioContext.createMediaStreamSource(mediaStream);
        const processor = new AudioWorkletNode(audioContext, "pcm-processor");

        processor.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };

        source.connect(processor);
        
        updateStatus("🎤 Streaming audio to ESP32...", "connected");
        instructionText.textContent = "Click Stop Streaming to end streaming.";
        startBtn.style.display = "none";
        stopBtn.style.display = "inline-block";

    } catch (error) {
        updateStatus("Microphone access denied or error: " + error.message, "error");
        console.error(error);
        stopStreaming();
    }
}

function stopStreaming() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    if (ws) {
        ws.close();
        ws = null;
    }
    
    startBtn.style.display = "inline-block";
    startBtn.disabled = false;
    stopBtn.style.display = "none";
    instructionText.textContent = "Click Start Streaming to begin voice control.";
    updateStatus("Streaming stopped. Awaiting user input...", "info");
}
