import type { StoredCardData, CardData } from '../types';
import { authService } from './authService';

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : '';

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
  private getAuthHeaders() {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async saveCard(cardData: StoredCardData): Promise<SaveCardResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cards`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(cardData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        const errorText = await response.text();
        throw new Error(`Failed to save card: ${response.status} ${errorText}`);
      }

      const result: SaveCardResponse = await response.json();
      return result;

    } catch (error) {
      console.error('Error saving card:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to save card: Unknown error');
    }
  }

  async listCards(series?: string): Promise<StoredCardData[]> {
    try {
      const url = new URL(`${API_BASE_URL}/api/cards`);
      if (series) {
        url.searchParams.set('series', series);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(`Failed to list cards: ${response.status}`);
      }

      const result: ListCardsResponse = await response.json();
      return result.cards;

    } catch (error) {
      console.error('Error listing cards:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to list cards: Unknown error');
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