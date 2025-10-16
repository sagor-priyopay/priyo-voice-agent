class WebRTCSignaling {
    constructor(websocket) {
        this.ws = websocket;
        this.peerConnection = null;
        this.iceCandidates = [];
        this.isInitialized = false;
    }

    async handleOffer(offer) {
        try {
            console.log('📡 Handling WebRTC offer');
            
            // Create peer connection if not exists
            if (!this.peerConnection) {
                this.createPeerConnection();
            }

            // Set remote description
            await this.peerConnection.setRemoteDescription(offer);
            
            // Create and send answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.sendToClient({
                type: 'webrtc_answer',
                payload: answer
            });

            console.log('✅ WebRTC answer sent');
        } catch (error) {
            console.error('❌ Error handling WebRTC offer:', error);
            this.sendError('Failed to handle WebRTC offer');
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
            console.error('❌ Error handling WebRTC answer:', error);
            this.sendError('Failed to handle WebRTC answer');
        }
    }

    async handleIceCandidate(candidate) {
        try {
            console.log('🧊 Handling ICE candidate');
            
            if (!this.peerConnection) {
                // Store candidates for later if peer connection not ready
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
            console.error('❌ Error handling ICE candidate:', error);
        }
    }

    createPeerConnection() {
        console.log('🔗 Creating WebRTC peer connection');
        
        const config = {
            iceServers: [
                {
                    urls: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'
                }
            ]
        };

        // Add TURN server if configured
        if (process.env.TURN_SERVER) {
            config.iceServers.push({
                urls: process.env.TURN_SERVER,
                username: process.env.TURN_USERNAME,
                credential: process.env.TURN_PASSWORD
            });
        }

        this.peerConnection = new RTCPeerConnection(config);

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate to client');
                this.sendToClient({
                    type: 'webrtc_ice_candidate',
                    payload: event.candidate
                });
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Connection state:', this.peerConnection.connectionState);
            this.sendToClient({
                type: 'connection_state',
                payload: {
                    state: this.peerConnection.connectionState
                }
            });
        };

        // Handle incoming audio streams
        this.peerConnection.ontrack = (event) => {
            console.log('🎵 Received audio track');
            const [stream] = event.streams;
            
            // Here you would typically forward the audio to OpenAI
            // For now, we'll just log it
            this.sendToClient({
                type: 'audio_stream_received',
                payload: {
                    streamId: stream.id
                }
            });
        };

        // Handle data channels (for future use)
        this.peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            console.log('📡 Data channel received:', channel.label);
            
            channel.onmessage = (event) => {
                console.log('📨 Data channel message:', event.data);
            };
        };

        // Add any stored ICE candidates
        this.iceCandidates.forEach(async (candidate) => {
            try {
                await this.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error adding stored ICE candidate:', error);
            }
        });
        this.iceCandidates = [];

        this.isInitialized = true;
        console.log('✅ WebRTC peer connection created');
    }

    async createOffer() {
        try {
            if (!this.peerConnection) {
                this.createPeerConnection();
            }

            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });

            await this.peerConnection.setLocalDescription(offer);
            
            this.sendToClient({
                type: 'webrtc_offer',
                payload: offer
            });

            console.log('✅ WebRTC offer created and sent');
        } catch (error) {
            console.error('❌ Error creating WebRTC offer:', error);
            this.sendError('Failed to create WebRTC offer');
        }
    }

    sendToClient(message) {
        if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send to client: WebSocket not ready');
        }
    }

    sendError(message) {
        this.sendToClient({
            type: 'error',
            payload: { message }
        });
    }

    cleanup() {
        console.log('🧹 Cleaning up WebRTC signaling');
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.iceCandidates = [];
        this.isInitialized = false;
    }

    // Get connection statistics
    async getStats() {
        if (!this.peerConnection) {
            return null;
        }

        try {
            const stats = await this.peerConnection.getStats();
            const statsReport = {};
            
            stats.forEach((report) => {
                if (report.type === 'inbound-rtp' || report.type === 'outbound-rtp') {
                    statsReport[report.type] = {
                        bytesReceived: report.bytesReceived,
                        bytesSent: report.bytesSent,
                        packetsReceived: report.packetsReceived,
                        packetsSent: report.packetsSent,
                        packetsLost: report.packetsLost
                    };
                }
            });

            return statsReport;
        } catch (error) {
            console.error('Error getting WebRTC stats:', error);
            return null;
        }
    }
}

module.exports = WebRTCSignaling;
