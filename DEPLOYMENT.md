# AI Top Trumps Card Generator - Deployment Guide

This document outlines the deployment process for the AI Top Trumps Card Generator across different environments.

## Environment Overview

### Development Environment 🏠
- **Purpose**: Local development and testing
- **Command**: `npm run dev`
- **URL**: http://localhost:8088 (frontend), http://localhost:3001 (backend)
- **Storage**: Local file system (`dev-storage/`)
- **Rate Limiting**: Disabled
- **Logging**: Local files only
- **Features**:
  - Hot reload for development
  - Local storage mock
  - Simplified error handling
  - No cloud dependencies required

### UAT Environment 🧪
- **Purpose**: User Acceptance Testing before production
- **Command**: `npm run deploy:uat` or `./deploy-uat.sh`
- **Service**: `ai-top-trumps-card-generator-uat`
- **Storage**: `cards_storage-uat-whispers-of-the-wildwood`
- **Rate Limiting**: Full production rules (100 req/day)
- **Resources**: Reduced (1Gi memory, 1 CPU, max 3 instances)
- **Features**:
  - Production-like environment
  - Cost-optimized resources
  - Separate data isolation
  - Full feature testing

### Production Environment 🌍
- **Purpose**: Live user-facing application
- **Command**: `npm run deploy:prod` or `./deploy-prod.sh`
- **Service**: `ai-top-trumps-card-generator`
- **URL**: https://ai-top-trumps-card-generator-50477513015.europe-north1.run.app
- **Storage**: `cards_storage-whispers-of-the-wildwood`
- **Rate Limiting**: Full enforcement (100 req/day)
- **Resources**: Full (2Gi memory, 2 CPU, max 10 instances)
- **Features**:
  - Human-in-the-loop deployment approvals
  - Health check validation
  - Comprehensive monitoring
  - Auto-scaling

## Deployment Workflow

### 1. Development Phase
```bash
# Start local development
npm run dev

# Access application
# Frontend: http://localhost:8088
# Backend: http://localhost:3001
```

**Features in Development:**
- ✅ Local storage (no cloud dependencies)
- ✅ Rate limiting disabled for easier testing
- ✅ Hot reload and fast feedback
- ✅ Simplified logging

### 2. UAT Deployment
```bash
# Deploy to UAT environment
npm run deploy:uat

# Or use script directly
./deploy-uat.sh
```

**UAT Deployment Process:**
1. Builds container image
2. Creates UAT-specific secrets if needed
3. Deploys with reduced resources
4. Runs health checks
5. Provides UAT URL for testing

**UAT Configuration:**
- Memory: 1Gi (vs 2Gi production)
- CPU: 1 (vs 2 production)
- Concurrency: 50 (vs 100 production)
- Max Instances: 3 (vs 10 production)
- Separate storage bucket
- Full rate limiting enabled

### 3. Production Deployment
```bash
# Deploy to production (with human approval)
npm run deploy:prod

# Or use script directly
./deploy-prod.sh
```

**Production Deployment Process:**
1. **Pre-deployment Checks**:
   - Shows current production status
   - Displays impact assessment
   - Checks current health

2. **Human Confirmation Required**:
   - UAT testing completion confirmation
   - User impact acknowledgment
   - Final deployment approval

3. **Deployment Execution**:
   - Builds and pushes container
   - Deploys with zero downtime
   - Runs comprehensive health checks
   - Switches traffic only after validation

4. **Post-deployment Verification**:
   - Health endpoint validation
   - Service metrics check
   - Traffic switch confirmation

### 4. Emergency Deployment
```bash
# Emergency production deployment (bypasses some checks)
npm run deploy:prod:emergency
```

**Use only for critical hotfixes when standard process would be too slow.**

## Environment Variables

### Development (.env.development)
- `NODE_ENV=development`
- Local storage configuration
- Simplified settings

### UAT (.env.uat)
- `NODE_ENV=uat`
- UAT-specific bucket
- Production-like configuration

### Production (.env.production)
- `NODE_ENV=production`
- Production bucket and secrets
- Full monitoring and logging

## Security & Authentication

### Player Code System
- **Current Code**: `TIGER34` (configurable in `server/middleware/authMiddleware.js`)
- **Token Expiry**: 24 hours
- **Required for**: All API endpoints except health checks

### Rate Limiting
- **Global Limit**: 100 requests per day per user/IP
- **Speed Limiting**: Delays start after 50 requests/day
- **Development**: Completely disabled for easier testing
- **UAT/Production**: Full enforcement

## Storage Configuration

### Development
- **Type**: Local file system
- **Location**: `dev-storage/` directory
- **Benefits**: No cloud setup required, faster development

### UAT
- **Type**: Google Cloud Storage
- **Bucket**: `cards_storage-uat-whispers-of-the-wildwood`
- **Purpose**: Isolated testing data

### Production
- **Type**: Google Cloud Storage
- **Bucket**: `cards_storage-whispers-of-the-wildwood`
- **Purpose**: Live user data

## Monitoring & Logging

### Development
- Console logging
- Local log files in `dev-storage/logs/`
- Error tracking to console

### UAT/Production
- Google Cloud Storage logging
- Comprehensive user tracking
- Rate limit monitoring
- Error tracking with stack traces

## Troubleshooting

### Common Issues

**1. Local Development Storage Errors**
- **Solution**: Ensure you're using `.env.development` and NODE_ENV is set to development

**2. UAT Deployment Fails**
- **Solution**: Check Google Cloud permissions and bucket existence
- Ensure UAT secrets are properly configured

**3. Production Health Checks Fail**
- **Solution**: The deployment script handles this by not switching traffic
- Manually investigate and fix issues
- Use manual traffic switching when ready

### Useful Commands

```bash
# Check service status
gcloud run services describe ai-top-trumps-card-generator --region europe-north1

# View logs
gcloud run services logs tail ai-top-trumps-card-generator --region europe-north1

# Manual traffic switching (if needed)
gcloud run services update-traffic ai-top-trumps-card-generator --to-latest --region europe-north1
```

## Best Practices

1. **Always test in UAT first** before production deployment
2. **Use the human-in-the-loop production deployment** - don't bypass confirmations
3. **Monitor logs after deployment** for any issues
4. **Keep emergency deployment for true emergencies only**
5. **Test rate limiting** in UAT to ensure it works as expected
6. **Verify authentication flows** in UAT before production

## Support

For deployment issues:
- Check Cloud Console logs
- Review health endpoint responses
- Monitor rate limiting logs
- Verify storage bucket permissions
- Check secret manager access