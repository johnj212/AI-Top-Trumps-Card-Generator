// Backend generation service — provides Gemini API calls for agent tool executors.
// Mirrors the prompt logic in geminiService.ts but runs server-side.

export const THEMES = {
  'Automotive': ['Top Speed', '0-60 MPH', 'Horsepower', 'Engine Size', 'Handling', 'Style'],
  'Dinosaurs': ['Height', 'Weight', 'Deadliness', 'Speed', 'Agility', 'Ferocity'],
  'Pokémon': ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'],
  'Aircraft': ['Max Speed', 'Range', 'Ceiling', 'Payload', 'Maneuverability', 'Stealth'],
  'Fantasy': ['Magic Power', 'Strength', 'Agility', 'Wisdom', 'Fear Factor', 'Defense'],
};

const THEME_PROMPTS = {
  'Automotive': 'automotive vehicle',
  'Dinosaurs': 'prehistoric dinosaur species',
  'Pokémon': 'fictional creature',
  'Aircraft': 'aircraft',
  'Fantasy': 'fantasy creature or character',
};

const IMAGE_STYLE_PROMPTS = {
  'Holographic Foil Effect': 'holographic foil effect art, shimmering, iridescent, vibrant, detailed',
  'Vintage Trading Card': 'vintage trading card illustration, retro style, aged paper texture, classic comic art',
  'Neon Cyberpunk': 'neon cyberpunk digital art, glowing lights, futuristic city background, high contrast',
  'Highly Realistic': 'highly realistic photo, 4k, cinematic lighting, detailed texture, professional photography',
  'Blueprint Schematic': 'blueprint technical schematic, white lines on blue background, detailed annotations, engineering diagram',
  'Pop Art Comic Book': 'pop art comic book style, bold outlines, Ben-Day dots, vibrant primary colors',
  'Minimalist Geometric': 'minimalist geometric design, clean lines, simple shapes, abstract representation',
  'Retro 80s Synthwave': 'retro 80s synthwave aesthetic, neon grids, sunset background, vibrant pinks and purples',
  'Watercolor Artistic': 'artistic watercolor rendering, soft edges, beautiful color blending, expressive brushstrokes',
  'Steampunk Mechanical': 'steampunk mechanical illustration, gears, cogs, brass and copper details, intricate machinery',
  'Neonpunk Transformer': 'neonpunk transformer robot, glowing neon circuitry, mechanical cyberpunk aesthetic, electric glow effects',
};

export function getRandomRarity() {
  const rand = Math.random() * 100;
  if (rand < 3) return 'Legendary';
  if (rand < 15) return 'Epic';
  if (rand < 40) return 'Rare';
  return 'Common';
}

function buildCardPrompt(theme, imageStyleName, statNames, count, themeContext) {
  const themeDesc = THEME_PROMPTS[theme] || 'fantasy entity';
  const stylePrompt = IMAGE_STYLE_PROMPTS[imageStyleName] || IMAGE_STYLE_PROMPTS['Highly Realistic'];
  const contextClause = themeContext ? ` focused on ${themeContext}` : '';
  const pluralClause = count > 1 ? 's' : '';

  return `You are a creative assistant for a Top Trumps card game. Generate ${count} unique ${themeDesc} concept${pluralClause}${contextClause}. For each card, provide a compelling title and assign balanced, thematic values between 1 and 100 for these statistics: ${statNames}. Also, create a detailed, visually rich prompt for an AI image generator using this style: ${stylePrompt}. The image must feature ONLY the single subject from the card's title, isolated or in a simple environment, without other creatures or characters.

Return ONLY valid JSON with no additional text. Use this exact format:
${count === 1 ? `{
  "title": "Card Title",
  "stats": {
    "stat1": 85,
    "stat2": 72
  },
  "imagePrompt": "Detailed image description..."
}` : `[
  {
    "title": "Card Title 1",
    "stats": {
      "stat1": 85,
      "stat2": 72
    },
    "imagePrompt": "Detailed image description..."
  }
]`}`;
}

export async function generateCardIdeasInternal(genAI, theme, imageStyleName, count, themeContext) {
  const statNames = (THEMES[theme] || THEMES['Fantasy']).join(', ');
  const prompt = buildCardPrompt(theme, imageStyleName, statNames, count, themeContext);

  const result = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  let rawText = result.candidates[0].content.parts[0].text;
  rawText = rawText.replace(/^(```)?json\n/, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Failed to parse card ideas from AI: ${e.message}`);
  }

  // Normalize to array
  let concepts = Array.isArray(parsed) ? parsed : [parsed];

  return concepts.map(c => {
    const statsObj = c.stats || {};
    const stats = Object.entries(statsObj).map(([name, value]) => ({
      name,
      value: Number(value) || 0,
    }));
    return {
      title: c.title || c.card_title || 'Unknown',
      stats,
      imagePrompt: c.imagePrompt || c.image_prompt || '',
    };
  });
}

export async function generateImageInternal(genAI, imagePrompt) {
  const imageResult = await genAI.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '3:4',
    },
  });

  if (!imageResult.generatedImages || imageResult.generatedImages.length === 0) {
    throw new Error('No image was generated');
  }

  return imageResult.generatedImages[0].image.imageBytes;
}
