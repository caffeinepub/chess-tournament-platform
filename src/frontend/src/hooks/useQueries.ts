import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { type Tournament, type Player, type Round, type Match, TournamentStatus } from "../backend.d";
import { createActorWithConfig } from "../config";

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const queryKeys = {
  tournaments: ["tournaments"] as const,
  tournament: (id: string) => ["tournament", id] as const,
  players: (tournamentId: string) => ["players", tournamentId] as const,
  currentRound: (tournamentId: string) => ["currentRound", tournamentId] as const,
  rounds: (tournamentId: string) => ["rounds", tournamentId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useGetAllTournaments() {
  const { actor, isFetching } = useActor();
  return useQuery<Tournament[]>({
    queryKey: queryKeys.tournaments,
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTournaments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTournament(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Tournament | null>({
    queryKey: queryKeys.tournament(id),
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getTournament(id);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
    refetchInterval: 10_000,
  });
}

export function useGetPlayers(tournamentId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Player[]>({
    queryKey: queryKeys.players(tournamentId),
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPlayersByTournament(tournamentId);
    },
    enabled: !!actor && !isFetching && !!tournamentId,
    refetchInterval: 8_000,
  });
}

export function useGetCurrentRound(tournamentId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Round | null>({
    queryKey: queryKeys.currentRound(tournamentId),
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCurrentRound(tournamentId);
    },
    enabled: !!actor && !isFetching && !!tournamentId,
    refetchInterval: 8_000,
  });
}

export function useGetRounds(tournamentId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Round[]>({
    queryKey: queryKeys.rounds(tournamentId),
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRoundsByTournament(tournamentId);
    },
    enabled: !!actor && !isFetching && !!tournamentId,
    refetchInterval: 10_000,
  });
}

// ─── Anonymous queries (for public pages) ────────────────────────────────────

export function useGetTournamentPublic(id: string) {
  return useQuery<Tournament | null>({
    queryKey: ["public", "tournament", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const actor = await createActorWithConfig();
        return await actor.getTournament(id);
      } catch {
        return null;
      }
    },
    enabled: !!id,
    refetchInterval: 8_000,
  });
}

export function useGetPlayersPublic(tournamentId: string) {
  return useQuery<Player[]>({
    queryKey: ["public", "players", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const actor = await createActorWithConfig();
      return actor.getPlayersByTournament(tournamentId);
    },
    enabled: !!tournamentId,
    refetchInterval: 8_000,
  });
}

export function useGetCurrentRoundPublic(tournamentId: string) {
  return useQuery<Round | null>({
    queryKey: ["public", "currentRound", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      const actor = await createActorWithConfig();
      return actor.getCurrentRound(tournamentId);
    },
    enabled: !!tournamentId,
    refetchInterval: 8_000,
  });
}

export function useGetRoundsPublic(tournamentId: string) {
  return useQuery<Round[]>({
    queryKey: ["public", "rounds", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const actor = await createActorWithConfig();
      return actor.getRoundsByTournament(tournamentId);
    },
    enabled: !!tournamentId,
    refetchInterval: 10_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<Tournament, Error, string>({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.createTournament(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
  });
}

export function useStartTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<Tournament, Error, string>({
    mutationFn: async (tournamentId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.startTournament(tournamentId);
    },
    onSuccess: (_data, tournamentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentRound(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
  });
}

export function useDeleteTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (tournamentId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteTournament(tournamentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
  });
}

export function useRecordMatchResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<Match, Error, { matchId: string; winnerId: string; loserId: string; tournamentId: string }>({
    mutationFn: async ({ matchId, winnerId, loserId }) => {
      if (!actor) throw new Error("Not connected");
      return actor.recordMatchResult(matchId, winnerId, loserId);
    },
    onSuccess: async (_data, { tournamentId }) => {
      // Refresh all tournament data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.currentRound(tournamentId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.players(tournamentId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rounds(tournamentId) }),
      ]);
    },
  });
}

export function useAddPlayer() {
  const queryClient = useQueryClient();

  return useMutation<Player, Error, { tournamentId: string; name: string }>({
    mutationFn: async ({ tournamentId, name }) => {
      const actor = await createActorWithConfig();
      return actor.addPlayer(tournamentId, name);
    },
    onSuccess: (_data, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: ["public", "players", tournamentId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.players(tournamentId) });
    },
  });
}

export function useCompleteTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<Tournament, Error, { tournamentId: string; winnerId: string }>({
    mutationFn: async ({ tournamentId, winnerId }) => {
      if (!actor) throw new Error("Not connected");
      return actor.completeTournament(tournamentId, winnerId);
    },
    onSuccess: (_data, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
  });
}

export function useUpdateTournamentStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<Tournament, Error, { tournamentId: string; status: TournamentStatus }>({
    mutationFn: async ({ tournamentId, status }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateTournamentStatus(tournamentId, status);
    },
    onSuccess: (_data, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
  });
}
