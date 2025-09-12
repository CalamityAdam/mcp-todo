#!/bin/bash

# Deployment script for Fly.io

echo "🚀 Deploying MCP Todo SMS App to Fly.io"

# Check if fly is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Build the application locally first
echo "📦 Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Launch or update the app
echo "🔧 Configuring Fly app..."
if ! flyctl status &> /dev/null; then
    echo "Creating new Fly app..."
    flyctl launch --no-deploy
else
    echo "App already exists, proceeding with deployment..."
fi

# Create volume if it doesn't exist
echo "💾 Checking for data volume..."
if ! flyctl volumes list | grep -q "data"; then
    echo "Creating data volume..."
    flyctl volumes create data --size 1 --region iad
fi

# Set secrets
echo "🔐 Setting secrets..."
echo "Please ensure you have set the following secrets:"
echo "  flyctl secrets set OPENAI_API_KEY=..."
echo "  flyctl secrets set TODO_MCP_TOKEN=..."
echo "  flyctl secrets set TWILIO_ACCOUNT_SID=..."
echo "  flyctl secrets set TWILIO_AUTH_TOKEN=..."
echo "  flyctl secrets set TWILIO_MESSAGING_SERVICE_SID=... (or TWILIO_PHONE_NUMBER=...)"
echo "  flyctl secrets set ALLOWED_SMS_FROM='+1234567890,+0987654321'"
echo "  flyctl secrets set PUBLIC_BASE_URL='https://your-app.fly.dev'"

read -p "Have you set all the required secrets? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the secrets and run this script again."
    exit 1
fi

# Deploy
echo "🚀 Deploying to Fly.io..."
flyctl deploy

# Show status
echo "✅ Deployment complete!"
flyctl status
echo ""
echo "🔗 Your app URL: https://$(flyctl info -j | jq -r .App.Name).fly.dev"
echo "📱 Configure your Twilio webhook to: https://$(flyctl info -j | jq -r .App.Name).fly.dev/twilio/sms"