# AI Top Trumps Card Generator

![Example Card](https://storage.googleapis.com/aif-quick-start-images/top-trumps-card-example.png)

An AI-powered web application to create, customize, and generate professional-quality Top Trumps-style trading cards. Users can choose themes, customize stats, and generate unique images for their cards.

## ✨ Features

-   **AI-Powered Content Generation**: Utilizes `gemini-2.5-flash` to dynamically generate thematic statistics and full card packs with unique titles and values.
-   **Stunning AI Image Generation**: Leverages `imagen-3.0-generate-002` to create high-quality, custom artwork for each card based on dynamic prompts.
-   **Live Interactive Preview**: Instantly see how your card looks as you tweak series names, titles, stats, and styles.
-   **Deep Customization**:
    -   Choose from a variety of themes (Dinosaurs, Fantasy, Automotive, etc.).
    -   Select different color schemes to match your theme.
    -   Apply unique image styles (Holographic, Vintage, Cyberpunk, etc.).
-   **Full Pack Generation**: Create a set of 4 unique cards, starting with your customized preview card.
-   **High-Resolution Downloads**: Download any generated card, including the live preview, as a high-quality PNG file, ready for printing or sharing.

## 🚀 How to Use

1.  **Customize Basics**: Start by giving your card series a name (e.g., "Mythical Creatures") and a title for your first card (e.g., "Griffin").
2.  **Select a Theme**: Choose a theme from the dropdown. This will automatically generate 6 relevant statistic names using AI.
3.  **Choose a Style**: Select a Color Scheme and an Image Style that best fits your vision.
4.  **Tweak Stats**: Adjust the AI-generated stats or randomize them for fun.
5.  **Generate Preview**: Click "Generate Preview Card". The AI will generate a new title, balanced stats, and a stunning image based on your settings. The live preview will update with the AI-generated result.
6.  **Download (Optional)**: Like the preview? Download it immediately using the "Download Preview" button.
7.  **Generate Full Pack**: Once you're happy with the preview card, click "Generate Full Pack". The application will generate 3 more unique cards that match your theme and style.
8.  **Download Your Cards**: All generated cards from the pack will be displayed at the bottom, each with its own download button.

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **AI Models**:
    -   Google Gemini API (`@google/genai`)
    -   Text Generation: `gemini-2.5-flash`
    -   Image Generation: `imagen-3.0-generate-002`
-   **Card Export**: `html-to-image` library for converting HTML components to PNG images.
