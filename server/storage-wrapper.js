// Storage wrapper that conditionally uses cloud or local storage based on environment

let storageModule = null;
let initPromise = null; // Promise lock to prevent concurrent initializations

async function initializeStorage() {
  // If already initialized, return immediately
  if (storageModule) return storageModule;
  // If initialization is in progress, wait for it — don't start a second one
  if (!initPromise) initPromise = _doInitialize();
  return initPromise;
}

async function _doInitialize() {
  const nodeEnv = process.env.NODE_ENV || 'undefined';
  const isDevelopment = nodeEnv === 'development';

  console.log(`🔍 Storage initialization: NODE_ENV="${nodeEnv}", isDevelopment=${isDevelopment}`);

  try {
    if (isDevelopment) {
      console.log('🏠 Loading local storage module (storage-dev.js)...');
      storageModule = await import('./storage-dev.js');
      console.log('✅ Successfully loaded local storage for development environment');
    } else {
      console.log('☁️ Loading cloud storage module (storage.js)...');
      console.log(`   STORAGE_BUCKET: ${process.env.STORAGE_BUCKET || 'NOT SET'}`);
      console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET'}`);
      storageModule = await import('./storage.js');
      console.log('✅ Successfully loaded Google Cloud Storage for production environment');
    }

    console.log('🎯 Storage initialization complete');
    return storageModule;

  } catch (error) {
    // Reset so a retry is possible
    initPromise = null;
    console.error('❌ Storage initialization failed:', error.message);
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