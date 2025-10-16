class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isMuted = false;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        
        this.onAudioData = null;
        this.onVolumeChange = null;
    }

    async initialize() {
        try {
            console.log('🎤 Initializing audio processor...');
            
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });

            // Create analyser for visualization
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Connect media stream to analyser
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);

            // Setup media recorder for audio capture
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    
                    // Convert to base64 and send to server
                    if (this.onAudioData) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64Audio = reader.result.split(',')[1];
                            this.onAudioData(base64Audio);
                        };
                        reader.readAsDataURL(event.data);
                    }
                }
            };

            console.log('✅ Audio processor initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize audio processor:', error);
            throw error;
        }
    }

    startRecording() {
        if (!this.mediaRecorder || this.isRecording) {
            console.warn('Cannot start recording: MediaRecorder not ready or already recording');
            return false;
        }

        try {
            this.audioChunks = [];
            this.mediaRecorder.start(100); // Capture in 100ms chunks for real-time processing
            this.isRecording = true;
            this.startVisualization();
            
            console.log('🎤 Recording started');
            return true;
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            return false;
        }
    }

    stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) {
            console.warn('Cannot stop recording: not currently recording');
            return false;
        }

        try {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopVisualization();
            
            console.log('⏹️ Recording stopped');
            return true;
        } catch (error) {
            console.error('❌ Failed to stop recording:', error);
            return false;
        }
    }

    toggleMute() {
        if (!this.mediaStream) {
            console.warn('Cannot toggle mute: no media stream');
            return false;
        }

        const audioTracks = this.mediaStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = this.isMuted;
        });
        
        this.isMuted = !this.isMuted;
        console.log(`🔊 Audio ${this.isMuted ? 'muted' : 'unmuted'}`);
        return this.isMuted;
    }

    startVisualization() {
        if (!this.analyser) return;

        const visualize = () => {
            if (!this.isRecording) return;

            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate average volume
            const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
            const volume = Math.min(100, (average / 255) * 100);
            
            if (this.onVolumeChange) {
                this.onVolumeChange(volume);
            }

            this.animationId = requestAnimationFrame(visualize);
        };

        visualize();
    }

    stopVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.onVolumeChange) {
            this.onVolumeChange(0);
        }
    }

    // Convert audio to PCM16 format for OpenAI
    async convertToPCM16(audioBlob) {
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Get the first channel (mono)
            const channelData = audioBuffer.getChannelData(0);
            
            // Convert to 16-bit PCM
            const pcm16 = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                // Convert from [-1, 1] to [-32768, 32767]
                pcm16[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
            }
            
            return pcm16.buffer;
        } catch (error) {
            console.error('Error converting audio to PCM16:', error);
            throw error;
        }
    }

    // Play audio response from OpenAI
    async playAudioResponse(base64Audio) {
        try {
            // Convert base64 to blob
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBlob = new Blob([bytes], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Play the audio
            const audio = new Audio(audioUrl);
            audio.play();
            
            // Clean up URL after playing
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
            
            console.log('🔊 Playing AI response');
        } catch (error) {
            console.error('❌ Failed to play audio response:', error);
        }
    }

    // Get audio devices
    async getAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
            
            return { audioInputs, audioOutputs };
        } catch (error) {
            console.error('Error getting audio devices:', error);
            return { audioInputs: [], audioOutputs: [] };
        }
    }

    // Switch audio input device
    async switchAudioInput(deviceId) {
        try {
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1
                }
            });

            // Reconnect to analyser
            if (this.audioContext && this.analyser) {
                const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                source.connect(this.analyser);
            }

            // Update media recorder
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            console.log('🎤 Audio input device switched');
            return true;
        } catch (error) {
            console.error('❌ Failed to switch audio input:', error);
            return false;
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up audio processor');
        
        this.stopRecording();
        this.stopVisualization();
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.mediaRecorder = null;
        this.analyser = null;
        this.dataArray = null;
        this.audioChunks = [];
    }

    // Get current status
    getStatus() {
        return {
            initialized: !!this.audioContext,
            recording: this.isRecording,
            muted: this.isMuted,
            sampleRate: this.audioContext?.sampleRate,
            state: this.audioContext?.state
        };
    }
}

// Export for use in other modules
window.AudioProcessor = AudioProcessor;
