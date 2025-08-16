import type { CardData, Theme, ColorScheme, ImageStyle } from './types';

export const THEMES: Theme[] = [
  { name: 'Automotive', suggestedStats: ['Top Speed', '0-60 MPH', 'Horsepower', 'Engine Size', 'Handling', 'Style'] },
  { name: 'Dinosaurs', suggestedStats: ['Height', 'Weight', 'Deadliness', 'Speed', 'Agility', 'Ferocity'] },
  { name: 'Pokémon', suggestedStats: ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'] },
  { name: 'Aircraft', suggestedStats: ['Max Speed', 'Range', 'Ceiling', 'Payload', 'Maneuverability', 'Stealth'] },
  { name: 'Fantasy', suggestedStats: ['Magic Power', 'Strength', 'Agility', 'Wisdom', 'Fear Factor', 'Defense'] },
];

export const COLOR_SCHEMES: ColorScheme[] = [
  { name: 'Orange-Black', primary: 'bg-orange-500', secondary: 'bg-gray-800', background: 'bg-black', text: 'text-white', accent: 'border-orange-500' },
  { name: 'Red-Gold', primary: 'bg-red-700', secondary: 'bg-yellow-500', background: 'bg-red-900', text: 'text-yellow-200', accent: 'border-yellow-500' },
  { name: 'Blue-Silver', primary: 'bg-blue-600', secondary: 'bg-gray-400', background: 'bg-gray-800', text: 'text-white', accent: 'border-blue-400' },
  { name: 'Green-Brown', primary: 'bg-green-700', secondary: 'bg-yellow-800', background: 'bg-green-900', text: 'text-yellow-100', accent: 'border-yellow-600' },
  { name: 'Purple-Black', primary: 'bg-purple-600', secondary: 'bg-gray-800', background: 'bg-black', text: 'text-purple-200', accent: 'border-purple-500' },
];

export const IMAGE_STYLES: ImageStyle[] = [
    { name: 'Holographic Foil Effect', promptSuffix: 'holographic foil effect art, shimmering, iridescent, vibrant, detailed' },
    { name: 'Vintage Trading Card', promptSuffix: 'vintage trading card illustration, retro style, aged paper texture, classic comic art' },
    { name: 'Neon Cyberpunk', promptSuffix: 'neon cyberpunk digital art, glowing lights, futuristic city background, high contrast' },
    { name: 'Highly Realistic', promptSuffix: 'highly realistic photo, 4k, cinematic lighting, detailed texture, professional photography' },
    { name: 'Blueprint Schematic', promptSuffix: 'blueprint technical schematic, white lines on blue background, detailed annotations, engineering diagram' },
    { name: 'Pop Art Comic Book', promptSuffix: 'pop art comic book style, bold outlines, Ben-Day dots, vibrant primary colors' },
    { name: 'Minimalist Geometric', promptSuffix: 'minimalist geometric design, clean lines, simple shapes, abstract representation' },
    { name: 'Retro 80s Synthwave', promptSuffix: 'retro 80s synthwave aesthetic, neon grids, sunset background, vibrant pinks and purples' },
    { name: 'Watercolor Artistic', promptSuffix: 'artistic watercolor rendering, soft edges, beautiful color blending, expressive brushstrokes' },
    { name: 'Steampunk Mechanical', promptSuffix: 'steampunk mechanical illustration, gears, cogs, brass and copper details, intricate machinery' },
];

export const DEFAULT_CARD_DATA: CardData = {
    id: 'preview-card',
    title: "T-Rex",
    series: "Dinosaurs",
    image: `https://picsum.photos/seed/trex/732/976`,
    stats: [
        { name: "Height", value: 55 },
        { name: "Weight", value: 72 },
        { name: "Deadliness", value: 95 },
        { name: "Speed", value: 60 },
        { name: "Agility", value: 35 },
        { name: "Ferocity", value: 98 },
    ],
    cardNumber: 1,
    totalCards: 4,
    rarity: 'Rare',
};