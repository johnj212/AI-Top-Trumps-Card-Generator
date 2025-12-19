#!/bin/bash

# AI Top Trumps Card Generator - PRODUCTION Deployment Script with Human-in-the-Loop
set -e

PROJECT_ID="whispers-of-the-wildwood"
SERVICE_NAME="ai-top-trumps-card-generator"
REGION="europe-north1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${RED}${BOLD}🚨 PRODUCTION DEPLOYMENT WARNING 🚨${NC}"
echo -e "${RED}You are about to deploy to the PRODUCTION environment${NC}"
echo -e "${RED}This will affect LIVE USERS and real traffic${NC}"
echo ""

# Get current service info
echo "📋 Setting project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Check current deployment status
echo -e "${BLUE}📊 Current Production Status:${NC}"
CURRENT_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null || echo "Service not found")
if [ "$CURRENT_URL" != "Service not found" ]; then
    echo "   🌐 Current URL: $CURRENT_URL"
    echo "   🏥 Current Health: $(curl -s --max-time 5 "$CURRENT_URL/api/health" | jq -r '.status // "Unknown"' 2>/dev/null || echo "Could not check")"
    
    # Get current service details
    CURRENT_IMAGE=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(spec.template.spec.template.spec.containers[0].image)' 2>/dev/null || echo "Unknown")
    CURRENT_TRAFFIC=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.traffic[0].percent)' 2>/dev/null || echo "Unknown")
    
    echo "   🖼️ Current Image: $CURRENT_IMAGE"
    echo "   🚦 Traffic Distribution: ${CURRENT_TRAFFIC}% to current version"
else
    echo "   ⚠️ Service not currently deployed"
fi
echo ""

# Pre-deployment checks
echo -e "${YELLOW}🔍 Pre-deployment Checks:${NC}"
echo "   ✅ Project ID: $PROJECT_ID"
echo "   ✅ Service Name: $SERVICE_NAME"
echo "   ✅ Region: $REGION"
echo "   ✅ Target Image: $IMAGE_NAME"
echo ""

# Impact assessment
echo -e "${YELLOW}📈 Impact Assessment:${NC}"
echo "   🎯 Target Environment: PRODUCTION"
echo "   👥 Affected Users: ALL LIVE USERS"
echo "   🛡️ Rate Limiting: 100 requests/day per user"
echo "   🔐 Authentication: JWT with player code TIGER34"
echo "   💾 Storage: cards_storage-whispers-of-the-wildwood"
echo "   ⚡ Resources: 2Gi memory, 2 CPU, up to 10 instances"
echo ""

# Human confirmation
echo -e "${BOLD}❓ Deployment Confirmation Required:${NC}"
read -p "Have you tested this deployment in UAT environment? (yes/no): " uat_tested
if [ "$uat_tested" != "yes" ]; then
    echo -e "${RED}❌ Please test in UAT environment first using: ./deploy-uat.sh${NC}"
    exit 1
fi

read -p "Are you prepared for potential user impact during deployment? (yes/no): " user_impact_ok
if [ "$user_impact_ok" != "yes" ]; then
    echo -e "${RED}❌ Deployment cancelled by user${NC}"
    exit 1
fi

read -p "Do you want to proceed with PRODUCTION deployment? (yes/no): " final_confirm
if [ "$final_confirm" != "yes" ]; then
    echo -e "${RED}❌ Deployment cancelled by user${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Human confirmation received. Proceeding with deployment...${NC}"
echo ""

# Build and push the container image
echo -e "${BLUE}🏗️ Building container image...${NC}"
gcloud builds submit --tag $IMAGE_NAME

echo -e "${BLUE}☁️ Deploying to Production Cloud Run...${NC}"
echo "⏳ This may take a few minutes..."

# Deploy to Cloud Run with production settings
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
    --allow-unauthenticated \
    --no-traffic

echo -e "${BLUE}🧪 Post-deployment Health Verification...${NC}"

# Get the new service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

# Health check with retry logic
echo "🏥 Testing health endpoint..."
for i in {1..5}; do
    if curl -s --max-time 10 "$SERVICE_URL/api/health" | grep -q "OK"; then
        echo -e "${GREEN}✅ Health check passed on attempt $i${NC}"
        HEALTH_OK=true
        break
    else
        echo "⏳ Health check attempt $i failed, retrying..."
        sleep 10
    fi
done

if [ "$HEALTH_OK" != "true" ]; then
    echo -e "${RED}❌ Health checks failed after 5 attempts${NC}"
    echo -e "${YELLOW}⚠️ New deployment created but traffic not switched${NC}"
    echo "🔧 To manually switch traffic after fixes:"
    echo "   gcloud run services update-traffic $SERVICE_NAME --to-latest --region $REGION"
    exit 1
fi

# Switch traffic to new version
echo -e "${BLUE}🚦 Switching traffic to new version...${NC}"
gcloud run services update-traffic $SERVICE_NAME --to-latest --region $REGION

# Final verification
echo -e "${BLUE}🔍 Final Production Verification...${NC}"
sleep 5

FINAL_HEALTH=$(curl -s --max-time 10 "$SERVICE_URL/api/health" | jq -r '.status // "Unknown"' 2>/dev/null || echo "Could not check")
echo "   🏥 Final Health Status: $FINAL_HEALTH"

if [ "$FINAL_HEALTH" = "OK" ]; then
    echo -e "${GREEN}🎉 PRODUCTION DEPLOYMENT SUCCESSFUL! 🎉${NC}"
else
    echo -e "${YELLOW}⚠️ Deployment completed but health check uncertain${NC}"
fi

echo ""
echo -e "${GREEN}✅ Production Deployment Summary:${NC}"
echo "   🌐 Production URL: $SERVICE_URL"
echo "   📊 Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo "   🕒 Deployed at: $(date)"
echo "   🖼️ Image: $IMAGE_NAME"
echo ""
echo -e "${BOLD}📝 Post-Deployment Actions:${NC}"
echo "   1. Monitor logs: gcloud run services logs tail $SERVICE_NAME --region $REGION"
echo "   2. Monitor metrics in Cloud Console"
echo "   3. Test key user flows manually"
echo "   4. Watch for rate limit errors in logs"
echo ""
echo -e "${GREEN}🔗 Access your PRODUCTION application at: $SERVICE_URL${NC}"