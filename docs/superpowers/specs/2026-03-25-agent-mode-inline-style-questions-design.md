# Agent Mode: Inline Style Questioning

**Date:** 2026-03-25
**Status:** Approved

## Overview

Replace the Color Scheme and Image Style dropdowns above the Agent Mode chat with an in-chat sequential questioning flow. The agent lazily asks about style only when needed (i.e. the user hasn't specified style in their message). Questions appear as chat bubbles with clickable option chips.

## Goals

- Remove the style picker panel from the Agent Mode UI in `App.tsx`
- Move `colorScheme` and `imageStyle` state ownership into `AgentChat`, with a callback to sync resolved values back to `App.tsx` for card rendering
- Show a random example prompt in the welcome message on each mount
- Ask about color scheme then image style sequentially via in-chat chip buttons, only when style is not already set
- Skip questions if the user mentions style keywords that match known options

## Non-Goals

- Changing the backend API contract
- Adding style preference persistence across sessions
- Changing Design Mode behaviour

---

## Architecture

### State Ownership

`colorScheme` and `imageStyle` move from `App.tsx` props into `AgentChat` local state, typed as `ColorScheme | null` and `ImageStyle | null`.

`AgentChat` gains one new prop: `onStyleResolved(colorScheme: ColorScheme, imageStyle: ImageStyle) => void`. This fires once both styles are confirmed (either via chips or inference), **before** the API call is made. `App.tsx` uses this callback to update `selectedColorScheme` and `selectedImageStyle`. Because the API call is async (network round trip), the React state update from `onStyleResolved` commits before any `card_complete` events arrive — cards always render with the correct scheme.

**Updated `AgentChatProps`:**
```ts
interface AgentChatProps {
  onCardsGenerated: (cards: CardData[]) => void;
  onStyleResolved: (colorScheme: ColorScheme, imageStyle: ImageStyle) => void;
}
```

`App.tsx` removes:
- The style picker `<div>` above `<AgentChat>`
- The `colorScheme` and `imageStyle` props passed to `<AgentChat>`
- Adds `onStyleResolved` prop wired to update `selectedColorScheme` / `selectedImageStyle`

`App.tsx` keeps `selectedColorScheme` and `selectedImageStyle` state (initialised to defaults) because `CardPreview` and `GeneratedCardsDisplay` still need them for rendering. On mode toggle, `AgentChat` unmounts and remounts — child style state resets to null. App.tsx style state is not reset on toggle; it retains the last resolved values, which is acceptable (cards already shown keep their scheme).

---

## Data Model

### Extended `ChatMessage`

```ts
interface ChatMessage {
  role: 'user' | 'agent' | 'question';
  text: string;
  progressItems?: ProgressItem[];
  // question-specific fields (role === 'question' only)
  questionKey?: 'colorScheme' | 'imageStyle';
  options?: string[];       // option name strings to display as chips
  answered?: boolean;       // true after user clicks a chip
  selectedOption?: string;  // which option was selected (for highlight)
}
```

`role: 'question'` renders a distinct bubble with chips. `QuestionBubble` reads `message.questionKey` to know which key to pass to `onSelect`. Once answered, `answered: true` and `selectedOption` are set; chips are visually disabled (opacity-50, pointer-events-none) with the selected chip highlighted.

### New State Variables in `AgentChat`

```ts
const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme | null>(null);
const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle | null>(null);
const [pendingMessage, setPendingMessage] = useState<string | null>(null);
const [awaitingAnswer, setAwaitingAnswer] = useState(false); // input disabled while question pending
```

---

## Interaction Flow

```
User types message → sendMessage(msg?: string)
  │  (msg param used for pending replay; falls back to input state if not provided)
  │
  ├─ awaitingAnswer is true? → do nothing (input is disabled)
  │
  ├─ Resolve text = msg ?? input.trim()
  │
  ├─ Try to infer colorScheme from text → resolvedCS
  ├─ Try to infer imageStyle from text  → resolvedIS
  │
  ├─ resolvedCS still null?
  │     ├─ Yes → setPendingMessage(text), setAwaitingAnswer(true),
  │     │         inject colorScheme question bubble, return
  │     └─ No → setSelectedColorScheme(resolvedCS) (local var, not state)
  │
  ├─ resolvedIS still null?
  │     ├─ Yes → setPendingMessage(text), setAwaitingAnswer(true),
  │     │         inject imageStyle question bubble, return
  │     └─ No → setSelectedImageStyle(resolvedIS) (local var, not state)
  │
  ├─ Call onStyleResolved(resolvedCS, resolvedIS) if not already called this session
  │
  └─ Call API with text, resolvedCS.name, resolvedIS.name
```

**Important:** Use local variables (`resolvedCS`, `resolvedIS`) for the API call and `onStyleResolved`, not the React state values, to avoid stale closure issues from async state updates.

When user clicks a chip (`handleOptionSelect(key, value)`):
1. Look up the full object: `COLOR_SCHEMES.find(s => s.name === value)` or `IMAGE_STYLES.find(s => s.name === value)`. If lookup returns `undefined` (should never happen), fall back to index 0 of the respective array.
2. Mark the question message as `answered: true`, `selectedOption: value`
3. `setAwaitingAnswer(false)`
4. If `key === 'colorScheme'`:
   - `setSelectedColorScheme(foundScheme)`
   - If `selectedImageStyle` is still null → inject imageStyle question bubble, `setAwaitingAnswer(true)`
   - Else → both resolved: call `onStyleResolved(foundScheme, selectedImageStyle)`, `sendMessage(pendingMessage!)`
5. If `key === 'imageStyle'`:
   - `setSelectedImageStyle(foundStyle)`
   - Both now resolved → call `onStyleResolved(selectedColorScheme!, foundStyle)`, `sendMessage(pendingMessage!)`

**Note:** In step 4/5, `selectedColorScheme`/`selectedImageStyle` from state are safe to read since the chip handler only runs after the preceding state was set (sequential flow guarantees only one question is active at a time).

**Input bar disabled state:** The text input and send button are disabled when `awaitingAnswer` is true. Placeholder text changes to "Choose an option above...".

---

## `sendMessage` Signature Change

```ts
const sendMessage = async (msg?: string) => {
  const userMessage = (msg ?? input).trim();
  if (!userMessage || isGenerating || awaitingAnswer) return;
  if (!msg) setInput(''); // only clear input if user typed it
  ...
}
```

The existing `sendMessage` body is unchanged except for reading `userMessage` from the parameter instead of `input` state.

---

## Style Inference (Skip Logic)

`inferStyleFromText<T extends { name: string }>(text: string, options: T[]): T | null`

Algorithm:
1. Lowercase the user text
2. For each option, split its name into words (e.g. "Neon Cyberpunk" → ["neon", "cyberpunk"])
3. Count how many of those words appear as substrings in the lowercased user text
4. Sort options by match count descending; return the first option with match count ≥ 1, or `null` if none

Example: user says "make cyberpunk cards"
- "Neon Cyberpunk" → ["neon", "cyberpunk"] → "cyberpunk" found → count 1
- "Neonpunk Transformer" → ["neonpunk", "transformer"] → neither found → count 0
- "Neon Cyberpunk" wins ✓

Example: user says "neon style"
- "Neon Cyberpunk" → ["neon", "cyberpunk"] → "neon" found → count 1
- "Neonpunk Transformer" → ["neonpunk", "transformer"] → neither found → count 0
- "Neon Cyberpunk" wins ✓ (because "neonpunk" does not match "neon")

This runs for both styles before showing any questions. If both infer successfully, no questions are shown.

---

## Components

### `QuestionBubble` (inline in `AgentChat.tsx`)

```tsx
function QuestionBubble({ message, onSelect }: {
  message: ChatMessage;
  onSelect: (key: 'colorScheme' | 'imageStyle', value: string) => void;
}) { ... }
```

Renders:
- Agent icon + question text
- Flexbox wrapping row of chip buttons (`flex flex-wrap gap-2`)
- Each chip: `rounded-full px-3 py-1 text-sm bg-gray-600 hover:bg-purple-600 transition-colors`
- Selected chip: `bg-purple-600 ring-2 ring-purple-400`
- When `answered`: all chips get `opacity-50 pointer-events-none`, selected chip retains highlight
- On click: calls `onSelect(message.questionKey!, value)`

With 11 image style options the chips wrap naturally inside the chat bubble (max-width 85%).

### Welcome Message

Random prompt selected using `useState(() => EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)])` — initialiser function runs once on mount; re-randomises if component unmounts/remounts on mode toggle.

```ts
const EXAMPLE_PROMPTS = [
  "Make me 3 legendary dragon cards",
  "Create a pack of space explorer cards",
  "Build a dinosaur card with max ferocity",
  "Give me 4 superhero cards with epic powers",
  "Make a wizard card with crazy magic stats",
  "Create underwater creature cards",
  "Make a robot warrior card, rare rarity",
  "Build me a pack of mythical beast cards",
];
```

Initial agent bubble text:
> "Hi! Tell me what kind of Top Trumps cards you want and I'll make them for you.
> Try: `{randomPrompt}` ✨"

### Style Footer

Reserve a fixed-height line below the input at all times to prevent layout jump:
- Before both styles resolved: empty / invisible placeholder (`h-4`)
- After both resolved: `Style: Orange-Black · Holographic Foil Effect` in `text-gray-600 text-xs`

---

## Files Changed

| File | Change |
|------|--------|
| `components/AgentChat.tsx` | Own colorScheme/imageStyle state; add question flow; add QuestionBubble; add EXAMPLE_PROMPTS; add inferStyleFromText; add onStyleResolved prop; update sendMessage signature |
| `App.tsx` | Remove style picker panel above AgentChat; remove colorScheme/imageStyle props; add onStyleResolved handler |

No backend changes required.

---

## Edge Cases

- **User sends message while question pending:** Input is disabled (`awaitingAnswer: true`). Not possible via UI.
- **Error during generation (after styles resolved):** Style selections retained in state. No re-questioning on retry. `awaitingAnswer` is already false at this point (cleared when chips were clicked).
- **Error mid-flow while question is pending:** Should not occur — `awaitingAnswer` prevents new messages; error path only triggers from the API call which hasn't started yet. If somehow triggered, `awaitingAnswer` and `pendingMessage` remain set — acceptable, user can click chips to continue.
- **Generation fails after styles resolved:** Style selections are retained. `onStyleResolved` already fired and App.tsx state is updated.
- **Mode toggle (Design → Agent → Design → Agent):** `AgentChat` unmounts and remounts; child style state resets to null; user is re-questioned. App.tsx retains last resolved scheme (acceptable — cards from previous session already rendered correctly).
- **Both styles inferred from message:** Both questions skipped; `onStyleResolved` fires before API call.
- **One style inferred, one not:** Only the unresolved question is shown.
- **Chip lookup fails (name mismatch):** Falls back to index 0 of the respective array. Should never happen in practice.

---

## Testing Checklist

- [ ] Welcome message shows a different random prompt on each page load / mode toggle
- [ ] Sending a plain message triggers color scheme question first
- [ ] Input and send button are disabled while awaiting a chip click
- [ ] Clicking color scheme chip re-disables input and shows image style question
- [ ] Clicking image style chip auto-submits the original pending message
- [ ] Answered chips are greyed out with selected chip highlighted
- [ ] Second message skips questioning entirely
- [ ] Message with one style keyword skips that question, asks the other
- [ ] Message with both style keywords skips both questions and goes straight to API
- [ ] Style footer shows correct selections after both resolved; placeholder before
- [ ] Style picker panel is gone from Agent Mode in App.tsx
- [ ] `CardPreview` in agent mode renders with correct colorScheme (not default) after first generation
