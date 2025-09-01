#!/bin/bash

# AI Top Trumps Card Generator - Cloud Run Deployment Script
set -e

PROJECT_ID="whispers-of-the-wildwood"
SERVICE_NAME="ai-top-trumps-card-generator"
REGION="europe-north1"  # Same as your storage bucket
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying AI Top Trumps Card Generator to Cloud Run..."

# Set the project
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Build and push the container image
echo "🏗️ Building container image..."
gcloud builds submit --tag $IMAGE_NAME

# Store the Gemini API key in Secret Manager (if not already done)
echo "🔐 Setting up secrets..."
if ! gcloud secrets describe gemini-api-key --quiet 2>/dev/null; then
    echo "Creating Gemini API key secret..."
    echo "Please enter your Gemini API key:"
    read -s GEMINI_API_KEY
    echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
else
    echo "Gemini API key secret already exists"
fi

# Grant the service account access to the secret
echo "🔑 Granting service account access to secrets..."
gcloud secrets add-iam-policy-binding gemini-api-key \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --service-account github-actions@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "NODE_ENV=production,STORAGE_BUCKET=cards_storage-whispers-of-the-wildwood" \
    --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
    --memory 2Gi \
    --cpu 2 \
    --timeout 900 \
    --concurrency 100 \
    --max-instances 10 \
    --min-instances 0 \
    --allow-unauthenticated

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "📊 Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"

# Test the deployment
echo "🧪 Testing deployment..."
curl -s "$SERVICE_URL/api/health" | head -5 || echo "Health check failed - service might still be starting"

echo ""
echo "🎉 Your AI Top Trumps Card Generator is now running on Google Cloud Run!"
echo "🔗 Access it at: $SERVICE_URL"