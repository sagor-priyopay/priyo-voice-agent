const WebSocket = require('ws');

class OpenAIRealtimeService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = 'gpt-4o-realtime-preview-2024-10-01';
        this.eventHandlers = new Map();
        
        if (!this.apiKey) {
            throw new Error('OpenAI API key is required');
        }
    }

    async startSession() {
        if (this.isConnected) {
            console.log('OpenAI Realtime session already active');
            return;
        }

        try {
            // Connect to OpenAI Realtime API
            this.ws = new WebSocket('wss://api.openai.com/v1/realtime?model=' + this.model, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'realtime=v1'
                }
            });

            this.ws.on('open', () => {
                console.log('✅ Connected to OpenAI Realtime API');
                this.isConnected = true;
                this.initializeSession();
            });

            this.ws.on('message', (data) => {
                this.handleOpenAIMessage(JSON.parse(data.toString()));
            });

            this.ws.on('error', (error) => {
                console.error('❌ OpenAI WebSocket error:', error);
                this.isConnected = false;
            });

            this.ws.on('close', () => {
                console.log('🔌 OpenAI WebSocket connection closed');
                this.isConnected = false;
            });

        } catch (error) {
            console.error('Failed to start OpenAI session:', error);
            throw error;
        }
    }

    initializeSession() {
        // Configure the session for voice-to-voice interaction
        const sessionConfig = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                instructions: `You are a helpful AI voice assistant. You should:
                - Respond naturally and conversationally
                - Keep responses concise but informative
                - Be friendly and professional
                - Handle interruptions gracefully
                - Adapt to the user's language and tone`,
                voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                    model: 'whisper-1'
                },
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                },
                tools: [],
                tool_choice: 'auto',
                temperature: 0.8,
                max_response_output_tokens: 4096
            }
        };

        this.sendToOpenAI(sessionConfig);
    }

    handleOpenAIMessage(message) {
        const { type } = message;

        switch (type) {
            case 'session.created':
                console.log('🎯 OpenAI session created:', message.session.id);
                break;

            case 'session.updated':
                console.log('🔄 OpenAI session updated');
                break;

            case 'input_audio_buffer.committed':
                console.log('🎤 Audio input committed');
                break;

            case 'input_audio_buffer.speech_started':
                console.log('🗣️ Speech started');
                this.emit('speech_started');
                break;

            case 'input_audio_buffer.speech_stopped':
                console.log('🤐 Speech stopped');
                this.emit('speech_stopped');
                break;

            case 'conversation.item.created':
                console.log('💬 Conversation item created:', message.item.type);
                break;

            case 'response.created':
                console.log('🤖 AI response created:', message.response.id);
                break;

            case 'response.output_item.added':
                if (message.item.type === 'message') {
                    console.log('📝 AI message added');
                }
                break;

            case 'response.audio.delta':
                // Forward audio data to client
                this.emit('audio_response', {
                    audio: message.delta,
                    response_id: message.response_id,
                    item_id: message.item_id
                });
                break;

            case 'response.audio.done':
                console.log('🔊 Audio response completed');
                this.emit('audio_complete', {
                    response_id: message.response_id,
                    item_id: message.item_id
                });
                break;

            case 'response.text.delta':
                // Forward text data to client (for debugging/transcription)
                this.emit('text_response', {
                    text: message.delta,
                    response_id: message.response_id,
                    item_id: message.item_id
                });
                break;

            case 'response.done':
                console.log('✅ Response completed');
                this.emit('response_complete', message.response);
                break;

            case 'error':
                console.error('❌ OpenAI API error:', message.error);
                this.emit('error', message.error);
                break;

            case 'rate_limits.updated':
                console.log('⚡ Rate limits updated:', message.rate_limits);
                break;

            default:
                console.log('📦 Unknown OpenAI message type:', type);
        }
    }

    async sendAudioData(audioData) {
        if (!this.isConnected || !this.ws) {
            console.warn('Cannot send audio: OpenAI not connected');
            return;
        }

        try {
            // Convert audio data to base64 if it's not already
            const base64Audio = Buffer.isBuffer(audioData) 
                ? audioData.toString('base64')
                : audioData;

            const message = {
                type: 'input_audio_buffer.append',
                audio: base64Audio
            };

            this.sendToOpenAI(message);
        } catch (error) {
            console.error('Error sending audio data:', error);
        }
    }

    commitAudioBuffer() {
        if (!this.isConnected) return;

        this.sendToOpenAI({
            type: 'input_audio_buffer.commit'
        });
    }

    createResponse() {
        if (!this.isConnected) return;

        this.sendToOpenAI({
            type: 'response.create',
            response: {
                modalities: ['text', 'audio'],
                instructions: 'Please respond to the user naturally and conversationally.'
            }
        });
    }

    cancelResponse(responseId) {
        if (!this.isConnected) return;

        this.sendToOpenAI({
            type: 'response.cancel',
            response_id: responseId
        });
    }

    sendToOpenAI(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send to OpenAI: WebSocket not ready');
        }
    }

    // Event emitter functionality
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    async endSession() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        console.log('🔚 OpenAI Realtime session ended');
    }

    cleanup() {
        this.endSession();
        this.eventHandlers.clear();
    }
}

module.exports = OpenAIRealtimeService;
