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

async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

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
  const contextClause = themeContext ? ` specifically about: ${themeContext}` : '';

  return `You are a Top Trumps card designer creating cards for children aged 8-12.

## Task
Generate ${count} unique ${themeDesc} card concept${count > 1 ? 's' : ''}${contextClause}.

## Stats Rules
Assign values (1-100) for: ${statNames}

Give each card a clear gameplay identity — 1-2 signature HIGH stats (85-100) that define its character, and genuine WEAK stats (10-40) that create trade-offs. A fast creature has high Speed but low Defense. A powerful brute has high Strength but low Agility. Avoid giving all stats similar values.

## Image Prompt Rules
Write a vivid image generation prompt that:
- Features ONLY the single named subject, isolated or in a minimal environment
- Describes pose, key visual features, and atmosphere
- Ends with the style descriptor: ${stylePrompt}
- Is 3-5 sentences long

## Example Output
[
  {
    "title": "Velociraptor Alpha",
    "stats": { "Speed": 97, "Ferocity": 89, "Agility": 92, "Weight": 18, "Deadliness": 85, "Height": 22 },
    "imagePrompt": "A single velociraptor mid-leap against a stormy jungle backdrop, scales glistening with rain, claws extended. Its eyes are alert and predatory, body low and aerodynamic. Simple dark foliage in the background keeps focus on the creature. ${stylePrompt}"
  }
]

## Your Output
Return ONLY a valid JSON array with ${count} card${count > 1 ? 's' : ''}. No markdown, no explanation.`;
}

export async function generateCardIdeasInternal(genAI, theme, imageStyleName, count, themeContext) {
  const statNames = (THEMES[theme] || THEMES['Fantasy']).join(', ');
  const prompt = buildCardPrompt(theme, imageStyleName, statNames, count, themeContext);

  const result = await withRetry(() => genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  }));

  let rawText = result.candidates[0].content.parts[0].text;
  rawText = rawText.replace(/^(```)?json\n/, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Failed to parse card ideas from AI: ${e.message}`);
  }

  // Always an array — prompt explicitly requests array format
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
  const imageResult = await withRetry(() => genAI.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '3:4',
    },
  }));

  if (!imageResult.generatedImages || imageResult.generatedImages.length === 0) {
    throw new Error('No image was generated');
  }

  return imageResult.generatedImages[0].image.imageBytes;
}
