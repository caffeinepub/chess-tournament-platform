# Chess Tournament Platform

## Current State

- Admin panel lets admins record match results by clicking "Player X Wins"
- Once a result is recorded (`recordMatchResult`), the match is marked `#completed` and the loser's loss count is incremented
- There is no way to undo a result after it has been recorded
- The `reshuffleCurrentRound` call is blocked once any match in the round has a completed result

## Requested Changes (Diff)

### Add
- Backend: `undoMatchResult(matchId)` — resets a completed match back to `#pending`, reverses the loser's loss/status changes, and marks the round as incomplete again
- Frontend: An "Undo" button on each completed (non-bye) match card in admin view, allowing the admin to revert the result and re-select the correct winner

### Modify
- `MatchCard.tsx`: In the completed state for admin mode, show an "Undo" button alongside the winner label
- `AdminPage.tsx`: Pass an `onUndo` callback into `MatchCard` and wire it to the new backend call; refresh queries after undo
- `useQueries.ts`: Add `useUndoMatchResult` mutation hook

### Remove
- Nothing removed

## Implementation Plan

1. **Backend**: Add `undoMatchResult(matchId: Text) : async Match`
   - Trap if match is not completed or is a bye match
   - Revert winner/loser player stats: decrement loser losses, update status (eliminated → oneLoss or active depending on count)
   - Reset match to `{ winnerId = null; loserId = null; result = #pending }`
   - Mark the round containing this match as `completed = false`

2. **Frontend hook**: Add `useUndoMatchResult` mutation in `useQueries.ts` that calls `actor.undoMatchResult(matchId)` and invalidates currentRound, players, tournament queries

3. **MatchCard.tsx**: In the `isCompleted && isAdmin` branch, show a small "Undo" button. Accept optional `onUndo?: () => Promise<void>` and `isUndoLoading?: boolean` props.

4. **AdminPage.tsx**: Wire `onUndo` in the MatchCard call inside TournamentPanel — call `undoMatchResult`, show toast, refresh data.
