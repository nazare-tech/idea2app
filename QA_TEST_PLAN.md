# QA & UX Master Test Plan: Idea2App
**Version:** 1.1  
**Author:** Senior QA/UX Engineer (ex-Apple)  
**Date:** 2026-02-15

---

##  The Philosophy: "It Just Works"
As we approach testing **Idea2App**, we are not merely looking for bugs; we are looking for friction. Every interaction should feel fluid, every animation motivated, and every feedback loop instant. Our users are entrepreneurs dreaming of their future—the tool they use should feel as premium and capable as the successful businesses they aim to build.

We test for **Functionality** (Does it work?), **Reliability** (Does it always work?), and **Delight** (Is it a joy to use?).

---

## 1. Test Environment & Scope

### Device Coverage
*   **Desktop (Primary):** macOS Sequoia (Chrome, Safari), Windows 11 (Edge).
*   **Tablet (Critical for Review):** iPad Pro 13" (Landscape & Portrait) - Focus on touch targets and "hover" alternatives.
*   **Mobile (Docs & Status):** iPhone 15 Pro, Pixel 8 - Focus on readability and navigation scaling.

### Principles
*   **Zero Glitch Tolerance:** Visual pops, layout shifts (CLS), or unstyled content flashes are P0 bugs.
*   **Pixel Perfection:** Padding, margins, and type hierarchy must strictly follow the Design System.
*   **Human Error:** Assume the user will click twice, disconnect mid-request, or misunderstand a prompt. The app must recover gracefully.

---

## 2. Core Functional Testing (The "Happy Path" & Beyond)

### A. Authentication & Onboarding
*   **Flow:** Sign Up $\to$ Email Confirmation $\to$ Login $\to$ Workspace.
*   **UX Checks:**
    *   Does the input field focus automatically on load?
    *   Is the error feedback specific? (e.g., "Password too short" vs "Invalid error").
    *   **Magic Link:** Test the "opening in new tab" experience. Does it redirect smoothly without flashing accessible raw JSON?

### B. Project Workspace (The "Three-Column" Layout)
*   **Navigation (Sidebar):**
    *   Verify the dark-themed `ProjectSidebar` remains persistent and performant.
    *   Test long project lists with scrolling—ensure scrollbars are unobtrusive (Apple-style).
*   **Pipeline Nav (`DocumentNav`):**
    *   Check state changes: Pending (Grey) $\to$ In Progress (Blue/Pulse) $\to$ Done (Green).
    *   **Clickability:** Are the click targets large enough? Is the active state visually distinct without relying solely on color (accessibility)?

### C. The Core Loop: AI Chat & Idea Refinement
*   **Prompt Tab:**
    *   *Input:* Type a vague idea (e.g., "Uber for dogs"). Does the AI ask relevant follow-up questions?
    *   *Streaming:* Verify text streams smoothly. No "jumping" of the scroll position as content piles up.
    *   *History:* Reload the page. Is the chat history identical?
*   **Model Switching:**
    *   Switch between Claude Sonnet and GPT-4. Verify the metadata in the DB updates correctly (`prompt_chat_messages` table).

### D. Document Generation (PRD, MVP, Tech Spec, Analysis)
*   **The "Waiting" Experience:**
    *   These requests take time (N8N/Claude).
    *   **Test:** Trigger a generation. Is the loading state clear? Is there a skeleton loader or a subtle progress indicator?
    *   **Test:** Navigate *away* while generating. Come back. Is the state preserved, or did we lose progress? (Ideally, it continues in background).
*   **Content verification:**
    *   Check Markdown rendering. Are headers, lists, and bold text strictly styled according to our typography (Sora / IBM Plex Mono)?
    *   **Mermaid Diagrams:**
        *   Test the "Expand" modal. Does the background blur (`backdrop-blur-sm`) feels native?
        *   Verify the diagram renders correctly. Text must be legible against the node background.

### E. Inline AI Editing (The "Magic" Feature)
This is our "Pencil" feature—interaction density is high here.
*   **Selection Mechanics:**
    *   Select text with mouse. Does the toolbar appear *immediately* on `mouseup`?
    *   **Drag Test:** Drag the mouse *out* of the editor window while selecting. Does it handle the event limit gracefully?
    *   **Selection Persistence:** Click "Edit with AI". Does the selection stay highlighted visually?
*   **Diff View:**
    *   Review the red/green diff view. Is it easy to read?
    *   **Accept/Reject:** Click Accept. Does the text morph instantly? Is there a subtle flash of success?

---

## 3. UX & Visual Polish (The "Apple" Standard)

### A. Typography & Hierarchy
*   **Font Loading:** Ensure `Sora` and `IBM Plex Mono` load without a FOUT (Flash of Unstyled Text).
*   **Readability:** Check line-height in long generated PRDs. It should be comfortable (~1.5-1.6), not tight.
*   **Consistency:** Are all "Generate" buttons the same size, weight, and color (Primary Red #DC2626)?

### B. Motion & Feedback
*   **Micro-interactions:**
    *   Hovering over sidebar items should act like iOS highlight (subtle background change).
    *   Buttons should have a generic "press" state (scale down 0.98 or opacity drop).
*   **Transitions:**
    *   Switching between "PRD" and "MVP Plan" tabs: Is it an instant snap, or a subtle cross-fade? (Prefer cross-fade).
    *   Modals (Mermaid, Settings) should spring open, not just appear.

---

## 4. Edge Cases & Resilience

### A. The "Monkey" Test
*   **Action:** Click the "Generate" button rapidly (10 times in 1 second).
*   **Expected:** The button should debounce (disable after the first click). We should not fire 10 API calls and drain 50 credits.

---

## 5. Security & Privacy

*   **RLS (Row Level Security):**
    *   attempt to fetch project ID `X` while logged in as user `Y`. Should return 404 or 403 (Test by manually changing URL ID or using incognito window with different account).
    *   Verify generated "Tech Specs" are only visible to the project owner.
*   **Input Sanitization:**
    *   Paste malicious markdown/HTML into the prompt (`<script>alert(1)</script>`). Ensure it renders as text code, not executable script.

---

## 6. Recommendations for Engineering

1.  **Skeleton Loading:** The current loading states for full-page generation could be perceived as "stuck". Implement a skeleton UI that mimics the document structure (headers, paragraphs) to reduce perceived wait time.
2.  **Mobile Navigation:** The 3-column layout is aggressive for mobile. Ensure the "Sidebar" and "DocumentNav" collapse into a Hamburger menu or Bottom Sheet on <768px screens.
3.  **Keyboard Shortcuts:** Power users love shortcuts.
    *   `Cmd+Enter` to submit Prompt.
    *   `Cmd+K` for global search.
    *   `Esc` to close any modal.
