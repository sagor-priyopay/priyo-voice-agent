#!/bin/bash

# Hostinger VPS Deployment Script for Priyo Voice Agent
# Usage: ./hostinger-deploy.sh [production|staging]

set -e

# Configuration
APP_NAME="priyo-voice-agent"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
}

# Install Node.js if not present
install_nodejs() {
    if ! command -v node &> /dev/null; then
        log_info "Installing Node.js $NODE_VERSION..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        log_info "Node.js already installed: $(node --version)"
    fi
}

# Install PM2 if not present
install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2..."
        sudo npm install -g pm2
        pm2 startup
    else
        log_info "PM2 already installed: $(pm2 --version)"
    fi
}

# Create backup
create_backup() {
    if [ -d "$APP_DIR" ]; then
        log_info "Creating backup..."
        sudo mkdir -p "$BACKUP_DIR"
        sudo cp -r "$APP_DIR" "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)"
        log_info "Backup created in $BACKUP_DIR"
    fi
}

# Deploy application
deploy_app() {
    log_info "Deploying application..."
    
    # Create app directory
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    
    # Copy files
    cp -r ./* "$APP_DIR/"
    cd "$APP_DIR"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --production
    
    # Set up environment
    if [ ! -f ".env" ]; then
        log_warn "No .env file found. Creating from template..."
        cp .env.example .env
        log_warn "Please edit $APP_DIR/.env with your configuration"
    fi
    
    # Set permissions
    chmod +x "$APP_DIR/deployment/hostinger-deploy.sh"
}

# Configure Nginx
configure_nginx() {
    log_info "Configuring Nginx..."
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    
    log_info "Nginx configured. Update server_name in /etc/nginx/sites-available/$APP_NAME"
}

# Start application with PM2
start_app() {
    log_info "Starting application with PM2..."
    
    cd "$APP_DIR"
    
    # Stop existing process
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start new process
    pm2 start server.js --name $APP_NAME
    pm2 save
    
    log_info "Application started successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    cd "$APP_DIR"
    npm test || log_warn "Tests failed, but continuing deployment"
}

# Main deployment function
main() {
    local env=${1:-production}
    
    log_info "Starting deployment for $env environment..."
    
    check_root
    install_nodejs
    install_pm2
    create_backup
    deploy_app
    run_tests
    configure_nginx
    start_app
    
    log_info "Deployment completed successfully!"
    log_info "Application is running at: http://your-domain.com"
    log_info "PM2 status: pm2 status"
    log_info "PM2 logs: pm2 logs $APP_NAME"
    log_info "PM2 restart: pm2 restart $APP_NAME"
    
    log_warn "Don't forget to:"
    log_warn "1. Update your domain in /etc/nginx/sites-available/$APP_NAME"
    log_warn "2. Configure SSL certificate (Let's Encrypt recommended)"
    log_warn "3. Update .env file with your OpenAI API key"
    log_warn "4. Configure firewall rules if needed"
}

# Run main function
main "$@"
