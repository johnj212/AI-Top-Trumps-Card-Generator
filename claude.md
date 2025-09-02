
# Gemini API Integration Reference (Locked Design)

## Backend API Contract

- All Gemini API calls are made from the backend (`server/server.js`).
- The backend exposes a single endpoint: `/api/generate`.
- Requests must include:
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
* ✅ **Production Deployment** - Successfully deployed to Google Cloud Run (europe-north1)
* ✅ **Cloud Storage Integration** - Added Google Cloud Storage for persistent image and card storage
* ✅ **Environment Consolidation** - Unified .env configuration for better deployment management
* ✅ **Deployment Optimization** - Streamlined Cloud Run deployment with optimized Docker builds
* ✅ **Initial Preview Fix** - Fixed initial preview image not displaying in production
* ✅ **Container Optimization** - Removed unnecessary deployment files, enhanced .dockerignore
* ✅ **Sequential Generation** - Implemented reliable card-by-card generation process
* ✅ **Health Monitoring** - Added comprehensive health checks and logging system

## Current Project Status

### Completed Features
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
  - `./deploy.sh` - Full deployment with secret setup
  - `./deploy-simple.sh` - Quick rebuild and redeploy
* **Environment Variables**: Managed via Google Secret Manager
* **Storage**: Google Cloud Storage for images and card data

### Card Generation Pipeline
1. Theme selection triggers stat generation via AI
2. Preview card generation (title, stats, image)
3. Pack generation (3 additional cards sequentially)
4. Image optimization and display with proper aspect ratios
5. Rarity assignment with weighted randomization

## Rules
* Do not mention claude code in and comments or commits.
* run linter before commit