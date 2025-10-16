require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const OpenAIRealtimeService = require('./services/openai-realtime');
const WebRTCSignaling = require('./services/webrtc-signaling');
const N8NIntegration = require('./services/n8n-integration');

class VoiceAgentServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.port = process.env.PORT || 3000;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }

    setupMiddleware() {
        // Security and performance middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    mediaSrc: ["'self'", "blob:", "data:"],
                    connectSrc: ["'self'", "wss:", "ws:"]
                }
            }
        }));
        
        this.app.use(compression());
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true
        }));
        
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // API status endpoint
        this.app.get('/api/status', (req, res) => {
            res.json({
                openai: !!process.env.OPENAI_API_KEY,
                n8n: !!process.env.N8N_WEBHOOK_URL,
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // Serve the main application
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // n8n webhook integration endpoint
        this.app.post('/api/n8n/trigger', async (req, res) => {
            try {
                const n8nService = new N8NIntegration();
                const result = await n8nService.triggerWorkflow(req.body);
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('N8N trigger error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('New WebSocket connection established');
            
            // Create services for this connection
            const openaiService = new OpenAIRealtimeService();
            const webrtcSignaling = new WebRTCSignaling(ws);
            const n8nService = new N8NIntegration();

            // Store services on the WebSocket for cleanup
            ws.services = { openaiService, webrtcSignaling, n8nService };

            // Handle incoming messages
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            // Handle connection close
            ws.on('close', () => {
                console.log('WebSocket connection closed');
                if (ws.services) {
                    ws.services.openaiService.cleanup();
                    ws.services.webrtcSignaling.cleanup();
                }
            });

            // Send initial connection confirmation
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Voice agent ready'
            }));
        });
    }

    async handleWebSocketMessage(ws, data) {
        const { type, payload } = data;
        const { openaiService, webrtcSignaling, n8nService } = ws.services;

        switch (type) {
            case 'start_session':
                await openaiService.startSession();
                ws.send(JSON.stringify({
                    type: 'session_started',
                    message: 'OpenAI Realtime session started'
                }));
                break;

            case 'webrtc_offer':
                await webrtcSignaling.handleOffer(payload);
                break;

            case 'webrtc_answer':
                await webrtcSignaling.handleAnswer(payload);
                break;

            case 'webrtc_ice_candidate':
                await webrtcSignaling.handleIceCandidate(payload);
                break;

            case 'audio_data':
                // Forward audio data to OpenAI Realtime API
                await openaiService.sendAudioData(payload);
                break;

            case 'trigger_n8n':
                // Trigger n8n workflow with conversation context
                const workflowResult = await n8nService.triggerWorkflow({
                    ...payload,
                    timestamp: new Date().toISOString()
                });
                ws.send(JSON.stringify({
                    type: 'n8n_response',
                    data: workflowResult
                }));
                break;

            case 'end_session':
                await openaiService.endSession();
                ws.send(JSON.stringify({
                    type: 'session_ended',
                    message: 'Session ended successfully'
                }));
                break;

            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Unknown message type: ${type}`
                }));
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 Voice Agent Server running on port ${this.port}`);
            console.log(`📱 Web interface: http://localhost:${this.port}`);
            console.log(`🔌 WebSocket endpoint: ws://localhost:${this.port}`);
            console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
            console.log(`🔗 N8N Integration: ${process.env.N8N_WEBHOOK_URL ? '✅ Configured' : '⚠️ Optional'}`);
        });
    }
}

// Start the server
const server = new VoiceAgentServer();
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = VoiceAgentServer;
