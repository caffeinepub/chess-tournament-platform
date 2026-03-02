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
    losses: bigint;
    eliminated: boolean;
    tournamentId: string;
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
    completeTournament(tournamentId: string, winner: string): Promise<Tournament>;
    createNextRound(tournamentId: string): Promise<Round>;
    createTournament(name: string, eliminationCount: bigint | null): Promise<Tournament>;
    deleteTournament(tournamentId: string): Promise<void>;
    getAllTournaments(): Promise<Array<Tournament>>;
    getCurrentRound(tournamentId: string): Promise<Round | null>;
    getPlayersByTournament(tournamentId: string): Promise<Array<Player>>;
    getRoundsByTournament(tournamentId: string): Promise<Array<Round>>;
    getTournament(id: string): Promise<Tournament>;
    recordMatchResult(matchId: string, winnerId: string, loserId: string): Promise<Match>;
    reshuffleCurrentRound(tournamentId: string): Promise<Round>;
    startTournament(tournamentId: string): Promise<Tournament>;
    updateTournamentStatus(tournamentId: string, status: TournamentStatus): Promise<Tournament>;
}
