# 🎙️ Priyo Voice Agent - Real-time AI Voice Assistant

A real-time speech-to-speech voice agent powered by OpenAI's Realtime API, WebRTC, and Node.js. This application enables natural, low-latency voice conversations with AI, designed for integration with n8n workflows and Zendesk support systems.

## ✨ Features

- **Real-time Voice Conversation**: Direct speech-to-speech interaction using OpenAI's Realtime API
- **WebRTC Audio Streaming**: Low-latency audio transmission for natural conversation flow
- **Modern Web Interface**: Beautiful, responsive UI with real-time audio visualization
- **N8N Integration Ready**: Built-in webhook support for workflow automation
- **Zendesk Integration**: Prepared for customer support ticket integration
- **Modular Architecture**: Easy to extend and customize for different use cases
- **Production Ready**: Optimized for deployment on VPS or cloud platforms

## 🏗️ Architecture

```
┌─────────────────┐    WebRTC     ┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Web Client    │◄─────────────►│  Node.js Server │◄───────────────►│  OpenAI Realtime│
│  (Browser)      │               │   (Express +    │                 │      API        │
│                 │               │   WebSocket)    │                 │                 │
└─────────────────┘               └─────────────────┘                 └─────────────────┘
                                           │
                                           │ HTTP/Webhook
                                           ▼
                                  ┌─────────────────┐
                                  │  N8N Workflows  │
                                  │   & Zendesk     │
                                  └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- OpenAI API key with Realtime API access
- Modern web browser with WebRTC support

### Installation

1. **Clone and setup the project:**
```bash
cd /home/md-sagor-khan/priyo-voice-agent
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open your browser:**
```
http://localhost:3000
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# WebRTC Configuration (optional)
STUN_SERVER=stun:stun.l.google.com:19302

# N8N Integration (optional)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/voice-agent

# Security
CORS_ORIGIN=http://localhost:3000
```

### OpenAI API Key Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key with Realtime API access
3. Add it to your `.env` file as `OPENAI_API_KEY`

## 📱 Usage

### Starting a Conversation

1. **Grant microphone permissions** when prompted
2. **Click "Start Conversation"** or press `Spacebar`
3. **Speak naturally** - the AI will respond in real-time
4. **Click "Stop"** or press `Escape` to end the conversation

### Keyboard Shortcuts

- `Spacebar`: Start/Stop conversation
- `Escape`: Stop conversation
- `M`: Toggle mute/unmute

### Audio Controls

- **Start/Stop**: Begin or end voice conversation
- **Mute**: Temporarily disable microphone input
- **Volume Visualization**: Real-time audio level display

## 🔗 N8N Integration

### Setting up N8N Webhook

1. **Create a webhook node** in your n8n workflow
2. **Copy the webhook URL** 
3. **Add to your `.env` file:**
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.hostinger.com/webhook/voice-agent
```

### Triggering Workflows

The voice agent can trigger n8n workflows with conversation context:

```javascript
// Example: Trigger customer support workflow
voiceAgent.triggerN8NWorkflow({
    type: 'customer_support',
    userMessage: 'I need help with my account',
    priority: 'high'
});
```

### Webhook Payload Structure

```json
{
    "source": "voice-agent",
    "timestamp": "2024-10-16T10:30:00.000Z",
    "data": {
        "type": "customer_support",
        "conversationHistory": [...],
        "sessionActive": true,
        "userMessage": "User's spoken message"
    }
}
```

## 🏗️ Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Run tests
npm test
```

### Production Deployment

#### Option 1: Hostinger VPS

1. **Upload files to your VPS:**
```bash
scp -r . user@your-vps-ip:/path/to/app
```

2. **Install dependencies:**
```bash
ssh user@your-vps-ip
cd /path/to/app
npm install --production
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with production values
```

4. **Start with PM2:**
```bash
npm install -g pm2
pm2 start server.js --name "voice-agent"
pm2 startup
pm2 save
```

#### Option 2: Cloud Platforms

**Heroku:**
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set OPENAI_API_KEY=your_key
git push heroku main
```

**Railway:**
```bash
# Install Railway CLI
railway login
railway init
railway add
railway deploy
```

### Nginx Configuration (for VPS)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Security Considerations

### API Key Security
- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Monitor API usage and costs

### WebRTC Security
- Use HTTPS in production for secure WebRTC
- Configure TURN servers for NAT traversal
- Implement rate limiting for API endpoints

### CORS Configuration
```javascript
// Configure CORS for production
app.use(cors({
    origin: ['https://your-domain.com'],
    credentials: true
}));
```

## 📊 Monitoring & Analytics

### Health Checks

The application provides health check endpoints:

- `GET /health` - Basic health status
- `GET /api/status` - Detailed service status

### Logging

Logs are structured and include:
- WebSocket connection events
- OpenAI API interactions
- Audio processing status
- Error tracking

### Performance Monitoring

Monitor these key metrics:
- WebSocket connection stability
- Audio latency and quality
- OpenAI API response times
- Memory and CPU usage

## 🛠️ Troubleshooting

### Common Issues

**Microphone not working:**
- Check browser permissions
- Ensure HTTPS in production
- Test with different browsers

**OpenAI connection fails:**
- Verify API key is correct
- Check API quota and billing
- Ensure Realtime API access

**WebRTC connection issues:**
- Configure STUN/TURN servers
- Check firewall settings
- Test on different networks

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm start
```

Use browser console for client-side debugging:
```javascript
// Check voice agent status
getVoiceAgentStatus();

// Access components
window.voiceAgent.getStatus();
```

## 🔄 API Cost Optimization

### OpenAI Realtime API Costs

- **Input Audio**: ~$0.06 per minute
- **Output Audio**: ~$0.24 per minute
- **Text Processing**: Standard GPT-4 rates

### Cost Reduction Strategies

1. **Session Management**: End sessions promptly
2. **Audio Quality**: Use appropriate sample rates
3. **Conversation Length**: Implement timeouts
4. **Caching**: Cache common responses
5. **Monitoring**: Track usage with alerts

## 🔮 Future Integrations

### Zendesk Integration

```javascript
// Example Zendesk ticket creation
const ticket = {
    subject: 'Voice Support Request',
    description: conversationTranscript,
    priority: 'normal',
    type: 'question'
};
```

### Advanced Features Roadmap

- **Multi-language Support**: Automatic language detection
- **Voice Cloning**: Custom voice models
- **Sentiment Analysis**: Real-time emotion detection
- **Call Recording**: Conversation archival
- **Analytics Dashboard**: Usage and performance metrics

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: +8801300152436
- Email: support@priyo.com

---

**Built with ❤️ for real-time voice AI experiences**
