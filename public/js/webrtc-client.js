class WebRTCClient {
    constructor(websocketClient) {
        this.ws = websocketClient;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isConnected = false;
        this.iceCandidates = [];
        
        // Event handlers
        this.onRemoteStream = null;
        this.onConnectionStateChange = null;
        this.onError = null;
    }

    async initialize(mediaStream) {
        try {
            console.log('🔗 Initializing WebRTC client');
            
            this.localStream = mediaStream;
            this.createPeerConnection();
            
            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            console.log('✅ WebRTC client initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize WebRTC client:', error);
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    createPeerConnection() {
        const config = {
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302'
                },
                {
                    urls: 'stun:stun1.l.google.com:19302'
                }
            ],
            iceCandidatePoolSize: 10
        };

        this.peerConnection = new RTCPeerConnection(config);

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                this.ws.sendWebRTCIceCandidate(event.candidate);
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('🔗 WebRTC connection state:', state);
            
            this.isConnected = state === 'connected';
            
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(state);
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
        };

        // Handle remote streams
        this.peerConnection.ontrack = (event) => {
            console.log('🎵 Received remote track');
            const [remoteStream] = event.streams;
            this.remoteStream = remoteStream;
            
            if (this.onRemoteStream) {
                this.onRemoteStream(remoteStream);
            }
        };

        // Handle data channels (for future use)
        this.peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            console.log('📡 Data channel received:', channel.label);
            
            channel.onopen = () => {
                console.log('📡 Data channel opened');
            };
            
            channel.onmessage = (event) => {
                console.log('📨 Data channel message:', event.data);
            };
        };

        console.log('✅ Peer connection created');
    }

    async createOffer() {
        try {
            console.log('📡 Creating WebRTC offer');
            
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });

            await this.peerConnection.setLocalDescription(offer);
            
            // Send offer through WebSocket
            this.ws.sendWebRTCOffer(offer);
            
            console.log('✅ WebRTC offer created and sent');
            return offer;
        } catch (error) {
            console.error('❌ Failed to create WebRTC offer:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    async handleOffer(offer) {
        try {
            console.log('📡 Handling WebRTC offer');
            
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            await this.peerConnection.setRemoteDescription(offer);
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Send answer through WebSocket
            this.ws.sendWebRTCAnswer(answer);
            
            console.log('✅ WebRTC answer created and sent');
            return answer;
        } catch (error) {
            console.error('❌ Failed to handle WebRTC offer:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            console.log('📡 Handling WebRTC answer');
            
            if (!this.peerConnection) {
                throw new Error('Peer connection not initialized');
            }

            await this.peerConnection.setRemoteDescription(answer);
            
            console.log('✅ WebRTC answer processed');
        } catch (error) {
            console.error('❌ Failed to handle WebRTC answer:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    async handleIceCandidate(candidate) {
        try {
            console.log('🧊 Handling ICE candidate');
            
            if (!this.peerConnection) {
                // Store for later if peer connection not ready
                this.iceCandidates.push(candidate);
                return;
            }

            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(candidate);
                console.log('✅ ICE candidate added');
            } else {
                // Store for later
                this.iceCandidates.push(candidate);
            }
        } catch (error) {
            console.error('❌ Failed to handle ICE candidate:', error);
        }
    }

    // Process stored ICE candidates
    async processStoredIceCandidates() {
        if (this.iceCandidates.length === 0) return;
        
        console.log(`🧊 Processing ${this.iceCandidates.length} stored ICE candidates`);
        
        for (const candidate of this.iceCandidates) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error adding stored ICE candidate:', error);
            }
        }
        
        this.iceCandidates = [];
    }

    // Create data channel for future use
    createDataChannel(label = 'data') {
        if (!this.peerConnection) {
            console.error('Cannot create data channel: peer connection not initialized');
            return null;
        }

        const dataChannel = this.peerConnection.createDataChannel(label, {
            ordered: true
        });

        dataChannel.onopen = () => {
            console.log(`📡 Data channel '${label}' opened`);
        };

        dataChannel.onclose = () => {
            console.log(`📡 Data channel '${label}' closed`);
        };

        dataChannel.onerror = (error) => {
            console.error(`❌ Data channel '${label}' error:`, error);
        };

        return dataChannel;
    }

    // Get connection statistics
    async getStats() {
        if (!this.peerConnection) {
            return null;
        }

        try {
            const stats = await this.peerConnection.getStats();
            const report = {};
            
            stats.forEach((stat) => {
                if (stat.type === 'inbound-rtp' || stat.type === 'outbound-rtp') {
                    report[stat.type] = {
                        bytesReceived: stat.bytesReceived,
                        bytesSent: stat.bytesSent,
                        packetsReceived: stat.packetsReceived,
                        packetsSent: stat.packetsSent,
                        packetsLost: stat.packetsLost,
                        jitter: stat.jitter,
                        roundTripTime: stat.roundTripTime
                    };
                }
            });

            return report;
        } catch (error) {
            console.error('Error getting WebRTC stats:', error);
            return null;
        }
    }

    // Restart ICE (useful for connection recovery)
    async restartIce() {
        if (!this.peerConnection) {
            console.error('Cannot restart ICE: peer connection not initialized');
            return;
        }

        try {
            console.log('🔄 Restarting ICE');
            
            const offer = await this.peerConnection.createOffer({ iceRestart: true });
            await this.peerConnection.setLocalDescription(offer);
            
            this.ws.sendWebRTCOffer(offer);
            
            console.log('✅ ICE restart initiated');
        } catch (error) {
            console.error('❌ Failed to restart ICE:', error);
        }
    }

    // Close connection
    close() {
        console.log('🔌 Closing WebRTC connection');
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.localStream = null;
        this.remoteStream = null;
        this.isConnected = false;
        this.iceCandidates = [];
    }

    // Get connection info
    getConnectionInfo() {
        if (!this.peerConnection) {
            return { connected: false };
        }

        return {
            connected: this.isConnected,
            connectionState: this.peerConnection.connectionState,
            iceConnectionState: this.peerConnection.iceConnectionState,
            iceGatheringState: this.peerConnection.iceGatheringState,
            signalingState: this.peerConnection.signalingState,
            localDescription: !!this.peerConnection.localDescription,
            remoteDescription: !!this.peerConnection.remoteDescription
        };
    }

    // Check if WebRTC is supported
    static isSupported() {
        return 'RTCPeerConnection' in window;
    }
}

// Export for use in other modules
window.WebRTCClient = WebRTCClient;
