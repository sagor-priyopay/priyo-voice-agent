class UIController {
    constructor() {
        this.elements = {};
        this.isConversationActive = false;
        this.conversationHistory = [];
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Status indicators
        this.elements.connectionStatus = document.getElementById('connection-status');
        this.elements.openaiStatus = document.getElementById('openai-status');
        this.elements.audioStatus = document.getElementById('audio-status');
        
        // Controls
        this.elements.startBtn = document.getElementById('start-btn');
        this.elements.stopBtn = document.getElementById('stop-btn');
        this.elements.muteBtn = document.getElementById('mute-btn');
        
        // Visual elements
        this.elements.audioVisualizer = document.getElementById('audio-visualizer');
        this.elements.conversationStatus = document.getElementById('conversation-status');
        this.elements.conversationHistory = document.getElementById('conversation-history');
        this.elements.clearHistory = document.getElementById('clear-history');
        
        // Audio output
        this.elements.audioOutput = document.getElementById('audio-output');
    }

    bindEvents() {
        // Control buttons
        this.elements.startBtn.addEventListener('click', () => {
            this.onStartConversation?.();
        });
        
        this.elements.stopBtn.addEventListener('click', () => {
            this.onStopConversation?.();
        });
        
        this.elements.muteBtn.addEventListener('click', () => {
            this.onToggleMute?.();
        });
        
        // Clear history
        this.elements.clearHistory.addEventListener('click', () => {
            this.clearConversationHistory();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Spacebar to start/stop (when not typing in input fields)
            if (event.code === 'Space' && !this.isInputFocused()) {
                event.preventDefault();
                if (this.isConversationActive) {
                    this.onStopConversation?.();
                } else {
                    this.onStartConversation?.();
                }
            }
            
            // Escape to stop
            if (event.code === 'Escape' && this.isConversationActive) {
                this.onStopConversation?.();
            }
            
            // M to toggle mute
            if (event.code === 'KeyM' && !this.isInputFocused()) {
                event.preventDefault();
                this.onToggleMute?.();
            }
        });
    }

    // Status updates
    updateConnectionStatus(status) {
        const statusElement = this.elements.connectionStatus.querySelector('.status-dot');
        const textElement = this.elements.connectionStatus.querySelector('span:last-child');
        
        statusElement.className = 'status-dot';
        
        switch (status) {
            case 'connected':
                statusElement.classList.add('online');
                textElement.textContent = 'Connected';
                break;
            case 'connecting':
            case 'reconnecting':
                statusElement.classList.add('connecting');
                textElement.textContent = 'Connecting...';
                break;
            case 'disconnected':
                statusElement.classList.add('offline');
                textElement.textContent = 'Disconnected';
                break;
            case 'error':
                statusElement.classList.add('offline');
                textElement.textContent = 'Error';
                break;
        }
    }

    updateOpenAIStatus(isConnected) {
        const statusElement = this.elements.openaiStatus.querySelector('.status-dot');
        
        statusElement.className = 'status-dot';
        statusElement.classList.add(isConnected ? 'online' : 'offline');
    }

    updateAudioStatus(hasPermission) {
        const statusElement = this.elements.audioStatus.querySelector('.status-dot');
        
        statusElement.className = 'status-dot';
        statusElement.classList.add(hasPermission ? 'online' : 'offline');
    }

    // Control states
    setConversationActive(active) {
        this.isConversationActive = active;
        
        this.elements.startBtn.disabled = active;
        this.elements.stopBtn.disabled = !active;
        this.elements.muteBtn.disabled = !active;
        
        if (active) {
            this.elements.audioVisualizer.classList.add('active');
            this.elements.conversationStatus.textContent = 'Listening... Speak now or press spacebar to stop';
            this.elements.startBtn.querySelector('.btn-text').textContent = 'Listening...';
        } else {
            this.elements.audioVisualizer.classList.remove('active');
            this.elements.conversationStatus.textContent = 'Click "Start Conversation" to begin talking with the AI assistant';
            this.elements.startBtn.querySelector('.btn-text').textContent = 'Start Conversation';
        }
    }

    setMuteState(isMuted) {
        const muteIcon = this.elements.muteBtn.querySelector('.btn-icon');
        const muteText = this.elements.muteBtn.querySelector('.btn-text');
        
        if (isMuted) {
            muteIcon.textContent = '🔇';
            muteText.textContent = 'Unmute';
            this.elements.muteBtn.classList.add('muted');
        } else {
            muteIcon.textContent = '🔊';
            muteText.textContent = 'Mute';
            this.elements.muteBtn.classList.remove('muted');
        }
    }

    // Audio visualization
    updateAudioVisualization(volume) {
        const waves = this.elements.audioVisualizer.querySelectorAll('.wave');
        
        waves.forEach((wave, index) => {
            const height = Math.max(20, (volume / 100) * 60 + Math.random() * 20);
            wave.style.height = `${height}px`;
        });
    }

    // Conversation management
    addMessage(type, content, timestamp = new Date()) {
        const message = {
            type, // 'user', 'assistant', 'system'
            content,
            timestamp
        };
        
        this.conversationHistory.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}`;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        const textElement = document.createElement('p');
        textElement.textContent = message.content;
        contentElement.appendChild(textElement);
        
        const timeElement = document.createElement('div');
        timeElement.className = 'message-time';
        timeElement.textContent = this.formatTime(message.timestamp);
        
        messageElement.appendChild(contentElement);
        messageElement.appendChild(timeElement);
        
        this.elements.conversationHistory.appendChild(messageElement);
    }

    clearConversationHistory() {
        this.conversationHistory = [];
        
        // Keep only the welcome message
        const welcomeMessage = this.elements.conversationHistory.querySelector('.message.system');
        this.elements.conversationHistory.innerHTML = '';
        
        if (welcomeMessage) {
            this.elements.conversationHistory.appendChild(welcomeMessage);
        }
    }

    scrollToBottom() {
        this.elements.conversationHistory.scrollTop = this.elements.conversationHistory.scrollHeight;
    }

    // Utility functions
    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.contentEditable === 'true'
        );
    }

    // Show notifications
    showNotification(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles if not already added
        this.addNotificationStyles();
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove
        const removeNotification = () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        };
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', removeNotification);
        
        // Auto close
        setTimeout(removeNotification, duration);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }

    addNotificationStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 400px;
                border-left: 4px solid #3b82f6;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification-success {
                border-left-color: #10b981;
            }
            
            .notification-error {
                border-left-color: #ef4444;
            }
            
            .notification-warning {
                border-left-color: #f59e0b;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notification-close {
                position: absolute;
                top: 5px;
                right: 10px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #6b7280;
            }
            
            .notification-close:hover {
                color: #374151;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Loading states
    setLoading(element, loading) {
        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    // Enable/disable controls based on readiness
    updateControlsState(canStart, canStop, canMute) {
        this.elements.startBtn.disabled = !canStart || this.isConversationActive;
        this.elements.stopBtn.disabled = !canStop || !this.isConversationActive;
        this.elements.muteBtn.disabled = !canMute || !this.isConversationActive;
    }
}

// Export for use in other modules
window.UIController = UIController;
