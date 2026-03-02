# Chess Tournament Platform

## Current State
- Full double-elimination chess tournament app with Admin panel at `/admin`, registration at `/register/:id`, and viewer at `/view/:id`
- Elimination threshold is hardcoded to 2 losses in the backend (`recordMatchResult`)
- `createTournament` accepts only a `name` parameter
- Admin panel shows Winner History, Create Tournament form (name only), and tournament list with expand/collapse panels
- Each tournament panel shows current round with dice reshuffle, standings table, and copy links
- Manual reshuffle toggle already present in the UI

## Requested Changes (Diff)

### Add
- `eliminationCount` field on the `Tournament` type (how many losses before a player is eliminated)
- `createTournament(name, eliminationCount)` — new parameter, default 2 if not specified
- Admin Create Tournament form: numeric input for "Losses to Eliminate" (min 1, max 5, default 2) alongside the name field
- Admin panel: display the elimination count as a badge/label on each tournament item and inside the tournament panel

### Modify
- Backend `recordMatchResult`: use `tournament.eliminationCount` instead of hardcoded `2`
- Frontend `AdminPage`: expand Create Tournament form to include the elimination count input
- `TournamentPanel` registration state: show elimination count prominently so admins know the rule

### Remove
- Nothing removed

## Implementation Plan
1. Update `Tournament` type in Motoko to add `eliminationCount: Nat` field
2. Update `createTournament` to accept `eliminationCount: Nat` parameter (default 2)
3. Update `recordMatchResult` to use `tournament.eliminationCount` when checking for elimination
4. Regenerate backend bindings (`backend.d.ts`)
5. Update Admin Create Tournament form to include a numeric "Losses to Eliminate" input (1–5)
6. Show elimination count badge on TournamentItem list and inside TournamentPanel header
7. Show elimination rule in the registration panel ("X losses = eliminated")
