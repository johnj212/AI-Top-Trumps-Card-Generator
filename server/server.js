
import express from 'express';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Not Loaded');
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

app.post('/api/generate', async (req, res) => {
  console.log('Request body:', req.body);
  try {
    const { prompt, modelName } = req.body;

    if (!prompt || !modelName) {
      return res.status(400).send('Missing prompt or modelName in request body');
    }

    const model = genAI.models; // Access the models object
    console.log('Attempting to generate content with model:', modelName);

    let text;

    if (modelName === 'imagen-3.0-generate-002') {
      const imageResult = await model.generateImages({
        model: modelName,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '9:16',
        },
      });
      if (!imageResult.generatedImages || imageResult.generatedImages.length === 0) {
        throw new Error("No image was generated.");
      }
      text = imageResult.generatedImages[0].image.imageBytes;
    } else {
      const result = await model.generateContent({
        model: modelName, // Specify the model here
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      console.log('Result from generateContent:', result);
      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No candidates found in Gemini API response.');
      }
      text = result.candidates[0].content.parts[0].text;
    }
    res.send(text);
  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).send('Error generating content');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
