// Storage wrapper that conditionally uses cloud or local storage based on environment

let storageModule = null;
let isInitialized = false;

async function initializeStorage() {
  if (isInitialized) return storageModule;
  
  if (process.env.NODE_ENV === 'development') {
    // Use local storage for development
    storageModule = await import('./storage-dev.js');
    console.log('🏠 Using local storage for development environment');
  } else {
    // Use cloud storage for production/UAT
    storageModule = await import('./storage.js');
    console.log('☁️ Using Google Cloud Storage for production environment');
  }
  
  isInitialized = true;
  return storageModule;
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
  const storage = await initializeStorage();
  return storage.listCards(series);
}

export async function getImageSignedUrl(imagePath) {
  const storage = await initializeStorage();
  return storage.getImageSignedUrl(imagePath);
}

export async function getStorageStats() {
  const storage = await initializeStorage();
  return storage.getStorageStats();
}