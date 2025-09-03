#!/bin/bash

# UAT - Simple Cloud Run Deployment Script (build and deploy only)
# This deploys to UAT environment with reduced resources
set -e

PROJECT_ID="whispers-of-the-wildwood"
SERVICE_NAME="ai-top-trumps-card-generator-uat"
REGION="europe-north1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🧪 Quick Deploy AI Top Trumps Card Generator to UAT environment..."

# Set the project
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Build and push the container image
echo "🏗️ Building container image for UAT..."
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run with UAT-specific configuration (assumes secrets already configured)
echo "☁️ Deploying to UAT Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --service-account github-actions@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "NODE_ENV=uat,STORAGE_BUCKET=cards_storage-uat-whispers-of-the-wildwood" \
    --set-secrets "GEMINI_API_KEY=gemini-api-key-uat:latest" \
    --memory 1Gi \
    --cpu 1 \
    --timeout 600 \
    --concurrency 50 \
    --max-instances 3 \
    --min-instances 0 \
    --allow-unauthenticated \
    --tag=uat

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "✅ UAT Deployment complete!"
echo "🧪 UAT Service URL: $SERVICE_URL"
echo "📊 Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"

# Test the UAT deployment
echo "🧪 Testing UAT deployment..."
curl -s "$SERVICE_URL/api/health" | head -5 || echo "Health check failed - UAT service might still be starting"

echo ""
echo "🎉 Your AI Top Trumps Card Generator UAT environment is now running!"
echo "🔗 UAT URL: $SERVICE_URL"