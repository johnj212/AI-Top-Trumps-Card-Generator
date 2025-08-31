
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
* ✅ Removed download functionality per requirements
* ✅ Optimized card aspect ratios (images: 1:1 square, cards: 1:1.61 portrait)
* ✅ Implemented sequential pack generation for better reliability
* ✅ Enhanced rarity system with proper positioning
* ✅ Improved JSON parsing with comprehensive error handling
* ✅ Added Docker containerization support
* ✅ Implemented theme-based automatic stat generation
* ✅ Enhanced UI/UX with loading states and error handling
* ✅ Optimized mobile responsiveness

## Current Project Status

### Completed Features
* ✅ AI-powered card content generation using `gemini-2.5-flash`
* ✅ AI image generation using `imagen-3.0-generate-002`
* ✅ Live interactive preview system
* ✅ Full pack generation (4 cards per pack)
* ✅ Theme-based stat generation
* ✅ Multiple color schemes and image styles
* ✅ Responsive design with mobile optimization
* ✅ Docker support with docker-compose
* ✅ Card aspect ratio optimization (1:1.61 for authentic trading card proportions)
* ✅ Rarity system with weighted random distribution
* ✅ Two-column stats layout for space efficiency
* ✅ Sequential pack generation for better reliability
* ✅ Robust error handling and JSON parsing

### Current Architecture
* **Frontend**: React + TypeScript + Tailwind CSS (Port 8088)
* **Backend**: Express.js + Node.js (Port 3001)
* **AI Integration**: Google Gemini API (`@google/genai`)
* **Deployment**: Docker + docker-compose support

### To Do List
* Add comprehensive tests (unit, integration, e2e)
* Implement stats caching to reduce AI API calls
* Add media storage system (images and cards folders)
* Implement API rate limiting
* Add authentication and security features
* Performance optimization and monitoring
* Add card export functionality (if needed)
* Database integration for persistent storage

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
* **Containerization**: Docker with multi-stage builds

### Card Generation Pipeline
1. Theme selection triggers stat generation via AI
2. Preview card generation (title, stats, image)
3. Pack generation (3 additional cards sequentially)
4. Image optimization and display with proper aspect ratios
5. Rarity assignment with weighted randomization

## Rules
* Do not mention claude code in and comments or commits.