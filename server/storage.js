import { Storage } from '@google-cloud/storage';
import path from 'path';

const storage = new Storage();
const bucketName = process.env.STORAGE_BUCKET || 'cards_stroage';
const bucket = storage.bucket(bucketName);

/**
 * Save generated image to Cloud Storage
 * @param {string} cardId - Unique card identifier  
 * @param {Buffer} imageBuffer - Image data as buffer
 * @param {string} series - Card series name for organization
 * @returns {Promise<string>} - Public URL of stored image
 */
export async function saveImage(cardId, imageBuffer, series = 'default') {
  try {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `images/${series}/${date}/${cardId}.jpg`;
    
    const file = bucket.file(fileName);
    
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400' // 24 hour cache
      }
    });
    
    console.log(`✅ Image saved: gs://${bucketName}/${fileName}`);
    
    // Generate signed URL for secure access (24 hour expiry)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    return signedUrl;
    
  } catch (error) {
    console.error('❌ Error saving image:', error);
    throw new Error(`Failed to save image: ${error.message}`);
  }
}

/**
 * Save card metadata to Cloud Storage  
 * @param {string} cardId - Unique card identifier
 * @param {Object} cardData - Complete card data object
 * @returns {Promise<string>} - Storage path of saved card
 */
export async function saveCard(cardId, cardData) {
  try {
    const series = cardData.series?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'default';
    const fileName = `cards/${series}/${cardId}.json`;
    
    const file = bucket.file(fileName);
    
    const cardMetadata = {
      ...cardData,
      savedAt: new Date().toISOString(),
      storageLocation: fileName
    };
    
    await file.save(JSON.stringify(cardMetadata, null, 2), {
      metadata: {
        contentType: 'application/json'
      }
    });
    
    console.log(`✅ Card saved: gs://${bucketName}/${fileName}`);
    return fileName;
    
  } catch (error) {
    console.error('❌ Error saving card:', error);
    throw new Error(`Failed to save card: ${error.message}`);
  }
}

/**
 * Save application logs to Cloud Storage
 * @param {string} logLevel - Log level (info, error, debug)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional log metadata
 */
export async function saveLog(logLevel, message, metadata = {}) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const fileName = `logs/${date}/${logLevel}.jsonl`;
    
    const logEntry = {
      timestamp,
      level: logLevel,
      message,
      ...metadata
    };
    
    const file = bucket.file(fileName);
    
    // Check if file exists and read existing content for true append behavior
    let existingContent = '';
    try {
      const [exists] = await file.exists();
      if (exists) {
        const [content] = await file.download();
        existingContent = content.toString();
      }
    } catch (downloadError) {
      // If we can't read the existing file, start fresh
      console.warn(`⚠️ Could not read existing log file ${fileName}, starting fresh:`, downloadError.message);
      existingContent = '';
    }
    
    // Append new log entry to existing content
    const newContent = existingContent + JSON.stringify(logEntry) + '\n';
    
    // Save the combined content back to the file
    await file.save(newContent, {
      metadata: { contentType: 'application/x-ndjson' },
      resumable: false
    });
    
  } catch (error) {
    console.error('❌ Error saving log:', error);
    // Don't throw here - logging failures shouldn't break the app
  }
}

/**
 * List stored cards by series
 * @param {string} series - Series name to filter by
 * @returns {Promise<Array>} - Array of card metadata
 */
export async function listCards(series = null) {
  try {
    const prefix = series ? `cards/${series}/` : 'cards/';
    const [files] = await bucket.getFiles({ prefix });
    
    const cards = [];
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const [content] = await file.download();
        const cardData = JSON.parse(content.toString());
        cards.push(cardData);
      }
    }
    
    return cards.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    
  } catch (error) {
    console.error('❌ Error listing cards:', error);
    throw new Error(`Failed to list cards: ${error.message}`);
  }
}

/**
 * Generate a fresh signed URL for a stored image
 * @param {string} imagePath - Path to the image in storage (e.g., "images/series/date/cardId.jpg")
 * @returns {Promise<string>} - Fresh signed URL
 */
export async function getImageSignedUrl(imagePath) {
  try {
    const file = bucket.file(imagePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`Image not found: ${imagePath}`);
    }
    
    // Generate fresh signed URL (24 hour expiry)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    console.log(`✅ Generated signed URL for: ${imagePath}`);
    return signedUrl;
    
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * Get storage bucket statistics
 * @returns {Promise<Object>} - Bucket usage statistics  
 */
export async function getStorageStats() {
  try {
    const [files] = await bucket.getFiles();
    
    const stats = {
      totalFiles: files.length,
      images: files.filter(f => f.name.startsWith('images/')).length,
      cards: files.filter(f => f.name.startsWith('cards/')).length,
      logs: files.filter(f => f.name.startsWith('logs/')).length,
      bucketName,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('📊 Storage stats:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error getting storage stats:', error);
    throw new Error(`Failed to get storage stats: ${error.message}`);
  }
}