import React, { useState, useRef, useEffect } from 'react';
import type { CardData, ColorScheme, ImageStyle } from '../types';
import { COLOR_SCHEMES, IMAGE_STYLES } from '../constants';

interface AgentChatProps {
  onCardsGenerated: (cards: CardData[]) => void;
  onStyleResolved: (colorScheme: ColorScheme, imageStyle: ImageStyle) => void;
}

interface ChatMessage {
  role: 'user' | 'agent' | 'question';
  text: string;
  progressItems?: ProgressItem[];
  // question-specific fields (role === 'question' only)
  questionKey?: 'colorScheme' | 'imageStyle';
  options?: string[];
  answered?: boolean;
  selectedOption?: string;
}

interface ProgressItem {
  type: 'tool_start' | 'tool_done' | 'tool_error' | 'card_complete';
  tool?: string;
  cardTitle?: string;
  rarity?: string;
  index?: number;
  total?: number;
  error?: string;
}

// Gemini conversation history format (sent to backend)
interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

const TOOL_LABELS: Record<string, string> = {
  select_theme: 'Choosing theme',
  set_series_name: 'Creating series name',
  generate_card_ideas: 'Planning card concepts',
  generate_card_image: 'Generating artwork',
  save_card: 'Saving to collection',
};

const RARITY_COLORS: Record<string, string> = {
  Legendary: 'text-yellow-400',
  Epic: 'text-purple-400',
  Rare: 'text-blue-400',
  Common: 'text-gray-300',
};

/**
 * Infers a style option from free text by matching words in the option name
 * against the user message. Returns the best match (most word hits), or null.
 */
function inferStyleFromText<T extends { name: string }>(
  text: string,
  options: T[]
): T | null {
  const lower = text.toLowerCase();
  let bestMatch: T | null = null;
  let bestCount = 0;

  for (const option of options) {
    const words = option.name.toLowerCase().split(/\s+/);
    const count = words.filter(word => lower.includes(word)).length;
    if (count > bestCount) {
      bestCount = count;
      bestMatch = option;
    }
  }

  return bestCount > 0 ? bestMatch : null;
}

function ProgressDisplay({ items }: { items: ProgressItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {items.map((item, i) => {
        if (item.type === 'tool_start') {
          const label = TOOL_LABELS[item.tool || ''] || item.tool;
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-arcade-cyan/80 font-nunito">
              <span className="animate-pulse">⚡</span>
              <span>{label}...</span>
            </div>
          );
        }
        if (item.type === 'tool_done') {
          const label = TOOL_LABELS[item.tool || ''] || item.tool;
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-arcade-dim font-nunito">
              <span className="text-arcade-success">✓</span>
              <span>{label}</span>
            </div>
          );
        }
        if (item.type === 'card_complete') {
          const rarityClass = RARITY_COLORS[item.rarity || ''] || 'text-gray-300';
          return (
            <div key={i} className="flex items-center gap-2 text-xs font-nunito font-bold">
              <span>🎴</span>
              <span className="text-arcade-text">{item.cardTitle}</span>
              <span className={rarityClass}>({item.rarity})</span>
              {item.total && item.total > 1 && (
                <span className="text-arcade-dim">{item.index}/{item.total}</span>
              )}
            </div>
          );
        }
        if (item.type === 'tool_error') {
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-red-400 font-nunito">
              <span>⚠️</span>
              <span>{item.error}</span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function QuestionBubble({
  message,
  onSelect,
}: {
  message: ChatMessage;
  onSelect: (key: 'colorScheme' | 'imageStyle', value: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-arcade-primary/20 border border-arcade-primary/40 flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-sm">🤖</span>
      </div>
      <div className="max-w-[85%] bg-arcade-card border border-arcade-primary/20 text-arcade-text rounded-2xl rounded-tl-sm px-4 py-3">
        <p className="font-nunito text-sm mb-3">{message.text}</p>
        <div className="flex flex-wrap gap-2">
          {(message.options ?? []).map((opt) => {
            const isSelected = message.selectedOption === opt;
            const isAnswered = message.answered;
            return (
              <button
                key={opt}
                onClick={() => !isAnswered && onSelect(message.questionKey!, opt)}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-nunito font-bold transition-all',
                  isSelected
                    ? 'bg-arcade-primary text-white ring-2 ring-arcade-cyan'
                    : 'bg-arcade-panel border border-arcade-primary/40 text-arcade-text hover:bg-arcade-primary/20',
                  isAnswered ? 'opacity-50 pointer-events-none' : 'cursor-pointer',
                ].join(' ')}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  'Make me 3 legendary dragon cards',
  'Create a pack of space explorer cards',
  'Build a dinosaur card with max ferocity',
  'Give me 4 superhero cards with epic powers',
  'Make a wizard card with crazy magic stats',
  'Create underwater creature cards',
  'Make a robot warrior card, rare rarity',
  'Build me a pack of mythical beast cards',
];

const AGENT_API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api/agent/chat'
  : '/api/agent/chat';

export default function AgentChat({ onCardsGenerated, onStyleResolved }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'agent',
      text: `Hi! Tell me what kind of Top Trumps cards you want and I'll make them for you. Try: "${EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]}" ✨`,
    },
  ]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveProgress, setLiveProgress] = useState<ProgressItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme | null>(null);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  // Ref to safely read resolved color scheme in the imageStyle chip handler
  // without relying on async React state updates
  const resolvedColorSchemeRef = useRef<ColorScheme | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveProgress]);

  const sendMessage = async (msg?: string, csOverride?: ColorScheme, isOverride?: ImageStyle) => {
    const userMessage = (msg ?? input).trim();
    if (!userMessage || isGenerating || (!msg && awaitingAnswer)) return;
    if (!msg) setInput('');
    setIsGenerating(true);

    // Resolve styles — overrides from handleOptionSelect take priority (avoids stale state),
    // then fall back to committed state, then infer from message
    const resolvedCS = csOverride ?? selectedColorScheme ?? inferStyleFromText(userMessage, COLOR_SCHEMES);
    const resolvedIS = isOverride ?? selectedImageStyle ?? inferStyleFromText(userMessage, IMAGE_STYLES);

    // If color scheme unknown, pause and ask
    if (!resolvedCS) {
      setIsGenerating(false);
      setPendingMessage(userMessage);
      setAwaitingAnswer(true);
      setMessages(prev => [
        ...prev,
        ...(msg ? [] : [{ role: 'user' as const, text: userMessage }]),
        {
          role: 'question' as const,
          text: 'What colour scheme do you want for your cards?',
          questionKey: 'colorScheme' as const,
          options: COLOR_SCHEMES.map(s => s.name),
          answered: false,
        },
      ]);
      return;
    }

    // If image style unknown, pause and ask
    if (!resolvedIS) {
      setIsGenerating(false);
      setPendingMessage(userMessage);
      setAwaitingAnswer(true);
      setMessages(prev => [
        ...prev,
        ...(msg ? [] : [{ role: 'user' as const, text: userMessage }]),
        {
          role: 'question' as const,
          text: 'What image style do you want?',
          questionKey: 'imageStyle' as const,
          options: IMAGE_STYLES.map(s => s.name),
          answered: false,
        },
      ]);
      return;
    }

    // Both resolved — sync to state and notify parent before the API call
    setSelectedColorScheme(resolvedCS);
    setSelectedImageStyle(resolvedIS);
    onStyleResolved(resolvedCS, resolvedIS);

    setLiveProgress([]);

    // Add user message to chat (skip when replaying a pending message — bubble already shown)
    if (!msg) {
      setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    }

    // Optimistically add "agent thinking" indicator
    setMessages(prev => [...prev, { role: 'agent', text: '...', progressItems: [] }]);

    const newCards: CardData[] = [];
    const progressSnapshot: ProgressItem[] = [];

    try {
      const response = await fetch(AGENT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          history: geminiHistory,
          colorScheme: resolvedCS.name,
          imageStyle: resolvedIS.name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agent error: ${errorText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        const dataStr = line.slice(6).trim();
        if (!dataStr) return;

        let data: any;
        try {
          data = JSON.parse(dataStr);
        } catch {
          return;
        }

        return data;
      };

      // We'll accumulate the current SSE event type
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (!line.startsWith('data: ')) continue;

          let data: any;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (currentEvent === 'card_complete') {
            newCards.push(data.card as CardData);
            onCardsGenerated([data.card as CardData]);
            progressSnapshot.push({
              type: 'card_complete',
              cardTitle: data.card.title,
              rarity: data.card.rarity,
              index: data.index,
              total: data.total,
            });
            setLiveProgress([...progressSnapshot]);

          } else if (currentEvent === 'progress') {
            if (data.type === 'tool_start') {
              progressSnapshot.push({ type: 'tool_start', tool: data.tool });
            } else if (data.type === 'tool_done') {
              // Replace matching tool_start bolt with a done checkmark
              const idx = [...progressSnapshot].reverse().findIndex(p => p.type === 'tool_start' && p.tool === data.tool);
              const realIdx = idx !== -1 ? progressSnapshot.length - 1 - idx : -1;
              if (realIdx !== -1) progressSnapshot[realIdx] = { type: 'tool_done', tool: data.tool };
            } else if (data.type === 'tool_error') {
              progressSnapshot.push({ type: 'tool_error', tool: data.tool, error: data.error });
            }
            // Update live progress display
            setLiveProgress([...progressSnapshot]);

          } else if (currentEvent === 'done') {
            // Replace placeholder agent message with final response
            const agentText = data.agentMessage || 'Done! Your cards are ready.';
            setMessages(prev => {
              const updated = [...prev];
              // Replace the last "..." placeholder
              updated[updated.length - 1] = {
                role: 'agent',
                text: agentText,
                progressItems: [...progressSnapshot],
              };
              return updated;
            });

            // Update Gemini conversation history for follow-ups
            setGeminiHistory(prev => [
              ...prev,
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: [{ text: agentText }] },
            ]);

          } else if (currentEvent === 'error') {
            throw new Error(data.message || 'Agent error');
          }

          // Reset event type after processing
          currentEvent = 'message';
        }
      }

    } catch (error: any) {
      const errorText = error.message || 'Something went wrong. Please try again.';
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'agent',
          text: `Sorry, I ran into an issue: ${errorText}`,
          progressItems: [],
        };
        return updated;
      });
    } finally {
      setIsGenerating(false);
      setLiveProgress([]);
      inputRef.current?.focus();
    }
  };

  const handleOptionSelect = (key: 'colorScheme' | 'imageStyle', value: string) => {
    // Mark the answered question bubble as done
    setMessages(prev =>
      prev.map(msg =>
        msg.role === 'question' && msg.questionKey === key && !msg.answered
          ? { ...msg, answered: true, selectedOption: value }
          : msg
      )
    );

    setAwaitingAnswer(false);

    if (key === 'colorScheme') {
      const found = COLOR_SCHEMES.find(s => s.name === value) ?? COLOR_SCHEMES[0];
      setSelectedColorScheme(found);
      // Store in ref so imageStyle handler can access it without stale state
      resolvedColorSchemeRef.current = found;

      if (!selectedImageStyle) {
        // Need to ask about image style next
        setAwaitingAnswer(true);
        setMessages(prev => [
          ...prev,
          {
            role: 'question',
            text: 'What image style do you want?',
            questionKey: 'imageStyle',
            options: IMAGE_STYLES.map(s => s.name),
            answered: false,
          },
        ]);
      } else {
        // Both resolved — fire callback and replay the pending message
        onStyleResolved(found, selectedImageStyle);
        sendMessage(pendingMessage ?? undefined, found, selectedImageStyle);
        setPendingMessage(null);
      }
    } else {
      // key === 'imageStyle'
      const found = IMAGE_STYLES.find(s => s.name === value) ?? IMAGE_STYLES[0];
      setSelectedImageStyle(found);

      // Use ref to get color scheme (avoids stale React state from previous chip click)
      const cs = resolvedColorSchemeRef.current ?? selectedColorScheme ?? COLOR_SCHEMES[0];
      onStyleResolved(cs, found);
      // Pass both resolved values directly — state hasn't committed yet in this event
      sendMessage(pendingMessage ?? undefined, cs, found);
      setPendingMessage(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="flex flex-col bg-arcade-panel rounded-2xl border border-arcade-primary/20 shadow-2xl shadow-arcade-primary/10 overflow-hidden min-h-[400px] max-h-[70dvh] lg:min-h-[500px] lg:max-h-[calc(100vh-10rem)]">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-arcade-card border-b border-arcade-primary/20 shrink-0">
        <div className="w-9 h-9 rounded-full bg-arcade-primary/20 border border-arcade-primary flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🤖</span>
        </div>
        <div>
          <p className="font-fredoka text-arcade-primary text-base leading-tight">AI Card Agent</p>
          <p className="font-nunito text-arcade-dim text-xs">Powered by Gemini</p>
        </div>
        {isGenerating && (
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-arcade-cyan animate-pulse" />
            <span className="font-nunito text-arcade-cyan text-xs">Working...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scroll-container">
        {messages.map((msg, i) => {
          if (msg.role === 'question') {
            return <QuestionBubble key={i} message={msg} onSelect={handleOptionSelect} />;
          }

          if (msg.role === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] bg-arcade-primary/80 text-white rounded-2xl rounded-tr-sm px-4 py-3 font-nunito text-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          // agent message
          return (
            <div key={i} className="flex items-start gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-arcade-primary/20 border border-arcade-primary/40 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm">🤖</span>
              </div>
              <div className="max-w-[80%] bg-arcade-card border border-arcade-primary/20 text-arcade-text rounded-2xl rounded-tl-sm px-4 py-3">
                <span className={`font-nunito text-sm ${msg.text === '...' ? 'animate-pulse text-arcade-dim' : ''}`}>
                  {msg.text}
                </span>
                {msg.progressItems && msg.progressItems.length > 0 && (
                  <ProgressDisplay items={msg.progressItems} />
                )}
              </div>
            </div>
          );
        })}

        {/* Live progress */}
        {isGenerating && liveProgress.length > 0 && (
          <div className="flex items-start gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-arcade-primary/20 border border-arcade-primary/40 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm">🤖</span>
            </div>
            <div className="max-w-[80%] bg-arcade-card border border-arcade-primary/20 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="font-nunito text-arcade-dim text-sm">On it! ✨</span>
              <ProgressDisplay items={liveProgress} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 p-3 border-t border-arcade-primary/20 bg-arcade-card">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isGenerating || awaitingAnswer}
            placeholder={
              awaitingAnswer
                ? 'Choose an option above...'
                : isGenerating
                ? 'Generating your cards...'
                : 'Describe the cards you want...'
            }
            className="flex-1 bg-arcade-panel border-2 border-arcade-primary/30 text-arcade-text placeholder-arcade-dim/60 rounded-xl px-4 py-3 font-nunito focus:outline-none focus:border-arcade-primary focus:shadow-[0_0_12px_rgba(108,99,255,0.3)] disabled:opacity-50 transition-all"
            style={{ fontSize: '16px' }}
          />
          <button
            type="submit"
            disabled={isGenerating || awaitingAnswer || !input.trim()}
            className="w-12 h-12 rounded-xl bg-arcade-primary hover:bg-arcade-primary/80 disabled:bg-arcade-panel disabled:opacity-50 text-white flex items-center justify-center text-xl transition-all hover:scale-105 flex-shrink-0"
          >
            {isGenerating ? <span className="animate-spin text-base">⏳</span> : '✨'}
          </button>
        </form>
        <div className="h-4 mt-1 text-center">
          {selectedColorScheme && selectedImageStyle && (
            <p className="font-nunito text-arcade-dim/60 text-xs">
              {selectedColorScheme.name} · {selectedImageStyle.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
