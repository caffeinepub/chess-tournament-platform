import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Dices,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PlayerStatus,
  type Round,
  type Tournament,
  TournamentStatus,
} from "../backend.d";
import type { Player } from "../backend.d";
import CopyLink from "../components/CopyLink";
import MatchCard from "../components/MatchCard";
import PlayerBadge, { getPlayerStatusLabel } from "../components/PlayerBadge";
import { createActorWithConfig } from "../config";
import {
  queryKeys,
  useCreateNextRound,
  useCreateTournament,
  useDeleteTournament,
  useGetAllTournaments,
  useGetCurrentRound,
  useGetPlayers,
  useGetTournament,
  useRecordMatchResult,
  useReshuffleCurrentRound,
  useStartTournament,
  useUndoMatchResult,
} from "../hooks/useQueries";

// ─── Winner History ───────────────────────────────────────────────────────────

function WinnerHistoryItem({
  tournament,
  rank,
}: {
  tournament: Tournament;
  rank: number;
}) {
  const { data: players = [] } = useGetPlayers(tournament.id);

  const winnerName = (() => {
    if (!tournament.winner) return "Unknown";
    const found = players.find((p) => p.id === tournament.winner);
    return found?.name ?? tournament.winner;
  })();

  const dateStr = new Date(
    Number(tournament.createdAt) / 1_000_000,
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card/70 hover:border-gold/30 transition-all group">
      {/* rank */}
      <span className="text-xs font-mono text-muted-foreground/50 w-5 shrink-0 text-right">
        {rank}.
      </span>

      {/* trophy */}
      <span className="text-gold text-base shrink-0 group-hover:scale-110 transition-transform">
        ♛
      </span>

      {/* tournament name */}
      <span className="font-semibold text-foreground text-sm truncate flex-1">
        {tournament.name}
      </span>

      {/* winner badge */}
      <span className="flex items-center gap-1.5 bg-gold/10 border border-gold/25 text-gold text-xs font-mono px-2.5 py-1 rounded-full shrink-0">
        <span className="text-gold/60">Winner:</span>
        <span className="font-bold">{winnerName}</span>
      </span>

      {/* date */}
      <span className="text-xs font-mono text-muted-foreground/60 shrink-0 hidden sm:block">
        {dateStr}
      </span>
    </div>
  );
}

function WinnerHistory({ tournaments }: { tournaments: Tournament[] }) {
  const completed = [...tournaments]
    .filter((t) => t.status === TournamentStatus.completed)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

  if (completed.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
          ♛ Winner History
        </h2>
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border/40 rounded-lg gap-2">
          <span className="text-4xl opacity-20">♛</span>
          <p className="text-sm text-muted-foreground/60 font-mono">
            No completed tournaments yet.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
          ♛ Winner History
        </h2>
        <span className="text-xs font-mono text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded">
          {completed.length} champion{completed.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-2">
        {completed.map((t, i) => (
          <WinnerHistoryItem key={t.id} tournament={t} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TournamentStatus }) {
  const config: Record<TournamentStatus, { label: string; className: string }> =
    {
      [TournamentStatus.registration]: {
        label: "Registration",
        className:
          "bg-[oklch(0.62_0.17_250/0.2)] text-[oklch(0.72_0.17_250)] border-[oklch(0.62_0.17_250/0.3)]",
      },
      [TournamentStatus.active]: {
        label: "Active",
        className:
          "bg-[oklch(0.72_0.18_145/0.2)] text-[oklch(0.78_0.18_145)] border-[oklch(0.72_0.18_145/0.3)]",
      },
      [TournamentStatus.completed]: {
        label: "Completed",
        className: "bg-muted/50 text-muted-foreground border-border",
      },
    };
  const { label, className } =
    config[status] ?? config[TournamentStatus.registration];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-mono uppercase tracking-wider", className)}
    >
      {label}
    </Badge>
  );
}

// ─── Tournament Management Panel ──────────────────────────────────────────────

function TournamentPanel({ tournamentId }: { tournamentId: string }) {
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const [undoingMatchId, setUndoingMatchId] = useState<string | null>(null);
  const [manualShuffleEnabled, setManualShuffleEnabled] = useState(false);
  const queryClient = useQueryClient();

  const { data: tournament, isLoading: tLoading } =
    useGetTournament(tournamentId);
  const { data: players = [], isLoading: pLoading } =
    useGetPlayers(tournamentId);
  const { data: currentRound, isLoading: rLoading } =
    useGetCurrentRound(tournamentId);
  const startMutation = useStartTournament();
  const recordMutation = useRecordMatchResult();
  const undoMutation = useUndoMatchResult();
  const createNextRoundMutation = useCreateNextRound();
  const reshuffleMutation = useReshuffleCurrentRound();

  const playersMap = new Map(players.map((p) => [p.id, p]));
  const activePlayers = players.filter((p) => !p.eliminated);
  const origin = window.location.origin;

  const pollAfterResult = useCallback(
    async (tId: string, currentPlayers: Player[]) => {
      await new Promise((r) => setTimeout(r, 800));

      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.currentRound(tId) }),
        queryClient.refetchQueries({ queryKey: queryKeys.tournament(tId) }),
        queryClient.refetchQueries({ queryKey: queryKeys.players(tId) }),
      ]);

      const updatedTournament = queryClient.getQueryData<Tournament>(
        queryKeys.tournament(tId),
      );
      if (updatedTournament?.status === TournamentStatus.completed) return;

      const updatedPlayers =
        queryClient.getQueryData<Player[]>(queryKeys.players(tId)) ??
        currentPlayers;
      const stillActive = updatedPlayers.filter((p) => !p.eliminated);

      if (stillActive.length <= 1 && stillActive.length > 0) {
        // Last player standing — complete the tournament
        const winner = stillActive[0];
        try {
          const actor = await createActorWithConfig();
          await actor.completeTournament(tId, winner.id);
          await queryClient.refetchQueries({
            queryKey: queryKeys.tournament(tId),
          });
          toast.success(`🏆 ${winner.name} is the Champion!`);
        } catch {
          await queryClient.refetchQueries({
            queryKey: queryKeys.tournament(tId),
          });
        }
        return;
      }

      // Check if current round is completed — if so, create next round
      const currentRound = queryClient.getQueryData<Round | null>(
        queryKeys.currentRound(tId),
      );
      if (!currentRound || currentRound.completed) {
        try {
          await createNextRoundMutation.mutateAsync(tId);
          await queryClient.refetchQueries({
            queryKey: queryKeys.currentRound(tId),
          });
        } catch (e) {
          // Round creation might fail if tournament is effectively over; ignore
          console.warn("createNextRound failed:", e);
        }
      }
    },
    [queryClient, createNextRoundMutation],
  );

  const handleRecordResult = useCallback(
    async (matchId: string, winnerId: string, loserId: string) => {
      if (!tournament) return;
      setLoadingMatchId(matchId);
      try {
        await recordMutation.mutateAsync({
          matchId,
          winnerId,
          loserId,
          tournamentId: tournament.id,
        });
        toast.success("Result recorded!");
        await pollAfterResult(tournament.id, players);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to record result");
      } finally {
        setLoadingMatchId(null);
      }
    },
    [tournament, recordMutation, pollAfterResult, players],
  );

  const handleUndo = useCallback(
    async (matchId: string) => {
      if (!tournament) return;
      setUndoingMatchId(matchId);
      try {
        await undoMutation.mutateAsync({
          matchId,
          tournamentId: tournament.id,
        });
        toast.success("Result undone — select the correct winner.");
        await Promise.all([
          queryClient.refetchQueries({
            queryKey: queryKeys.currentRound(tournament.id),
          }),
          queryClient.refetchQueries({
            queryKey: queryKeys.players(tournament.id),
          }),
        ]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to undo result");
      } finally {
        setUndoingMatchId(null);
      }
    },
    [tournament, undoMutation, queryClient],
  );

  const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      await startMutation.mutateAsync(tournament.id);
      toast.success("Tournament started!");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to start tournament",
      );
    }
  };

  if (tLoading || pLoading || rLoading) {
    return (
      <div className="space-y-3 p-4">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-12 w-full bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!tournament) {
    return (
      <p className="text-muted-foreground p-4 text-sm">Tournament not found.</p>
    );
  }

  // ─ Registration state ─
  if (tournament.status === TournamentStatus.registration) {
    return (
      <div className="space-y-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyLink
            url={`${origin}/register/${tournament.id}`}
            label="Registration Link"
          />
          <CopyLink
            url={`${origin}/view/${tournament.id}`}
            label="Viewer Link"
          />
        </div>

        {/* Elimination rule info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gold/20 bg-gold/5">
          <span className="text-gold text-sm shrink-0">⚠</span>
          <p className="text-xs font-mono text-gold/80">
            Rule:{" "}
            <span className="font-bold text-gold">
              {Number(tournament.eliminationCount)} loss
              {Number(tournament.eliminationCount) !== 1 ? "es" : ""}
            </span>{" "}
            = eliminated
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              Players
            </h4>
            <span className="text-xs font-mono text-gold bg-gold/10 px-2 py-0.5 rounded">
              {players.length} registered
            </span>
          </div>
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No players yet. Share the registration link!
            </p>
          ) : (
            <div className="grid gap-1.5">
              {players.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded bg-card/50 border border-border/50"
                >
                  <span className="text-muted-foreground/50 font-mono text-xs w-5">
                    {i + 1}.
                  </span>
                  <span className="font-medium text-foreground">
                    {player.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleStartTournament}
          disabled={players.length < 2 || startMutation.isPending}
          className="w-full bg-gold text-background hover:bg-gold-light font-mono font-bold uppercase tracking-wider"
        >
          {startMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>♟ Start Tournament</>
          )}
        </Button>
        {players.length < 2 && (
          <p className="text-xs text-muted-foreground text-center">
            Need at least 2 players to start
          </p>
        )}
      </div>
    );
  }

  // ─ Completed state ─
  if (tournament.status === TournamentStatus.completed) {
    const winner = tournament.winner ? playersMap.get(tournament.winner) : null;
    const winnerName = winner?.name ?? tournament.winner ?? "Unknown";

    return (
      <div className="p-6 text-center space-y-4">
        <div className="space-y-1">
          <p className="text-4xl animate-float">♛</p>
          <h3 className="text-2xl font-bold gold-shimmer">Champion</h3>
          <p className="text-3xl font-bold text-gold mt-2">{winnerName}</p>
        </div>
        <div className="pt-4 border-t border-border/50">
          <CopyLink
            url={`${origin}/view/${tournament.id}`}
            label="Share Results"
          />
        </div>
      </div>
    );
  }

  // ─ Active state ─
  const allMatchesCompleted = currentRound
    ? currentRound.matches.every(
        (m) => m.result === "completed" || !!m.byePlayerId,
      )
    : false;

  const hasAnyCompletedMatch = currentRound
    ? currentRound.matches.some(
        (m) => m.result === "completed" && !m.byePlayerId,
      )
    : false;

  const isDiceDisabled =
    !manualShuffleEnabled ||
    reshuffleMutation.isPending ||
    hasAnyCompletedMatch;

  const handleReshuffle = async () => {
    if (!tournament) return;
    try {
      await reshuffleMutation.mutateAsync(tournament.id);
      toast.success("Matchups reshuffled!");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to reshuffle matchups",
      );
    }
  };

  return (
    <div className="space-y-6 p-4">
      {currentRound ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left side: round heading + dice button */}
            <div className="flex items-center gap-2.5 min-w-0">
              <h4 className="font-mono font-bold text-gold uppercase tracking-wider text-sm shrink-0">
                Round {Number(currentRound.roundNumber)}
              </h4>
              <button
                type="button"
                onClick={handleReshuffle}
                disabled={isDiceDisabled}
                title="Reshuffle matchups"
                aria-label="Reshuffle matchups"
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg border transition-all duration-200 shrink-0",
                  isDiceDisabled
                    ? "border-border/30 text-muted-foreground/30 cursor-not-allowed bg-card/20"
                    : "border-gold/50 text-gold bg-gold/10 hover:bg-gold/20 hover:border-gold hover:shadow-[0_0_12px_oklch(0.82_0.15_85/0.35)] active:scale-95 cursor-pointer",
                )}
              >
                {reshuffleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Dices className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Right side: manual override toggle + round complete badge */}
            <div className="flex items-center gap-3 shrink-0">
              {allMatchesCompleted && (
                <span className="text-xs text-player-active font-mono bg-player-active/10 px-2 py-0.5 rounded animate-pulse-gold">
                  ✓ Round Complete
                </span>
              )}
              <div className="flex items-center gap-2 border border-border/30 rounded-lg px-2.5 py-1.5 bg-card/30">
                <Switch
                  id={`manual-shuffle-${tournamentId}`}
                  checked={manualShuffleEnabled}
                  onCheckedChange={setManualShuffleEnabled}
                  className="scale-75 data-[state=checked]:bg-gold"
                />
                <div className="flex flex-col gap-0">
                  <Label
                    htmlFor={`manual-shuffle-${tournamentId}`}
                    className="text-xs font-mono text-muted-foreground cursor-pointer leading-none"
                  >
                    Manual Reshuffle
                  </Label>
                  <span
                    className={cn(
                      "text-[10px] font-mono leading-none mt-0.5",
                      manualShuffleEnabled
                        ? "text-gold/70"
                        : "text-muted-foreground/50",
                    )}
                  >
                    {manualShuffleEnabled
                      ? "Manual override active"
                      : "System auto-shuffles each round"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {currentRound.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                players={playersMap}
                isAdmin
                isLoading={loadingMatchId === match.id}
                isUndoLoading={undoingMatchId === match.id}
                onWin={async (winnerId, loserId) => {
                  await handleRecordResult(match.id, winnerId, loserId);
                }}
                onUndo={async () => {
                  await handleUndo(match.id);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground text-sm p-4 rounded-lg border border-border/50 bg-card/30">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading round data...</span>
        </div>
      )}

      {/* Player standings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Standings
          </h4>
          <span className="text-[10px] font-mono text-gold/50 bg-gold/8 border border-gold/15 px-1.5 py-0.5 rounded whitespace-nowrap">
            {Number(tournament.eliminationCount)} loss
            {Number(tournament.eliminationCount) !== 1 ? "es" : ""} = out
          </span>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  Player
                </th>
                <th className="text-center p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  Losses
                </th>
                <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {[...players]
                .sort((a, b) => {
                  if (a.eliminated !== b.eliminated)
                    return a.eliminated ? 1 : -1;
                  return Number(a.losses) - Number(b.losses);
                })
                .map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-border/30 last:border-0 hover:bg-card/50 transition-colors"
                  >
                    <td className="p-3">
                      <PlayerBadge player={player} showLosses={false} />
                    </td>
                    <td className="p-3 text-center font-mono text-muted-foreground">
                      {Number(player.losses)}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={cn(
                          "text-xs font-mono px-1.5 py-0.5 rounded uppercase",
                          player.eliminated
                            ? "bg-player-eliminated/20 text-player-eliminated"
                            : player.status === PlayerStatus.oneLoss
                              ? "bg-player-one-loss/20 text-player-one-loss"
                              : "bg-player-active/20 text-player-active",
                        )}
                      >
                        {getPlayerStatusLabel(player)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right font-mono">
          {activePlayers.length} active ·{" "}
          {players.length - activePlayers.length} eliminated
        </p>
      </div>

      <CopyLink url={`${origin}/view/${tournament.id}`} label="Viewer Link" />
    </div>
  );
}

// ─── Tournament Item ──────────────────────────────────────────────────────────

function TournamentItem({
  tournament,
  isSelected,
  onSelect,
}: {
  tournament: Tournament;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const deleteMutation = useDeleteTournament();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${tournament.name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(tournament.id);
      toast.success("Tournament deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isSelected
          ? "border-gold/50 bg-card shadow-gold"
          : "border-border/50 bg-card/50 hover:border-border hover:bg-card",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(tournament.id)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-gold text-lg shrink-0">♞</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {tournament.name}
              </p>
              {tournament.status !== TournamentStatus.completed && (
                <span className="text-[10px] font-mono text-gold/60 bg-gold/8 border border-gold/20 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                  {Number(tournament.eliminationCount)} loss
                  {Number(tournament.eliminationCount) !== 1 ? "es" : ""} = out
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {new Date(
                Number(tournament.createdAt) / 1_000_000,
              ).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <StatusBadge status={tournament.status} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
          <a
            href={`/view/${tournament.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-gold transition-colors p-1 rounded hover:bg-gold/10"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {isSelected ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isSelected && (
        <div className="border-t border-border/50">
          <TournamentPanel tournamentId={tournament.id} />
        </div>
      )}
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [eliminationCount, setEliminationCount] = useState(2);
  const createFormRef = useRef<HTMLInputElement>(null);

  const { data: tournaments = [], isLoading } = useGetAllTournaments();
  const createMutation = useCreateTournament();

  const sortedTournaments = [...tournaments].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const t = await createMutation.mutateAsync({
        name,
        eliminationCount: BigInt(eliminationCount),
      });
      setNewName("");
      setEliminationCount(2);
      setSelectedId(t.id);
      toast.success("New tournament created!");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create tournament",
      );
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen chess-bg-subtle">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-gold animate-float">♔</span>
            <div>
              <h1 className="font-bold text-xl gold-text">Admin Panel</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Chess Tournament Platform
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-gold/30 text-gold font-mono text-xs"
          >
            ♟ Double Elimination
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <WinnerHistory tournaments={tournaments} />

        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
            Create Tournament
          </h2>
          <form
            onSubmit={handleCreate}
            className="flex gap-3 flex-wrap sm:flex-nowrap"
          >
            <Input
              ref={createFormRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tournament name..."
              className="bg-card border-border focus:border-gold/50 font-medium flex-1 min-w-0"
              disabled={createMutation.isPending}
            />
            <div className="flex flex-col gap-1 shrink-0">
              <Label
                htmlFor="elimination-count"
                className="text-xs font-mono text-muted-foreground whitespace-nowrap"
              >
                Losses to Eliminate
              </Label>
              <Input
                id="elimination-count"
                type="number"
                min={1}
                max={5}
                value={eliminationCount}
                onChange={(e) =>
                  setEliminationCount(
                    Math.min(5, Math.max(1, Number(e.target.value))),
                  )
                }
                className="bg-card border-border focus:border-gold/50 font-mono text-center w-20"
                disabled={createMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-gold text-background hover:bg-gold-light font-mono font-bold shrink-0 self-end"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Create</span>
            </Button>
          </form>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
              Tournaments
            </h2>
            {tournaments.length > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                {tournaments.length} total
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {["sk1", "sk2", "sk3"].map((key) => (
                <Skeleton key={key} className="h-16 w-full bg-card/50" />
              ))}
            </div>
          ) : sortedTournaments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border/50 rounded-lg">
              <span className="text-4xl block mb-3 opacity-30">♜</span>
              <p className="text-muted-foreground text-sm">
                No tournaments yet.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Create one above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTournaments.map((t) => (
                <TournamentItem
                  key={t.id}
                  tournament={t}
                  isSelected={selectedId === t.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border/30 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground/50 font-mono">
          © 2026. Built with <span className="text-gold">♥</span> using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-gold transition-colors underline-offset-2 hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
