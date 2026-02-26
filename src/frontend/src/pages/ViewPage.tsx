import { useParams } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TournamentStatus, PlayerStatus, MatchResult, type Round } from "../backend.d";
import {
  useGetTournamentPublic,
  useGetPlayersPublic,
  useGetCurrentRoundPublic,
  useGetRoundsPublic,
} from "../hooks/useQueries";
import PlayerBadge, { getPlayerStatusLabel } from "../components/PlayerBadge";
import MatchCard from "../components/MatchCard";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TournamentStatus }) {
  const config: Record<TournamentStatus, { label: string; className: string }> = {
    [TournamentStatus.registration]: {
      label: "Registration",
      className: "bg-[oklch(0.62_0.17_250/0.2)] text-[oklch(0.72_0.17_250)] border-[oklch(0.62_0.17_250/0.3)]",
    },
    [TournamentStatus.active]: {
      label: "Live",
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
      {status === TournamentStatus.active && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      )}
      {label}
    </Badge>
  );
}

// ─── Round Tab Content ────────────────────────────────────────────────────────

function RoundContent({ round, playersMap }: {
  round: Round;
  playersMap: Map<string, import("../backend.d").Player>;
}) {
  const completed = round.matches.filter((m) => m.result === MatchResult.completed || !!m.byePlayerId).length;
  const total = round.matches.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3 text-xs font-mono text-muted-foreground">
        <span>{completed}/{total} matches complete</span>
        {round.completed && (
          <span className="text-player-active">✓ Round Complete</span>
        )}
      </div>
      {round.matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          players={playersMap}
          isAdmin={false}
        />
      ))}
    </div>
  );
}

// ─── Players Section ──────────────────────────────────────────────────────────

function PlayersSection({ players }: { players: import("../backend.d").Player[] }) {
  if (players.length === 0) return null;

  const sorted = [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return Number(a.losses) - Number(b.losses);
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Players</h3>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="text-center p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Losses</th>
              <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => (
              <tr key={player.id} className="border-b border-border/30 last:border-0">
                <td className="p-3">
                  <PlayerBadge player={player} showLosses={false} />
                </td>
                <td className="p-3 text-center font-mono text-muted-foreground text-xs">
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
      <div className="text-xs text-right font-mono text-muted-foreground space-x-3">
        <span className="text-player-active">● Active: {players.filter((p) => !p.eliminated && p.status === PlayerStatus.active).length}</span>
        <span className="text-player-one-loss">● 1 Loss: {players.filter((p) => p.status === PlayerStatus.oneLoss && !p.eliminated).length}</span>
        <span className="text-player-eliminated opacity-60">● Out: {players.filter((p) => p.eliminated).length}</span>
      </div>
    </div>
  );
}

// ─── View Page ────────────────────────────────────────────────────────────────

export default function ViewPage() {
  const { id } = useParams({ from: "/view/$id" });

  const { data: tournament, isLoading: tLoading } = useGetTournamentPublic(id);
  const { data: players = [], isLoading: pLoading } = useGetPlayersPublic(id);
  const { data: currentRound } = useGetCurrentRoundPublic(id);
  const { data: rounds = [], isLoading: rLoading } = useGetRoundsPublic(id);

  const playersMap = new Map(players.map((p) => [p.id, p]));
  const isLoading = tLoading || pLoading || rLoading;

  if (isLoading && !tournament) {
    return (
      <div className="min-h-screen chess-bg-subtle flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-mono">Loading tournament...</span>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen chess-bg-subtle flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="text-5xl block opacity-30">♜</span>
          <p className="text-muted-foreground font-mono">Tournament not found</p>
          <p className="text-xs text-muted-foreground/60">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen chess-bg-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl text-gold">♚</span>
            <div>
              <h1 className="font-bold text-lg text-foreground truncate max-w-[200px] sm:max-w-none">
                {tournament.name}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">Tournament Bracket</p>
            </div>
          </div>
          <StatusBadge status={tournament.status} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Registration state */}
        {tournament.status === TournamentStatus.registration && (
          <div className="space-y-6">
            <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
              <span className="text-4xl block mb-3 animate-float">♟</span>
              <h2 className="font-bold text-foreground text-lg mb-1">Registration Open</h2>
              <p className="text-muted-foreground text-sm">
                Tournament hasn&apos;t started yet. Check back soon!
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                {players.length} player{players.length !== 1 ? "s" : ""} registered
              </p>
            </div>

            {players.length > 0 && (
              <div>
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  Registered Players
                </h3>
                <div className="grid gap-1.5 sm:grid-cols-2">
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
              </div>
            )}
          </div>
        )}

        {/* Active state */}
        {tournament.status === TournamentStatus.active && (
          <div className="space-y-8">
            {/* Current round highlight */}
            {currentRound && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-mono font-bold text-gold uppercase tracking-wider text-sm">
                    ⚔ Round {Number(currentRound.roundNumber)} — Current
                  </h2>
                  <span className="text-xs text-muted-foreground font-mono">
                    {currentRound.matches.filter((m) => m.result === MatchResult.completed || !!m.byePlayerId).length}/
                    {currentRound.matches.length} done
                  </span>
                </div>
                <div className="space-y-2">
                  {currentRound.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      players={playersMap}
                      isAdmin={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All rounds tabs */}
            {rounds.length > 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  Match History
                </h3>
                <Tabs defaultValue={`round-${rounds.length}`}>
                  <TabsList className="bg-muted/30 border border-border h-auto flex-wrap gap-1 p-1">
                    {[...rounds]
                      .sort((a, b) => Number(a.roundNumber) - Number(b.roundNumber))
                      .map((round) => (
                        <TabsTrigger
                          key={round.roundNumber}
                          value={`round-${Number(round.roundNumber)}`}
                          className="font-mono text-xs data-[state=active]:bg-gold data-[state=active]:text-background"
                        >
                          R{Number(round.roundNumber)}
                          {round.completed && " ✓"}
                        </TabsTrigger>
                      ))}
                  </TabsList>
                  {[...rounds]
                    .sort((a, b) => Number(a.roundNumber) - Number(b.roundNumber))
                    .map((round) => (
                      <TabsContent
                        key={round.roundNumber}
                        value={`round-${Number(round.roundNumber)}`}
                        className="mt-3"
                      >
                        <RoundContent round={round} playersMap={playersMap} />
                      </TabsContent>
                    ))}
                </Tabs>
              </div>
            )}

            <PlayersSection players={players} />
          </div>
        )}

        {/* Completed state */}
        {tournament.status === TournamentStatus.completed && (
          <div className="space-y-8">
            {/* Champion banner */}
            <div className="text-center py-12 rounded-xl border border-gold/30 bg-gold/5 relative overflow-hidden scanlines">
              <div className="relative z-10 space-y-3">
                <div className="text-6xl animate-float">♛</div>
                <h2 className="text-3xl font-bold gold-shimmer uppercase tracking-widest">
                  Champion
                </h2>
                {tournament.winner && (
                  <div className="space-y-1">
                    {(() => {
                      const winner = players.find((p) => p.id === tournament.winner);
                      const winnerName = winner?.name ?? tournament.winner;
                      return (
                        <p className="text-4xl font-bold text-gold drop-shadow-lg">{winnerName}</p>
                      );
                    })()}
                  </div>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-4">
                  ♟ Double Elimination Champion ♟
                </p>
              </div>
              {/* Decorative corners */}
              <div className="absolute top-4 left-4 text-gold/20 text-2xl">♜</div>
              <div className="absolute top-4 right-4 text-gold/20 text-2xl">♜</div>
              <div className="absolute bottom-4 left-4 text-gold/20 text-2xl">♟</div>
              <div className="absolute bottom-4 right-4 text-gold/20 text-2xl">♟</div>
            </div>

            {/* Full match history */}
            {rounds.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  Full Match History
                </h3>
                <Tabs defaultValue="round-1">
                  <TabsList className="bg-muted/30 border border-border h-auto flex-wrap gap-1 p-1">
                    {[...rounds]
                      .sort((a, b) => Number(a.roundNumber) - Number(b.roundNumber))
                      .map((round) => (
                        <TabsTrigger
                          key={round.roundNumber}
                          value={`round-${Number(round.roundNumber)}`}
                          className="font-mono text-xs data-[state=active]:bg-gold data-[state=active]:text-background"
                        >
                          Round {Number(round.roundNumber)}
                        </TabsTrigger>
                      ))}
                  </TabsList>
                  {[...rounds]
                    .sort((a, b) => Number(a.roundNumber) - Number(b.roundNumber))
                    .map((round) => (
                      <TabsContent
                        key={round.roundNumber}
                        value={`round-${Number(round.roundNumber)}`}
                        className="mt-3"
                      >
                        <RoundContent round={round} playersMap={playersMap} />
                      </TabsContent>
                    ))}
                </Tabs>
              </div>
            )}

            <PlayersSection players={players} />
          </div>
        )}
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
