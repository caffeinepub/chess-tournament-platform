# Chess Tournament Platform

## Current State
Full-stack chess tournament app with double-elimination brackets, admin panel, public registration, live bracket viewer. Backend uses Motoko with stable storage. Frontend uses React/TypeScript with React Query.

Known bugs:
- `createTournament` mutation passes `eliminationCount` as raw bigint, but Candid interface expects `[] | [bigint]` (Motoko optional) -- causes a type error on submission
- Player type has no `wins`, `rating`, or `disqualified` fields
- No player management functions beyond add/delete
- No statistics tracking

## Requested Changes (Diff)

### Add
- Backend: `wins: Nat`, `rating: Nat`, `disqualified: Bool` fields to Player
- Backend: `changePlayerName(playerId, newName)` function
- Backend: `changePlayerRating(playerId, rating)` function  
- Backend: `disqualifyPlayer(playerId)` function (marks eliminated + disqualified)
- Backend: increment `wins` on winner when `recordMatchResult` is called
- Frontend: Player Management panel in Admin with: Add Player, Remove Player, Disqualify Player, Change Name, Change Rating
- Frontend: Player Statistics section showing: Wins, Losses, Win Rate, Buchholz Score, Opponent Score per player
- Frontend: new hooks `useChangePlayerName`, `useChangePlayerRating`, `useDisqualifyPlayer`

### Modify
- Fix `useCreateTournament` hook: wrap `eliminationCount` as `[eliminationCount]` (Motoko optional array)
- Fix `handleCreate` in AdminPage to pass `eliminationCount` correctly
- `recordMatchResult` backend: increment winner's `wins` counter
- All Player instantiation code in backend to include new fields with defaults (wins=0, rating=1200, disqualified=false)

### Remove
- Nothing removed

## Implementation Plan
1. Rewrite `main.mo` with updated Player type + new functions + wins tracking
2. Regenerate backend.d.ts declarations to include new fields and methods
3. Fix `eliminationCount` bug in `useQueries.ts` `useCreateTournament`
4. Add new hooks to `useQueries.ts`
5. Update `AdminPage.tsx`: Player Management tab with all 5 actions + Statistics tab with computed metrics (Buchholz = sum of opponents' wins, Opponent Score = avg opponent win rate)
