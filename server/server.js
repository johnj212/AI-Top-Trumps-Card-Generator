
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables BEFORE importing modules that depend on them
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { saveImage, saveCard, saveLog, listCards, getStorageStats, getImageSignedUrl } from './storage-wrapper.js';
import { verifyToken } from './middleware/authMiddleware.js';
import { globalRateLimiter, speedLimiter, rateLimitLogger } from './middleware/rateLimiter.js';
import authRoutes from './auth/auth.js';

console.log('🚀 Starting AI Top Trumps server...');
console.log('📍 Working directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port configuration:', process.env.PORT ? `Cloud Run PORT=${process.env.PORT}` : 'Default port 3001');

const app = express();
const port = process.env.PORT || 3001;

console.log(`🎯 Server will listen on port ${port}`);

// Essential environment check with detailed logging
console.log('🔑 Environment Variables Check:');
console.log('  - GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Loaded ✅' : 'Missing ❌');
console.log('  - STORAGE_BUCKET:', process.env.STORAGE_BUCKET || 'Default: cards_stroage');
console.log('  - GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Loaded ✅' : 'Not Set ⚠️');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY environment variable is missing. Server cannot start.');
  console.error('💡 Ensure GEMINI_API_KEY is set via environment variables or secrets.');
  process.exit(1);
}

try {
  console.log('⚙️ Configuring Express middleware...');

  // Configure CORS with specific allowed origins for security
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'https://ai-top-trumps-card-generator-50477513015.europe-north1.run.app',
          'https://ai-top-trumps-card-generator-uat-50477513015.europe-north1.run.app',
          'http://localhost:8088',
          'http://localhost:8089',
          'http://localhost:3001'
        ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  app.use(cors(corsOptions));
  console.log('🔒 CORS configured with allowed origins:', corsOptions.origin);

  // Add security headers with helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://esm.sh"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  console.log('🛡️ Security headers configured with helmet');

  // Add cookie parser for httpOnly cookie authentication
  app.use(cookieParser());
  console.log('🍪 Cookie parser configured');

  app.use(express.json({ limit: '5mb' })); // Reduced from 10mb for security (base64 images)

  // Trust proxy for accurate IP addresses (important for rate limiting)
  app.set('trust proxy', 1);
  console.log('🔧 Proxy trust configured');

  // Apply rate limiting globally
  app.use(globalRateLimiter);
  app.use(speedLimiter);
  app.use(rateLimitLogger);
  console.log('🚦 Rate limiting middleware applied');

  // Serve static files from example_images directory
  const exampleImagesPath = path.join(__dirname, '..', 'example_images');
  app.use('/example_images', express.static(exampleImagesPath));
  console.log('📁 Example images static path:', exampleImagesPath);

  // Serve dev-storage files in development
  if (process.env.NODE_ENV === 'development') {
    const devStoragePath = path.join(__dirname, '..', 'dev-storage');
    app.use('/dev-storage', express.static(devStoragePath));
    console.log('🏠 Dev storage static path:', devStoragePath);
  }

  // Serve built frontend in production and UAT
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'uat') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    console.log('📦 Static files path:', distPath);
  }
  
  console.log('✅ Express middleware configuration complete');

} catch (middlewareError) {
  console.error('❌ FATAL: Failed to configure Express middleware:', middlewareError);
  console.error('Stack:', middlewareError.stack);
  process.exit(1);
}

console.log('🤖 Initializing Google Gemini AI...');
let genAI;
try {
  genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
  console.log('✅ Gemini AI client initialized successfully');
} catch (genAIError) {
  console.error('❌ FATAL: Failed to initialize Gemini AI client:', genAIError);
  console.error('💡 Check GEMINI_API_KEY format and validity');
  process.exit(1);
}

// Helper function to extract user context for logging
const getUserContext = (req) => ({
  playerCode: req.playerData?.playerCode || 'anonymous',
  clientIP: req.ip || req.connection.remoteAddress,
  userAgent: req.headers['user-agent'] || 'unknown'
});

console.log('🔐 Setting up authentication routes...');
try {
  // Add authentication routes
  app.use('/api/auth', authRoutes);
  console.log('✅ Authentication routes configured');
} catch (authError) {
  console.error('❌ FATAL: Failed to configure auth routes:', authError);
  process.exit(1);
}

// Log server startup (async but non-blocking)
console.log('📝 Logging server startup...');
saveLog('info', 'AI Top Trumps server starting', {
  port,
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  hasStorageCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
}).catch(err => {
  console.warn('⚠️ Warning: Could not save startup log:', err.message);
});

app.post('/api/generate', verifyToken, async (req, res) => {
  console.log('Request body:', req.body);
  const startTime = Date.now();
  
  try {
    const { prompt, modelName, cardId, series } = req.body;

    if (!prompt || !modelName) {
      await saveLog('error', 'Missing prompt or modelName in request', { 
        ...getUserContext(req),
        prompt: prompt || 'missing', 
        modelName: modelName || 'missing',
        endpoint: req.path
      });
      return res.status(400).send('Missing prompt or modelName in request body');
    }

    const model = genAI.models; // Access the models object
    console.log('Attempting to generate content with model:', modelName);
    
    await saveLog('info', 'Starting content generation', {
      ...getUserContext(req),
      modelName,
      promptLength: prompt.length,
      cardId,
      series,
      endpoint: req.path
    });

    if (modelName === 'imagen-4.0-generate-001') {
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
            ...getUserContext(req),
            cardId,
            series,
            imageSizeKB: Math.round(imageBuffer.length / 1024),
            generationTimeMs: Date.now() - startTime,
            endpoint: req.path
          });
          
          console.log(`✅ Image persisted: ${persistentImageUrl}`);
        } catch (storageError) {
          console.error('⚠️ Failed to save image to storage:', storageError);
          await saveLog('error', 'Failed to save image to storage', {
            ...getUserContext(req),
            error: storageError.message,
            cardId,
            series,
            endpoint: req.path
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
      ...getUserContext(req),
      error: error.message,
      stack: error.stack,
      modelName: req.body.modelName,
      promptLength: req.body.prompt?.length,
      generationTimeMs: Date.now() - startTime,
      endpoint: req.path
    });
    
    res.status(500).send('Error generating content');
  }
});

// Save complete card data (called after full card generation)
app.post('/api/cards', verifyToken, async (req, res) => {
  try {
    const cardData = req.body;
    
    if (!cardData.id || !cardData.title) {
      await saveLog('error', 'Invalid card data for saving', { 
        ...getUserContext(req),
        cardData: { id: cardData.id || 'missing', title: cardData.title || 'missing' },
        endpoint: req.path
      });
      return res.status(400).json({ error: 'Missing required card fields: id, title' });
    }
    
    console.log(`💾 Saving card: ${cardData.title}`);
    const cardPath = await saveCard(cardData.id, cardData);
    
    await saveLog('info', 'Card saved successfully', {
      ...getUserContext(req),
      cardId: cardData.id,
      title: cardData.title,
      series: cardData.series,
      storagePath: cardPath,
      endpoint: req.path
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
      ...getUserContext(req),
      error: error.message,
      cardData: { id: req.body.id, title: req.body.title },
      endpoint: req.path
    });
    
    res.status(500).json({ error: 'Failed to save card', details: error.message });
  }
});

// Get stored cards (with optional series filter)
app.get('/api/cards', verifyToken, async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    const { series, limit = 50 } = req.query;
    const userContext = getUserContext(req);
    
    console.log(`📚 [${requestId}] Cards list request started:`);
    console.log(`   User: ${userContext.playerCode || 'unknown'} (IP: ${userContext.ipAddress})`);
    console.log(`   Series: ${series || 'all'}`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Headers: ${JSON.stringify({
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'none',
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
      'content-type': req.headers['content-type']
    })}`);
    
    const cards = await listCards(series);
    const limitedCards = cards.slice(0, parseInt(limit));
    
    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] Cards list completed in ${duration}ms:`);
    console.log(`   Found: ${cards.length} cards`);
    console.log(`   Returned: ${limitedCards.length} cards`);
    console.log(`   Series breakdown: ${Array.from(new Set(cards.map(c => c.series))).join(', ')}`);
    
    await saveLog('info', 'Cards listed successfully', {
      ...userContext,
      requestId,
      series,
      totalFound: cards.length,
      returned: limitedCards.length,
      durationMs: duration,
      endpoint: req.path,
      seriesBreakdown: Array.from(new Set(cards.map(c => c.series)))
    });
    
    const response = {
      success: true,
      cards: limitedCards,
      total: cards.length,
      series: series || 'all',
      requestId,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📤 [${requestId}] Sending response: ${JSON.stringify({
      ...response,
      cards: `[${response.cards.length} cards]` // Don't log full card data
    })}`);
    
    res.json(response);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const userContext = getUserContext(req);
    
    console.error(`❌ [${requestId}] Cards list failed after ${duration}ms:`, error);
    console.error(`   Error type: ${error.constructor.name}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Stack trace: ${error.stack}`);
    
    await saveLog('error', 'Failed to list cards', {
      ...userContext,
      requestId,
      error: error.message,
      errorType: error.constructor.name,
      series: req.query.series,
      durationMs: duration,
      endpoint: req.path,
      stackTrace: error.stack
    });
    
    // Determine appropriate error response based on error type
    let statusCode = 500;
    let errorMessage = 'Failed to list cards';
    
    if (error.message.includes('authentication') || error.message.includes('token')) {
      statusCode = 401;
      errorMessage = 'Authentication required';
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      statusCode = 403;
      errorMessage = 'Access denied';
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      statusCode = 503;
      errorMessage = 'Storage service unavailable';
    }
    
    const errorResponse = {
      error: errorMessage,
      details: error.message,
      requestId,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📤 [${requestId}] Sending error response (${statusCode}):`, errorResponse);
    res.status(statusCode).json(errorResponse);
  }
});

// Storage health check endpoint
app.get('/api/storage/health', async (req, res) => {
  const startTime = Date.now();
  const healthCheck = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {},
    environment: process.env.NODE_ENV,
    duration: 0
  };

  try {
    console.log('🏥 Running storage health check...');

    // 1. Check storage initialization
    try {
      console.log('1️⃣ Testing storage initialization...');
      // Test storage by calling a simple storage function
      await getStorageStats();
      healthCheck.checks.initialization = { status: 'pass', message: 'Storage backend initialized successfully' };
    } catch (error) {
      healthCheck.checks.initialization = { status: 'fail', message: error.message };
      healthCheck.status = 'unhealthy';
    }

    // 2. Check authentication middleware
    try {
      console.log('2️⃣ Testing authentication...');
      const token = req.headers.authorization;
      if (token && token.startsWith('Bearer ')) {
        healthCheck.checks.auth = { status: 'pass', message: 'Authentication token provided' };
      } else {
        healthCheck.checks.auth = { status: 'warn', message: 'No authentication token (health check does not require auth)' };
      }
    } catch (error) {
      healthCheck.checks.auth = { status: 'fail', message: error.message };
    }

    // 3. Check storage stats (basic connectivity)
    try {
      console.log('3️⃣ Testing storage connectivity...');
      const stats = await getStorageStats();
      if (stats && typeof stats === 'object') {
        healthCheck.checks.connectivity = { 
          status: 'pass', 
          message: `Connected to ${stats.bucketName || 'storage backend'}`,
          details: {
            totalFiles: stats.totalFiles,
            images: stats.images,
            cards: stats.cards
          }
        };
      } else {
        healthCheck.checks.connectivity = { status: 'warn', message: 'Storage stats returned but format unexpected' };
      }
    } catch (error) {
      healthCheck.checks.connectivity = { status: 'fail', message: error.message };
      healthCheck.status = 'unhealthy';
    }

    // 4. Test list cards operation (read test)
    try {
      console.log('4️⃣ Testing card listing...');
      const cards = await listCards();
      healthCheck.checks.readOperation = { 
        status: 'pass', 
        message: `Successfully listed ${cards?.length || 0} cards`
      };
    } catch (error) {
      healthCheck.checks.readOperation = { status: 'fail', message: error.message };
      if (healthCheck.status !== 'unhealthy') {
        healthCheck.status = 'degraded';
      }
    }

    // 5. Environment variables check
    console.log('5️⃣ Checking environment configuration...');
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // Development environment - no special requirements
      healthCheck.checks.environment = { status: 'pass', message: 'Development environment - no special requirements' };
    } else {
      // Production/UAT environment - check required variables
      const requiredVars = ['STORAGE_BUCKET'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      // Check for Google Cloud authentication
      const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const isCloudRun = !!(process.env.K_SERVICE || process.env.GAE_SERVICE);
      
      if (missingVars.length === 0 && (hasCredentialsFile || isCloudRun)) {
        const authMethod = hasCredentialsFile ? 'credentials file' : 'Cloud Run service account';
        healthCheck.checks.environment = { 
          status: 'pass', 
          message: `Environment configured correctly (auth: ${authMethod})`,
          details: {
            storageBucket: process.env.STORAGE_BUCKET,
            authMethod,
            isCloudRun
          }
        };
      } else {
        const issues = [];
        if (missingVars.length > 0) {
          issues.push(`Missing variables: ${missingVars.join(', ')}`);
        }
        if (!hasCredentialsFile && !isCloudRun) {
          issues.push('No Google Cloud authentication available');
        }
        
        healthCheck.checks.environment = { 
          status: 'fail', 
          message: issues.join('; ')
        };
        healthCheck.status = 'unhealthy';
      }
    }

    healthCheck.duration = Date.now() - startTime;
    
    // Log overall health status
    const statusEmoji = healthCheck.status === 'healthy' ? '✅' : 
                       healthCheck.status === 'degraded' ? '⚠️' : '❌';
    console.log(`${statusEmoji} Storage health check complete: ${healthCheck.status} (${healthCheck.duration}ms)`);

    // Return appropriate HTTP status
    const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 207 : 503;
    
    res.status(httpStatus).json(healthCheck);
    
  } catch (error) {
    healthCheck.duration = Date.now() - startTime;
    healthCheck.status = 'unhealthy';
    healthCheck.checks.overall = { status: 'fail', message: error.message };
    
    console.error('❌ Storage health check failed:', error);
    res.status(503).json(healthCheck);
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
      error: error.message,
      endpoint: req.path
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

    // Enhanced path traversal protection
    const normalizedPath = path.normalize(imagePath);
    if (!normalizedPath.startsWith('images/') ||
        normalizedPath.includes('..') ||
        normalizedPath.includes('~')) {
      console.warn(`⚠️ Path traversal attempt blocked: ${imagePath}`);
      return res.status(400).json({ error: 'Invalid image path' });
    }
    
    const signedUrl = await getImageSignedUrl(imagePath);
    
    await saveLog('info', 'Image URL generated', {
      imagePath,
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      clientIP: req.ip
    });
    
    // Redirect to the signed URL
    res.redirect(signedUrl);
    
  } catch (error) {
    console.error('Error serving image:', error);
    
    await saveLog('error', 'Failed to serve image', {
      error: error.message,
      imagePath: `images/${req.params.series}/${req.params.date}/${req.params.filename}`,
      endpoint: req.path,
      clientIP: req.ip
    });
    
    res.status(404).json({ error: 'Image not found or access denied', details: error.message });
  }
});

// Health check endpoint - sanitized to minimize information disclosure
app.get('/api/health', async (req, res) => {
  try {
    // Only return minimal information for security
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };

    res.json(health);

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

// Catch all handler for React Router (must be after all API routes)
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'uat') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

console.log('🌐 Starting server...');
const server = app.listen(port, '0.0.0.0', () => {
  console.log('🎉 SUCCESS: Server is running!');
  console.log(`🔗 Server listening at http://0.0.0.0:${port}`);
  console.log('📋 Available endpoints:');
  console.log('  🔐 POST /api/auth/login - User authentication');
  console.log('  🤖 POST /api/generate - Generate content (images/text)');
  console.log('  💾 POST /api/cards - Save card data');
  console.log('  📚 GET  /api/cards - List stored cards');
  console.log('  📊 GET  /api/storage/stats - Storage statistics');
  console.log('  🖼️  GET  /api/images/:series/:date/:filename - Serve stored images');
  console.log('  ❤️  GET  /api/health - Health check');
  console.log('  🌍 GET  /* - Frontend application (production)');
  console.log('');
  console.log('✅ Server startup complete! Ready to accept requests.');
  
  // Log successful startup
  saveLog('info', 'Server successfully started', {
    port,
    host: '0.0.0.0',
    timestamp: new Date().toISOString(),
    processId: process.pid,
    uptime: process.uptime()
  }).catch(err => {
    console.warn('⚠️ Warning: Could not save startup success log:', err.message);
  });
});

// Handle server startup errors
server.on('error', (err) => {
  console.error('❌ FATAL: Server failed to start:', err);
  
  if (err.code === 'EADDRINUSE') {
    console.error(`💡 Port ${port} is already in use. Try a different port or stop the existing process.`);
  } else if (err.code === 'EACCES') {
    console.error(`💡 Permission denied to bind to port ${port}. Try a different port or run with appropriate permissions.`);
  }
  
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});
