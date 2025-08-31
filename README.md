# 🎯 AI Top Trumps Card Generator

![Example Card](/example_images/Aircraft-Stratosphere_Sovereign.jpg) ![Example Card](/example_images/Dinosaurs-Carnotaurus__Horned_Hunter.jpg) ![Example Card](/example_images/Fantasy-The_Sunstone_Golem.jpg)

A state-of-the-art AI-powered web application that generates professional-quality Top Trumps-style trading cards. Harness the power of Google's Gemini AI to create unique themes, balanced statistics, and stunning artwork for your custom card collections.

[![React](https://img.shields.io/badge/React-19.1.1-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## ✨ Features

-   **AI-Powered Content Generation**: Utilizes `gemini-2.5-flash` to dynamically generate thematic statistics and full card packs with unique titles and values.
-   **Stunning AI Image Generation**: Leverages `imagen-3.0-generate-002` to create high-quality, custom artwork for each card based on dynamic prompts.
-   **Live Interactive Preview**: Instantly see how your card looks as you tweak series names, titles, stats, and styles.
-   **Deep Customization**:
    -   Choose from a variety of themes (Dinosaurs, Fantasy, Automotive, etc.).
    -   Select different color schemes to match your theme.
    -   Apply unique image styles (Holographic, Vintage, Cyberpunk, etc.).
-   **Full Pack Generation**: Create a set of 4 unique cards, starting with your customized preview card.
-   **Optimized Image Generation**: All images generated as perfect 1:1 squares for optimal card display.

## 🚀 How to Use

1.  **Customize Basics**: Start by giving your card series a name (e.g., "Mythical Creatures") and a title for your first card (e.g., "Griffin").
2.  **Select a Theme**: Choose a theme from the dropdown. This will automatically generate 6 relevant statistic names using AI.
3.  **Choose a Style**: Select a Color Scheme and an Image Style that best fits your vision.
4.  **Tweak Stats**: Adjust the AI-generated stats or randomize them for fun.
5.  **Generate Preview**: Click "Generate Preview Card". The AI will generate a new title, balanced stats, and a stunning image based on your settings. The live preview will update with the AI-generated result.
6.  **Generate Full Pack**: Once you're happy with the preview card, click "Generate Full Pack". The application will generate 3 more unique cards that match your theme and style.
7.  **View Your Cards**: All generated cards from the pack will be displayed at the bottom for you to admire and use.

## 🛠️ Getting Started

### Prerequisites

- Node.js and npm installed.
- A Google Gemini API key.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/AI-Top-Trumps-Card-Generator.git
   cd AI-Top-Trumps-Card-Generator
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Set up your environment variables:**
   - Create a new file named `.env` in the `server` directory.
   - Add your Gemini API key to the `.env` file as follows:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

### Running the Application

- **Start both the frontend and backend servers concurrently:**
  ```bash
  npm run dev
  ```
- The frontend will be available at `http://localhost:8088` and the backend at `http://localhost:3001`.

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **AI Models**:
    -   Google Gemini API (`@google/genai`)
    -   Text Generation: `gemini-2.5-flash`
    -   Image Generation: `imagen-3.0-generate-002`
-   **Card Display**: Optimized CSS layout with perfect 1:1.61 aspect ratio for authentic trading card proportions.

## 🏗️ Technical Architecture

### Frontend Stack
- **React 19** with TypeScript for type-safe component development
- **Tailwind CSS** for utility-first styling and responsive design
- **Vite** for fast development and optimized production builds
- **Custom Hooks** for state management and API integration

### Backend Stack
- **Node.js** with Express.js for robust server architecture
- **Google Gemini API** (`@google/genai`) for AI-powered content generation
- **CORS** enabled for cross-origin requests
- **Dotenv** for secure environment variable management

### AI Integration
- **Text Generation**: `gemini-2.5-flash` for statistics and card content
- **Image Generation**: `imagen-3.0-generate-002` for high-quality artwork
- **Response Processing**: Custom JSON parsing with comprehensive error handling
- **Rate Limiting**: Built-in request throttling and timeout management

### Development Tools
- **TypeScript** for full-stack type safety
- **Concurrently** for running multiple development servers
- **Docker & Docker Compose** for containerized deployment
- **ESM Modules** for modern JavaScript imports

### Card Rendering System
- **Aspect Ratio**: Authentic 1:1.61 (62:100) trading card proportions
- **Image Optimization**: 3:4 aspect ratio images optimized for card display
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **CSS Grid & Flexbox**: Modern layout techniques for precise positioning

## 📁 Project Structure

```
AI-Top-Trumps-Card-Generator/
├── components/                 # React components
│   ├── CardPreview.tsx        # Live card preview
│   ├── ControlPanel.tsx       # User interface controls
│   ├── GeneratedCardsDisplay.tsx # Pack display
│   └── Loader.tsx             # Loading states
├── server/                    # Backend server
│   ├── server.js             # Express server & API routes
│   ├── package.json          # Server dependencies
│   └── .env                  # Environment variables
├── services/                  # Frontend services
│   └── geminiService.ts      # AI API integration
├── App.tsx                   # Main application component
├── types.ts                  # TypeScript type definitions
├── constants.ts              # App constants & configurations
├── docker-compose.yml        # Container orchestration
├── Dockerfile               # Container definition
└── package.json             # Main project dependencies
```

## 🚀 Deployment Options

### Docker Deployment (Recommended)
```bash
# Production deployment
docker-compose up -d
```

### Manual Deployment
```bash
# Build frontend
npm run build

# Start backend
cd server && npm start

# Serve built frontend (using nginx, Apache, etc.)
```

### Environment Variables
```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional
NODE_ENV=production
PORT=3001
```

## 🔧 API Reference

### POST `/api/generate`
Generate AI content for cards

**Request Body:**
```json
{
  "prompt": "Your generation prompt",
  "modelName": "gemini-2.5-flash" | "imagen-3.0-generate-002"
}
```

**Response Formats:**

*Text/Stats Generation:*
```json
{
  "kind": "json",
  "data": ["Stat 1", "Stat 2", ...] | [{ title, stats, imagePrompt }, ...]
}
```

*Image Generation:*
```json
{
  "kind": "image",
  "mime": "image/jpeg",
  "data": "base64_encoded_image"
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Maintain existing code style (Tailwind CSS patterns)
- Add appropriate error handling
- Test both frontend and backend changes
- Update documentation for new features

## 🐛 Troubleshooting

### Common Issues

**"GEMINI_API_KEY environment variable is missing"**
- Ensure `.env` file exists in `server/` directory
- Verify API key is correctly formatted
- Check file permissions

**"Failed to parse Gemini content as JSON"**
- API response format may have changed
- Check network connectivity
- Verify API quota and billing status

**Images not displaying**
- Check browser console for CORS errors
- Verify backend is running on port 3001
- Ensure proper base64 encoding

**Cards not generating**
- Check AI model availability
- Verify prompt format matches expected structure
- Review server logs for detailed error messages

### Debug Mode
```bash
# Enable detailed logging
NODE_ENV=development npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini API** for powerful AI content generation
- **React & TypeScript** communities for excellent tooling
- **Tailwind CSS** for beautiful, responsive styling
- **Open Source Community** for inspiration and support

---

**Built with ❤️ and AI**
