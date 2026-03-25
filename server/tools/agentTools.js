import { THEMES, generateCardIdeasInternal, generateImageInternal, getRandomRarity } from '../services/generationService.js';
import { saveImage, saveCard } from '../storage-wrapper.js';

export const toolDefinitions = [
  {
    name: 'select_theme',
    description: 'Choose the most fitting theme for the cards based on user intent',
    parameters: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: ['Dinosaurs', 'Fantasy', 'Automotive', 'Aircraft', 'Pokémon'],
          description: 'The theme that best matches what the user wants',
        },
      },
      required: ['theme'],
    },
  },
  {
    name: 'set_series_name',
    description: 'Set a creative name for this card series',
    parameters: {
      type: 'object',
      properties: {
        seriesName: {
          type: 'string',
          description: 'Exciting, kid-friendly series name',
        },
      },
      required: ['seriesName'],
    },
  },
  {
    name: 'generate_card_ideas',
    description: 'Generate card concepts (title, stats, image prompt) for the selected theme. Call this once to plan all cards.',
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of cards to generate (1-4)',
        },
        theme: {
          type: 'string',
          description: 'The selected theme',
        },
        themeContext: {
          type: 'string',
          description: 'Additional context from user intent to guide card creation (e.g. "dragons", "racing cars")',
        },
        seriesName: {
          type: 'string',
          description: 'The series name for this card set',
        },
      },
      required: ['count', 'theme', 'seriesName'],
    },
  },
  {
    name: 'generate_and_save_card',
    description: 'Generate artwork for a single card and immediately save it to the collection. Call once per card idea.',
    parameters: {
      type: 'object',
      properties: {
        cardTitle: {
          type: 'string',
          description: 'The title of the card (must match one from generate_card_ideas)',
        },
        imagePrompt: {
          type: 'string',
          description: 'Detailed image generation prompt from generate_card_ideas',
        },
        stats: {
          type: 'object',
          description: 'Stat name-to-value map from generate_card_ideas (e.g. {"Speed": 85, "Power": 72})',
        },
        cardId: {
          type: 'string',
          description: 'Unique identifier for this card (e.g. "agent-card-1")',
        },
        seriesName: {
          type: 'string',
          description: 'The series name for this card',
        },
      },
      required: ['cardTitle', 'imagePrompt', 'stats', 'cardId', 'seriesName'],
    },
  },
];

export async function executeToolCall(genAI, name, args, agentContext) {
  switch (name) {
    case 'select_theme': {
      const theme = args.theme;
      const stats = THEMES[theme] || THEMES['Fantasy'];
      agentContext.selectedTheme = theme;
      console.log(`[Agent] Selected theme: ${theme}`);
      return { theme, stats };
    }

    case 'set_series_name': {
      agentContext.seriesName = args.seriesName;
      console.log(`[Agent] Series name set: ${args.seriesName}`);
      return { seriesName: args.seriesName };
    }

    case 'generate_card_ideas': {
      const count = Math.min(Math.max(args.count || 1, 1), 4);
      const theme = args.theme || agentContext.selectedTheme || 'Fantasy';
      const { imageStyle } = agentContext;

      console.log(`[Agent] Generating ${count} card ideas for theme: ${theme}`);
      const ideas = await generateCardIdeasInternal(genAI, theme, imageStyle, count, args.themeContext);

      agentContext.cardIdeas = ideas;
      agentContext.totalCards = ideas.length;

      return {
        count: ideas.length,
        ideas: ideas.map(i => ({
          title: i.title,
          imagePrompt: i.imagePrompt,
          stats: i.stats.reduce((acc, s) => { acc[s.name] = s.value; return acc; }, {}),
        })),
      };
    }

    case 'generate_and_save_card': {
      const { colorScheme, imageStyle } = agentContext;
      const cardId = args.cardId || `agent-card-${Date.now()}`;
      const series = args.seriesName || agentContext.seriesName || 'Agent Collection';
      const theme = agentContext.selectedTheme || 'Fantasy';

      console.log(`[Agent] Generating image for: ${args.cardTitle}`);
      const imageBase64 = await generateImageInternal(genAI, args.imagePrompt);

      // Persist image to cloud storage
      let persistentUrl = null;
      try {
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        persistentUrl = await saveImage(cardId, imageBuffer, series);
      } catch (err) {
        console.warn(`[Agent] Failed to persist image: ${err.message}`);
      }

      // Use stats passed directly from generate_card_ideas output
      const statsObj = args.stats || {};
      const stats = Object.entries(statsObj).map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }));

      // Fall back to random stats only if none were passed
      const finalStats = stats.length > 0
        ? stats
        : (THEMES[theme] || THEMES['Fantasy']).map(name => ({
            name,
            value: Math.floor(Math.random() * 91) + 10,
          }));

      const card = {
        id: cardId,
        title: args.cardTitle,
        series,
        image: `data:image/jpeg;base64,${imageBase64}`,
        stats: finalStats,
        rarity: getRandomRarity(),
        cardNumber: agentContext.generatedCards.length + 1,
        totalCards: agentContext.totalCards || 1,
        theme,
        colorScheme,
        imageStyle,
        imagePrompt: args.imagePrompt,
        persistentImageUrl: persistentUrl || `data:image/jpeg;base64,${imageBase64}`,
        imageFilename: `${cardId}.jpg`,
        generatedAt: new Date().toISOString(),
      };

      agentContext.generatedCards.push(card);

      // Persist card metadata
      try {
        await saveCard(cardId, card);
        console.log(`[Agent] Card saved: ${card.title}`);
      } catch (err) {
        console.warn(`[Agent] Failed to save card metadata: ${err.message}`);
      }

      // Stream card to frontend immediately
      if (agentContext.streamEvent) {
        agentContext.streamEvent('card_complete', {
          card,
          index: agentContext.generatedCards.length,
          total: agentContext.totalCards || 1,
        });
      }

      console.log(`[Agent] Card generated: ${args.cardTitle} (${card.rarity})`);
      return { cardId, title: args.cardTitle, rarity: card.rarity, success: true };
    }

    // Backward-compat stub — Gemini may call this from old conversation history
    case 'save_card': {
      console.log(`[Agent] save_card called (now handled by generate_and_save_card), ignoring`);
      return { success: true, note: 'Card was already saved by generate_and_save_card' };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
