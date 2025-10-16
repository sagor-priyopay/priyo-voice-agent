class WebSocketClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        
        // Event handlers
        this.onConnect = null;
        this.onDisconnect = null;
        this.onMessage = null;
        this.onError = null;
        this.onStatusChange = null;
    }

    connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log('🔌 Connecting to WebSocket:', wsUrl);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                
                if (this.onConnect) {
                    this.onConnect();
                }
                
                this.updateStatus('connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.stopHeartbeat();
                
                if (this.onDisconnect) {
                    this.onDisconnect(event);
                }
                
                this.updateStatus('disconnected');
                
                // Attempt to reconnect if not a clean close
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                
                if (this.onError) {
                    this.onError(error);
                }
                
                this.updateStatus('error');
            };
            
        } catch (error) {
            console.error('❌ Failed to connect WebSocket:', error);
            this.updateStatus('error');
        }
    }

    handleMessage(data) {
        const { type, payload, message } = data;
        
        console.log('📨 Received message:', type);
        
        switch (type) {
            case 'connected':
                console.log('🎯 Server confirmed connection');
                break;
                
            case 'session_started':
                console.log('🤖 OpenAI session started');
                break;
                
            case 'session_ended':
                console.log('🔚 OpenAI session ended');
                break;
                
            case 'audio_response':
                console.log('🔊 Received audio response');
                break;
                
            case 'text_response':
                console.log('📝 Received text response');
                break;
                
            case 'speech_started':
                console.log('🗣️ User speech detected');
                break;
                
            case 'speech_stopped':
                console.log('🤐 User speech ended');
                break;
                
            case 'error':
                console.error('❌ Server error:', payload?.message || message);
                break;
                
            case 'n8n_response':
                console.log('🔗 N8N workflow response:', payload);
                break;
                
            case 'pong':
                console.log('💓 Heartbeat response received');
                break;
                
            default:
                console.log('📦 Unknown message type:', type);
        }
        
        // Forward to message handler
        if (this.onMessage) {
            this.onMessage(data);
        }
    }

    send(data) {
        if (!this.isConnected || !this.ws) {
            console.warn('⚠️ Cannot send message: WebSocket not connected');
            return false;
        }
        
        try {
            this.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('❌ Failed to send WebSocket message:', error);
            return false;
        }
    }

    // Specific message types
    startSession() {
        return this.send({
            type: 'start_session'
        });
    }

    endSession() {
        return this.send({
            type: 'end_session'
        });
    }

    sendAudioData(audioData) {
        return this.send({
            type: 'audio_data',
            payload: audioData
        });
    }

    sendWebRTCOffer(offer) {
        return this.send({
            type: 'webrtc_offer',
            payload: offer
        });
    }

    sendWebRTCAnswer(answer) {
        return this.send({
            type: 'webrtc_answer',
            payload: answer
        });
    }

    sendWebRTCIceCandidate(candidate) {
        return this.send({
            type: 'webrtc_ice_candidate',
            payload: candidate
        });
    }

    triggerN8NWorkflow(data) {
        return this.send({
            type: 'trigger_n8n',
            payload: data
        });
    }

    // Heartbeat mechanism
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Send ping every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Reconnection logic
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        this.updateStatus('reconnecting');
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    // Manual reconnect
    reconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.reconnectAttempts = 0;
        this.connect();
    }

    // Disconnect
    disconnect() {
        console.log('🔌 Manually disconnecting WebSocket');
        
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
        
        this.isConnected = false;
        this.updateStatus('disconnected');
    }

    // Status updates
    updateStatus(status) {
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }

    // Get connection info
    getConnectionInfo() {
        return {
            connected: this.isConnected,
            readyState: this.ws?.readyState,
            reconnectAttempts: this.reconnectAttempts,
            url: this.ws?.url
        };
    }

    // Check if WebSocket is supported
    static isSupported() {
        return 'WebSocket' in window;
    }
}

// Export for use in other modules
window.WebSocketClient = WebSocketClient;
