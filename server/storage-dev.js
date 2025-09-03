import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local storage paths for development
const DEV_STORAGE_PATH = path.join(__dirname, '..', 'dev-storage');
const IMAGES_PATH = path.join(DEV_STORAGE_PATH, 'images');
const CARDS_PATH = path.join(DEV_STORAGE_PATH, 'cards');
const LOGS_PATH = path.join(DEV_STORAGE_PATH, 'logs');

// Ensure storage directories exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Initialize storage directories
ensureDirectoryExists(IMAGES_PATH);
ensureDirectoryExists(CARDS_PATH);
ensureDirectoryExists(LOGS_PATH);

/**
 * Save generated image to local storage (development only)
 * @param {string} cardId - Unique card identifier  
 * @param {Buffer} imageBuffer - Image data as buffer
 * @param {string} series - Card series name for organization
 * @returns {Promise<string>} - Local URL of stored image
 */
export async function saveImage(cardId, imageBuffer, series = 'default') {
  try {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const seriesPath = path.join(IMAGES_PATH, series, date);
    ensureDirectoryExists(seriesPath);
    
    const fileName = `${cardId}.jpg`;
    const filePath = path.join(seriesPath, fileName);
    
    fs.writeFileSync(filePath, imageBuffer);
    
    console.log(`✅ [DEV] Image saved locally: ${filePath}`);
    
    // Return local URL path for development
    const localUrl = `/dev-storage/images/${series}/${date}/${fileName}`;
    return localUrl;
    
  } catch (error) {
    console.error('❌ [DEV] Error saving image locally:', error);
    throw new Error(`Failed to save image locally: ${error.message}`);
  }
}

/**
 * Save card metadata to local storage (development only)
 * @param {string} cardId - Unique card identifier
 * @param {Object} cardData - Complete card data object
 * @returns {Promise<string>} - Local storage path of saved card
 */
export async function saveCard(cardId, cardData) {
  try {
    const series = cardData.series?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'default';
    const seriesPath = path.join(CARDS_PATH, series);
    ensureDirectoryExists(seriesPath);
    
    const fileName = `${cardId}.json`;
    const filePath = path.join(seriesPath, fileName);
    
    const cardMetadata = {
      ...cardData,
      savedAt: new Date().toISOString(),
      storageLocation: `cards/${series}/${fileName}`
    };
    
    fs.writeFileSync(filePath, JSON.stringify(cardMetadata, null, 2));
    
    console.log(`✅ [DEV] Card saved locally: ${filePath}`);
    return `cards/${series}/${fileName}`;
    
  } catch (error) {
    console.error('❌ [DEV] Error saving card locally:', error);
    throw new Error(`Failed to save card locally: ${error.message}`);
  }
}

/**
 * Save application logs to local storage (development only)
 * @param {string} logLevel - Log level (info, error, debug)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional log metadata
 */
export async function saveLog(logLevel, message, metadata = {}) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const logDir = path.join(LOGS_PATH, date);
    ensureDirectoryExists(logDir);
    
    const fileName = `${logLevel}.jsonl`;
    const filePath = path.join(logDir, fileName);
    
    const logEntry = {
      timestamp,
      level: logLevel,
      message,
      ...metadata
    };
    
    // Append to log file
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(filePath, logLine);
    
    // Only log to console for important messages to reduce noise
    if (logLevel === 'error' || logLevel === 'warning') {
      console.log(`📝 [DEV] ${logLevel.toUpperCase()}: ${message}`);
    }
    
  } catch (error) {
    console.error('❌ [DEV] Error saving log locally:', error);
    // Don't throw here - logging failures shouldn't break the app
  }
}

/**
 * List stored cards by series (development only)
 * @param {string} series - Series name to filter by
 * @returns {Promise<Array>} - Array of card metadata
 */
export async function listCards(series = null) {
  try {
    const cards = [];
    
    if (series) {
      const seriesPath = path.join(CARDS_PATH, series);
      if (fs.existsSync(seriesPath)) {
        const files = fs.readdirSync(seriesPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(seriesPath, file);
            const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            cards.push(cardData);
          }
        }
      }
    } else {
      // List all cards from all series
      if (fs.existsSync(CARDS_PATH)) {
        const seriesDirs = fs.readdirSync(CARDS_PATH);
        for (const seriesDir of seriesDirs) {
          const seriesPath = path.join(CARDS_PATH, seriesDir);
          if (fs.statSync(seriesPath).isDirectory()) {
            const files = fs.readdirSync(seriesPath);
            for (const file of files) {
              if (file.endsWith('.json')) {
                const filePath = path.join(seriesPath, file);
                const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                cards.push(cardData);
              }
            }
          }
        }
      }
    }
    
    return cards.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    
  } catch (error) {
    console.error('❌ [DEV] Error listing cards locally:', error);
    throw new Error(`Failed to list cards locally: ${error.message}`);
  }
}

/**
 * Generate a local URL for a stored image (development only)
 * @param {string} imagePath - Path to the image in storage (e.g., "images/series/date/cardId.jpg")
 * @returns {Promise<string>} - Local URL
 */
export async function getImageSignedUrl(imagePath) {
  try {
    const localFilePath = path.join(DEV_STORAGE_PATH, imagePath);
    
    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Image not found locally: ${imagePath}`);
    }
    
    // Return local URL for development
    const localUrl = `/dev-storage/${imagePath}`;
    console.log(`✅ [DEV] Generated local URL for: ${imagePath}`);
    return localUrl;
    
  } catch (error) {
    console.error('❌ [DEV] Error generating local URL:', error);
    throw new Error(`Failed to generate local URL: ${error.message}`);
  }
}

/**
 * Get local storage statistics (development only)
 * @returns {Promise<Object>} - Local storage usage statistics  
 */
export async function getStorageStats() {
  try {
    let totalFiles = 0;
    let images = 0;
    let cards = 0;
    let logs = 0;
    
    // Count images
    if (fs.existsSync(IMAGES_PATH)) {
      const countFilesRecursively = (dir) => {
        const files = fs.readdirSync(dir);
        let count = 0;
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            count += countFilesRecursively(filePath);
          } else if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
            count++;
          }
        }
        return count;
      };
      images = countFilesRecursively(IMAGES_PATH);
    }
    
    // Count cards
    if (fs.existsSync(CARDS_PATH)) {
      const countCardsRecursively = (dir) => {
        const files = fs.readdirSync(dir);
        let count = 0;
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            count += countCardsRecursively(filePath);
          } else if (file.endsWith('.json')) {
            count++;
          }
        }
        return count;
      };
      cards = countCardsRecursively(CARDS_PATH);
    }
    
    // Count logs
    if (fs.existsSync(LOGS_PATH)) {
      const countLogsRecursively = (dir) => {
        const files = fs.readdirSync(dir);
        let count = 0;
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            count += countLogsRecursively(filePath);
          } else if (file.endsWith('.jsonl')) {
            count++;
          }
        }
        return count;
      };
      logs = countLogsRecursively(LOGS_PATH);
    }
    
    totalFiles = images + cards + logs;
    
    const stats = {
      totalFiles,
      images,
      cards,
      logs,
      bucketName: 'dev-local-storage',
      lastUpdated: new Date().toISOString(),
      storagePath: DEV_STORAGE_PATH
    };
    
    console.log('📊 [DEV] Local storage stats:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ [DEV] Error getting local storage stats:', error);
    throw new Error(`Failed to get local storage stats: ${error.message}`);
  }
}