# Mobile Compatibility Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two iPhone issues reported in GitHub issue #4: the Enter/Return key not submitting in Agent Mode chat, and the app layout overflowing the visible screen area on iPhone.

**Architecture:** Two targeted fixes — (1) wrap the AgentChat text input in a native `<form>` so iOS Safari's virtual keyboard "Return" key triggers form submission reliably, and (2) replace `min-h-screen` (`100vh`) with `min-h-[100dvh]` (dynamic viewport height) and make AgentChat's hardcoded pixel heights responsive.

**Tech Stack:** React + TypeScript + Tailwind CSS (CDN build), iOS Safari

---

## File Map

| File | Change |
|------|--------|
| `components/AgentChat.tsx` | Wrap input+button in `<form onSubmit>`, remove `onKeyDown`, make container height responsive |
| `App.tsx` | Replace `min-h-screen` with `min-h-[100dvh]` on root element |

---

### Task 1: Fix Enter key in AgentChat by wrapping input in a `<form>`

**Problem:** iOS Safari's virtual keyboard "Return/Go" button fires a form submission event — it does **not** reliably fire `keydown` events on bare `<input>` elements. The current `onKeyDown={handleKeyDown}` works on desktop but fails silently on iPhone.

**Fix:** Replace the bare `<div>` wrapper around the input+button with a `<form onSubmit>`. Remove the `onKeyDown` handler (the form submission replaces it). Keep `e.preventDefault()` inside `onSubmit` to stop page reload.

**Files:**
- Modify: `components/AgentChat.tsx`

- [ ] **Step 1: Open `components/AgentChat.tsx` and read lines 462–551 to confirm current state**

  Confirm `handleKeyDown` exists and that the input+button live inside a plain `<div className="flex gap-2">`.

- [ ] **Step 2: Replace `handleKeyDown` with a form submit handler**

  Delete the `handleKeyDown` function (lines 462–467) and add `handleFormSubmit` in its place:

  ```tsx
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };
  ```

- [ ] **Step 3: Wrap the input+button in a `<form>` and remove `onKeyDown`**

  Change the input section in the JSX (lines 526–551). Find:

  ```tsx
  <div className="shrink-0 p-3 border-t border-gray-700 bg-gray-800">
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating || awaitingAnswer}
        ...
      />
      <button
        onClick={sendMessage}
        disabled={isGenerating || awaitingAnswer || !input.trim()}
        ...
      >
        {isGenerating ? '⏳' : '✨'}
      </button>
    </div>
  ```

  Replace with:

  ```tsx
  <div className="shrink-0 p-3 border-t border-gray-700 bg-gray-800">
    <form onSubmit={handleFormSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        disabled={isGenerating || awaitingAnswer}
        ...
      />
      <button
        type="submit"
        disabled={isGenerating || awaitingAnswer || !input.trim()}
        ...
      >
        {isGenerating ? '⏳' : '✨'}
      </button>
    </form>
  ```

  Key changes:
  - `<div className="flex gap-2">` → `<form onSubmit={handleFormSubmit} className="flex gap-2">`
  - Remove `onKeyDown={handleKeyDown}` from the `<input>`
  - Add `type="submit"` to the `<button>` (removes `onClick={sendMessage}`)

- [ ] **Step 4: Verify the file compiles cleanly**

  Run: `npm run build` (or `npx tsc --noEmit` if the project has a typecheck script)

  Expected: No TypeScript errors. The `handleKeyDown` function is now unused and deleted — confirm it's gone.

- [ ] **Step 5: Commit**

  ```bash
  git add components/AgentChat.tsx
  git commit -m "fix: wrap AgentChat input in form so iOS Return key submits"
  ```

---

### Task 2: Fix AgentChat hardcoded heights for small iPhone screens

**Problem:** `AgentChat.tsx` line 470 has `style={{ minHeight: '400px', maxHeight: '600px' }}` hardcoded in pixels. On an iPhone SE (667px screen height) with Safari's address bar visible (~100px chrome), the visible area is ~567px. The chat panel alone takes up to 600px, leaving no room for the header, mode toggle, or player profile above it.

**Fix:** Remove the pixel height constraints. Instead, control height through Tailwind flex layout — the outer page is already `min-h-screen` and the grid column is `flex flex-col`, so the chat panel can use `flex-1` with a reasonable `max-h` based on viewport units.

**Files:**
- Modify: `components/AgentChat.tsx`

- [ ] **Step 1: Find the AgentChat root div (line 470)**

  Current code:
  ```tsx
  <div className="flex flex-col h-full min-h-0 bg-gray-850 rounded-xl border border-gray-700 overflow-hidden" style={{ minHeight: '400px', maxHeight: '600px' }}>
  ```

- [ ] **Step 2: Replace fixed pixel heights with a responsive Tailwind class**

  ```tsx
  <div className="flex flex-col min-h-[320px] max-h-[60vh] lg:max-h-[600px] bg-gray-850 rounded-xl border border-gray-700 overflow-hidden">
  ```

  Explanation:
  - `min-h-[320px]` — minimum to be usable without being cramped
  - `max-h-[60vh]` — on mobile, cap at 60% of viewport height so header content above it remains visible
  - `lg:max-h-[600px]` — restore the original 600px cap on large screens where space isn't an issue
  - Remove `h-full` (not needed; flex layout handles this) and `min-h-0` (the new explicit min-h handles the floor)

- [ ] **Step 3: Verify the messages area still scrolls correctly**

  The messages div at line 487 already has `flex-1 overflow-y-auto`. This is correct — it will scroll within whatever height the outer container provides. No change needed there.

- [ ] **Step 4: Commit**

  ```bash
  git add components/AgentChat.tsx
  git commit -m "fix: make AgentChat height responsive for small iPhone screens"
  ```

---

### Task 3: Fix `min-h-screen` viewport issue on iOS Safari

**Problem:** `min-h-screen` in Tailwind compiles to `min-height: 100vh`. On iOS Safari, `100vh` is calculated as the viewport height *including* the address bar area (the "large viewport" height). When Safari's URL bar is visible and takes up space, content overflows below the visible area, or the page scrolls unexpectedly. The CSS `dvh` unit (dynamic viewport height) was introduced precisely for this — it equals the visible viewport height at any given moment.

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Find all `min-h-screen` usages in `App.tsx`**

  Run: `grep -n "min-h-screen" App.tsx`

  Expected output: Two hits — one on the auth loading screen (~line 313) and one on the main app root (~line 340).

- [ ] **Step 2: Replace both `min-h-screen` with `min-h-[100dvh]`**

  Change line ~313:
  ```tsx
  // Before:
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
  // After:
  <div className="min-h-[100dvh] bg-gray-900 flex items-center justify-center">
  ```

  Change line ~340:
  ```tsx
  // Before:
  <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
  // After:
  <div className="min-h-[100dvh] bg-gray-900 text-white p-4 sm:p-8">
  ```

  Note: `100dvh` is supported in iOS Safari 15.4+ (released March 2022). This covers the vast majority of active iPhones. The `min-h-[100dvh]` syntax works with the Tailwind CDN build used in this project via arbitrary value syntax.

- [ ] **Step 3: Check LoginScreen for the same issue**

  Run: `grep -n "min-h-screen" components/auth/LoginScreen.tsx`

  `LoginScreen.tsx` line 59 uses `min-h-screen`. Apply the same fix:

  ```tsx
  // Before:
  <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
  // After:
  <div className="min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
  ```

- [ ] **Step 4: Verify the build compiles**

  Run: `npm run build`

  Expected: No errors. `100dvh` is a valid CSS value — TypeScript/JSX doesn't validate CSS values, so this is safe.

- [ ] **Step 5: Commit**

  ```bash
  git add App.tsx components/auth/LoginScreen.tsx
  git commit -m "fix: use 100dvh instead of 100vh to fix iOS Safari viewport height"
  ```

---

### Task 4: Manual verification on iPhone (or iPhone Simulator)

**Files:** None — testing task only.

- [ ] **Step 1: Run the dev server**

  ```bash
  npm run dev
  ```

  Note the local IP address printed by Vite (e.g., `http://192.168.x.x:8088`).

- [ ] **Step 2: Open the app on iPhone Safari**

  On your iPhone, open Safari and navigate to the local IP address. Log in with player code `TIGER34`.

- [ ] **Step 3: Verify Enter key fix**

  - Switch to **Agent Mode**
  - Type a message in the chat input
  - Tap the "Return" or "Go" key on the iPhone keyboard
  - Expected: The message sends (same as tapping the ✨ button)

- [ ] **Step 4: Verify screen size fix**

  - Observe that the full UI is visible without requiring horizontal scroll
  - The Agent Chat panel should not overflow the screen
  - Scroll the page vertically — the content should stay within bounds
  - Rotate to landscape — verify the layout adapts

- [ ] **Step 5: Verify Login screen**

  - Log out (if logout is accessible) or open in a private tab without auth
  - Confirm the login screen fills the viewport correctly on iPhone

- [ ] **Step 6: If iOS device not available, test with Chrome DevTools**

  In Chrome, open DevTools → Toggle Device Toolbar (Cmd+Shift+M) → Select "iPhone 14 Pro" or "iPhone SE".
  Test the same steps above. Note: DevTools simulation doesn't perfectly replicate iOS Safari's `vh` behaviour but catches layout overflows.
