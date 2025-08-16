
import type { CardIdea, ImageStyle, Statistic } from '../types';


const DEFAULT_DEV_API_URL = 'http://localhost:3001/api/generate';
const API_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_URL
    ? import.meta.env.VITE_GEMINI_API_URL
    : DEFAULT_DEV_API_URL;

// Fail fast in production if API_URL is not set
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && API_URL === DEFAULT_DEV_API_URL) {
  const errorMsg =
    'VITE_GEMINI_API_URL environment variable is not set. This is required for production deployments. Please configure VITE_GEMINI_API_URL.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

async function callApi(prompt: string, modelName: string) {
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 10000; // configurable timeout (10s)
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
        body: JSON.stringify({ prompt, modelName }),
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

export async function generateStatsForTheme(theme: string): Promise<Statistic[]> {
  try {
    const prompt = `Based on the theme "${theme}", generate exactly 6 thematically appropriate statistic names for a Top Trumps style trading card game. Return ONLY the names as a JSON array of strings, with no additional text or formatting. Examples for 'Dinosaurs' could be 'Height', 'Weight', 'Deadliness', 'Speed'.`;
    const jsonText = await callApi(prompt, "gemini-2.5-flash");
    let stats: any;
    try {
      stats = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse stats JSON:", e, "Raw response:", jsonText);
      return [];
    }

    // Handle backend response shape { kind: 'json', data: [...] }
    if (stats && typeof stats === 'object' && stats.kind === 'json' && Array.isArray(stats.data)) {
      stats = stats.data;
    }

    if (!Array.isArray(stats)) {
      console.warn("Stats is not an array, returning empty array. Raw response:", stats);
      // Fallback: if stats is an object with keys, use keys as stat names
      if (stats && typeof stats === 'object') {
        const keys = Object.keys(stats);
        if (keys.length > 0) {
          console.warn("Fallback: using object keys as stat names:", keys);
          return keys.map(name => ({
            name,
            value: Math.floor(Math.random() * 91) + 10
          }));
        }
      }
      return [];
    }

    // Only map/filter valid entries (name must be string)
    return stats
      .filter((name: any) => typeof name === 'string')
      .map((name: string) => ({
        name: name,
        value: Math.floor(Math.random() * 91) + 10
      }));

  } catch (error) {
    console.error("Error generating stats for theme:", error);
    throw new Error("Failed to generate statistics. Please check your API key and try again.");
  }
}

export async function generateCardIdeas(seriesName: string, theme: string, imageStyle: ImageStyle, stats: Statistic[], count: number, excludeTitle?: string): Promise<CardIdea[]> {
  const statNames = stats.map(s => s.name).join(', ');
  const exclusionClause = excludeTitle ? ` that are different from "${excludeTitle}"` : '';
  const pluralClause = count > 1 ? 's' : '';
  const prompt = `You are a creative assistant for a Top Trumps card game. The game's series is called "${seriesName}". Based on the theme of "${theme}", generate ${count} unique and creative card concept${pluralClause}${exclusionClause}. For each card, provide a compelling title and assign balanced, thematic values between 1 and 100 for the following statistics: ${statNames}. The values should be plausible for the card's title. Also, create a detailed, visually rich prompt for an AI image generator to create an image for this card in a "${imageStyle.name}" style. Crucially, the image must feature ONLY the single subject from the card's title, isolated or in a simple environment, without other creatures or characters. The prompt should be creative and describe a dynamic scene focusing on that single subject. Return ONLY the JSON object(s), with no additional text or formatting.`;

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
        const imagePrompt = concept.image_prompt || concept.ai_image_prompt || '';
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