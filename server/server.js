
import express from 'express';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Not Loaded');

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is missing. Server cannot start.');
  process.exit(1);
}

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
      const imageObj = imageResult.generatedImages[0].image;
      const imageBase64 = imageObj.imageBytes;
      console.log('[Gemini Image Generation]');
      console.log('Prompt:', prompt);
      console.log('Image object:', imageObj);
      console.log('Base64 length:', imageBase64 ? imageBase64.length : 'undefined');
      if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 1000) {
        console.error('Image base64 string is missing or too short:', imageBase64);
      }
      res.type('application/json').send({ kind: "image", mime: "image/jpeg", data: imageBase64 });
      // Option 2: To send as raw image, uncomment below:
      // const imageBuffer = Buffer.from(imageBase64, 'base64');
      // res.type('image/jpeg').send(imageBuffer);
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
      let parsed;
      try {
        // Clean and parse the text as JSON
        let rawText = result.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/^(```)?json\n/, '').replace(/```$/, '').trim();
        parsed = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse Gemini content as JSON:', e, 'Raw text:', result.candidates[0].content.parts[0].text);
        return res.status(500).send({ error: 'Failed to parse Gemini content as JSON', raw: result.candidates[0].content.parts[0].text });
      }
      res.type('application/json').send({ kind: "json", data: parsed });
    }
  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).send('Error generating content');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
