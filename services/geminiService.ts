
import { GoogleGenAI, Type } from "@google/genai";
import type { CardIdea, ImageStyle, Statistic } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateStatsForTheme(theme: string): Promise<Statistic[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on the theme "${theme}", generate exactly 6 thematically appropriate statistic names for a Top Trumps style trading card game. Examples for 'Dinosaurs' could be 'Height', 'Weight', 'Deadliness', 'Speed'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              value: { type: Type.INTEGER },
            },
            required: ["name", "value"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    const stats = JSON.parse(jsonText);
    
    // Ensure value is a random number between 10-100 for preview purposes
    return stats.map((stat: {name: string}) => ({
      name: stat.name,
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
  const prompt = `You are a creative assistant for a Top Trumps card game. The game's series is called "${seriesName}". Based on the theme of "${theme}", generate ${count} unique and creative card concept${pluralClause}${exclusionClause}. For each card, provide a compelling title and assign balanced, thematic values between 1 and 100 for the following statistics: ${statNames}. The values should be plausible for the card's title. Also, create a detailed, visually rich prompt for an AI image generator to create an image for this card in a "${imageStyle.name}" style. Crucially, the image must feature ONLY the single subject from the card's title, isolated or in a simple environment, without other creatures or characters. The prompt should be creative and describe a dynamic scene focusing on that single subject.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              stats: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    value: { type: Type.INTEGER },
                  },
                  required: ["name", "value"],
                },
              },
              imagePrompt: { type: Type.STRING },
            },
            required: ["title", "stats", "imagePrompt"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    // If we ask for one, Gemini might return a single object instead of an array. Let's ensure it's always an array.
    if (count === 1 && !Array.isArray(result)) {
        return [result];
    }
    return result;
    
  } catch (error) {
    console.error("Error generating card ideas:", error);
    throw new Error("Failed to generate card ideas. Please check your API key and try again.");
  }
}


export async function generateImage(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '9:16',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image. The model may have safety restrictions. Please try a different prompt.");
    }
}