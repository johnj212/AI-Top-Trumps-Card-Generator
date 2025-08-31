
import express from 'express';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveImage, saveCard, saveLog, listCards, getStorageStats, getImageSignedUrl } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from example_images directory
app.use('/example_images', express.static(path.join(__dirname, '..', 'example_images')));

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
}

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Not Loaded');
console.log('STORAGE_BUCKET:', process.env.STORAGE_BUCKET || 'cards_stroage');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Loaded' : 'Not Set');

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is missing. Server cannot start.');
  process.exit(1);
}

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Log server startup (async but non-blocking)
saveLog('info', 'AI Top Trumps server starting', {
  port,
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development'
}).catch(console.error);

app.post('/api/generate', async (req, res) => {
  console.log('Request body:', req.body);
  const startTime = Date.now();
  
  try {
    const { prompt, modelName, cardId, series } = req.body;

    if (!prompt || !modelName) {
      await saveLog('error', 'Missing prompt or modelName in request', { prompt, modelName });
      return res.status(400).send('Missing prompt or modelName in request body');
    }

    const model = genAI.models; // Access the models object
    console.log('Attempting to generate content with model:', modelName);
    
    await saveLog('info', 'Starting content generation', {
      modelName,
      promptLength: prompt.length,
      cardId,
      series
    });

    if (modelName === 'imagen-3.0-generate-002') {
      const imageResult = await model.generateImages({
        model: modelName,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '3:4',
        },
      });
      
      if (!imageResult.generatedImages || imageResult.generatedImages.length === 0) {
        throw new Error("No image was generated.");
      }
      
      const imageObj = imageResult.generatedImages[0].image;
      const imageBase64 = imageObj.imageBytes;
      
      console.log('[Gemini Image Generation]');
      console.log('Prompt:', prompt.substring(0, 100) + '...');
      console.log('Base64 length:', imageBase64 ? imageBase64.length : 'undefined');
      
      if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 1000) {
        console.error('Image base64 string is missing or too short:', imageBase64);
        throw new Error('Generated image data is invalid');
      }

      // Save image to Cloud Storage if cardId and series provided
      let persistentImageUrl = null;
      if (cardId && series) {
        try {
          const imageBuffer = Buffer.from(imageBase64, 'base64');
          persistentImageUrl = await saveImage(cardId, imageBuffer, series);
          
          await saveLog('info', 'Image saved to storage', {
            cardId,
            series,
            imageSizeKB: Math.round(imageBuffer.length / 1024),
            generationTimeMs: Date.now() - startTime
          });
          
          console.log(`✅ Image persisted: ${persistentImageUrl}`);
        } catch (storageError) {
          console.error('⚠️ Failed to save image to storage:', storageError);
          await saveLog('error', 'Failed to save image to storage', {
            error: storageError.message,
            cardId,
            series
          });
          // Continue without persistent storage
        }
      }
      
      res.type('application/json').send({ 
        kind: "image", 
        mime: "image/jpeg", 
        data: imageBase64,
        persistentUrl: persistentImageUrl
      });
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
        // Check if we have the expected structure
        if (!result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
          console.error('Unexpected response structure:', JSON.stringify(result, null, 2));
          return res.status(500).send({ error: 'Unexpected response structure from Gemini' });
        }
        
        // Clean and parse the text as JSON
        let rawText = result.candidates[0].content.parts[0].text;
        console.log('Raw text from Gemini:', rawText);
        
        if (!rawText || typeof rawText !== 'string') {
          console.error('No text content in response');
          return res.status(500).send({ error: 'No text content in Gemini response' });
        }
        
        rawText = rawText.replace(/^(```)?json\n/, '').replace(/```$/, '').trim();
        console.log('Cleaned text for parsing:', rawText);
        parsed = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse Gemini content as JSON:', e);
        const rawText = result.candidates[0]?.content?.parts?.[0]?.text || 'No text found';
        console.error('Raw text was:', rawText);
        
        // Send back the raw text so we can see what Gemini returned
        console.log('Sending error response with raw text');
        return res.status(500).json({ 
          error: 'Failed to parse Gemini content as JSON', 
          raw: rawText,
          errorMessage: e.message 
        });
      }
      console.log('Sending response:', { kind: "json", data: parsed });
      res.type('application/json').send({ kind: "json", data: parsed });
    }
  } catch (error) {
    console.error('Error in /api/generate:', error);
    
    await saveLog('error', 'Content generation failed', {
      error: error.message,
      stack: error.stack,
      modelName: req.body.modelName,
      promptLength: req.body.prompt?.length,
      generationTimeMs: Date.now() - startTime
    });
    
    res.status(500).send('Error generating content');
  }
});

// Save complete card data (called after full card generation)
app.post('/api/cards', async (req, res) => {
  try {
    const cardData = req.body;
    
    if (!cardData.id || !cardData.title) {
      await saveLog('error', 'Invalid card data for saving', { cardData });
      return res.status(400).json({ error: 'Missing required card fields: id, title' });
    }
    
    console.log(`💾 Saving card: ${cardData.title}`);
    const cardPath = await saveCard(cardData.id, cardData);
    
    await saveLog('info', 'Card saved successfully', {
      cardId: cardData.id,
      title: cardData.title,
      series: cardData.series,
      storagePath: cardPath
    });
    
    res.json({ 
      success: true, 
      cardId: cardData.id,
      storagePath: cardPath,
      message: 'Card saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving card:', error);
    
    await saveLog('error', 'Failed to save card', {
      error: error.message,
      cardData: req.body
    });
    
    res.status(500).json({ error: 'Failed to save card', details: error.message });
  }
});

// Get stored cards (with optional series filter)
app.get('/api/cards', async (req, res) => {
  try {
    const { series, limit = 50 } = req.query;
    
    console.log(`📚 Listing cards ${series ? `for series: ${series}` : '(all series)'}`);
    
    const cards = await listCards(series);
    const limitedCards = cards.slice(0, parseInt(limit));
    
    await saveLog('info', 'Cards listed', {
      series,
      totalFound: cards.length,
      returned: limitedCards.length
    });
    
    res.json({
      success: true,
      cards: limitedCards,
      total: cards.length,
      series: series || 'all'
    });
    
  } catch (error) {
    console.error('Error listing cards:', error);
    
    await saveLog('error', 'Failed to list cards', {
      error: error.message,
      series: req.query.series
    });
    
    res.status(500).json({ error: 'Failed to list cards', details: error.message });
  }
});

// Get storage statistics
app.get('/api/storage/stats', async (req, res) => {
  try {
    console.log('📊 Getting storage statistics');
    const stats = await getStorageStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting storage stats:', error);
    
    await saveLog('error', 'Failed to get storage stats', {
      error: error.message
    });
    
    res.status(500).json({ error: 'Failed to get storage stats', details: error.message });
  }
});

// Serve stored images securely with fresh signed URLs
app.get('/api/images/:series/:date/:filename', async (req, res) => {
  try {
    // Reconstruct the full image path
    const { series, date, filename } = req.params;
    const imagePath = `images/${series}/${date}/${filename}`;
    console.log(`🖼️ Requesting image: ${imagePath}`);
    
    if (!imagePath || !imagePath.startsWith('images/')) {
      return res.status(400).json({ error: 'Invalid image path' });
    }
    
    const signedUrl = await getImageSignedUrl(imagePath);
    
    await saveLog('info', 'Image URL generated', {
      imagePath,
      timestamp: new Date().toISOString()
    });
    
    // Redirect to the signed URL
    res.redirect(signedUrl);
    
  } catch (error) {
    console.error('Error serving image:', error);
    
    await saveLog('error', 'Failed to serve image', {
      error: error.message,
      imagePath: `images/${req.params.series}/${req.params.date}/${req.params.filename}`
    });
    
    res.status(404).json({ error: 'Image not found or access denied', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: {
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasStorageCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        storageBucket: process.env.STORAGE_BUCKET || 'cards_stroage'
      }
    };
    
    res.json(health);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch all handler for React Router (must be after all API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
  console.log('Available endpoints:');
  console.log('  POST /api/generate - Generate content (images/text)');
  console.log('  POST /api/cards - Save card data');
  console.log('  GET  /api/cards - List stored cards');
  console.log('  GET  /api/storage/stats - Storage statistics');
  console.log('  GET  /api/images/:series/:date/:filename - Serve stored images with fresh signed URLs');
  console.log('  GET  /api/health - Health check');
});
