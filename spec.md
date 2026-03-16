# Chess Tournament Platform

## Current State
Full-featured Chess Tournament Platform with double-elimination brackets, admin controls, player management, player statistics, and Hulk Smash cinematic theming. Backend uses stable Motoko storage. No notification system is currently live.

## Requested Changes (Diff)

### Add
- **Notification data model** in backend: `Notification` type (id, tournamentId, targetPlayerName optional, title, body, notifType, createdAt, readBy list)
- **NotificationSettings** type per tournament: matchResultEnabled, nextRoundEnabled, tournamentStartEnabled, manualBroadcastEnabled
- **Backend methods**:
  - `getNotificationsForPlayer(tournamentId, playerName)` -- returns unread notifications for a player
  - `markNotificationsRead(tournamentId, playerName, notifIds)` -- marks notifications as read
  - `getNotificationLog(tournamentId)` -- admin: all notifications ever sent
  - `getNotificationSettings(tournamentId)` -- returns current settings
  - `updateNotificationSettings(tournamentId, settings)` -- saves settings
  - `broadcastNotification(tournamentId, title, body)` -- admin manual broadcast
- **Auto-trigger notifications** inside existing backend functions:
  - `startTournament` -> "Tournament has started! Check pairings."
  - `recordMatchResult` -> winner gets congrats, loser gets result notification
  - `generateNextRound` -> all active players notified of new pairings
- **Frontend: Notification permission request** on RegisterPage after successful registration
- **Frontend: Polling hook** (`useNotifications`) that polls every 15s for the registered player, shows browser Notification API popups for new notifications
- **Frontend: Admin Notifications Tab** inside each tournament panel with:
  - Toggle switches for each notification type (match result, next round, tournament start)
  - Manual broadcast form (title + message + Send button)
  - Notification log table (time, type, message, recipients)

### Modify
- `startTournament`, `recordMatchResult`, `generateNextRound` -- add notification creation calls internally
- RegisterPage -- add notification permission request after registration success
- AdminPage -- add Notifications tab alongside existing tabs

### Remove
- Nothing removed

## Implementation Plan
1. Add `Notification`, `NotificationSettings` types and stable storage maps to backend
2. Add notification creation helper function in backend
3. Wire notification creation into `startTournament`, `recordMatchResult`, `generateNextRound`
4. Add public query/update methods for notifications and settings
5. Frontend: `useNotifications` hook -- polls backend, triggers browser Notification API, tracks shown IDs in localStorage
6. Frontend: Permission request component on RegisterPage
7. Frontend: Notifications tab in AdminPage with toggles, broadcast form, log table
