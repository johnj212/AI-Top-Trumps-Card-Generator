import React, { useState, useRef, useEffect } from 'react';
import type { CardData, ColorScheme, ImageStyle } from '../types';

interface AgentChatProps {
  colorScheme: ColorScheme;
  imageStyle: ImageStyle;
  onCardsGenerated: (cards: CardData[]) => void;
}

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  progressItems?: ProgressItem[];
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

function ProgressDisplay({ items }: { items: ProgressItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {items.map((item, i) => {
        if (item.type === 'tool_start') {
          const label = TOOL_LABELS[item.tool || ''] || item.tool;
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="animate-pulse">⚡</span>
              <span>{label}...</span>
            </div>
          );
        }
        if (item.type === 'tool_done' && item.tool === 'select_theme') {
          return null; // Don't show tool_done for most tools — card_complete handles the visible result
        }
        if (item.type === 'card_complete') {
          const rarityClass = RARITY_COLORS[item.rarity || ''] || 'text-gray-300';
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>🎴</span>
              <span className="text-white font-medium">{item.cardTitle}</span>
              <span className={`font-bold ${rarityClass}`}>({item.rarity})</span>
              {item.total && item.total > 1 && (
                <span className="text-gray-500 text-xs">{item.index}/{item.total}</span>
              )}
            </div>
          );
        }
        if (item.type === 'tool_error') {
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-red-400">
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

const AGENT_API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api/agent/chat'
  : '/api/agent/chat';

export default function AgentChat({ colorScheme, imageStyle, onCardsGenerated }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      text: "Hi! Tell me what kind of Top Trumps cards you want and I'll make them for you. Try: \"Make me a dragon card\" or \"Create 3 Pokémon cards\"",
    },
  ]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveProgress, setLiveProgress] = useState<ProgressItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveProgress]);

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || isGenerating) return;

    setInput('');
    setIsGenerating(true);
    setLiveProgress([]);

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);

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
          colorScheme: colorScheme.name,
          imageStyle: imageStyle.name,
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

          if (currentEvent === 'progress') {
            if (data.type === 'card_complete') {
              newCards.push(data.card as CardData);
              // Notify parent immediately as each card arrives
              onCardsGenerated([data.card as CardData]);
              progressSnapshot.push({
                type: 'card_complete',
                cardTitle: data.card.title,
                rarity: data.card.rarity,
                index: data.index,
                total: data.total,
              });
            } else if (data.type === 'tool_start') {
              progressSnapshot.push({ type: 'tool_start', tool: data.tool });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-850 rounded-xl border border-gray-700 overflow-hidden" style={{ minHeight: '400px', maxHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <span className="text-xl">🧠</span>
        <div>
          <p className="font-bold text-white text-sm">AI Card Agent</p>
          <p className="text-gray-400 text-xs">Powered by Gemini function calling</p>
        </div>
        {isGenerating && (
          <div className="ml-auto flex items-center gap-2 text-xs text-purple-400">
            <span className="animate-pulse">●</span>
            <span>Working...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-purple-700 text-white rounded-tr-sm'
                : 'bg-gray-700 text-gray-100 rounded-tl-sm'
            }`}>
              {msg.role === 'agent' && <span className="text-lg mr-2">🤖</span>}
              <span className={msg.text === '...' ? 'animate-pulse text-gray-400' : ''}>
                {msg.text}
              </span>
              {msg.progressItems && msg.progressItems.length > 0 && (
                <ProgressDisplay items={msg.progressItems} />
              )}
            </div>
          </div>
        ))}

        {/* Live progress for in-flight generation */}
        {isGenerating && liveProgress.length > 0 && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="text-lg mr-2">🤖</span>
              <span className="text-gray-300 text-sm">On it!</span>
              <ProgressDisplay items={liveProgress} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={isGenerating ? 'Generating cards...' : 'Describe the cards you want...'}
            className="flex-1 bg-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isGenerating || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            {isGenerating ? '⏳' : '✨'}
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-1 text-center">
          Style: {colorScheme.name} · {imageStyle.name}
        </p>
      </div>
    </div>
  );
}
