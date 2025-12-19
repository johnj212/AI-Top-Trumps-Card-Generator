import type { StoredCardData, CardData } from '../types';
import { authService } from './authService';

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : '';

// Error codes for better debugging
export enum StorageErrorCode {
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  STORAGE_BACKEND_ERROR = 'STORAGE_BACKEND_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }

  static fromFetchError(error: Error, context: string): StorageError {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new StorageError(
        `Network connection failed while ${context}. Please check your internet connection.`,
        StorageErrorCode.NETWORK_ERROR,
        undefined,
        { originalError: error.message }
      );
    }
    return new StorageError(
      `Unknown error while ${context}: ${error.message}`,
      StorageErrorCode.UNKNOWN_ERROR,
      undefined,
      { originalError: error.message }
    );
  }
}

export interface SaveCardResponse {
  success: boolean;
  cardId: string;
  storagePath: string;
  message: string;
}

export interface ListCardsResponse {
  success: boolean;
  cards: StoredCardData[];
  total: number;
  series: string;
}

class CardStorageService {
  private getAuthFetchOptions(options: RequestInit = {}): RequestInit {
    const isAuthenticated = authService.isAuthenticated();

    console.log(`🔐 Auth check: isAuthenticated=${isAuthenticated}`);

    if (!isAuthenticated) {
      throw new StorageError(
        'You must be logged in to access your saved cards. Please log in and try again.',
        StorageErrorCode.AUTH_TOKEN_MISSING
      );
    }

    // Use authService helper that includes credentials for httpOnly cookies
    return authService.getAuthFetchOptions(options);
  }

  async saveCard(cardData: StoredCardData): Promise<SaveCardResponse> {
    const startTime = Date.now();
    const url = `${API_BASE_URL}/api/cards`;
    
    console.log(`💾 Attempting to save card: ${cardData.title} (${cardData.id})`);
    console.log(`📡 Request URL: ${url}`);
    
    try {
      const response = await fetch(url, this.getAuthFetchOptions({
        method: 'POST',
        body: JSON.stringify(cardData)
      }));

      const duration = Date.now() - startTime;
      console.log(`⏱️ Save card request took ${duration}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Save card failed: ${response.status} ${errorText}`);
        
        if (response.status === 401) {
          throw new StorageError(
            'Your session has expired. Please log in again to save cards.',
            StorageErrorCode.AUTH_TOKEN_EXPIRED,
            401
          );
        } else if (response.status === 403) {
          throw new StorageError(
            'Permission denied. You don\'t have access to save cards.',
            StorageErrorCode.PERMISSION_DENIED,
            403
          );
        } else if (response.status === 429) {
          throw new StorageError(
            'Too many requests. Please wait a moment before trying again.',
            StorageErrorCode.RATE_LIMITED,
            429
          );
        } else if (response.status >= 500) {
          throw new StorageError(
            'Server error while saving card. Please try again later.',
            StorageErrorCode.SERVER_ERROR,
            response.status,
            { responseText: errorText }
          );
        } else {
          throw new StorageError(
            `Failed to save card: ${errorText || 'Unknown server error'}`,
            StorageErrorCode.STORAGE_BACKEND_ERROR,
            response.status,
            { responseText: errorText }
          );
        }
      }

      const result: SaveCardResponse = await response.json();
      console.log(`✅ Card saved successfully: ${result.cardId}`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Error saving card after ${duration}ms:`, error);
      
      if (error instanceof StorageError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw StorageError.fromFetchError(error, 'saving card');
      }
      
      throw new StorageError(
        'An unexpected error occurred while saving the card',
        StorageErrorCode.UNKNOWN_ERROR,
        undefined,
        { originalError: String(error) }
      );
    }
  }

  async listCards(series?: string): Promise<StoredCardData[]> {
    const startTime = Date.now();
    
    // Build URL string first, then create URL object if needed
    let urlString = `${API_BASE_URL}/api/cards`;
    if (series) {
      const separator = urlString.includes('?') ? '&' : '?';
      urlString += `${separator}series=${encodeURIComponent(series)}`;
    }
    
    console.log(`📚 Attempting to list cards${series ? ` for series: ${series}` : ' (all series)'}`);
    console.log(`📡 Request URL: ${urlString}`);

    try {
      const response = await fetch(urlString, this.getAuthFetchOptions({
        method: 'GET'
      }));

      const duration = Date.now() - startTime;
      console.log(`⏱️ List cards request took ${duration}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ List cards failed: ${response.status} ${errorText}`);
        
        if (response.status === 401) {
          throw new StorageError(
            'Your session has expired. Please log in again to view your saved cards.',
            StorageErrorCode.AUTH_TOKEN_EXPIRED,
            401
          );
        } else if (response.status === 403) {
          throw new StorageError(
            'Permission denied. You don\'t have access to view cards.',
            StorageErrorCode.PERMISSION_DENIED,
            403
          );
        } else if (response.status === 429) {
          throw new StorageError(
            'Too many requests. Please wait a moment before trying again.',
            StorageErrorCode.RATE_LIMITED,
            429
          );
        } else if (response.status >= 500) {
          throw new StorageError(
            'Server error while loading cards. The storage system may be temporarily unavailable.',
            StorageErrorCode.SERVER_ERROR,
            response.status,
            { responseText: errorText }
          );
        } else {
          throw new StorageError(
            `Failed to load cards: ${errorText || 'Unknown server error'}`,
            StorageErrorCode.STORAGE_BACKEND_ERROR,
            response.status,
            { responseText: errorText }
          );
        }
      }

      const result: ListCardsResponse = await response.json();
      
      if (!result || !Array.isArray(result.cards)) {
        console.error('❌ Invalid response format:', result);
        throw new StorageError(
          'Invalid response from server. The card data format is corrupted.',
          StorageErrorCode.INVALID_RESPONSE,
          response.status,
          { response: result }
        );
      }
      
      console.log(`✅ Successfully loaded ${result.cards.length} cards (total: ${result.total})`);
      return result.cards;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Error listing cards after ${duration}ms:`, error);
      
      if (error instanceof StorageError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw StorageError.fromFetchError(error, 'loading cards');
      }
      
      throw new StorageError(
        'An unexpected error occurred while loading your saved cards',
        StorageErrorCode.UNKNOWN_ERROR,
        undefined,
        { originalError: String(error) }
      );
    }
  }

  async saveCardPack(cards: StoredCardData[]): Promise<SaveCardResponse[]> {
    const results: SaveCardResponse[] = [];
    
    for (const card of cards) {
      try {
        const result = await this.saveCard(card);
        results.push(result);
      } catch (error) {
        console.error(`Failed to save card ${card.title}:`, error);
        // Continue with other cards even if one fails
        results.push({
          success: false,
          cardId: card.id,
          storagePath: '',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // Helper function to convert CardData to StoredCardData
  enhanceCardWithStorageData(
    cardData: CardData,
    theme: string,
    colorScheme: string,
    imageStyle: string,
    imagePrompt: string,
    persistentImageUrl?: string
  ): StoredCardData {
    return {
      ...cardData,
      theme,
      colorScheme,
      imageStyle,
      imagePrompt,
      persistentImageUrl: persistentImageUrl || cardData.image,
      imageFilename: `${cardData.id}.jpg`,
      generatedAt: new Date().toISOString()
    };
  }
}

export const cardStorageService = new CardStorageService();