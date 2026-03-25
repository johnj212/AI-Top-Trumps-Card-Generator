# Agent Mode: Inline Style Questioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Color Scheme and Image Style dropdowns above the Agent Mode chat with sequential in-chat question bubbles that ask users their style preferences via clickable chips.

**Architecture:** `colorScheme`/`imageStyle` state moves from `App.tsx` into `AgentChat`, synced back via `onStyleResolved` callback. Before the first API call, `AgentChat` checks if styles are set — if not, it injects question bubbles and disables the input until the user clicks chips. Style keywords in user messages are auto-detected to skip questions. A `useRef` is used to safely pass the resolved color scheme to the image style chip handler without relying on async React state.

**Tech Stack:** React, TypeScript, Tailwind CSS. No backend changes. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-25-agent-mode-inline-style-questions-design.md`

---

## File Map

| File | What changes |
|------|-------------|
| `components/AgentChat.tsx` | New imports, extended types, new state + ref, `inferStyleFromText`, `QuestionBubble`, updated `sendMessage`, new `handleOptionSelect`, updated render |
| `App.tsx` | Remove style picker `<div>`, remove `colorScheme`/`imageStyle` props from `<AgentChat>`, add `onStyleResolved` handler |

---

## Task 1: Extend types, add imports, state, and EXAMPLE_PROMPTS

**Files:**
- Modify: `components/AgentChat.tsx`

- [ ] **Step 1: Add imports**

At line 2 (after the existing `import React...` line), the current file has:
```ts
import type { CardData, ColorScheme, ImageStyle } from '../types';
```

`ColorScheme` and `ImageStyle` are already imported. Add a new line below it for the constants:
```ts
import { COLOR_SCHEMES, IMAGE_STYLES } from '../constants';
```

- [ ] **Step 2: Replace the `AgentChatProps` interface (lines 4–8)**

```ts
interface AgentChatProps {
  onCardsGenerated: (cards: CardData[]) => void;
  onStyleResolved: (colorScheme: ColorScheme, imageStyle: ImageStyle) => void;
}
```

- [ ] **Step 3: Extend the `ChatMessage` interface (lines 10–14)**

Replace with:
```ts
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
```

- [ ] **Step 4: Add `EXAMPLE_PROMPTS` constant above the component function (above `const AGENT_API_URL`)**

```ts
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
```

- [ ] **Step 5: Update the `messages` useState to use a random example prompt**

The current initialiser (line 103) is:
```ts
const [messages, setMessages] = useState<ChatMessage[]>([
  {
    role: 'agent',
    text: "Hi! Tell me what kind of Top Trumps cards you want and I'll make them for you. Try: \"Make me a dragon card\" or \"Create 3 Pokémon cards\"",
  },
]);
```

Replace with a lazy initialiser that picks a random prompt (runs once on mount, re-randomises on mode toggle remount):
```ts
const [messages, setMessages] = useState<ChatMessage[]>(() => [
  {
    role: 'agent',
    text: `Hi! Tell me what kind of Top Trumps cards you want and I'll make them for you. Try: "${EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]}" ✨`,
  },
]);
```

- [ ] **Step 6: Add new state and ref variables**

After the existing `useState` declarations (after `inputRef`), add:

```ts
const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme | null>(null);
const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle | null>(null);
const [pendingMessage, setPendingMessage] = useState<string | null>(null);
const [awaitingAnswer, setAwaitingAnswer] = useState(false);
// Ref to safely read resolved color scheme in the imageStyle chip handler
// without relying on async React state updates
const resolvedColorSchemeRef = useRef<ColorScheme | null>(null);
```

- [ ] **Step 7: Verify the file compiles**

```bash
npm run build
```

Expected: TypeScript errors in `App.tsx` about wrong/missing props — these are expected and will be fixed in Task 6. No errors should originate from `AgentChat.tsx` itself.

- [ ] **Step 8: Commit**

```bash
git add components/AgentChat.tsx
git commit -m "feat: extend AgentChat types, state, and example prompts for inline style questions"
```

---

## Task 2: Add `inferStyleFromText` utility

**Files:**
- Modify: `components/AgentChat.tsx`

Add this pure function above `EXAMPLE_PROMPTS`.

- [ ] **Step 1: Add the function**

```ts
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
```

- [ ] **Step 2: Manually verify the logic**

Check these cases mentally:
- `"make cyberpunk cards"` → "Neon Cyberpunk" has word "cyberpunk" (count 1); "Neonpunk Transformer" has no matching words (count 0). Returns "Neon Cyberpunk" ✓
- `"neon style"` → "Neon Cyberpunk" has "neon" (count 1); "Neonpunk Transformer" has no matching words. Returns "Neon Cyberpunk" ✓
- `"make dragon cards"` → no option name words found anywhere. Returns `null` ✓

- [ ] **Step 3: Verify file still compiles**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/AgentChat.tsx
git commit -m "feat: add inferStyleFromText for auto-detecting style from user messages"
```

---

## Task 3: Add `QuestionBubble` component

**Files:**
- Modify: `components/AgentChat.tsx`

Add below the existing `ProgressDisplay` function (ends at line 96), before `const AGENT_API_URL`.

- [ ] **Step 1: Add the component**

```tsx
function QuestionBubble({
  message,
  onSelect,
}: {
  message: ChatMessage;
  onSelect: (key: 'colorScheme' | 'imageStyle', value: string) => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-gray-700 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="mb-2">
          <span className="text-lg mr-2">🤖</span>
          <span>{message.text}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {(message.options ?? []).map((opt) => {
            const isSelected = message.selectedOption === opt;
            const isAnswered = message.answered;
            return (
              <button
                key={opt}
                onClick={() => !isAnswered && onSelect(message.questionKey!, opt)}
                className={[
                  'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-purple-600 ring-2 ring-purple-400 text-white'
                    : 'bg-gray-600 text-gray-200 hover:bg-purple-600 hover:text-white',
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
```

- [ ] **Step 2: Verify file still compiles**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/AgentChat.tsx
git commit -m "feat: add QuestionBubble component for in-chat style selection chips"
```

---

## Task 4: Update `sendMessage` with style inference and question flow

**Files:**
- Modify: `components/AgentChat.tsx`

Read the current `sendMessage` function carefully before editing (starts at line 120).

**Key invariant:** When `sendMessage` is called with a `msg` argument (replay after chips), the user bubble was already injected when the question was shown. To prevent duplicate user bubbles, `sendMessage` must only add the user bubble when called without the `msg` param (i.e. directly from user input).

- [ ] **Step 1: Update the function signature and opening guard**

Replace:
```ts
const sendMessage = async () => {
  const userMessage = input.trim();
  if (!userMessage || isGenerating) return;

  setInput('');
  setIsGenerating(true);
```

With:
```ts
const sendMessage = async (msg?: string) => {
  const userMessage = (msg ?? input).trim();
  if (!userMessage || isGenerating || awaitingAnswer) return;
  if (!msg) setInput('');
  setIsGenerating(true);
```

- [ ] **Step 2: Add style resolution block**

Insert the following block **after** `setIsGenerating(true);` and **before** `setLiveProgress([]);`:

```ts
// Resolve styles — use already-selected values, or infer from message
const resolvedCS = selectedColorScheme ?? inferStyleFromText(userMessage, COLOR_SCHEMES);
const resolvedIS = selectedImageStyle ?? inferStyleFromText(userMessage, IMAGE_STYLES);

// If color scheme unknown, pause and ask
if (!resolvedCS) {
  setIsGenerating(false);
  setPendingMessage(userMessage);
  setAwaitingAnswer(true);
  setMessages(prev => [
    ...prev,
    { role: 'user', text: userMessage },
    {
      role: 'question',
      text: 'What colour scheme do you want for your cards?',
      questionKey: 'colorScheme',
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
    { role: 'user', text: userMessage },
    {
      role: 'question',
      text: 'What image style do you want?',
      questionKey: 'imageStyle',
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
```

- [ ] **Step 3: Guard the user bubble addition**

Find the line that adds the user message to chat (currently just below the opening guard):
```ts
// Add user message to chat
setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
```

Wrap it so it only fires when called from user input (not from replay):
```ts
// Add user message to chat (skip when replaying a pending message — bubble already shown)
if (!msg) {
  setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
}
```

- [ ] **Step 4: Update the fetch body to use local variables**

In the `fetch` call body, find the two style lines:
```ts
colorScheme: colorScheme.name,
imageStyle: imageStyle.name,
```

Replace with:
```ts
colorScheme: resolvedCS.name,
imageStyle: resolvedIS.name,
```

- [ ] **Step 5: Verify**

```bash
npm run build
```

Expected: TypeScript errors only from `App.tsx` (stale props). No errors from `AgentChat.tsx`.

- [ ] **Step 6: Commit**

```bash
git add components/AgentChat.tsx
git commit -m "feat: update sendMessage with lazy style questioning flow and inference"
```

---

## Task 5: Add `handleOptionSelect` chip click handler

**Files:**
- Modify: `components/AgentChat.tsx`

Add inside the component function, after `sendMessage` and before `handleKeyDown`.

- [ ] **Step 1: Add the handler**

```ts
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
      sendMessage(pendingMessage ?? undefined);
      setPendingMessage(null);
    }
  } else {
    // key === 'imageStyle'
    const found = IMAGE_STYLES.find(s => s.name === value) ?? IMAGE_STYLES[0];
    setSelectedImageStyle(found);

    // Use ref to get color scheme (avoids stale React state from previous chip click)
    const cs = resolvedColorSchemeRef.current ?? selectedColorScheme ?? COLOR_SCHEMES[0];
    onStyleResolved(cs, found);
    sendMessage(pendingMessage ?? undefined);
    setPendingMessage(null);
  }
};
```

- [ ] **Step 2: Verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/AgentChat.tsx
git commit -m "feat: add handleOptionSelect for chip-based style selection"
```

---

## Task 6: Update the render — QuestionBubble, disabled input, style footer

**Files:**
- Modify: `components/AgentChat.tsx`

- [ ] **Step 1: Update the messages render loop**

Find the `messages.map` block in the JSX (starts around line 300). It currently looks like:

```tsx
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
```

Replace **only this map block** (leave the live-progress section below it intact) with:

```tsx
{messages.map((msg, i) => {
  if (msg.role === 'question') {
    return <QuestionBubble key={i} message={msg} onSelect={handleOptionSelect} />;
  }
  return (
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
  );
})}
```

The live-progress section (the `{isGenerating && liveProgress.length > 0 && ...}` block) immediately follows — leave it untouched.

- [ ] **Step 2: Update the `<input>` element**

Find the `<input>` in the input bar. Update `disabled` and `placeholder`:

```tsx
<input
  ref={inputRef}
  type="text"
  value={input}
  onChange={e => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  disabled={isGenerating || awaitingAnswer}
  placeholder={
    awaitingAnswer
      ? 'Choose an option above...'
      : isGenerating
      ? 'Generating cards...'
      : 'Describe the cards you want...'
  }
  className="flex-1 bg-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
/>
```

- [ ] **Step 3: Update the send button's `disabled` prop**

```tsx
disabled={isGenerating || awaitingAnswer || !input.trim()}
```

- [ ] **Step 4: Replace the style footer**

Find:
```tsx
<p className="text-gray-600 text-xs mt-1 text-center">
  Style: {colorScheme.name} · {imageStyle.name}
</p>
```

Replace with a fixed-height container to prevent layout jump:
```tsx
<div className="h-4 mt-1 text-center">
  {selectedColorScheme && selectedImageStyle && (
    <p className="text-gray-600 text-xs">
      Style: {selectedColorScheme.name} · {selectedImageStyle.name}
    </p>
  )}
</div>
```

- [ ] **Step 5: Verify**

```bash
npm run build
```

Expected: TypeScript errors only from `App.tsx`. `AgentChat.tsx` should be error-free.

- [ ] **Step 6: Commit**

```bash
git add components/AgentChat.tsx
git commit -m "feat: update AgentChat render with QuestionBubble, disabled input, and style footer"
```

---

## Task 7: Update App.tsx — remove style picker, wire onStyleResolved

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Remove the style picker panel**

In the `agentMode` branch (around line 385–427), find and delete the entire `<div>` with the comment `{/* Style pickers remain visible in Agent Mode */}`. It starts with:

```tsx
{/* Style pickers remain visible in Agent Mode */}
<div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
```

And ends after the second `</select>` closes, at `</div>` (around line 421). Delete the whole block including the wrapping `<div className="flex flex-col gap-4">` wrapper — that wrapper can go too since it only contained the picker and `<AgentChat>`. Replace it with just `<AgentChat ...>` directly.

The `agentMode` branch should go from:
```tsx
<div className="flex flex-col gap-4">
  {/* Style pickers... */}
  <div ...>...</div>
  <AgentChat
    colorScheme={selectedColorScheme}
    imageStyle={selectedImageStyle}
    onCardsGenerated={(cards) => setGeneratedCards(prev => [...prev, ...cards])}
  />
</div>
```

To:
```tsx
<AgentChat
  onCardsGenerated={(cards) => setGeneratedCards(prev => [...prev, ...cards])}
  onStyleResolved={(cs, is) => {
    setSelectedColorScheme(cs);
    setSelectedImageStyle(is);
  }}
/>
```

- [ ] **Step 2: Confirm `CardPreview` in agent mode uses the updated state**

Find the agent-mode card rendering section (around line 450):
```tsx
{generatedCards.map((card) => (
  <CardPreview key={card.id} cardData={card} colorScheme={selectedColorScheme} />
))}
```

This already uses `selectedColorScheme` from App state, which is now updated by `onStyleResolved`. No change needed — just verify it's wired correctly.

- [ ] **Step 3: Full build — should be clean**

```bash
npm run build
```

Expected: zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: remove style picker panel from Agent Mode, wire onStyleResolved to AgentChat"
```

---

## Task 8: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:8088`.

- [ ] **Step 2: Verify welcome message randomises**

Switch to Agent Mode. Note the example prompt in the welcome bubble. Toggle to Design Mode and back a few times — the prompt should vary.

- [ ] **Step 3: Verify style picker panel is gone**

In Agent Mode, there should be no "Color Scheme" or "Image Style" dropdowns above the chat.

- [ ] **Step 4: Plain message → color scheme question**

Type `Make me a dinosaur card` and send. Expect:
- User bubble appears
- Question bubble: "What colour scheme do you want for your cards?" with 5 chips
- Input disabled, placeholder = "Choose an option above..."

- [ ] **Step 5: Color scheme chip → image style question**

Click a chip (e.g. "Blue-Silver"). Expect:
- Clicked chip highlights purple with ring; all chips grey out
- New question bubble: "What image style do you want?" with 11 chips
- Input still disabled

- [ ] **Step 6: Image style chip → auto-send + generation**

Click an image style chip (e.g. "Watercolor Artistic"). Expect:
- Chip highlights; all chips grey out
- Original message sent automatically, generation begins
- Style footer appears: `Style: Blue-Silver · Watercolor Artistic`

- [ ] **Step 7: Second message skips questions**

After generation, type another message — it goes straight to the API, no question bubbles.

- [ ] **Step 8: Style keyword inference**

Reload. Switch to Agent Mode. Type `Make me a cyberpunk card`. Expect:
- Color scheme question still appears (no color keyword)
- After answering, generation starts immediately — no image style question (inferred "Neon Cyberpunk")

- [ ] **Step 9: Cards render with correct color scheme**

After generation, cards should show the chosen color scheme (e.g. Blue-Silver = blue headers), not the default Orange-Black.

- [ ] **Step 10: Design Mode unaffected**

Switch to Design Mode. ControlPanel works normally with its own dropdowns.

---

## Done

All tasks complete. No backend changes. Two files modified.
