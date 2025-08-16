
import type { CardIdea, ImageStyle, Statistic } from '../types';

const API_URL = 'http://localhost:3001/api/generate';

async function callApi(prompt: string, modelName: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, modelName }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed with status ${response.status}: ${errorText}`);
  }

  const jsonText = await response.text();
  const cleanedJsonText = jsonText.replace(/```json\n|```/g, '').trim();
  return cleanedJsonText;
}

export async function generateStatsForTheme(theme: string): Promise<Statistic[]> {
  try {
    const prompt = `Based on the theme "${theme}", generate exactly 6 thematically appropriate statistic names for a Top Trumps style trading card game. Return ONLY the names as a JSON array of strings, with no additional text or formatting. Examples for 'Dinosaurs' could be 'Height', 'Weight', 'Deadliness', 'Speed'.`;
    const jsonText = await callApi(prompt, "gemini-2.5-flash");
    const stats = JSON.parse(jsonText);
    
    // Ensure value is a random number between 10-100 for preview purposes
    return stats.map((name: string) => ({
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
    const rawResult = JSON.parse(jsonText);

    let cardConcepts: any[];

    // Normalize the raw result into an array of card concepts
    if (Array.isArray(rawResult)) {
        cardConcepts = rawResult;
    } else if (rawResult.card_concept) {
        // If it's a single object with a 'card_concept' key
        if (Array.isArray(rawResult.card_concept)) {
            cardConcepts = rawResult.card_concept;
        } else {
            cardConcepts = [rawResult.card_concept];
        }
    } else {
        // Assume it's a single flat object
        cardConcepts = [rawResult];
    }

    const processedCardIdeas = cardConcepts.map(concept => {
        // Use a more robust way to get title, stats, and imagePrompt
        const title = concept.title || concept.card_title;
        const imagePrompt = concept.image_prompt || concept.ai_image_prompt;
        const statsData = concept.stats || concept.statistics;

        const stats = Object.entries(statsData).map(([name, value]) => ({ name, value: value as number }));

        return {
            title: title,
            stats: stats,
            imagePrompt: imagePrompt
        };
    });

    console.log('Processed card ideas before return:', processedCardIdeas);
    return processedCardIdeas;

  } catch (error) {
    console.error("Error generating card ideas:", error);
    throw new Error("Failed to generate card ideas. Please check your API key and try again.");
  }
}


export async function generateImage(prompt: string): Promise<string> {
    try {
        const imageBytes = await callApi(prompt, 'imagen-3.0-generate-002');
        return imageBytes;
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image. The model may have safety restrictions. Please try a different prompt.");
    }
}