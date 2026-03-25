import express from 'express';
import { randomUUID } from 'crypto';
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
4. generate_and_save_card — generate artwork AND save each card in one step (call ONCE per card idea, passing the stats from generate_card_ideas directly)

IMPORTANT: If generate_card_ideas returns 3 ideas, you must call generate_and_save_card 3 times (once for each idea), passing the stats object from each idea into the stats parameter.

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
    const sessionId = randomUUID();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    await saveLog('info', 'agent.session.start', {
      sessionId,
      playerCode,
      'gen_ai.request.model': 'gemini-2.5-flash',
      messagePreview: message.substring(0, 80),
      colorScheme,
      imageStyle,
    }).catch(() => {});

    try {
      const systemPrompt = buildSystemPrompt(colorScheme, imageStyle);

      let messages = [
        ...history,
        { role: 'user', parts: [{ text: message }] },
      ];

      let iteration = 0;

      while (iteration < MAX_AGENT_ITERATIONS) {
        iteration++;

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

        const inputTokens = response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        await saveLog('info', 'agent.llm.response', {
          sessionId,
          playerCode,
          iteration,
          'gen_ai.request.model': 'gemini-2.5-flash',
          'gen_ai.response.finish_reason': candidate.finishReason || (functionCallParts.length > 0 ? 'FUNCTION_CALL' : 'STOP'),
          'gen_ai.usage.input_tokens': inputTokens,
          'gen_ai.usage.output_tokens': outputTokens,
          functionCallCount: functionCallParts.length,
        }).catch(() => {});

        if (functionCallParts.length === 0) {
          // Agent has finished — send final text response
          const textPart = parts.find(p => p.text);
          const agentMessage = textPart?.text || 'Done! Your cards are ready.';

          const durationMs = Date.now() - startTime;
          // Gemini 2.5 Flash pricing: $0.075/1M input tokens, $0.30/1M output tokens
          const estimatedCostUSD = (totalInputTokens / 1_000_000) * 0.075
            + (totalOutputTokens / 1_000_000) * 0.30;
          await saveLog('info', 'agent.session.complete', {
            sessionId,
            playerCode,
            cardsGenerated: agentContext.generatedCards.length,
            iterations: iteration,
            durationMs,
            'gen_ai.usage.total_input_tokens': totalInputTokens,
            'gen_ai.usage.total_output_tokens': totalOutputTokens,
            estimatedCostUSD: +estimatedCostUSD.toFixed(6),
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
          const toolStart = Date.now();

          await saveLog('info', 'agent.tool.start', {
            sessionId,
            playerCode,
            iteration,
            'gen_ai.function.name': name,
            'gen_ai.function.input': JSON.stringify(args).substring(0, 500),
          }).catch(() => {});

          // Notify frontend that a tool is starting
          sendEvent('progress', { type: 'tool_start', tool: name });

          let result;
          try {
            result = await executeToolCall(genAI, name, args, agentContext);
            const toolDurationMs = Date.now() - toolStart;
            await saveLog('info', 'agent.tool.done', {
              sessionId,
              playerCode,
              iteration,
              'gen_ai.function.name': name,
              'gen_ai.function.output': JSON.stringify(sanitizeResultForStream(name, result)).substring(0, 500),
              durationMs: toolDurationMs,
            }).catch(() => {});
            sendEvent('progress', { type: 'tool_done', tool: name, result: sanitizeResultForStream(name, result) });
          } catch (toolError) {
            const toolDurationMs = Date.now() - toolStart;
            await saveLog('error', 'agent.tool.error', {
              sessionId,
              playerCode,
              iteration,
              'gen_ai.function.name': name,
              error: toolError.message,
              durationMs: toolDurationMs,
            }).catch(() => {});
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

        // Trim large payloads from earlier history to keep context lean.
        // generate_card_ideas returns full imagePrompt strings per card — once
        // consumed by generate_and_save_card they don't need to stay in context.
        messages = trimConsumedPayloads(messages);
      }

      // Hit iteration limit
      const estimatedCostUSD = (totalInputTokens / 1_000_000) * 0.075
        + (totalOutputTokens / 1_000_000) * 0.30;
      await saveLog('warning', 'agent.session.max_iterations', {
        sessionId,
        playerCode,
        iterations: MAX_AGENT_ITERATIONS,
        cardsGenerated: agentContext.generatedCards.length,
        durationMs: Date.now() - startTime,
        'gen_ai.usage.total_input_tokens': totalInputTokens,
        'gen_ai.usage.total_output_tokens': totalOutputTokens,
        estimatedCostUSD: +estimatedCostUSD.toFixed(6),
      }).catch(() => {});
      sendEvent('done', {
        agentMessage: `Done! Generated ${agentContext.generatedCards.length} card${agentContext.generatedCards.length !== 1 ? 's' : ''}.`,
        cards: agentContext.generatedCards,
      });
      res.end();

    } catch (error) {
      await saveLog('error', 'agent.session.error', {
        sessionId,
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

// Once generate_card_ideas results have been consumed (i.e. generate_and_save_card
// has been called at least once), replace the ideas payload in prior function
// responses with a lightweight summary to keep the context window lean.
function trimConsumedPayloads(messages) {
  // Only trim once a generate_and_save_card call has been fed back
  const hasConsumed = messages.some(m =>
    m.role === 'user' &&
    m.parts?.some(p =>
      p.functionResponse?.name === 'generate_and_save_card'
    )
  );
  if (!hasConsumed) return messages;

  return messages.map(m => {
    if (m.role !== 'user') return m;
    const trimmedParts = m.parts.map(p => {
      if (
        p.functionResponse?.name === 'generate_card_ideas' &&
        p.functionResponse.response?.result?.ideas
      ) {
        const { count, ideas } = p.functionResponse.response.result;
        return {
          functionResponse: {
            name: 'generate_card_ideas',
            response: {
              result: {
                count,
                titles: ideas.map(i => i.title),
                note: '[image prompts and stats trimmed from context]',
              },
            },
          },
        };
      }
      return p;
    });
    return { ...m, parts: trimmedParts };
  });
}
