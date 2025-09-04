// Storage wrapper that conditionally uses cloud or local storage based on environment

let storageModule = null;
let isInitialized = false;

async function initializeStorage() {
  if (isInitialized) {
    console.log('📦 Storage already initialized, reusing existing module');
    return storageModule;
  }
  
  const nodeEnv = process.env.NODE_ENV || 'undefined';
  const isDevelopment = nodeEnv === 'development';
  
  console.log(`🔍 Storage initialization:`);
  console.log(`   NODE_ENV: "${nodeEnv}"`);
  console.log(`   isDevelopment: ${isDevelopment}`);
  console.log(`   Available env vars: ${Object.keys(process.env).filter(k => k.includes('NODE')).join(', ')}`);
  
  try {
    if (isDevelopment) {
      // Use local storage for development
      console.log('🏠 Loading local storage module (storage-dev.js)...');
      storageModule = await import('./storage-dev.js');
      console.log('✅ Successfully loaded local storage for development environment');
      console.log(`   Storage path: ${storageModule.getStoragePath ? storageModule.getStoragePath() : 'not available'}`);
    } else {
      // Use cloud storage for production/UAT
      console.log('☁️ Loading cloud storage module (storage.js)...');
      const bucketName = process.env.STORAGE_BUCKET;
      const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      console.log(`   STORAGE_BUCKET: ${bucketName || 'NOT SET'}`);
      console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${hasCredentials ? 'SET' : 'NOT SET'}`);
      
      storageModule = await import('./storage.js');
      console.log('✅ Successfully loaded Google Cloud Storage for production environment');
    }
    
    isInitialized = true;
    console.log('🎯 Storage initialization complete');
    return storageModule;
    
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      nodeEnv,
      isDevelopment
    });
    throw new Error(`Storage initialization failed: ${error.message}`);
  }
}

// Wrapper functions that initialize storage on first use
export async function saveImage(cardId, imageBuffer, series) {
  const storage = await initializeStorage();
  return storage.saveImage(cardId, imageBuffer, series);
}

export async function saveCard(cardId, cardData) {
  const storage = await initializeStorage();
  return storage.saveCard(cardId, cardData);
}

export async function saveLog(logLevel, message, metadata) {
  const storage = await initializeStorage();
  return storage.saveLog(logLevel, message, metadata);
}

export async function listCards(series) {
  console.log(`📋 Storage wrapper: listCards called${series ? ` for series: ${series}` : ' (all series)'}`);
  try {
    const storage = await initializeStorage();
    console.log(`🔗 Using storage backend: ${storage.constructor?.name || 'unknown'}`);
    const result = await storage.listCards(series);
    console.log(`✅ Storage wrapper: listCards returned ${result?.length || 0} cards`);
    return result;
  } catch (error) {
    console.error('❌ Storage wrapper: listCards failed:', error);
    throw error;
  }
}

export async function getImageSignedUrl(imagePath) {
  const storage = await initializeStorage();
  return storage.getImageSignedUrl(imagePath);
}

export async function getStorageStats() {
  const storage = await initializeStorage();
  return storage.getStorageStats();
}