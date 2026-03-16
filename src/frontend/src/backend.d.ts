import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Player {
    id: string;
    status: PlayerStatus;
    name: string;
    wins: bigint;
    losses: bigint;
    eliminated: boolean;
    rating: bigint;
    disqualified: boolean;
    tournamentId: string;
}
export interface NotificationSettings {
    nextRoundEnabled: boolean;
    tournamentStartEnabled: boolean;
    matchResultEnabled: boolean;
}
export interface Tournament {
    id: string;
    status: TournamentStatus;
    eliminationCount: bigint;
    name: string;
    createdAt: bigint;
    winner?: string;
}
export interface Round {
    completed: boolean;
    matches: Array<Match>;
    roundNumber: bigint;
    tournamentId: string;
}
export interface Match {
    id: string;
    player1Id: string;
    player2Id: string;
    result: MatchResult;
    winnerId?: string;
    loserId?: string;
    player2Name: string;
    byePlayerId?: string;
    roundNumber: bigint;
    tournamentId: string;
    player1Name: string;
}
export interface NotificationView {
    id: string;
    title: string;
    notifType: string;
    body: string;
    createdAt: bigint;
    targetPlayerName?: string;
    tournamentId: string;
    readByPlayerNames: Array<string>;
}
export enum MatchResult {
    pending = "pending",
    completed = "completed"
}
export enum PlayerStatus {
    active = "active",
    oneLoss = "oneLoss",
    eliminated = "eliminated"
}
export enum TournamentStatus {
    active = "active",
    registration = "registration",
    completed = "completed"
}
export interface backendInterface {
    addPlayer(tournamentId: string, name: string): Promise<Player>;
    broadcastNotification(tournamentId: string, title: string, body: string): Promise<void>;
    changePlayerName(playerId: string, newName: string): Promise<Player>;
    changePlayerRating(playerId: string, rating: bigint): Promise<Player>;
    completeTournament(tournamentId: string, winner: string): Promise<Tournament>;
    createNextRound(tournamentId: string): Promise<Round>;
    createTournament(name: string, eliminationCount: bigint | null): Promise<Tournament>;
    deletePlayer(playerId: string): Promise<void>;
    deleteTournament(tournamentId: string): Promise<void>;
    disqualifyPlayer(playerId: string): Promise<void>;
    getAllTournaments(): Promise<Array<Tournament>>;
    getCurrentRound(tournamentId: string): Promise<Round | null>;
    getNotificationLog(tournamentId: string): Promise<Array<NotificationView>>;
    getNotificationSettings(tournamentId: string): Promise<NotificationSettings>;
    getNotificationsForPlayer(tournamentId: string, playerName: string): Promise<Array<NotificationView>>;
    getPlayersByTournament(tournamentId: string): Promise<Array<Player>>;
    getRoundsByTournament(tournamentId: string): Promise<Array<Round>>;
    getTournament(id: string): Promise<Tournament>;
    markNotificationsRead(tournamentId: string, playerName: string, notifIds: Array<string>): Promise<void>;
    recordMatchResult(matchId: string, winnerId: string, loserId: string): Promise<Match>;
    reshuffleCurrentRound(tournamentId: string): Promise<Round>;
    startTournament(tournamentId: string): Promise<Tournament>;
    undoMatchResult(matchId: string): Promise<Match>;
    updateNotificationSettings(tournamentId: string, matchResultEnabled: boolean, nextRoundEnabled: boolean, tournamentStartEnabled: boolean): Promise<void>;
    updateTournamentStatus(tournamentId: string, status: TournamentStatus): Promise<Tournament>;
}
