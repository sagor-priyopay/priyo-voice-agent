class VoiceAgentApp {
    constructor() {
        this.ui = new UIController();
        this.ws = new WebSocketClient();
        this.webrtc = new WebRTCClient(this.ws);
        this.audio = new AudioProcessor();
        
        this.isInitialized = false;
        this.isSessionActive = false;
        
        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        // UI event handlers
        this.ui.onStartConversation = () => this.startConversation();
        this.ui.onStopConversation = () => this.stopConversation();
        this.ui.onToggleMute = () => this.toggleMute();
        
        // WebSocket event handlers
        this.ws.onConnect = () => this.handleWebSocketConnect();
        this.ws.onDisconnect = () => this.handleWebSocketDisconnect();
        this.ws.onMessage = (data) => this.handleWebSocketMessage(data);
        this.ws.onError = (error) => this.handleWebSocketError(error);
        this.ws.onStatusChange = (status) => this.ui.updateConnectionStatus(status);
        
        // Audio event handlers
        this.audio.onAudioData = (audioData) => this.handleAudioData(audioData);
        this.audio.onVolumeChange = (volume) => this.ui.updateAudioVisualization(volume);
        
        // WebRTC event handlers
        this.webrtc.onRemoteStream = (stream) => this.handleRemoteStream(stream);
        this.webrtc.onConnectionStateChange = (state) => this.handleWebRTCStateChange(state);
        this.webrtc.onError = (error) => this.handleWebRTCError(error);
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Voice Agent App...');
            
            // Check browser support
            this.checkBrowserSupport();
            
            // Initialize audio processor
            await this.initializeAudio();
            
            // Connect to WebSocket
            this.ws.connect();
            
            // Check API status
            await this.checkAPIStatus();
            
            this.isInitialized = true;
            console.log('✅ Voice Agent App initialized successfully');
            
            this.ui.showNotification('Voice Agent ready! Click "Start Conversation" to begin.', 'success');
            
        } catch (error) {
            console.error('❌ Failed to initialize Voice Agent App:', error);
            this.ui.showNotification('Failed to initialize voice agent: ' + error.message, 'error');
        }
    }

    checkBrowserSupport() {
        const features = {
            webSocket: WebSocketClient.isSupported(),
            webRTC: WebRTCClient.isSupported(),
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            audioContext: !!(window.AudioContext || window.webkitAudioContext)
        };
        
        const unsupported = Object.entries(features)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);
        
        if (unsupported.length > 0) {
            throw new Error(`Browser does not support: ${unsupported.join(', ')}`);
        }
        
        console.log('✅ Browser support check passed');
    }

    async initializeAudio() {
        try {
            await this.audio.initialize();
            this.ui.updateAudioStatus(true);
            console.log('✅ Audio initialized');
        } catch (error) {
            this.ui.updateAudioStatus(false);
            throw new Error('Microphone access denied or not available');
        }
    }

    async checkAPIStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            this.ui.updateOpenAIStatus(status.openai);
            
            if (!status.openai) {
                this.ui.showNotification('OpenAI API key not configured', 'warning');
            }
            
            console.log('📊 API Status:', status);
        } catch (error) {
            console.error('Failed to check API status:', error);
        }
    }

    // WebSocket event handlers
    handleWebSocketConnect() {
        console.log('🔌 WebSocket connected');
        this.ui.updateControlsState(true, false, false);
    }

    handleWebSocketDisconnect() {
        console.log('🔌 WebSocket disconnected');
        this.ui.updateControlsState(false, false, false);
        
        if (this.isSessionActive) {
            this.stopConversation();
        }
    }

    handleWebSocketMessage(data) {
        const { type, payload } = data;
        
        switch (type) {
            case 'session_started':
                this.handleSessionStarted();
                break;
                
            case 'session_ended':
                this.handleSessionEnded();
                break;
                
            case 'audio_response':
                this.handleAudioResponse(payload);
                break;
                
            case 'text_response':
                this.handleTextResponse(payload);
                break;
                
            case 'speech_started':
                this.handleSpeechStarted();
                break;
                
            case 'speech_stopped':
                this.handleSpeechStopped();
                break;
                
            case 'webrtc_offer':
                this.webrtc.handleOffer(payload);
                break;
                
            case 'webrtc_answer':
                this.webrtc.handleAnswer(payload);
                break;
                
            case 'webrtc_ice_candidate':
                this.webrtc.handleIceCandidate(payload);
                break;
                
            case 'error':
                this.handleServerError(payload);
                break;
                
            case 'n8n_response':
                this.handleN8NResponse(payload);
                break;
        }
    }

    handleWebSocketError(error) {
        console.error('WebSocket error:', error);
        this.ui.showNotification('Connection error occurred', 'error');
    }

    // Session management
    async startConversation() {
        if (!this.isInitialized || this.isSessionActive) {
            return;
        }
        
        try {
            console.log('🎤 Starting conversation...');
            
            // Initialize WebRTC if needed
            if (!this.webrtc.isConnected) {
                await this.webrtc.initialize(this.audio.mediaStream);
            }
            
            // Start OpenAI session
            this.ws.startSession();
            
            // Start recording
            this.audio.startRecording();
            
            this.isSessionActive = true;
            this.ui.setConversationActive(true);
            this.ui.addMessage('system', 'Conversation started. Speak now...');
            
            console.log('✅ Conversation started');
            
        } catch (error) {
            console.error('❌ Failed to start conversation:', error);
            this.ui.showNotification('Failed to start conversation: ' + error.message, 'error');
        }
    }

    async stopConversation() {
        if (!this.isSessionActive) {
            return;
        }
        
        try {
            console.log('⏹️ Stopping conversation...');
            
            // Stop recording
            this.audio.stopRecording();
            
            // End OpenAI session
            this.ws.endSession();
            
            this.isSessionActive = false;
            this.ui.setConversationActive(false);
            this.ui.addMessage('system', 'Conversation ended.');
            
            console.log('✅ Conversation stopped');
            
        } catch (error) {
            console.error('❌ Failed to stop conversation:', error);
            this.ui.showNotification('Failed to stop conversation: ' + error.message, 'error');
        }
    }

    toggleMute() {
        if (!this.isSessionActive) {
            return;
        }
        
        const isMuted = this.audio.toggleMute();
        this.ui.setMuteState(isMuted);
        
        this.ui.addMessage('system', isMuted ? 'Microphone muted' : 'Microphone unmuted');
    }

    // Audio handling
    handleAudioData(audioData) {
        if (this.isSessionActive && this.ws.isConnected) {
            this.ws.sendAudioData(audioData);
        }
    }

    handleAudioResponse(payload) {
        console.log('🔊 Received audio response');
        
        if (payload.audio) {
            this.audio.playAudioResponse(payload.audio);
        }
    }

    handleTextResponse(payload) {
        console.log('📝 Received text response:', payload.text);
        
        if (payload.text) {
            this.ui.addMessage('assistant', payload.text);
        }
    }

    // Speech detection
    handleSpeechStarted() {
        console.log('🗣️ User speech detected');
        this.ui.addMessage('system', 'Listening...');
    }

    handleSpeechStopped() {
        console.log('🤐 User speech ended');
        this.ui.addMessage('system', 'Processing...');
    }

    // Session events
    handleSessionStarted() {
        console.log('🤖 OpenAI session started');
        this.ui.showNotification('AI assistant is ready', 'success');
    }

    handleSessionEnded() {
        console.log('🔚 OpenAI session ended');
        this.isSessionActive = false;
        this.ui.setConversationActive(false);
    }

    // WebRTC handling
    handleRemoteStream(stream) {
        console.log('🎵 Received remote audio stream');
        
        // Connect remote stream to audio output
        if (this.ui.elements.audioOutput) {
            this.ui.elements.audioOutput.srcObject = stream;
        }
    }

    handleWebRTCStateChange(state) {
        console.log('🔗 WebRTC state changed:', state);
        
        if (state === 'failed' || state === 'disconnected') {
            this.ui.showNotification('Audio connection lost', 'warning');
        } else if (state === 'connected') {
            this.ui.showNotification('Audio connection established', 'success');
        }
    }

    handleWebRTCError(error) {
        console.error('WebRTC error:', error);
        this.ui.showNotification('Audio connection error', 'error');
    }

    // Error handling
    handleServerError(payload) {
        console.error('Server error:', payload);
        this.ui.showNotification(payload.message || 'Server error occurred', 'error');
    }

    // N8N integration
    handleN8NResponse(payload) {
        console.log('🔗 N8N response:', payload);
        
        if (payload.success) {
            this.ui.addMessage('system', 'Workflow triggered successfully');
        } else {
            this.ui.addMessage('system', 'Workflow trigger failed');
        }
    }

    // Trigger N8N workflow with conversation context
    triggerN8NWorkflow(workflowData) {
        if (!this.ws.isConnected) {
            this.ui.showNotification('Cannot trigger workflow: not connected', 'warning');
            return;
        }
        
        const contextData = {
            ...workflowData,
            conversationHistory: this.ui.conversationHistory.slice(-5), // Last 5 messages
            sessionActive: this.isSessionActive,
            timestamp: new Date().toISOString()
        };
        
        this.ws.triggerN8NWorkflow(contextData);
        this.ui.addMessage('system', 'Triggering workflow...');
    }

    // Cleanup
    cleanup() {
        console.log('🧹 Cleaning up Voice Agent App');
        
        this.stopConversation();
        this.audio.cleanup();
        this.webrtc.close();
        this.ws.disconnect();
    }

    // Get app status
    getStatus() {
        return {
            initialized: this.isInitialized,
            sessionActive: this.isSessionActive,
            websocket: this.ws.getConnectionInfo(),
            webrtc: this.webrtc.getConnectionInfo(),
            audio: this.audio.getStatus()
        };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 Starting Priyo Voice Agent...');
    
    // Create global app instance
    window.voiceAgent = new VoiceAgentApp();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        window.voiceAgent.cleanup();
    });
    
    // Debug: Expose status to console
    window.getVoiceAgentStatus = () => {
        console.table(window.voiceAgent.getStatus());
    };
    
    console.log('✨ Voice Agent loaded! Type getVoiceAgentStatus() in console for debug info.');
});
