import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { toolDefinitions, executeToolCall } from '../tools/agentTools.js';
import { saveLog } from '../storage-wrapper.js';

const MAX_AGENT_ITERATIONS = 25; // Safety limit on tool call loops

function buildSystemPrompt(colorScheme, imageStyle) {
  return `You are a creative card generation agent for a Top Trumps card game designed for kids.

When a user describes what cards they want, use your tools in this order:
1. select_theme — choose the closest matching theme from the available options
2. set_series_name — create an exciting, creative series name based on the user's intent
3. generate_card_ideas — get card concepts (default: 1 card unless user asks for more, max 4)
4. generate_card_image — generate artwork for each card concept (call ONCE per card, not once total)
5. save_card — persist each card to the collection (call once per card after generate_card_image)

IMPORTANT: If generate_card_ideas returns 3 ideas, you must call generate_card_image 3 times (once for each idea) and save_card 3 times.

Rules:
- Default to 1 card unless the user asks for more (max 4)
- Always create an exciting series name that fits the user's intent
- Be enthusiastic and kid-friendly in your responses
- After all cards are complete, summarize what you made (title + rarity for each card)
- The user has chosen: colorScheme="${colorScheme}", imageStyle="${imageStyle}" — you must respect these, do not change them
- For follow-up requests, continue the same series unless the user wants something new

The user's style choices are locked in. Focus your creativity on the card content.`;
}

export function createAgentRouter(genAI) {
  const router = express.Router();

  router.post('/chat', verifyToken, async (req, res) => {
    const { message, history = [], colorScheme = 'Orange-Black', imageStyle = 'Holographic Foil Effect' } = req.body;
    const playerCode = req.playerData?.playerCode || 'anonymous';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Shared context across tool calls in this agent session
    const agentContext = {
      colorScheme,
      imageStyle,
      selectedTheme: null,
      seriesName: null,
      cardIdeas: [],
      generatedCards: [],
      totalCards: 1,
      streamEvent: sendEvent,
    };

    const startTime = Date.now();
    console.log(`[Agent] Starting session for player: ${playerCode}, message: "${message.substring(0, 80)}"`);

    try {
      const systemPrompt = buildSystemPrompt(colorScheme, imageStyle);

      let messages = [
        ...history,
        { role: 'user', parts: [{ text: message }] },
      ];

      let iteration = 0;

      while (iteration < MAX_AGENT_ITERATIONS) {
        iteration++;
        console.log(`[Agent] Iteration ${iteration}: calling Gemini`);

        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: messages,
          config: {
            tools: [{ functionDeclarations: toolDefinitions }],
            systemInstruction: systemPrompt,
          },
        });

        const candidate = response.candidates?.[0];
        if (!candidate) {
          sendEvent('error', { message: 'No response from AI agent' });
          res.end();
          return;
        }

        const parts = candidate.content?.parts || [];
        const functionCallParts = parts.filter(p => p.functionCall);

        if (functionCallParts.length === 0) {
          // Agent has finished — send final text response
          const textPart = parts.find(p => p.text);
          const agentMessage = textPart?.text || 'Done! Your cards are ready.';

          const durationMs = Date.now() - startTime;
          console.log(`[Agent] Session complete in ${durationMs}ms, ${agentContext.generatedCards.length} cards generated`);

          await saveLog('info', 'Agent session complete', {
            playerCode,
            cardsGenerated: agentContext.generatedCards.length,
            iterations: iteration,
            durationMs,
          }).catch(() => {});

          sendEvent('done', {
            agentMessage,
            cards: agentContext.generatedCards,
          });
          res.end();
          return;
        }

        // Add model's response (with function calls) to history
        messages.push({ role: 'model', parts });

        // Execute all tool calls in this turn
        const functionResponses = [];
        for (const part of functionCallParts) {
          const { name, args } = part.functionCall;
          console.log(`[Agent] Tool call: ${name}`, JSON.stringify(args).substring(0, 100));

          // Notify frontend that a tool is starting
          sendEvent('progress', { type: 'tool_start', tool: name });

          let result;
          try {
            result = await executeToolCall(genAI, name, args, agentContext);
            sendEvent('progress', { type: 'tool_done', tool: name, result: sanitizeResultForStream(name, result) });
          } catch (toolError) {
            console.error(`[Agent] Tool ${name} failed:`, toolError.message);
            sendEvent('progress', { type: 'tool_error', tool: name, error: toolError.message });
            result = { error: toolError.message };
          }

          functionResponses.push({
            functionResponse: {
              name,
              response: { result },
            },
          });
        }

        // Feed results back to Gemini
        messages.push({ role: 'user', parts: functionResponses });
      }

      // Hit iteration limit
      console.warn(`[Agent] Hit max iterations (${MAX_AGENT_ITERATIONS})`);
      sendEvent('done', {
        agentMessage: `Done! Generated ${agentContext.generatedCards.length} card${agentContext.generatedCards.length !== 1 ? 's' : ''}.`,
        cards: agentContext.generatedCards,
      });
      res.end();

    } catch (error) {
      console.error('[Agent] Fatal error:', error);
      await saveLog('error', 'Agent session failed', {
        playerCode,
        error: error.message,
        durationMs: Date.now() - startTime,
      }).catch(() => {});

      sendEvent('error', { message: error.message || 'An unexpected error occurred' });
      res.end();
    }
  });

  return router;
}

// Strip large data (base64 images) from tool results before streaming to frontend
function sanitizeResultForStream(toolName, result) {
  if (toolName === 'generate_card_ideas') {
    // Don't send full image prompts in progress events (card_complete event has the card)
    return { count: result.count, titles: (result.ideas || []).map(i => i.title) };
  }
  // For other tools, result is already small
  return result;
}
