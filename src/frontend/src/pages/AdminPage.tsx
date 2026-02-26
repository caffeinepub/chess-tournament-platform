import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Plus, ChevronDown, ChevronUp, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TournamentStatus, PlayerStatus, type Tournament } from "../backend.d";
import {
  useGetAllTournaments,
  useGetTournament,
  useGetPlayers,
  useGetCurrentRound,
  useCreateTournament,
  useStartTournament,
  useDeleteTournament,
  useRecordMatchResult,
  queryKeys,
} from "../hooks/useQueries";
import PlayerBadge, { getPlayerStatusLabel } from "../components/PlayerBadge";
import MatchCard from "../components/MatchCard";
import CopyLink from "../components/CopyLink";
import { useQueryClient } from "@tanstack/react-query";
import { createActorWithConfig } from "../config";
import type { Player } from "../backend.d";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TournamentStatus }) {
  const config: Record<TournamentStatus, { label: string; className: string }> = {
    [TournamentStatus.registration]: {
      label: "Registration",
      className: "bg-[oklch(0.62_0.17_250/0.2)] text-[oklch(0.72_0.17_250)] border-[oklch(0.62_0.17_250/0.3)]",
    },
    [TournamentStatus.active]: {
      label: "Active",
      className: "bg-[oklch(0.72_0.18_145/0.2)] text-[oklch(0.78_0.18_145)] border-[oklch(0.72_0.18_145/0.3)]",
    },
    [TournamentStatus.completed]: {
      label: "Completed",
      className: "bg-muted/50 text-muted-foreground border-border",
    },
  };
  const { label, className } = config[status] ?? config[TournamentStatus.registration];
  return (
    <Badge variant="outline" className={cn("text-xs font-mono uppercase tracking-wider", className)}>
      {label}
    </Badge>
  );
}

// ─── Tournament Management Panel ──────────────────────────────────────────────

function TournamentPanel({ tournamentId }: { tournamentId: string }) {
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tournament, isLoading: tLoading } = useGetTournament(tournamentId);
  const { data: players = [], isLoading: pLoading } = useGetPlayers(tournamentId);
  const { data: currentRound, isLoading: rLoading } = useGetCurrentRound(tournamentId);
  const startMutation = useStartTournament();
  const recordMutation = useRecordMatchResult();

  const playersMap = new Map(players.map((p) => [p.id, p]));
  const activePlayers = players.filter((p) => !p.eliminated);
  const origin = window.location.origin;

  const pollAfterResult = useCallback(async (tId: string, currentPlayers: Player[]) => {
    await new Promise((r) => setTimeout(r, 800));

    await Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.currentRound(tId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.tournament(tId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.players(tId) }),
    ]);

    const updatedTournament = queryClient.getQueryData<Tournament>(queryKeys.tournament(tId));
    if (updatedTournament?.status === TournamentStatus.completed) return;

    const updatedPlayers = queryClient.getQueryData<Player[]>(queryKeys.players(tId)) ?? currentPlayers;
    const stillActive = updatedPlayers.filter((p) => !p.eliminated);

    if (stillActive.length <= 1 && stillActive.length > 0) {
      const winner = stillActive[0];
      try {
        const actor = await createActorWithConfig();
        await actor.completeTournament(tId, winner.id);
        await queryClient.refetchQueries({ queryKey: queryKeys.tournament(tId) });
        toast.success(`🏆 ${winner.name} is the Champion!`);
      } catch {
        await queryClient.refetchQueries({ queryKey: queryKeys.tournament(tId) });
      }
    }
  }, [queryClient]);

  const handleRecordResult = useCallback(async (matchId: string, winnerId: string, loserId: string) => {
    if (!tournament) return;
    setLoadingMatchId(matchId);
    try {
      await recordMutation.mutateAsync({ matchId, winnerId, loserId, tournamentId: tournament.id });
      toast.success("Result recorded!");
      await pollAfterResult(tournament.id, players);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record result");
    } finally {
      setLoadingMatchId(null);
    }
  }, [tournament, recordMutation, pollAfterResult, players]);

  const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      await startMutation.mutateAsync(tournament.id);
      toast.success("Tournament started!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start tournament");
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
    return <p className="text-muted-foreground p-4 text-sm">Tournament not found.</p>;
  }

  // ─ Registration state ─
  if (tournament.status === TournamentStatus.registration) {
    return (
      <div className="space-y-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyLink url={`${origin}/register/${tournament.id}`} label="Registration Link" />
          <CopyLink url={`${origin}/view/${tournament.id}`} label="Viewer Link" />
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
            <p className="text-sm text-muted-foreground italic">No players yet. Share the registration link!</p>
          ) : (
            <div className="grid gap-1.5">
              {players.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded bg-card/50 border border-border/50"
                >
                  <span className="text-muted-foreground/50 font-mono text-xs w-5">{i + 1}.</span>
                  <span className="font-medium text-foreground">{player.name}</span>
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
          <p className="text-xs text-muted-foreground text-center">Need at least 2 players to start</p>
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
          <CopyLink url={`${origin}/view/${tournament.id}`} label="Share Results" />
        </div>
      </div>
    );
  }

  // ─ Active state ─
  const allMatchesCompleted = currentRound
    ? currentRound.matches.every((m) => m.result === "completed" || !!m.byePlayerId)
    : false;

  return (
    <div className="space-y-6 p-4">
      {currentRound ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-mono font-bold text-gold uppercase tracking-wider text-sm">
              Round {Number(currentRound.roundNumber)}
            </h4>
            {allMatchesCompleted && (
              <span className="text-xs text-player-active font-mono bg-player-active/10 px-2 py-0.5 rounded animate-pulse-gold">
                ✓ Round Complete
              </span>
            )}
          </div>
          <div className="space-y-2">
            {currentRound.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                players={playersMap}
                isAdmin
                isLoading={loadingMatchId === match.id}
                onWin={async (winnerId, loserId) => {
                  await handleRecordResult(match.id, winnerId, loserId);
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
        <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">
          Standings
        </h4>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Player</th>
                <th className="text-center p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Losses</th>
                <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...players]
                .sort((a, b) => {
                  if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
                  return Number(a.losses) - Number(b.losses);
                })
                .map((player) => (
                  <tr key={player.id} className="border-b border-border/30 last:border-0 hover:bg-card/50 transition-colors">
                    <td className="p-3">
                      <PlayerBadge player={player} showLosses={false} />
                    </td>
                    <td className="p-3 text-center font-mono text-muted-foreground">
                      {Number(player.losses)}
                    </td>
                    <td className="p-3 text-right">
                      <span className={cn(
                        "text-xs font-mono px-1.5 py-0.5 rounded uppercase",
                        player.eliminated
                          ? "bg-player-eliminated/20 text-player-eliminated"
                          : player.status === PlayerStatus.oneLoss
                          ? "bg-player-one-loss/20 text-player-one-loss"
                          : "bg-player-active/20 text-player-active"
                      )}>
                        {getPlayerStatusLabel(player)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right font-mono">
          {activePlayers.length} active · {players.length - activePlayers.length} eliminated
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
          : "border-border/50 bg-card/50 hover:border-border hover:bg-card"
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
            <p className="font-semibold text-foreground truncate">{tournament.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {new Date(Number(tournament.createdAt) / 1_000_000).toLocaleDateString()}
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
  const createFormRef = useRef<HTMLInputElement>(null);

  const { data: tournaments = [], isLoading } = useGetAllTournaments();
  const createMutation = useCreateTournament();

  const sortedTournaments = [...tournaments].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const t = await createMutation.mutateAsync(name);
      setNewName("");
      setSelectedId(t.id);
      toast.success("New tournament created!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create tournament");
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
              <p className="text-xs text-muted-foreground font-mono">Chess Tournament Platform</p>
            </div>
          </div>
          <Badge variant="outline" className="border-gold/30 text-gold font-mono text-xs">
            ♟ Double Elimination
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
            Create Tournament
          </h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              ref={createFormRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tournament name..."
              className="bg-card border-border focus:border-gold/50 font-medium flex-1"
              disabled={createMutation.isPending}
            />
            <Button
              type="submit"
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-gold text-background hover:bg-gold-light font-mono font-bold shrink-0"
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
              <p className="text-muted-foreground text-sm">No tournaments yet.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Create one above to get started.</p>
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
          © 2026. Built with{" "}
          <span className="text-gold">♥</span>{" "}
          using{" "}
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
