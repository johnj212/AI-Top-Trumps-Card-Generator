
export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface Statistic {
  name: string;
  value: number;
}

export interface CardData {
  id: string;
  title: string;
  series: string;
  image: string; // base64 string or placeholder URL
  stats: Statistic[];
  cardNumber: number;
  totalCards: number;
  rarity: Rarity;
}

export interface Theme {
  name: string;
  stats: string[];
}

export interface Series {
  name: string;
  themes: string[];
}

export interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export interface ImageStyle {
  name: string;
  promptSuffix: string;
}

export interface CardIdea {
  title: string;
  stats: Statistic[];
  imagePrompt: string;
}