# 🚀 Installation & Deployment Guide

This guide will help you set up and deploy the Priyo Voice Agent on various platforms.

## 📋 Prerequisites

- **Node.js 16+** (recommended: Node.js 18)
- **OpenAI API Key** with Realtime API access
- **Modern browser** with WebRTC support
- **HTTPS domain** (required for production WebRTC)

## 🏃‍♂️ Quick Local Setup

### 1. Install Dependencies

```bash
cd /home/md-sagor-khan/priyo-voice-agent
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
nano .env
```

**Required environment variables:**
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Test Connection

```bash
# Test OpenAI connection and server health
npm test
```

### 4. Start Development Server

```bash
# Start with auto-reload
npm run dev

# Or start production mode
npm start
```

### 5. Access Application

Open your browser and go to: **http://localhost:3000**

---

## 🌐 Production Deployment

### Option 1: Hostinger VPS Deployment

#### Automated Deployment Script

```bash
# Make deployment script executable
chmod +x deployment/hostinger-deploy.sh

# Run deployment (will install Node.js, PM2, configure Nginx)
./deployment/hostinger-deploy.sh production
```

#### Manual VPS Setup

1. **Connect to your VPS:**
```bash
ssh root@your-vps-ip
```

2. **Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Install PM2:**
```bash
sudo npm install -g pm2
```

4. **Upload your project:**
```bash
# From your local machine
scp -r . root@your-vps-ip:/var/www/priyo-voice-agent
```

5. **Setup on VPS:**
```bash
cd /var/www/priyo-voice-agent
npm install --production

# Configure environment
cp .env.example .env
nano .env  # Add your OpenAI API key

# Start with PM2
pm2 start server.js --name priyo-voice-agent
pm2 startup
pm2 save
```

6. **Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/priyo-voice-agent
```

Add this configuration:
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
        proxy_read_timeout 86400;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/priyo-voice-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. **Setup SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 2: Railway Deployment

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login and deploy:**
```bash
railway login
railway init
railway add
railway deploy
```

3. **Set environment variables:**
```bash
railway variables set OPENAI_API_KEY=your_key_here
railway variables set NODE_ENV=production
```

### Option 3: Heroku Deployment

1. **Install Heroku CLI and login:**
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login
```

2. **Create and deploy:**
```bash
heroku create priyo-voice-agent
heroku config:set OPENAI_API_KEY=your_key_here
heroku config:set NODE_ENV=production

git add .
git commit -m "Initial deployment"
git push heroku main
```

### Option 4: Docker Deployment

1. **Build and run with Docker:**
```bash
# Build image
docker build -t priyo-voice-agent .

# Run container
docker run -d \
  --name priyo-voice-agent \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your_key_here \
  -e NODE_ENV=production \
  priyo-voice-agent
```

2. **Or use Docker Compose:**
```bash
# Set environment variables
export OPENAI_API_KEY=your_key_here
export CORS_ORIGIN=https://your-domain.com

# Start services
docker-compose -f deployment/docker-compose.yml up -d
```

---

## 🔧 Configuration Guide

### OpenAI API Key Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Ensure you have access to the Realtime API
4. Add the key to your `.env` file

### N8N Integration Setup

1. **Create webhook in N8N:**
   - Add a "Webhook" node to your workflow
   - Set HTTP Method to "POST"
   - Copy the webhook URL

2. **Configure in voice agent:**
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/voice-agent
```

3. **Test integration:**
```bash
curl -X POST https://your-n8n-instance.com/webhook/voice-agent \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

### Zendesk Integration (Future)

```env
ZENDESK_SUBDOMAIN=your-company
ZENDESK_API_TOKEN=your_api_token
ZENDESK_EMAIL=agent@your-company.com
```

---

## 🔒 Security Configuration

### Production Security Checklist

- [ ] **HTTPS enabled** (required for WebRTC)
- [ ] **API keys in environment variables** (never in code)
- [ ] **CORS properly configured** for your domain
- [ ] **Rate limiting implemented** (optional)
- [ ] **Firewall configured** (ports 80, 443, 22)
- [ ] **Regular security updates** scheduled

### Environment Variables Security

```bash
# Set secure file permissions
chmod 600 .env

# Never commit .env to git
echo ".env" >> .gitignore
```

---

## 📊 Monitoring & Maintenance

### PM2 Management Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs priyo-voice-agent

# Restart application
pm2 restart priyo-voice-agent

# Stop application
pm2 stop priyo-voice-agent

# Monitor resources
pm2 monit
```

### Health Checks

```bash
# Check application health
curl http://localhost:3000/health

# Check API status
curl http://localhost:3000/api/status
```

### Log Monitoring

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View Nginx logs (if using)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Microphone not working:**
```bash
# Check browser permissions
# Ensure HTTPS in production
# Test with different browsers
```

**2. OpenAI connection fails:**
```bash
# Test API key
node test/test-connection.js

# Check API quota
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**3. WebRTC connection issues:**
```bash
# Check STUN/TURN configuration
# Verify firewall settings
# Test on different networks
```

**4. High memory usage:**
```bash
# Monitor with PM2
pm2 monit

# Restart if needed
pm2 restart priyo-voice-agent
```

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development npm start

# Check browser console for client errors
# Use browser dev tools Network tab
```

---

## 💰 Cost Optimization

### OpenAI API Costs

- **Input Audio**: ~$0.06 per minute
- **Output Audio**: ~$0.24 per minute
- **Total**: ~$0.30 per minute of conversation

### Cost Reduction Tips

1. **Session timeouts**: Implement automatic session ending
2. **Audio quality**: Use appropriate sample rates
3. **Conversation length**: Set maximum duration limits
4. **Usage monitoring**: Track and alert on high usage
5. **Caching**: Cache common responses

### Monitoring Usage

```javascript
// Add to your application
const usage = {
    sessions: 0,
    totalMinutes: 0,
    totalCost: 0
};

// Track in your session handlers
```

---

## 🔄 Updates & Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart application
pm2 restart priyo-voice-agent
```

### Backup Strategy

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backups/priyo-voice-agent_$DATE.tar.gz /var/www/priyo-voice-agent
```

---

## 📞 Support

If you encounter issues:

1. **Check logs** first: `pm2 logs priyo-voice-agent`
2. **Test connections**: `npm test`
3. **Review configuration**: Verify `.env` file
4. **Contact support**: +8801300152436

---

**🎉 Your real-time AI voice agent is now ready for production!**
