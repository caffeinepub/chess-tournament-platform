# Chess Tournament Platform

## Current State
New project with empty backend and a bare-bones frontend scaffold (React + TypeScript + Tailwind + Vite). No existing application logic.

## Requested Changes (Diff)

### Add
- Full double-elimination chess tournament platform with three public views
- Persistent tournament data storage via backend canister
- Admin panel for managing tournaments and recording match results
- Public player registration page per tournament
- Public read-only tournament viewer with live status
- Double-elimination logic (2 losses = eliminated)
- Automatic round pairing with Fisher-Yates shuffle
- Bye handling for odd player counts
- Color-coded player status (white=active, orange=1 loss, red=eliminated)
- Champion detection and winner announcement
- Copy-to-clipboard links for registration and viewer URLs
- Chess-themed dark UI with gold accents and chess unicode symbols

### Modify
- Frontend routing: add React Router v6 with routes for `/`, `/admin`, `/register/:id`, `/view/:id`
- index.css: dark chess theme design tokens

### Remove
- Nothing (new project)

## Implementation Plan
1. Generate Motoko backend with Tournament, Player, Round, Match data types and CRUD operations
2. Build frontend with React Router, four main page components, shared tournament store (localStorage bridge to backend), pairing algorithm, elimination logic
3. Admin page: tournament list, tournament management (registration/active/completed states)
4. Register page: player name input, closed-state handling
5. View page: tabbed rounds display, player standings, winner banner
6. Shared components: player badge with color coding, match card, copy-link button, toast notifications

## UX Notes
- Dark background #0f172a, cards #1e293b, gold accent #f59e0b
- Chess unicode symbols ♟ ♔ ♛ ♚ used decoratively
- Mobile-responsive layout
- Smooth state transitions with loading indicators
- Toast notifications on copy/submit/result actions
- Registration link and viewer link both copyable from admin panel
