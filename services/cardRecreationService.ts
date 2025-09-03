import type { StoredCardData, CardData, ColorScheme, ImageStyle, Theme } from '../types';
import { cardStorageService } from './cardStorageService';
import { COLOR_SCHEMES, IMAGE_STYLES, THEMES } from '../constants';

export interface RecreatedCard {
  cardData: CardData;
  metadata: {
    theme: string;
    colorScheme: string;
    imageStyle: string;
    imagePrompt: string;
    generatedAt: string;
  };
}

class CardRecreationService {
  /**
   * Recreate a card from stored metadata without using AI
   */
  async recreateCard(storedCard: StoredCardData): Promise<RecreatedCard> {
    // Convert stored card data back to runtime CardData
    const cardData: CardData = {
      id: storedCard.id,
      title: storedCard.title,
      series: storedCard.series,
      image: storedCard.persistentImageUrl || storedCard.image,
      stats: storedCard.stats,
      cardNumber: storedCard.cardNumber,
      totalCards: storedCard.totalCards,
      rarity: storedCard.rarity
    };

    return {
      cardData,
      metadata: {
        theme: storedCard.theme,
        colorScheme: storedCard.colorScheme,
        imageStyle: storedCard.imageStyle,
        imagePrompt: storedCard.imagePrompt,
        generatedAt: storedCard.generatedAt
      }
    };
  }

  /**
   * Recreate multiple cards from stored metadata
   */
  async recreateCardPack(storedCards: StoredCardData[]): Promise<RecreatedCard[]> {
    return Promise.all(storedCards.map(storedCard => this.recreateCard(storedCard)));
  }

  /**
   * Load and recreate cards by series
   */
  async loadCardsBySeries(series: string): Promise<RecreatedCard[]> {
    try {
      const storedCards = await cardStorageService.listCards(series);
      return this.recreateCardPack(storedCards);
    } catch (error) {
      console.error(`Failed to load cards for series ${series}:`, error);
      throw new Error(`Failed to load cards for series: ${series}`);
    }
  }

  /**
   * Load and recreate all cards
   */
  async loadAllCards(): Promise<RecreatedCard[]> {
    try {
      const storedCards = await cardStorageService.listCards();
      return this.recreateCardPack(storedCards);
    } catch (error) {
      console.error('Failed to load all cards:', error);
      throw new Error('Failed to load cards from storage');
    }
  }

  /**
   * Get the original generation settings for a stored card
   */
  getGenerationSettings(storedCard: StoredCardData) {
    // Find the original settings used to generate this card
    const theme = THEMES.find(t => t.name === storedCard.theme);
    const colorScheme = COLOR_SCHEMES.find(c => c.name === storedCard.colorScheme);
    const imageStyle = IMAGE_STYLES.find(i => i.name === storedCard.imageStyle);

    return {
      theme: theme || THEMES[0], // Fallback to first theme if not found
      colorScheme: colorScheme || COLOR_SCHEMES[0],
      imageStyle: imageStyle || IMAGE_STYLES[0]
    };
  }

  /**
   * Check if a card can be fully recreated (has all required metadata)
   */
  canRecreateCard(storedCard: StoredCardData): boolean {
    const requiredFields = [
      'id', 'title', 'series', 'stats', 'rarity',
      'theme', 'colorScheme', 'imageStyle', 'imagePrompt'
    ];

    return requiredFields.every(field => {
      const value = storedCard[field as keyof StoredCardData];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Get statistics about stored cards
   */
  async getStorageStatistics(): Promise<{
    totalCards: number;
    seriesList: string[];
    themesList: string[];
    recreatableCards: number;
    oldestCard: string | null;
    newestCard: string | null;
  }> {
    try {
      const allCards = await cardStorageService.listCards();
      
      const seriesSet = new Set<string>();
      const themesSet = new Set<string>();
      let recreatableCount = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      allCards.forEach(card => {
        seriesSet.add(card.series);
        if (card.theme) themesSet.add(card.theme);
        if (this.canRecreateCard(card)) recreatableCount++;

        if (card.generatedAt) {
          const cardDate = new Date(card.generatedAt);
          if (!oldestDate || cardDate < oldestDate) {
            oldestDate = cardDate;
          }
          if (!newestDate || cardDate > newestDate) {
            newestDate = cardDate;
          }
        }
      });

      return {
        totalCards: allCards.length,
        seriesList: Array.from(seriesSet),
        themesList: Array.from(themesSet),
        recreatableCards: recreatableCount,
        oldestCard: oldestDate ? oldestDate.toISOString() : null,
        newestCard: newestDate ? newestDate.toISOString() : null
      };

    } catch (error) {
      console.error('Failed to get storage statistics:', error);
      throw new Error('Failed to get storage statistics');
    }
  }
}

export const cardRecreationService = new CardRecreationService();