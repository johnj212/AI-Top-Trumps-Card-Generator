#!/bin/bash

# PRODUCTION - Simple Cloud Run Deployment Script (build and deploy only)
# WARNING: This deploys directly to PRODUCTION environment
# Use deploy-prod.sh for human-in-the-loop safeguards
set -e

PROJECT_ID="whispers-of-the-wildwood"
SERVICE_NAME="ai-top-trumps-card-generator"
REGION="europe-north1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Quick Deploy AI Top Trumps Card Generator to PRODUCTION..."

# Set the project
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Build and push the container image
echo "🏗️ Building container image..."
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run (assumes secrets already configured)
echo "☁️ Deploying to PRODUCTION Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --service-account github-actions@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "NODE_ENV=production,STORAGE_BUCKET=cards_storage-whispers-of-the-wildwood" \
    --set-secrets "JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest" \
    --memory 2Gi \
    --cpu 2 \
    --timeout 900 \
    --concurrency 100 \
    --max-instances 10 \
    --min-instances 0 \
    --allow-unauthenticated

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "✅ PRODUCTION Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "📊 Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"

# Test the deployment
echo "🧪 Testing PRODUCTION deployment..."
curl -s "$SERVICE_URL/api/health" | head -5 || echo "Health check failed - service might still be starting"

echo ""
echo "🎉 Your AI Top Trumps Card Generator is now running on PRODUCTION!"
echo "🔗 Access it at: $SERVICE_URL"