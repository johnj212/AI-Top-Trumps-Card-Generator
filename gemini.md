
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