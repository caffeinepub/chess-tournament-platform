import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Match,
  Player,
  Round,
  Tournament,
  TournamentStatus,
} from "../backend.d";
import { createActorWithConfig } from "../config";
import { useActor } from "./useActor";

// ─── Error helpers ────────────────────────────────────────────────────────────

function isCanisterStopped(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("IC0508") ||
    msg.includes("is stopped") ||
    (msg.includes("Canister") && msg.includes("stopped"))
  );
}

function normalizeError(e: unknown): Error {
  if (isCanisterStopped(e)) {
    return new Error(
      "The backend is temporarily offline. Please refresh the page and try again in a moment.",
    );
  }
  return e instanceof Error ? e : new Error(String(e));
}

/**
 * Retries an async call up to `maxAttempts` times when a canister-stopped
 * error is detected. Uses exponential backoff: 2s, 4s, 8s, ...
 */
async function withCanisterRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isCanisterStopped(e)) throw e;
      // Exponential backoff: 2s, 4s, 8s, 16s, 32s
      const delayMs = Math.min(2000 * 2 ** attempt, 32_000);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw normalizeError(lastError);
}

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const queryKeys = {
  tournaments: ["tournaments"] as const,
  tournament: (id: string) => ["tournament", id] as const,
  players: (tournamentId: string) => ["players", tournamentId] as const,
  currentRound: (tournamentId: string) =>
    ["currentRound", tournamentId] as const,
  rounds: (tournamentId: string) => ["rounds", tournamentId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useGetAllTournaments() {
  const { actor, isFetching } = useActor();
  return useQuery<Tournament[]>({
    queryKey: queryKeys.tournaments,
    queryFn: async () => {
      if (!actor) return [];
      return withCanisterRetry(() => actor.getAllTournaments());
    },
    enabled: !!actor && !isFetching,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetTournament(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Tournament | null>({
    queryKey: queryKeys.tournament(id),
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await withCanisterRetry(() => actor.getTournament(id));
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
    refetchInterval: 10_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetPlayers(tournamentId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Player[]>({
    queryKey: queryKeys.players(tournamentId),
    queryFn: async () => {
      if (!actor) return [];
      return withCanisterRetry(() =>
        actor.getPlayersByTournament(tournamentId),
      );
    },
    enabled: !!actor && !isFetching && !!tournamentId,
    refetchInterval: 8_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetCurrentRound(tournamentId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Round | null>({
    queryKey: queryKeys.currentRound(tournamentId),
    queryFn: async () => {
      if (!actor) return null;
      return withCanisterRetry(() => actor.getCurrentRound(tournamentId));
    },
    enabled: !!actor && !isFetching && !!tournamentId,
    refetchInterval: 8_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetRounds(tournamentId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Round[]>({
    queryKey: queryKeys.rounds(tournamentId),
    queryFn: async () => {
      if (!actor) return [];
      return withCanisterRetry(() => actor.getRoundsByTournament(tournamentId));
    },
    enabled: !!actor && !isFetching && !!tournamentId,
    refetchInterval: 10_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
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
        return await withCanisterRetry(() => actor.getTournament(id));
      } catch {
        return null;
      }
    },
    enabled: !!id,
    refetchInterval: 8_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetPlayersPublic(tournamentId: string) {
  return useQuery<Player[]>({
    queryKey: ["public", "players", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const actor = await createActorWithConfig();
      return withCanisterRetry(() =>
        actor.getPlayersByTournament(tournamentId),
      );
    },
    enabled: !!tournamentId,
    refetchInterval: 8_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetCurrentRoundPublic(tournamentId: string) {
  return useQuery<Round | null>({
    queryKey: ["public", "currentRound", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      const actor = await createActorWithConfig();
      return withCanisterRetry(() => actor.getCurrentRound(tournamentId));
    },
    enabled: !!tournamentId,
    refetchInterval: 8_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetRoundsPublic(tournamentId: string) {
  return useQuery<Round[]>({
    queryKey: ["public", "rounds", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const actor = await createActorWithConfig();
      return withCanisterRetry(() => actor.getRoundsByTournament(tournamentId));
    },
    enabled: !!tournamentId,
    refetchInterval: 10_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

export function useGetAllTournamentsPublic() {
  return useQuery<Tournament[]>({
    queryKey: ["public", "tournaments"],
    queryFn: async () => {
      const actor = await createActorWithConfig();
      return withCanisterRetry(() => actor.getAllTournaments());
    },
    refetchInterval: 10_000,
    retry: (failureCount, error) => {
      if (isCanisterStopped(error)) return failureCount < 4;
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 32_000),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    Tournament,
    Error,
    { name: string; eliminationCount: bigint }
  >({
    mutationFn: async ({ name, eliminationCount }) => {
      if (!actor) throw new Error("Not connected");
      try {
        return await withCanisterRetry(() =>
          actor.createTournament(name, eliminationCount),
        );
      } catch (e) {
        throw normalizeError(e);
      }
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
      try {
        return await withCanisterRetry(() =>
          actor.startTournament(tournamentId),
        );
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: (_data, tournamentId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tournament(tournamentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.currentRound(tournamentId),
      });
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

  return useMutation<
    Match,
    Error,
    { matchId: string; winnerId: string; loserId: string; tournamentId: string }
  >({
    mutationFn: async ({ matchId, winnerId, loserId }) => {
      if (!actor) throw new Error("Not connected");
      try {
        return await withCanisterRetry(() =>
          actor.recordMatchResult(matchId, winnerId, loserId),
        );
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: async (_data, { tournamentId }) => {
      // Refresh all tournament data
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.tournament(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.currentRound(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.players(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rounds(tournamentId),
        }),
      ]);
    },
  });
}

export function useAddPlayer() {
  const queryClient = useQueryClient();

  return useMutation<Player, Error, { tournamentId: string; name: string }>({
    mutationFn: async ({ tournamentId, name }) => {
      const actor = await createActorWithConfig();
      return withCanisterRetry(() => actor.addPlayer(tournamentId, name));
    },
    onSuccess: (_data, { tournamentId }) => {
      queryClient.invalidateQueries({
        queryKey: ["public", "players", tournamentId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.players(tournamentId),
      });
    },
  });
}

export function useCreateNextRound() {
  const queryClient = useQueryClient();

  return useMutation<Round, Error, string>({
    mutationFn: async (tournamentId: string) => {
      const actor = await createActorWithConfig();
      return withCanisterRetry(() => actor.createNextRound(tournamentId));
    },
    onSuccess: (_data, tournamentId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.currentRound(tournamentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.rounds(tournamentId),
      });
    },
  });
}

export function useCompleteTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    Tournament,
    Error,
    { tournamentId: string; winnerId: string }
  >({
    mutationFn: async ({ tournamentId, winnerId }) => {
      if (!actor) throw new Error("Not connected");
      return withCanisterRetry(() =>
        actor.completeTournament(tournamentId, winnerId),
      );
    },
    onSuccess: (_data, { tournamentId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tournament(tournamentId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
  });
}

export function useUpdateTournamentStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    Tournament,
    Error,
    { tournamentId: string; status: TournamentStatus }
  >({
    mutationFn: async ({ tournamentId, status }) => {
      if (!actor) throw new Error("Not connected");
      return withCanisterRetry(() =>
        actor.updateTournamentStatus(tournamentId, status),
      );
    },
    onSuccess: (_data, { tournamentId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tournament(tournamentId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
  });
}

export function useReshuffleCurrentRound() {
  const queryClient = useQueryClient();
  return useMutation<Round, Error, string>({
    mutationFn: async (tournamentId: string) => {
      const actor = await createActorWithConfig();
      return withCanisterRetry(() => actor.reshuffleCurrentRound(tournamentId));
    },
    onSuccess: (_data, tournamentId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.currentRound(tournamentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.rounds(tournamentId),
      });
    },
  });
}

export function useUndoMatchResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<Match, Error, { matchId: string; tournamentId: string }>({
    mutationFn: async ({ matchId }) => {
      if (!actor) throw new Error("Not connected");
      return withCanisterRetry(() => actor.undoMatchResult(matchId));
    },
    onSuccess: async (_data, { tournamentId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.currentRound(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.players(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.tournament(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rounds(tournamentId),
        }),
      ]);
    },
  });
}

export function useDeletePlayer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playerId: string; tournamentId: string }>({
    mutationFn: async ({ playerId }) => {
      if (!actor) throw new Error("Not connected");
      try {
        return await withCanisterRetry(() => actor.deletePlayer(playerId));
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: async (_data, { tournamentId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.players(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.currentRound(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rounds(tournamentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.tournament(tournamentId),
        }),
      ]);
    },
  });
}
