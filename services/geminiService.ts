
import type { CardIdea, ImageStyle, Statistic } from '../types';
import { SERIES_NAMES, THEMES, IMAGE_STYLES } from '../constants';

// Input validation functions for security
function validateSeriesName(seriesName: string): string | null {
  return SERIES_NAMES.includes(seriesName) ? seriesName : null;
}

function validateThemeName(themeName: string): string | null {
  return THEMES.find(t => t.name === themeName)?.name || null;
}

function validateImageStyleName(styleName: string): string | null {
  return IMAGE_STYLES.find(s => s.name === styleName)?.name || null;
}

function validateStatName(statName: string): boolean {
  return typeof statName === 'string' && 
         statName.trim().length > 0 && 
         statName.length <= 50 && 
         /^[a-zA-Z0-9\s\-\.]+$/.test(statName);
}

function validateCardTitle(title: string): boolean {
  return typeof title === 'string' && 
         title.trim().length > 0 && 
         title.length <= 100 && 
         /^[a-zA-Z0-9\s\-\.\(\)\'\"]+$/.test(title);
}

function buildSecureCardPrompt(themeName: string, imageStyleName: string, statNames: string, count: number, exclusionClause: string, pluralClause: string): string {
  const themeTemplates = {
    'Automotive': `Generate ${count} unique automotive vehicle concept${pluralClause}${exclusionClause}. Focus on cars, motorcycles, or other vehicles with realistic performance characteristics.`,
    'Dinosaurs': `Generate ${count} unique prehistoric dinosaur species concept${pluralClause}${exclusionClause}. Focus on scientifically plausible dinosaur characteristics.`,
    'Pokémon': `Generate ${count} unique fictional creature concept${pluralClause}${exclusionClause}. Focus on balanced battle statistics typical of collectible creature games.`,
    'Aircraft': `Generate ${count} unique aircraft concept${pluralClause}${exclusionClause}. Focus on planes, helicopters, or other flying vehicles with realistic performance data.`,
    'Fantasy': `Generate ${count} unique fantasy creature or character concept${pluralClause}${exclusionClause}. Focus on magical beings with balanced fantasy attributes.`
  };
  
  const imageStyleTemplates = {
    'Holographic Foil Effect': 'holographic foil effect art, shimmering, iridescent, vibrant, detailed',
    'Vintage Trading Card': 'vintage trading card illustration, retro style, aged paper texture, classic comic art',
    'Neon Cyberpunk': 'neon cyberpunk digital art, glowing lights, futuristic city background, high contrast',
    'Highly Realistic': 'highly realistic photo, 4k, cinematic lighting, detailed texture, professional photography',
    'Blueprint Schematic': 'blueprint technical schematic, white lines on blue background, detailed annotations, engineering diagram',
    'Pop Art Comic Book': 'pop art comic book style, bold outlines, Ben-Day dots, vibrant primary colors',
    'Minimalist Geometric': 'minimalist geometric design, clean lines, simple shapes, abstract representation',
    'Retro 80s Synthwave': 'retro 80s synthwave aesthetic, neon grids, sunset background, vibrant pinks and purples',
    'Watercolor Artistic': 'artistic watercolor rendering, soft edges, beautiful color blending, expressive brushstrokes',
    'Steampunk Mechanical': 'steampunk mechanical illustration, gears, cogs, brass and copper details, intricate machinery'
  };
  
  const themePrompt = themeTemplates[themeName as keyof typeof themeTemplates] || themeTemplates['Fantasy'];
  const stylePrompt = imageStyleTemplates[imageStyleName as keyof typeof imageStyleTemplates] || imageStyleTemplates['Highly Realistic'];
  
  return `You are a creative assistant for a Top Trumps card game. ${themePrompt} For each card, provide a compelling title and assign balanced, thematic values between 1 and 100 for these statistics: ${statNames}. The values should be plausible for the card's title. Also, create a detailed, visually rich prompt for an AI image generator using this style: ${stylePrompt}. The image must feature ONLY the single subject from the card's title, isolated or in a simple environment, without other creatures or characters.

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

const DEFAULT_DEV_API_URL = 'http://localhost:3001/api/generate';

// In production (Cloud Run), use relative URL since frontend and backend are served together
const getApiUrl = () => {
  // If environment variable is set, use it
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_URL) {
    return import.meta.env.VITE_GEMINI_API_URL;
  }
  
  // If we're on localhost, use the dev URL
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return DEFAULT_DEV_API_URL;
  }
  
  // In production, use relative URL
  return '/api/generate';
};

const API_URL = getApiUrl();

async function callApi(prompt: string, modelName: string, customBody?: any) {
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 30000; // configurable timeout (30s)
  const BACKOFF_MS = 1000; // initial backoff (1s)

  let lastError: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customBody || { prompt, modelName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`API call failed with status ${response.status}: ${errorText}`);
        // Retry only on transient errors (e.g., 5xx)
        if (response.status >= 500 && response.status < 600 && attempt < MAX_ATTEMPTS) {
          await new Promise(res => setTimeout(res, BACKOFF_MS * attempt));
          continue;
        } else {
          throw lastError;
        }
      }

      const jsonText = await response.text();
      const cleanedJsonText = jsonText.replace(/```json\n|```/g, '').trim();
      return cleanedJsonText;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        lastError = new Error('API request timed out');
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(res => setTimeout(res, BACKOFF_MS * attempt));
          continue;
        } else {
          throw lastError;
        }
      } else {
        lastError = err;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(res => setTimeout(res, BACKOFF_MS * attempt));
          continue;
        } else {
          throw lastError;
        }
      }
    }
  }
  throw lastError || new Error('API call failed after retries');
}

export async function generateStatsValues(statNames: string[]): Promise<Statistic[]> {
  const validatedStatNames = statNames.filter(name => 
    typeof name === 'string' && 
    name.trim().length > 0 && 
    name.length <= 50 && 
    /^[a-zA-Z0-9\s\-\.]+$/.test(name)
  );
  
  if (validatedStatNames.length === 0) {
    console.warn("No valid stat names provided, generating random values");
    return [];
  }

  return validatedStatNames.map(name => ({
    name,
    value: Math.floor(Math.random() * 91) + 10
  }));
}

export async function generateCardIdeas(seriesName: string, themeName: string, imageStyle: ImageStyle, stats: Statistic[], count: number, excludeTitle?: string): Promise<CardIdea[]> {
  // Validate and sanitize inputs
  const validatedSeriesName = validateSeriesName(seriesName);
  const validatedThemeName = validateThemeName(themeName);
  const validatedImageStyleName = validateImageStyleName(imageStyle.name);
  const validatedStats = stats.filter(stat => validateStatName(stat.name));
  
  if (!validatedSeriesName || !validatedThemeName || !validatedImageStyleName || validatedStats.length === 0) {
    throw new Error("Invalid input parameters for card generation");
  }
  
  const statNames = validatedStats.map(s => s.name).join(', ');
  const exclusionClause = excludeTitle && validateCardTitle(excludeTitle) ? ` that are different from the previous card` : '';
  const pluralClause = count > 1 ? 's' : '';
  
  // Use safe, pre-validated template without direct interpolation
  const prompt = buildSecureCardPrompt(validatedThemeName, validatedImageStyleName, statNames, count, exclusionClause, pluralClause);

  try {
    const jsonText = await callApi(prompt, "gemini-2.5-flash");
    console.log('Gemini response for card ideas:', jsonText);
    let rawResult: any;
    try {
      rawResult = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse card ideas JSON:", e, "Raw response:", jsonText);
      return [];
    }

    let cardConcepts: any[];
    // Normalize the raw result into an array of card concepts
    if (Array.isArray(rawResult)) {
      cardConcepts = rawResult;
    } else if (rawResult.card_concept) {
      if (Array.isArray(rawResult.card_concept)) {
        cardConcepts = rawResult.card_concept;
      } else {
        cardConcepts = [rawResult.card_concept];
      }
    } else if (rawResult.cards && Array.isArray(rawResult.cards)) {
      // Fallback: check for 'cards' array property
      cardConcepts = rawResult.cards;
    } else if (rawResult && typeof rawResult === 'object') {
      // Fallback: use object values if they look like card concepts
      cardConcepts = Object.values(rawResult).filter(v => typeof v === 'object');
      if (cardConcepts.length === 0) cardConcepts = [rawResult];
    } else {
      cardConcepts = [rawResult];
    }

    // Unwrap card_concept or card objects if present
    cardConcepts = cardConcepts.map(concept => {
      if (concept && typeof concept === 'object') {
        if (concept.card_concept && typeof concept.card_concept === 'object') {
          return concept.card_concept;
        }
        if (concept.card && typeof concept.card === 'object') {
          return concept.card;
        }
      }
      return concept;
    });

    // Robust check: filter out undefined/null concepts and log them
    cardConcepts = cardConcepts.filter(concept => {
      if (!concept || typeof concept !== 'object') {
        console.warn('Skipping invalid concept (not an object):', concept);
        return false;
      }
      if (!('title' in concept) && !('card_title' in concept)) {
        console.warn('Skipping concept due to missing title property:', concept);
        return false;
      }
      return true;
    });

    const processedCardIdeas: CardIdea[] = cardConcepts
      .map(concept => {
        // Validate and default title
        const title = concept.title || concept.card_title || '';
        if (!title || typeof title !== 'string') {
          console.warn('Skipping concept due to missing or invalid title:', concept);
          return null;
        }

        // Validate and default imagePrompt
        const imagePrompt = concept.imagePrompt || concept.image_prompt || concept.ai_image_prompt || '';
        if (typeof imagePrompt !== 'string') {
          console.warn('Skipping concept due to missing or invalid imagePrompt:', concept);
          return null;
        }

        // Validate and default statsData
        let statsData = (typeof concept.stats === 'object' && concept.stats)
          ? concept.stats
          : (typeof concept.statistics === 'object' && concept.statistics)
            ? concept.statistics
            : {};

        // Only use Object.entries if statsData is a non-null object
        let stats: { name: string, value: number }[] = [];
        if (statsData && typeof statsData === 'object' && !Array.isArray(statsData)) {
          stats = Object.entries(statsData)
            .filter(([name, value]) => typeof name === 'string' && name.trim() !== '')
            .map(([name, value]) => {
              const numValue = Number(value);
              return {
                name,
                value: isNaN(numValue) ? 0 : numValue
              };
            });
        }

        return {
          title,
          stats,
          imagePrompt
        };
      })
      .filter(Boolean) as CardIdea[]; // Remove nulls from skipped concepts

    console.log('Processed card ideas before return:', processedCardIdeas);
    return processedCardIdeas;
  } catch (error) {
    console.error("Error generating card ideas:", error);
    throw new Error("Failed to generate card ideas. Please check your API key and try again.");
  }
}

export async function generateImage(prompt: string): Promise<string> {
  // Validate image prompt for security
  if (!validateImagePrompt(prompt)) {
    throw new Error("Invalid image prompt provided");
  }
  
  try {
    const responseText = await callApi(prompt, 'imagen-3.0-generate-002');
    let responseObj;
    try {
      responseObj = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse image response as JSON:", e, "Raw response:", responseText);
      throw new Error("Image API did not return valid JSON.");
    }
    if (responseObj && responseObj.kind === "image" && typeof responseObj.data === "string") {
      return responseObj.data;
    } else {
      console.error("Image API response missing expected fields:", responseObj);
      throw new Error("Image API response missing expected fields.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. The model may have safety restrictions. Please try a different prompt.");
  }
}

function validateImagePrompt(prompt: string): boolean {
  return typeof prompt === 'string' && 
         prompt.trim().length > 0 && 
         prompt.length <= 2000 && 
         // Allow more characters for image prompts but still restrict dangerous patterns
         !/[<>{}[\]\\`|&$;(){}]/.test(prompt);
}