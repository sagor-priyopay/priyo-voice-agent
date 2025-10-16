const axios = require('axios');

class N8NIntegration {
    constructor() {
        this.webhookUrl = process.env.N8N_WEBHOOK_URL;
        this.isConfigured = !!this.webhookUrl;
    }

    async triggerWorkflow(data) {
        if (!this.isConfigured) {
            console.warn('N8N webhook URL not configured');
            return { success: false, message: 'N8N not configured' };
        }

        try {
            console.log('🔗 Triggering N8N workflow with data:', JSON.stringify(data, null, 2));
            
            const response = await axios.post(this.webhookUrl, {
                source: 'voice-agent',
                timestamp: new Date().toISOString(),
                data: data
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Priyo-Voice-Agent/1.0'
                },
                timeout: 10000 // 10 second timeout
            });

            console.log('✅ N8N workflow triggered successfully');
            return {
                success: true,
                data: response.data,
                status: response.status
            };

        } catch (error) {
            console.error('❌ N8N workflow trigger failed:', error.message);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data,
                    status: error.response.status
                };
            } else if (error.request) {
                return {
                    success: false,
                    error: 'No response from N8N webhook',
                    message: 'Network or timeout error'
                };
            } else {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    // Specific workflow triggers for common use cases
    async triggerCustomerSupport(conversationData) {
        return this.triggerWorkflow({
            type: 'customer_support',
            conversation: conversationData,
            priority: 'normal'
        });
    }

    async triggerTicketCreation(ticketData) {
        return this.triggerWorkflow({
            type: 'create_ticket',
            ticket: ticketData,
            source: 'voice_agent'
        });
    }

    async triggerUserAuthentication(userInfo) {
        return this.triggerWorkflow({
            type: 'user_authentication',
            user: userInfo,
            method: 'voice'
        });
    }

    async triggerPaymentProcessing(paymentData) {
        return this.triggerWorkflow({
            type: 'payment_processing',
            payment: paymentData,
            channel: 'voice'
        });
    }

    async triggerNotification(notificationData) {
        return this.triggerWorkflow({
            type: 'notification',
            notification: notificationData,
            timestamp: new Date().toISOString()
        });
    }

    // Health check for N8N connection
    async healthCheck() {
        if (!this.isConfigured) {
            return { healthy: false, message: 'Not configured' };
        }

        try {
            const response = await axios.post(this.webhookUrl, {
                type: 'health_check',
                timestamp: new Date().toISOString()
            }, {
                timeout: 5000
            });

            return {
                healthy: true,
                status: response.status,
                responseTime: Date.now()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    // Get configuration status
    getStatus() {
        return {
            configured: this.isConfigured,
            webhookUrl: this.webhookUrl ? '***configured***' : 'not set',
            availableTriggers: [
                'triggerCustomerSupport',
                'triggerTicketCreation', 
                'triggerUserAuthentication',
                'triggerPaymentProcessing',
                'triggerNotification'
            ]
        };
    }
}

module.exports = N8NIntegration;
