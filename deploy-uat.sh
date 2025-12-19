#!/bin/bash

# AI Top Trumps Card Generator - UAT Cloud Run Deployment Script
set -e

PROJECT_ID="whispers-of-the-wildwood"
SERVICE_NAME="ai-top-trumps-card-generator-uat"
REGION="europe-north1"  # Same as your storage bucket
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🧪 Deploying AI Top Trumps Card Generator to UAT environment..."
echo "⚠️ This is a UAT deployment - lower resource limits will be applied"

# Set the project
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Build and push the container image
echo "🏗️ Building container image for UAT..."
gcloud builds submit --tag $IMAGE_NAME

# Store the UAT Gemini API key in Secret Manager (if not already done)
echo "🔐 Setting up UAT secrets..."
if ! gcloud secrets describe gemini-api-key-uat --quiet 2>/dev/null; then
    echo "Creating UAT Gemini API key secret..."
    echo "Please enter your UAT Gemini API key (can be same as production):"
    read -s GEMINI_API_KEY_UAT
    echo -n "$GEMINI_API_KEY_UAT" | gcloud secrets create gemini-api-key-uat --data-file=-
else
    echo "UAT Gemini API key secret already exists"
fi

# Grant the service account access to the UAT secret
echo "🔑 Granting service account access to UAT secrets..."
gcloud secrets add-iam-policy-binding gemini-api-key-uat \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Deploy to Cloud Run with UAT-specific configuration
echo "☁️ Deploying to Cloud Run UAT environment..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --service-account github-actions@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "NODE_ENV=uat,STORAGE_BUCKET=cards_storage-uat-whispers-of-the-wildwood" \
    --set-secrets "JWT_SECRET=jwt-secret-uat:latest,GEMINI_API_KEY=gemini-api-key-uat:latest" \
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
echo ""
echo "🔧 UAT Configuration:"
echo "   - Memory: 1Gi (reduced from production 2Gi)"
echo "   - CPU: 1 (reduced from production 2)"
echo "   - Concurrency: 50 (reduced from production 100)"
echo "   - Max Instances: 3 (reduced from production 10)"
echo "   - Storage Bucket: cards_storage-uat-whispers-of-the-wildwood"
echo "   - Environment: uat"

# Test the UAT deployment
echo "🧪 Testing UAT deployment..."
curl -s "$SERVICE_URL/api/health" | head -5 || echo "Health check failed - UAT service might still be starting"

echo ""
echo "🎉 Your AI Top Trumps Card Generator UAT environment is now running!"
echo "🔗 UAT URL: $SERVICE_URL"
echo ""
echo "📝 Next Steps:"
echo "   1. Test all functionality in UAT environment"
echo "   2. Verify rate limiting and authentication work correctly"
echo "   3. Test card generation and image storage"
echo "   4. Once UAT testing passes, deploy to production using deploy-prod.sh"