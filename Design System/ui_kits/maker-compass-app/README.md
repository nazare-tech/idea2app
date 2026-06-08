# Maker Compass — Product (Workspace) UI Kit

A high-fidelity recreation of the Maker Compass product workspace: the dark sidebar rail, the projects grid, the idea-intake flow, and a project workspace with long-form artifacts plus an assistant chat. Gently rounded corners, inhabitable voice.

Open **`index.html`** for the full click-through:
1. **Projects** — dark sidebar + a grid of project cards (hover to reveal delete). Click **New Project** to start.
2. **Idea intake** — describe the idea, target users, constraints. **Generate plan** spins briefly, creates the project, and drops you into the workspace.
3. **Workspace** — project header with a status pill, a tab nav (Competitive / PRD / MVP Plan / Tech Spec) over a long-form artifact, and an assistant chat panel. The composer sends messages (Enter to send) and returns a canned reply.

## Files
- **`index.html`** — entry; loads React 18 + Babel + Lucide, then the JSX below.
- **`kit.css`** — all workspace styles, paired with the root `colors_and_type.css` tokens.
- **`shell.jsx`** — `Icon` (Lucide wrapper), `Button`, `Sidebar` (dark rail + credits).
- **`views.jsx`** — `ProjectsView` / `ProjectCard`, `IntakeView`, `WorkspaceView` (`Artifact`, `ChatPanel`).
- **`app.jsx`** — view routing + seeded projects.

## Component notes
- **Sidebar** — the deliberate dark inversion. Active item uses `--sidebar-active`; the credits block lives at the bottom with a mono label and a coral coin icon.
- **Product cards** — `rounded-lg`, Border Strong hairline, hover shifts border + tints background. Never nested.
- **Artifact** — long-form prose capped at ~72ch, mono section kickers, tables with a Warm Paper header row. Body at line-height 1.6.
- **Chat** — assistant bubbles use Warm Paper + hairline; the user bubble is Workshop Black. Composer send button is Action Red.

## Voice reminders
Impersonal, instructional in-product copy ("Describe what you want to build"), mono UPPERCASE kickers, no em dashes, no emoji. Action Red appears only on the primary action, the active tab underline, and the send button.
