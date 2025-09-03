
# Gemini API Integration Reference (Locked Design)

## 🔐 AUTHENTICATION REQUIRED

**IMPORTANT**: As of September 2025, all API endpoints require authentication. Users must log in with a valid player code before accessing any AI features.

- **Login Required**: All users must authenticate via `/api/auth/login` before using the application
- **Player Code**: Currently set to `TIGER34` (configurable in `server/middleware/authMiddleware.js`)
- **Token Required**: All API requests must include `Authorization: Bearer <token>` header
- **Session Duration**: JWT tokens expire after 24 hours
- **Rate Limiting**: Global limit of 100 requests per day per user/IP address
- **Speed Limiting**: Requests slowed down after 50 requests per day

## Backend API Contract

- All Gemini API calls are made from the backend (`server/server.js`).
- The backend exposes a single endpoint: `/api/generate` (PROTECTED - requires authentication).
- Requests must include:
    - `Authorization: Bearer <jwt-token>` header (REQUIRED)
    - `prompt`: The prompt string for Gemini.
    - `modelName`: The Gemini model to use (`gemini-2.5-flash` for text/stats, `imagen-3.0-generate-002` for images).

## Response Shapes

### Stats Generation
- **Request:**
    - `modelName: 'gemini-2.5-flash'`
    - `prompt`: As described in the codebase (see `generateStatsForTheme`).
- **Backend Response:**
    - `{ kind: 'json', data: ["Stat Name 1", "Stat Name 2", ...] }`
- **Frontend Handling:**
    - The frontend parses the response as JSON and uses `data` as the array of stat names.

### Card Ideas Generation
- **Request:**
    - `modelName: 'gemini-2.5-flash'`
    - `prompt`: As described in the codebase (see `generateCardIdeas`).
- **Backend Response:**
    - `{ kind: 'json', data: [ { title, stats, imagePrompt }, ... ] }`
- **Frontend Handling:**
    - The frontend parses the response as JSON and uses `data` as the array of card ideas.

### Image Generation
- **Request:**
    - `modelName: 'imagen-3.0-generate-002'`
    - `prompt`: The image prompt string.
- **Backend Response:**
    - `{ kind: 'image', mime: 'image/jpeg', data: '<base64>' }`
- **Frontend Handling:**
    - The frontend parses the response as JSON and uses `data` as the base64 image string.

## Error Handling
- All parsing is done on the backend before sending to the client.
- If parsing fails, backend returns a 500 error with the raw text for debugging.
- Frontend expects the above shapes and logs errors if the expected fields are missing.

## Design Lock
- **Do not change the response shapes or contract without updating both backend and frontend.**
- Always return `{ kind, data }` objects for all API responses.
- All frontend code must check for `kind` and use `data` accordingly.

## Example Usage

```js
// Backend response for stats:
{ kind: 'json', data: ["Top Speed", "Range", ...] }

// Backend response for card ideas:
{ kind: 'json', data: [ { title, stats, imagePrompt }, ... ] }

// Backend response for image:
{ kind: 'image', mime: 'image/jpeg', data: '<base64>' }
```

## Maintenance
- If Gemini API changes, update backend parsing logic first, then update frontend contract.
- Always test both stats and image generation after any change.

## Recent Development History
* ✅ **Deployment Script Restructuring** - Fixed ambiguous deployment script naming to prevent production confusion (Sep 3, 2025)
* ✅ **Google Cloud Logging Fix** - Fixed log append behavior to prevent overwriting previous logs (Sep 2025)
* ✅ **Color Scheme Border Fix** - Fixed Green-Brown and Red-Gold color schemes to use proper accent borders (Sep 2025)
* ✅ **Global Rate Limiting System** - 100 requests per day per user with detailed logging (Sep 2025)
* ✅ **Enhanced Logging System** - All logs now include user details and rate limit information
* ✅ **Player Code Authentication System** - Implemented JWT-based login with player code "TIGER34" (Sep 2025)
* ✅ **API Security Protection** - All `/api/generate` and `/api/cards` endpoints now require authentication
* ✅ **Child-Friendly Login UI** - Gaming-themed login screen designed for 12-year-old users
* ✅ **Session Management** - Automatic token validation and persistent login state
* ✅ **Production Deployment** - Successfully deployed to Google Cloud Run (europe-north1)
* ✅ **Cloud Storage Integration** - Added Google Cloud Storage for persistent image and card storage
* ✅ **Environment Consolidation** - Unified .env configuration for better deployment management
* ✅ **Deployment Script Security** - Restructured deployment scripts with explicit environment naming
* ✅ **Initial Preview Fix** - Fixed initial preview image not displaying in production
* ✅ **Container Optimization** - Removed unnecessary deployment files, enhanced .dockerignore
* ✅ **Sequential Generation** - Implemented reliable card-by-card generation process
* ✅ **Health Monitoring** - Added comprehensive health checks and logging system

## Current Project Status

### Completed Features
* ✅ **Global Rate Limiting** - 100 requests per day limit with speed throttling and comprehensive logging
* ✅ **Enhanced Cloud Logging** - User details, rate limits, and comprehensive request tracking
* ✅ **Player Code Authentication System** - Secure JWT-based login with player code authentication
* ✅ **Protected API Access** - All AI endpoints require valid authentication tokens
* ✅ **Child-Friendly Security** - Login system designed for 12-year-old target audience
* ✅ **Session Management** - Persistent login state with automatic token validation
* ✅ **AI-powered card content generation** using `gemini-2.5-flash`
* ✅ **AI image generation** using `imagen-3.0-generate-002`
* ✅ **Live interactive preview system** with immediate initial preview
* ✅ **Full pack generation** (4 cards per pack) with sequential processing
* ✅ **Theme-based stat generation** with 5 themes (Dinosaurs, Fantasy, Automotive, Aircraft, Pokémon)
* ✅ **Multiple color schemes and image styles** (10 image styles, 5 color schemes)
* ✅ **Production deployment** on Google Cloud Run (europe-north1)
* ✅ **Cloud storage integration** for persistent image and card storage
* ✅ **Responsive design** with mobile optimization and touch-friendly interface
* ✅ **Card aspect ratio optimization** (1:1.61 for authentic trading card proportions)
* ✅ **Rarity system** with weighted random distribution and visual indicators
* ✅ **Two-column stats layout** for space efficiency
* ✅ **Sequential pack generation** for better reliability and error handling
* ✅ **Comprehensive health monitoring** with logging and error tracking

### Current Architecture
* **Frontend**: React + TypeScript + Tailwind CSS (Port 8088)
* **Backend**: Express.js + Node.js (Port 3001)
* **AI Integration**: Google Gemini API (`@google/genai`)
* **Production Deployment**: Google Cloud Run (europe-north1 region)
* **Development**: Docker support for local development

### Production Status
* **Live URL**: https://ai-top-trumps-card-generator-50477513015.europe-north1.run.app
* **Deployment Status**: ✅ Fully deployed and operational
* **Health Status**: ✅ All systems healthy
* **Storage**: ✅ Google Cloud Storage integrated
* **Security**: ✅ API keys managed via Google Secret Manager
* **Performance**: ✅ Auto-scaling 0-10 instances

### Completed Issues
* ✅ **Initial Preview Image Fixed** - Example images now included in production container
* ✅ **Environment Variables Consolidated** - Single .env file for better management
* ✅ **Docker Optimization** - Removed unnecessary deployment files
* ✅ **Sequential Generation** - Fixed pack generation reliability issues
* ✅ **Cloud Storage** - Persistent storage for generated content

### Future Enhancements
* Add comprehensive tests (unit, integration, e2e)
* Implement stats caching to reduce AI API calls
* Implement API rate limiting and monitoring
* Add user authentication and session management
* Performance analytics and usage tracking
* Card collection management system
* Export functionality for high-resolution prints

## Technical Architecture

### Frontend (React + TypeScript)
* **Port**: 8088 (Vite dev server)
* **Main Components**:
  - `App.tsx`: Main application logic and state management
  - `ControlPanel.tsx`: User interface for card customization
  - `CardPreview.tsx`: Real-time card preview
  - `GeneratedCardsDisplay.tsx`: Display generated card packs
  - `Loader.tsx`: Loading states and progress indicators
* **Styling**: Tailwind CSS with custom card aspect ratios
* **State Management**: React useState hooks with callback optimization

### Backend (Express.js)
* **Port**: 3001
* **Main File**: `server/server.js`
* **API Endpoints**: Single `/api/generate` endpoint handling both text and image generation
* **AI Integration**: Google Gemini API with proper error handling
* **Features**: CORS enabled, static file serving, environment variable validation

### AI Integration Details
* **Text Generation**: `gemini-2.5-flash` for stats and card ideas
* **Image Generation**: `imagen-3.0-generate-002` with 3:4 aspect ratio configuration
* **Response Format**: Standardized `{ kind, data }` structure
* **Error Handling**: Comprehensive parsing with fallback error responses

### Development Setup
* **Package Manager**: npm with workspace support
* **Build Tool**: Vite for frontend bundling
* **Process Management**: Concurrently for running both servers
* **Environment**: Dotenv for API key management
* **Containerization**: Docker with optimized builds

### Deployment
* **Production Platform**: Google Cloud Run
* **Region**: europe-north1 
* **Project**: whispers-of-the-wildwood
* **Service Name**: ai-top-trumps-card-generator
* **Deployment Scripts**: 
  - `./deploy-prod.sh` - Production deployment with human-in-the-loop safeguards
  - `./deploy-simple-prod.sh` - Quick production deployment (no prompts)
  - `./deploy-uat.sh` - UAT deployment with detailed logging
  - `./deploy-simple-uat.sh` - Quick UAT deployment (streamlined)
* **Environment Variables**: Managed via Google Secret Manager
* **Storage**: Google Cloud Storage for images and card data

### Card Generation Pipeline
1. Theme selection triggers stat generation via AI
2. Preview card generation (title, stats, image)
3. Pack generation (3 additional cards sequentially)
4. Image optimization and display with proper aspect ratios
5. Rarity assignment with weighted randomization

## 🚀 Deployment Management

### Deployment Script Reference
The project uses explicit environment naming to prevent deployment confusion:

| Script | Target Environment | Purpose | Prompts | Resources | Service Name |
|--------|-------------------|---------|---------|-----------|--------------|
| `./deploy-prod.sh` | Production | Safe deployment with confirmations | ✅ Yes | 2Gi RAM, 2 CPU | `ai-top-trumps-card-generator` |
| `./deploy-simple-prod.sh` | Production | Quick deployment for CI/CD | ❌ No | 2Gi RAM, 2 CPU | `ai-top-trumps-card-generator` |
| `./deploy-uat.sh` | UAT | Full deployment with logging | ✅ Yes | 1Gi RAM, 1 CPU | `ai-top-trumps-card-generator-uat` |
| `./deploy-simple-uat.sh` | UAT | Streamlined deployment | ❌ No | 1Gi RAM, 1 CPU | `ai-top-trumps-card-generator-uat` |

### Environment Configuration
- **Production**: 
  - NODE_ENV=production
  - Storage: `cards_storage-whispers-of-the-wildwood`
  - Secret: `gemini-api-key`
- **UAT**: 
  - NODE_ENV=uat
  - Storage: `cards_storage-uat-whispers-of-the-wildwood`
  - Secret: `gemini-api-key-uat`

### Deployment Best Practices
1. **Always test in UAT first**: Use `./deploy-uat.sh` before production deployments
2. **Use safe production deployment**: Use `./deploy-prod.sh` for important releases (includes confirmations)
3. **Quick deployments for CI/CD**: Use `./deploy-simple-*` scripts for automated pipelines
4. **Never guess environment**: Script names explicitly indicate target environment

### Deployment Safety Features
- **Human-in-the-loop**: Production scripts require explicit confirmation
- **Environment validation**: Scripts verify correct project and service settings
- **Health checks**: Automatic post-deployment verification
- **Rollback capability**: Documented rollback procedures in case of issues

## Rules
* Do not mention claude code in and comments or commits.
* run linter before commit
* Always use explicit deployment scripts - never create ambiguous script names