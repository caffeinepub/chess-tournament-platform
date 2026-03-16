import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronUp,
  Dices,
  Edit2,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Star,
  Trash2,
  UserX,
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
  useAddPlayerAdmin,
  useBroadcastNotification,
  useChangePlayerName,
  useChangePlayerRating,
  useCreateNextRound,
  useCreateTournament,
  useDeletePlayer,
  useDeleteTournament,
  useDisqualifyPlayer,
  useGetAllTournaments,
  useGetCurrentRound,
  useGetNotificationLog,
  useGetNotificationSettings,
  useGetPlayers,
  useGetRounds,
  useGetTournament,
  useRecordMatchResult,
  useReshuffleCurrentRound,
  useStartTournament,
  useUndoMatchResult,
  useUpdateNotificationSettings,
} from "../hooks/useQueries";

// ─── Canister Offline Banner ──────────────────────────────────────────────────

function CanisterOfflineBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg mb-6"
      style={{
        background: "oklch(0.12 0.04 30 / 0.6)",
        border: "1px solid oklch(0.55 0.18 30 / 0.5)",
      }}
      data-ocid="admin.canister_offline.error_state"
    >
      <AlertTriangle
        className="h-4 w-4 shrink-0 mt-0.5"
        style={{ color: "oklch(0.75 0.20 50)" }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: "oklch(0.85 0.15 50)" }}
        >
          Backend temporarily offline
        </p>
        <p
          className="text-xs mt-0.5 font-mono"
          style={{ color: "oklch(0.62 0.10 50)" }}
        >
          The backend is restarting. Click Retry to reconnect — it will
          auto-recover within a few seconds.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded shrink-0 transition-all"
        style={{
          color: "oklch(0.85 0.15 50)",
          border: "1px solid oklch(0.55 0.18 30 / 0.5)",
          background: "oklch(0.15 0.05 30 / 0.4)",
        }}
        data-ocid="admin.canister_offline.button"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

// ─── Smoke background particles (same as RegisterPage) ───────────────────────

function SmokeParticles() {
  const smokes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + i * 11}%`,
    bottom: `${5 + (i % 4) * 5}%`,
    size: 40 + (i % 3) * 20,
    delay: (i % 4) * 1.0,
    duration: 5 + (i % 3) * 2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {smokes.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.left,
            bottom: s.bottom,
            width: s.size,
            height: s.size,
            background: "oklch(0.35 0.08 145 / 0.08)",
            filter: "blur(20px)",
            animation: `smoke-rise ${s.duration}s ease-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

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
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-card/40 transition-all group"
      style={{
        borderColor: "oklch(0.25 0.08 145 / 0.4)",
        background: "oklch(0.10 0.02 145 / 0.5)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "oklch(0.42 0.18 145 / 0.5)";
        (e.currentTarget as HTMLDivElement).style.background =
          "oklch(0.13 0.04 145 / 0.7)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "oklch(0.25 0.08 145 / 0.4)";
        (e.currentTarget as HTMLDivElement).style.background =
          "oklch(0.10 0.02 145 / 0.5)";
      }}
    >
      {/* rank */}
      <span className="text-xs font-mono text-muted-foreground/50 w-5 shrink-0 text-right">
        {rank}.
      </span>

      {/* trophy */}
      <span
        className="text-base shrink-0 group-hover:scale-110 transition-transform"
        style={{
          color: "oklch(0.72 0.28 145)",
          filter: "drop-shadow(0 0 8px oklch(0.72 0.28 145 / 0.7))",
        }}
      >
        ♛
      </span>

      {/* tournament name */}
      <span className="font-semibold text-foreground text-sm truncate flex-1">
        {tournament.name}
      </span>

      {/* winner badge */}
      <span
        className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full shrink-0"
        style={{
          background: "oklch(0.10 0.04 145 / 0.5)",
          border: "1px solid oklch(0.35 0.14 145 / 0.4)",
          color: "oklch(0.72 0.22 145)",
        }}
      >
        <span style={{ color: "oklch(0.45 0.10 145)" }}>Winner:</span>
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
        <h2
          className="text-sm font-mono uppercase tracking-widest mb-4"
          style={{ color: "oklch(0.45 0.12 145)" }}
        >
          ♛ Winner History
        </h2>
        <div
          className="flex flex-col items-center justify-center py-10 rounded-lg gap-2"
          style={{
            border: "1px dashed oklch(0.28 0.08 145 / 0.5)",
            background: "oklch(0.09 0.02 145 / 0.3)",
          }}
          data-ocid="admin.winner_history.empty_state"
        >
          <span
            className="text-4xl opacity-20"
            style={{ color: "oklch(0.72 0.28 145)" }}
          >
            ♛
          </span>
          <p
            className="text-sm font-mono"
            style={{ color: "oklch(0.35 0.08 145)" }}
          >
            No completed tournaments yet.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-sm font-mono uppercase tracking-widest"
          style={{ color: "oklch(0.45 0.12 145)" }}
        >
          ♛ Winner History
        </h2>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            color: "oklch(0.72 0.25 145)",
            background: "oklch(0.12 0.04 145 / 0.6)",
            border: "1px solid oklch(0.35 0.15 145 / 0.5)",
          }}
        >
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

// ─── Player Management Panel ─────────────────────────────────────────────────

function PlayerManagementPanel({
  tournamentId,
  players,
  tournament,
  onCanisterOffline,
}: {
  tournamentId: string;
  players: Player[];
  tournament: Tournament;
  onCanisterOffline: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "management" | "statistics" | "notifications"
  >("management");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [editRatingPlayerId, setEditRatingPlayerId] = useState<string | null>(
    null,
  );
  const [editRatingValue, setEditRatingValue] = useState("");
  const [addPlayerName, setAddPlayerName] = useState("");

  const { data: rounds = [] } = useGetRounds(tournamentId);
  const deletePlayerMutation = useDeletePlayer();
  const disqualifyMutation = useDisqualifyPlayer();
  const changeNameMutation = useChangePlayerName();
  const changeRatingMutation = useChangePlayerRating();
  const addPlayerMutation = useAddPlayerAdmin();

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return Number(a.losses) - Number(b.losses);
  });

  // Compute statistics
  const statsPlayers = [...players]
    .map((player) => {
      const wins = Number(player.wins);
      const losses = Number(player.losses);
      const total = wins + losses;
      const winRate = total > 0 ? (wins / total) * 100 : 0;

      // Find all opponents this player has faced
      const opponentIds: string[] = [];
      for (const round of rounds) {
        for (const match of round.matches) {
          if (match.byePlayerId) continue;
          if (match.player1Id === player.id && match.player2Id) {
            opponentIds.push(match.player2Id);
          } else if (match.player2Id === player.id && match.player1Id) {
            opponentIds.push(match.player1Id);
          }
        }
      }

      const playersMap = new Map(players.map((p) => [p.id, p]));
      let buchholzScore = 0;
      let opponentWinRateSum = 0;
      let opponentCount = 0;
      for (const oppId of opponentIds) {
        const opp = playersMap.get(oppId);
        if (!opp) continue;
        buchholzScore += Number(opp.wins);
        const oppTotal = Number(opp.wins) + Number(opp.losses);
        opponentWinRateSum += oppTotal > 0 ? Number(opp.wins) / oppTotal : 0;
        opponentCount++;
      }
      const opponentScore =
        opponentCount > 0 ? (opponentWinRateSum / opponentCount) * 100 : 0;

      return { player, wins, losses, winRate, buchholzScore, opponentScore };
    })
    .sort((a, b) => b.winRate - a.winRate);

  const isRegistration = tournament.status === TournamentStatus.registration;

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addPlayerName.trim();
    if (!name) return;
    try {
      await addPlayerMutation.mutateAsync({ tournamentId, name });
      setAddPlayerName("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("IC0508") || msg.includes("stopped"))
        onCanisterOffline();
      else toast.error(msg);
    }
  };

  const handleSaveName = async (playerId: string) => {
    const newName = editNameValue.trim();
    if (!newName) return;
    try {
      await changeNameMutation.mutateAsync({ playerId, newName, tournamentId });
      setEditingPlayerId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("IC0508") || msg.includes("stopped"))
        onCanisterOffline();
      else toast.error(msg);
    }
  };

  const handleSaveRating = async (playerId: string) => {
    const rating = Number(editRatingValue);
    if (Number.isNaN(rating) || rating < 0) return;
    try {
      await changeRatingMutation.mutateAsync({
        playerId,
        rating: BigInt(rating),
        tournamentId,
      });
      setEditRatingPlayerId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("IC0508") || msg.includes("stopped"))
        onCanisterOffline();
      else toast.error(msg);
    }
  };

  const handleDisqualify = async (player: Player) => {
    if (
      !confirm(
        `Disqualify "${player.name}"? They will be removed from the tournament.`,
      )
    )
      return;
    try {
      await disqualifyMutation.mutateAsync({
        playerId: player.id,
        tournamentId,
      });
      toast.success(`${player.name} disqualified`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("IC0508") || msg.includes("stopped"))
        onCanisterOffline();
      else toast.error(msg);
    }
  };

  const handleDelete = async (player: Player) => {
    if (
      !confirm(
        `Remove "${player.name}" from the tournament? Their pending matches will be forfeited.`,
      )
    )
      return;
    try {
      await deletePlayerMutation.mutateAsync({
        playerId: player.id,
        tournamentId,
      });
      toast.success(`${player.name} removed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("IC0508") || msg.includes("stopped"))
        onCanisterOffline();
      else toast.error(msg);
    }
  };

  const thStyle = { color: "oklch(0.42 0.10 145)" };
  const borderColor = "oklch(0.22 0.06 145 / 0.6)";

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-0 mb-4 rounded-lg overflow-hidden"
        style={{
          border: "1px solid oklch(0.22 0.06 145 / 0.5)",
          background: "oklch(0.09 0.02 145 / 0.5)",
        }}
      >
        <button
          type="button"
          data-ocid="admin.player_management.tab"
          onClick={() => setActiveTab("management")}
          className="flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-all"
          style={
            activeTab === "management"
              ? {
                  background: "oklch(0.15 0.06 145 / 0.8)",
                  color: "oklch(0.72 0.28 145)",
                  borderBottom: "2px solid oklch(0.72 0.28 145)",
                }
              : { color: "oklch(0.42 0.10 145)" }
          }
        >
          ♟ Management
        </button>
        <button
          type="button"
          data-ocid="admin.player_stats.tab"
          onClick={() => setActiveTab("statistics")}
          className="flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-all"
          style={
            activeTab === "statistics"
              ? {
                  background: "oklch(0.15 0.06 145 / 0.8)",
                  color: "oklch(0.72 0.28 145)",
                  borderBottom: "2px solid oklch(0.72 0.28 145)",
                }
              : { color: "oklch(0.42 0.10 145)" }
          }
        >
          ♜ Statistics
        </button>
        <button
          type="button"
          data-ocid="admin.notifications.tab"
          onClick={() => setActiveTab("notifications")}
          className="flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1"
          style={
            activeTab === "notifications"
              ? {
                  background: "oklch(0.15 0.06 145 / 0.8)",
                  color: "oklch(0.72 0.28 145)",
                  borderBottom: "2px solid oklch(0.72 0.28 145)",
                }
              : { color: "oklch(0.42 0.10 145)" }
          }
        >
          🔔 Notifications
        </button>
      </div>

      {activeTab === "management" && (
        <div className="space-y-4">
          {/* Add Player */}
          {isRegistration ? (
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <Input
                data-ocid="admin.add_player.input"
                value={addPlayerName}
                onChange={(e) => setAddPlayerName(e.target.value)}
                placeholder="Add player name..."
                className="flex-1 font-mono text-sm"
                style={{
                  background: "oklch(0.11 0.02 145 / 0.8)",
                  borderColor: "oklch(0.25 0.08 145 / 0.6)",
                  color: "oklch(0.90 0.10 145)",
                }}
                disabled={addPlayerMutation.isPending}
              />
              <Button
                type="submit"
                data-ocid="admin.add_player.submit_button"
                disabled={!addPlayerName.trim() || addPlayerMutation.isPending}
                className="font-mono font-bold shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.45 0.22 145), oklch(0.60 0.28 145))",
                  border: "1px solid oklch(0.68 0.25 145 / 0.6)",
                  color: "oklch(0.05 0.01 145)",
                }}
              >
                {addPlayerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </form>
          ) : (
            <p
              className="text-xs font-mono px-3 py-2 rounded"
              style={{
                color: "oklch(0.45 0.10 145)",
                background: "oklch(0.11 0.02 145 / 0.4)",
                border: "1px solid oklch(0.22 0.06 145 / 0.4)",
              }}
            >
              Registration closed — players can no longer be added.
            </p>
          )}

          {/* Player table */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: `1px solid ${borderColor}` }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor,
                    background: "oklch(0.11 0.03 145 / 0.5)",
                  }}
                >
                  <th
                    className="text-left p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Player
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Rating
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    L
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Status
                  </th>
                  <th
                    className="text-right p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, idx) => (
                  <tr
                    key={player.id}
                    className="border-b last:border-0 transition-colors"
                    style={{
                      borderColor: "oklch(0.18 0.05 145 / 0.4)",
                      opacity: player.eliminated ? 0.5 : 1,
                    }}
                  >
                    {/* Name */}
                    <td className="p-3">
                      {editingPlayerId === player.id ? (
                        <div className="flex gap-1">
                          <input
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveName(player.id);
                              if (e.key === "Escape") setEditingPlayerId(null);
                            }}
                            className="flex-1 text-sm px-2 py-1 rounded font-mono outline-none"
                            style={{
                              background: "oklch(0.13 0.04 145 / 0.8)",
                              border: "1px solid oklch(0.45 0.20 145 / 0.6)",
                              color: "oklch(0.90 0.10 145)",
                              minWidth: 0,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveName(player.id)}
                            className="text-xs px-2 py-1 rounded font-mono"
                            style={{
                              background: "oklch(0.45 0.22 145)",
                              color: "oklch(0.05 0.01 145)",
                            }}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlayerId(null)}
                            className="text-xs px-2 py-1 rounded font-mono text-muted-foreground"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <PlayerBadge player={player} showLosses={false} />
                      )}
                    </td>
                    {/* Rating */}
                    <td className="p-3 text-center font-mono text-muted-foreground">
                      {editRatingPlayerId === player.id ? (
                        <div className="flex gap-1 justify-center">
                          <input
                            type="number"
                            value={editRatingValue}
                            onChange={(e) => setEditRatingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveRating(player.id);
                              if (e.key === "Escape")
                                setEditRatingPlayerId(null);
                            }}
                            className="w-20 text-sm px-2 py-1 rounded font-mono text-center outline-none"
                            style={{
                              background: "oklch(0.13 0.04 145 / 0.8)",
                              border: "1px solid oklch(0.45 0.20 145 / 0.6)",
                              color: "oklch(0.90 0.10 145)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRating(player.id)}
                            className="text-xs px-2 py-1 rounded font-mono"
                            style={{
                              background: "oklch(0.45 0.22 145)",
                              color: "oklch(0.05 0.01 145)",
                            }}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRatingPlayerId(null)}
                            className="text-xs px-2 py-1 rounded font-mono text-muted-foreground"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span>{Number(player.rating)}</span>
                      )}
                    </td>
                    {/* Losses */}
                    <td className="p-3 text-center font-mono text-muted-foreground">
                      {Number(player.losses)}
                    </td>
                    {/* Status */}
                    <td className="p-3 text-center">
                      <span
                        className={cn(
                          "text-xs font-mono px-1.5 py-0.5 rounded uppercase",
                          player.disqualified
                            ? "bg-red-500/20 text-red-400"
                            : player.eliminated
                              ? "bg-player-eliminated/20 text-player-eliminated"
                              : player.status === PlayerStatus.oneLoss
                                ? "bg-player-one-loss/20 text-player-one-loss"
                                : "bg-player-active/20 text-player-active",
                        )}
                      >
                        {player.disqualified
                          ? "DQ"
                          : getPlayerStatusLabel(player)}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {!player.eliminated && (
                          <>
                            <button
                              type="button"
                              data-ocid={`admin.player.edit_button.${idx + 1}`}
                              title="Edit name"
                              onClick={() => {
                                setEditingPlayerId(player.id);
                                setEditNameValue(player.name);
                                setEditRatingPlayerId(null);
                              }}
                              className="p-1.5 rounded transition-colors text-muted-foreground hover:text-[oklch(0.72_0.28_145)] hover:bg-[oklch(0.15_0.06_145/0.5)]"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Edit rating"
                              onClick={() => {
                                setEditRatingPlayerId(player.id);
                                setEditRatingValue(
                                  String(Number(player.rating)),
                                );
                                setEditingPlayerId(null);
                              }}
                              className="p-1.5 rounded transition-colors text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Disqualify player"
                              onClick={() => handleDisqualify(player)}
                              disabled={disqualifyMutation.isPending}
                              className="p-1.5 rounded transition-colors text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              data-ocid={`admin.player.delete_button.${idx + 1}`}
                              title="Remove player"
                              onClick={() => handleDelete(player)}
                              disabled={deletePlayerMutation.isPending}
                              className="p-1.5 rounded transition-colors text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className="text-xs text-right font-mono"
            style={{ color: "oklch(0.40 0.08 145)" }}
          >
            {players.filter((p) => !p.eliminated).length} active ·{" "}
            {players.filter((p) => p.eliminated).length} eliminated
          </p>
        </div>
      )}

      {activeTab === "statistics" && (
        <div>
          <div
            className="rounded-lg overflow-x-auto"
            style={{ border: `1px solid ${borderColor}` }}
          >
            <table
              className="w-full text-sm"
              data-ocid="admin.player_stats.table"
            >
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor,
                    background: "oklch(0.11 0.03 145 / 0.5)",
                  }}
                >
                  <th
                    className="text-left p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Player
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    W
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    L
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Win%
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Buchholz
                  </th>
                  <th
                    className="text-center p-3 font-mono text-xs uppercase tracking-wider"
                    style={thStyle}
                  >
                    Opp%
                  </th>
                </tr>
              </thead>
              <tbody>
                {statsPlayers.map(
                  ({
                    player,
                    wins,
                    losses,
                    winRate,
                    buchholzScore,
                    opponentScore,
                  }) => (
                    <tr
                      key={player.id}
                      className="border-b last:border-0 transition-colors"
                      style={{
                        borderColor: "oklch(0.18 0.05 145 / 0.4)",
                        opacity: player.eliminated ? 0.45 : 1,
                      }}
                    >
                      <td
                        className="p-3 font-medium"
                        style={{
                          color: player.eliminated
                            ? "oklch(0.50 0.06 145)"
                            : "oklch(0.88 0.12 145)",
                        }}
                      >
                        {player.name}
                        {player.disqualified && (
                          <span className="ml-1.5 text-xs text-red-400 font-mono">
                            (DQ)
                          </span>
                        )}
                      </td>
                      <td
                        className="p-3 text-center font-mono"
                        style={{ color: "oklch(0.72 0.22 145)" }}
                      >
                        {wins}
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground">
                        {losses}
                      </td>
                      <td
                        className="p-3 text-center font-mono"
                        style={{
                          color:
                            winRate >= 70
                              ? "oklch(0.78 0.25 145)"
                              : winRate >= 50
                                ? "oklch(0.68 0.18 145)"
                                : "oklch(0.55 0.10 145)",
                        }}
                      >
                        {winRate.toFixed(0)}%
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground">
                        {buchholzScore}
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground">
                        {opponentScore.toFixed(0)}%
                      </td>
                    </tr>
                  ),
                )}
                {statsPlayers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 text-center text-muted-foreground text-sm font-mono"
                      data-ocid="admin.player_stats.empty_state"
                    >
                      No player data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p
            className="text-xs mt-2 font-mono text-right"
            style={{ color: "oklch(0.38 0.08 145)" }}
          >
            Sorted by win rate · Buchholz = sum of opponents' wins · Opp% = avg
            opponent win rate
          </p>
        </div>
      )}

      {activeTab === "notifications" && (
        <NotificationsPanel tournamentId={tournamentId} />
      )}
    </div>
  );
}

// ─── Notifications Panel ──────────────────────────────────────────────────────

function NotificationsPanel({ tournamentId }: { tournamentId: string }) {
  const { data: settings, isLoading: settingsLoading } =
    useGetNotificationSettings(tournamentId);
  const {
    data: log = [],
    refetch: refetchLog,
    isLoading: logLoading,
  } = useGetNotificationLog(tournamentId);
  const updateSettings = useUpdateNotificationSettings();
  const broadcast = useBroadcastNotification();

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastStatus, setBroadcastStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleToggle = async (
    key: "matchResultEnabled" | "nextRoundEnabled" | "tournamentStartEnabled",
    value: boolean,
  ) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    try {
      await updateSettings.mutateAsync({
        tournamentId,
        matchResultEnabled: updated.matchResultEnabled,
        nextRoundEnabled: updated.nextRoundEnabled,
        tournamentStartEnabled: updated.tournamentStartEnabled,
      });
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setBroadcastStatus("idle");
    try {
      await broadcast.mutateAsync({
        tournamentId,
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
      });
      setBroadcastStatus("success");
      setBroadcastTitle("");
      setBroadcastBody("");
      toast.success("Broadcast sent!");
      refetchLog();
    } catch {
      setBroadcastStatus("error");
      toast.error("Broadcast failed");
    }
  };

  const cardStyle = {
    background: "oklch(0.10 0.02 145 / 0.6)",
    border: "1px solid oklch(0.22 0.06 145 / 0.5)",
  };
  const headingStyle = { color: "oklch(0.72 0.28 145)" };
  const labelStyle = { color: "oklch(0.62 0.14 145)" };

  return (
    <div className="space-y-6">
      {/* Section A — Notification Settings */}
      <div className="rounded-lg p-4 space-y-4" style={cardStyle}>
        <h3
          className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
          style={headingStyle}
        >
          <Bell className="h-4 w-4" />
          Notification Settings
        </h3>
        {settingsLoading ? (
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "oklch(0.45 0.10 145)" }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="notif-result-switch"
                className="text-xs font-mono uppercase tracking-wider"
                style={labelStyle}
              >
                Match Result Notifications
              </label>
              <Switch
                id="notif-result-switch"
                data-ocid="notif.result.switch"
                checked={settings?.matchResultEnabled ?? false}
                onCheckedChange={(v) => handleToggle("matchResultEnabled", v)}
                disabled={updateSettings.isPending}
                style={
                  settings?.matchResultEnabled
                    ? { background: "oklch(0.58 0.26 145)" }
                    : undefined
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="notif-nextround-switch"
                className="text-xs font-mono uppercase tracking-wider"
                style={labelStyle}
              >
                Next Round Notifications
              </label>
              <Switch
                id="notif-nextround-switch"
                data-ocid="notif.nextround.switch"
                checked={settings?.nextRoundEnabled ?? false}
                onCheckedChange={(v) => handleToggle("nextRoundEnabled", v)}
                disabled={updateSettings.isPending}
                style={
                  settings?.nextRoundEnabled
                    ? { background: "oklch(0.58 0.26 145)" }
                    : undefined
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="notif-start-switch"
                className="text-xs font-mono uppercase tracking-wider"
                style={labelStyle}
              >
                Tournament Start Notifications
              </label>
              <Switch
                id="notif-start-switch"
                data-ocid="notif.start.switch"
                checked={settings?.tournamentStartEnabled ?? false}
                onCheckedChange={(v) =>
                  handleToggle("tournamentStartEnabled", v)
                }
                disabled={updateSettings.isPending}
                style={
                  settings?.tournamentStartEnabled
                    ? { background: "oklch(0.58 0.26 145)" }
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Section B — Manual Broadcast */}
      <div className="rounded-lg p-4 space-y-4" style={cardStyle}>
        <h3
          className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
          style={headingStyle}
        >
          <Send className="h-4 w-4" />
          Broadcast to All Players
        </h3>
        <form onSubmit={handleBroadcast} className="space-y-3">
          <Input
            data-ocid="notif.broadcast.input"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            placeholder="Notification title"
            className="font-mono text-sm"
            style={{
              background: "oklch(0.11 0.02 145 / 0.8)",
              borderColor: "oklch(0.25 0.08 145 / 0.6)",
              color: "oklch(0.90 0.10 145)",
            }}
          />
          <textarea
            data-ocid="notif.broadcast.textarea"
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            placeholder="Enter message for all players..."
            rows={3}
            className="w-full rounded-md px-3 py-2 text-sm font-mono resize-none outline-none"
            style={{
              background: "oklch(0.11 0.02 145 / 0.8)",
              border: "1px solid oklch(0.25 0.08 145 / 0.6)",
              color: "oklch(0.90 0.10 145)",
            }}
          />
          {broadcastStatus === "success" && (
            <p
              className="text-xs font-mono"
              style={{ color: "oklch(0.72 0.28 145)" }}
              data-ocid="notif.broadcast.success_state"
            >
              ✓ Broadcast sent successfully
            </p>
          )}
          {broadcastStatus === "error" && (
            <p
              className="text-xs font-mono"
              style={{ color: "oklch(0.65 0.22 27)" }}
              data-ocid="notif.broadcast.error_state"
            >
              ✗ Failed to send broadcast
            </p>
          )}
          <Button
            type="submit"
            data-ocid="notif.broadcast.button"
            disabled={
              !broadcastTitle.trim() ||
              !broadcastBody.trim() ||
              broadcast.isPending
            }
            className="w-full font-mono font-bold text-xs uppercase tracking-wider"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.20 145), oklch(0.58 0.26 145))",
              color: "oklch(0.06 0.01 145)",
              border: "none",
            }}
          >
            {broadcast.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Section C — Notification Log */}
      <div className="rounded-lg p-4 space-y-3" style={cardStyle}>
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
            style={headingStyle}
          >
            🔔 Notification Log
          </h3>
          <button
            type="button"
            data-ocid="notif.log.refresh.button"
            onClick={() => refetchLog()}
            disabled={logLoading}
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded transition-all hover:opacity-80"
            style={{
              color: "oklch(0.55 0.12 145)",
              border: "1px solid oklch(0.22 0.06 145 / 0.5)",
              background: "oklch(0.09 0.02 145 / 0.5)",
            }}
          >
            <RefreshCw
              className={`h-3 w-3 ${logLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {log.length === 0 ? (
          <div
            className="py-8 text-center rounded-lg"
            data-ocid="notif.log.empty_state"
            style={{
              border: "1px dashed oklch(0.22 0.06 145 / 0.4)",
              background: "oklch(0.08 0.01 145 / 0.3)",
            }}
          >
            <Bell
              className="h-6 w-6 mx-auto mb-2 opacity-20"
              style={{ color: "oklch(0.72 0.28 145)" }}
            />
            <p
              className="text-xs font-mono"
              style={{ color: "oklch(0.38 0.08 145)" }}
            >
              No notifications sent yet.
            </p>
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-lg"
            style={{ border: "1px solid oklch(0.22 0.06 145 / 0.4)" }}
          >
            <table
              className="w-full text-xs font-mono"
              data-ocid="notif.log.table"
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid oklch(0.22 0.06 145 / 0.5)",
                    background: "oklch(0.09 0.02 145 / 0.6)",
                  }}
                >
                  {["Time", "Type", "Title", "Message", "Target"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left uppercase tracking-wider"
                      style={{ color: "oklch(0.42 0.10 145)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((n, idx) => (
                  <tr
                    key={n.id}
                    data-ocid={`notif.log.row.${idx + 1}`}
                    style={{
                      borderBottom: "1px solid oklch(0.15 0.04 145 / 0.3)",
                      background:
                        idx % 2 === 0
                          ? "oklch(0.09 0.02 145 / 0.3)"
                          : "transparent",
                    }}
                  >
                    <td
                      className="px-3 py-2 whitespace-nowrap"
                      style={{ color: "oklch(0.48 0.10 145)" }}
                    >
                      {new Date(
                        Number(n.createdAt) / 1_000_000,
                      ).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "oklch(0.60 0.16 145)" }}
                    >
                      {n.notifType}
                    </td>
                    <td
                      className="px-3 py-2 font-bold max-w-[120px] truncate"
                      style={{ color: "oklch(0.82 0.18 145)" }}
                    >
                      {n.title}
                    </td>
                    <td
                      className="px-3 py-2 max-w-[200px] truncate"
                      style={{ color: "oklch(0.62 0.12 145)" }}
                    >
                      {n.body}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "oklch(0.50 0.10 145)" }}
                    >
                      {n.targetPlayerName ?? "All"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tournament Management Panel ──────────────────────────────────────────────

function TournamentPanel({
  tournamentId,
  onCanisterOffline,
}: {
  tournamentId: string;
  onCanisterOffline: () => void;
}) {
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
        const msg = e instanceof Error ? e.message : "Failed to record result";
        if (
          msg.includes("temporarily offline") ||
          msg.includes("IC0508") ||
          msg.includes("is stopped")
        ) {
          onCanisterOffline();
        } else {
          toast.error(msg);
        }
      } finally {
        setLoadingMatchId(null);
      }
    },
    [tournament, recordMutation, pollAfterResult, players, onCanisterOffline],
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
        const msg = e instanceof Error ? e.message : "Failed to undo result";
        if (
          msg.includes("temporarily offline") ||
          msg.includes("IC0508") ||
          msg.includes("is stopped")
        ) {
          onCanisterOffline();
        } else {
          toast.error(msg);
        }
      } finally {
        setUndoingMatchId(null);
      }
    },
    [tournament, undoMutation, queryClient, onCanisterOffline],
  );

  const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      await startMutation.mutateAsync(tournament.id);
      toast.success("Tournament started!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start tournament";
      if (
        msg.includes("temporarily offline") ||
        msg.includes("IC0508") ||
        msg.includes("is stopped")
      ) {
        onCanisterOffline();
      } else {
        toast.error(msg);
      }
    }
  };

  if (tLoading || pLoading || rLoading) {
    return (
      <div className="space-y-3 p-4" data-ocid="admin.panel.loading_state">
        {["a", "b", "c"].map((key) => (
          <Skeleton
            key={key}
            className="h-12 w-full"
            style={{ background: "oklch(0.15 0.04 145 / 0.5)" }}
          />
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
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            background: "oklch(0.10 0.04 145 / 0.4)",
            border: "1px solid oklch(0.35 0.15 145 / 0.4)",
          }}
        >
          <span
            className="text-sm shrink-0"
            style={{ color: "oklch(0.72 0.22 145)" }}
          >
            ⚠
          </span>
          <p
            className="text-xs font-mono"
            style={{ color: "oklch(0.62 0.14 145)" }}
          >
            Rule:{" "}
            <span
              className="font-bold"
              style={{ color: "oklch(0.72 0.22 145)" }}
            >
              {Number(tournament.eliminationCount)} loss
              {Number(tournament.eliminationCount) !== 1 ? "es" : ""}
            </span>{" "}
            = eliminated
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4
              className="text-sm font-mono uppercase tracking-wider"
              style={{ color: "oklch(0.45 0.12 145)" }}
            >
              Players
            </h4>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                color: "oklch(0.72 0.22 145)",
                background: "oklch(0.12 0.04 145 / 0.5)",
                border: "1px solid oklch(0.35 0.14 145 / 0.4)",
              }}
            >
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
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded border"
                  style={{
                    background: "oklch(0.11 0.02 145 / 0.5)",
                    borderColor: "oklch(0.28 0.08 145 / 0.4)",
                  }}
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
          data-ocid="admin.start_tournament.primary_button"
          onClick={handleStartTournament}
          disabled={players.length < 2 || startMutation.isPending}
          className="w-full font-mono font-bold uppercase tracking-wider transition-all"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.45 0.22 145), oklch(0.60 0.28 145))",
            border: "1px solid oklch(0.68 0.25 145 / 0.6)",
            color: "oklch(0.05 0.01 145)",
            boxShadow: "0 0 20px oklch(0.55 0.25 145 / 0.3)",
          }}
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
          <p
            className="text-4xl animate-float"
            style={{
              color: "oklch(0.82 0.28 145)",
              filter: "drop-shadow(0 0 20px oklch(0.72 0.28 145 / 0.8))",
            }}
          >
            ♛
          </p>
          <h3 className="text-2xl font-bold gold-shimmer">Champion</h3>
          <p
            className="text-3xl font-bold mt-2"
            style={{ color: "oklch(0.88 0.28 145)" }}
          >
            {winnerName}
          </p>
        </div>
        <div
          className="pt-4 border-t"
          style={{ borderColor: "oklch(0.25 0.08 145 / 0.4)" }}
        >
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
      const msg =
        e instanceof Error ? e.message : "Failed to reshuffle matchups";
      if (
        msg.includes("temporarily offline") ||
        msg.includes("IC0508") ||
        msg.includes("is stopped")
      ) {
        onCanisterOffline();
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="space-y-6 p-4">
      {currentRound ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left side: round heading + dice button */}
            <div className="flex items-center gap-2.5 min-w-0">
              <h4
                className="font-mono font-bold uppercase tracking-wider text-sm shrink-0"
                style={{ color: "oklch(0.72 0.28 145)" }}
              >
                Round {Number(currentRound.roundNumber)}
              </h4>
              <button
                type="button"
                onClick={handleReshuffle}
                disabled={isDiceDisabled}
                title="Reshuffle matchups"
                aria-label="Reshuffle matchups"
                data-ocid="admin.reshuffle.button"
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg border transition-all duration-200 shrink-0",
                  isDiceDisabled
                    ? "border-border/30 text-muted-foreground/30 cursor-not-allowed bg-card/20"
                    : "cursor-pointer active:scale-95",
                )}
                style={
                  !isDiceDisabled
                    ? {
                        border: "1px solid oklch(0.45 0.20 145 / 0.6)",
                        color: "oklch(0.72 0.28 145)",
                        background: "oklch(0.12 0.06 145 / 0.5)",
                      }
                    : undefined
                }
                onMouseEnter={(e) => {
                  if (!isDiceDisabled) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 0 12px oklch(0.72 0.28 145 / 0.35)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "oklch(0.60 0.25 145 / 0.8)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDiceDisabled) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "oklch(0.45 0.20 145 / 0.6)";
                  }
                }}
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
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded animate-pulse"
                  style={{
                    color: "oklch(0.72 0.25 145)",
                    background: "oklch(0.12 0.06 145 / 0.4)",
                    border: "1px solid oklch(0.35 0.15 145 / 0.4)",
                  }}
                >
                  ✓ Round Complete
                </span>
              )}
              <div
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={{
                  border: "1px solid oklch(0.25 0.08 145 / 0.4)",
                  background: "oklch(0.10 0.02 145 / 0.4)",
                }}
              >
                <Switch
                  id={`manual-shuffle-${tournamentId}`}
                  checked={manualShuffleEnabled}
                  onCheckedChange={setManualShuffleEnabled}
                  data-ocid="admin.manual_reshuffle.switch"
                  className="scale-75 data-[state=checked]:bg-[oklch(0.55_0.25_145)]"
                />
                <div className="flex flex-col gap-0">
                  <Label
                    htmlFor={`manual-shuffle-${tournamentId}`}
                    className="text-xs font-mono text-muted-foreground cursor-pointer leading-none"
                  >
                    Manual Reshuffle
                  </Label>
                  <span
                    className="text-[10px] font-mono leading-none mt-0.5"
                    style={{
                      color: manualShuffleEnabled
                        ? "oklch(0.68 0.20 145)"
                        : "oklch(0.35 0.06 145)",
                    }}
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
        <div
          className="flex items-center gap-2 text-sm p-4 rounded-lg"
          style={{
            color: "oklch(0.45 0.10 145)",
            border: "1px solid oklch(0.25 0.08 145 / 0.4)",
            background: "oklch(0.10 0.02 145 / 0.3)",
          }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading round data...</span>
        </div>
      )}

      {/* Player Management Panel */}
      <PlayerManagementPanel
        tournamentId={tournamentId}
        players={players}
        tournament={tournament}
        onCanisterOffline={onCanisterOffline}
      />
      <CopyLink url={`${origin}/view/${tournament.id}`} label="Viewer Link" />
    </div>
  );
}

// ─── Tournament Item ──────────────────────────────────────────────────────────

function TournamentItem({
  tournament,
  isSelected,
  onSelect,
  onCanisterOffline,
}: {
  tournament: Tournament;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onCanisterOffline: () => void;
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
      className="rounded-lg border transition-all"
      style={
        isSelected
          ? {
              borderColor: "oklch(0.45 0.20 145 / 0.6)",
              background: "oklch(var(--card))",
              boxShadow: "0 0 20px oklch(0.45 0.20 145 / 0.25)",
            }
          : {
              borderColor: "oklch(0.22 0.06 145 / 0.5)",
              background: "oklch(var(--card) / 0.5)",
            }
      }
    >
      <button
        type="button"
        onClick={() => onSelect(tournament.id)}
        className="w-full flex items-center justify-between p-4 text-left"
        data-ocid="admin.tournament.button"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-lg shrink-0"
            style={{
              color: "oklch(0.72 0.28 145)",
              filter: "drop-shadow(0 0 6px oklch(0.72 0.28 145 / 0.6))",
            }}
          >
            ♞
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {tournament.name}
              </p>
              {tournament.status !== TournamentStatus.completed && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap"
                  style={{
                    color: "oklch(0.62 0.18 145)",
                    background: "oklch(0.12 0.04 145 / 0.5)",
                    border: "1px solid oklch(0.30 0.12 145 / 0.4)",
                  }}
                >
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
            data-ocid="admin.tournament.delete_button"
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
            className="text-muted-foreground transition-colors p-1 rounded"
            style={{ color: "oklch(0.42 0.08 145)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "oklch(0.72 0.28 145)";
              (e.currentTarget as HTMLAnchorElement).style.background =
                "oklch(0.72 0.28 145 / 0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "oklch(0.42 0.08 145)";
              (e.currentTarget as HTMLAnchorElement).style.background = "";
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {isSelected ? (
            <ChevronUp
              className="h-4 w-4"
              style={{ color: "oklch(0.55 0.15 145)" }}
            />
          ) : (
            <ChevronDown
              className="h-4 w-4"
              style={{ color: "oklch(0.42 0.08 145)" }}
            />
          )}
        </div>
      </button>

      {isSelected && (
        <div
          className="border-t"
          style={{ borderColor: "oklch(0.22 0.06 145 / 0.4)" }}
        >
          <TournamentPanel
            tournamentId={tournament.id}
            onCanisterOffline={onCanisterOffline}
          />
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
  const [canisterOffline, setCanisterOffline] = useState(false);
  const createFormRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: tournaments = [], isLoading } = useGetAllTournaments();
  const createMutation = useCreateTournament();

  const sortedTournaments = [...tournaments].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  const handleCanisterOffline = () => {
    setCanisterOffline(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCanisterOffline(false);
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
      const msg =
        e instanceof Error ? e.message : "Failed to create tournament";
      if (
        msg.includes("temporarily offline") ||
        msg.includes("IC0508") ||
        msg.includes("is stopped")
      ) {
        setCanisterOffline(true);
      } else {
        toast.error(msg);
      }
    }
  };

  const handleRetry = () => {
    setCanisterOffline(false);
    // Force-remove the cached actor so a fresh one is created, then refetch all queries
    queryClient.removeQueries({ queryKey: ["actor"] });
    queryClient.invalidateQueries({ queryKey: ["actor"] });
    setTimeout(() => {
      queryClient.resetQueries();
    }, 800);
  };

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen hulk-bg relative overflow-hidden">
      {/* Smoke particles */}
      <SmokeParticles />

      {/* Green ambient glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "80%",
          height: 300,
          background:
            "radial-gradient(ellipse at top, oklch(0.28 0.14 145 / 0.18), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{
          background: "oklch(0.07 0.015 145 / 0.92)",
          borderBottom: "1px solid oklch(0.30 0.12 145 / 0.4)",
          boxShadow: "0 1px 0 oklch(0.45 0.20 145 / 0.3)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl animate-float"
              style={{
                color: "oklch(0.72 0.28 145)",
                filter: "drop-shadow(0 0 10px oklch(0.72 0.28 145 / 0.8))",
              }}
            >
              ♔
            </span>
            <div>
              <h1
                className="font-bold text-xl"
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  background:
                    "linear-gradient(135deg, oklch(0.92 0.32 145), oklch(0.62 0.25 145))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Admin Panel
              </h1>
              <p
                className="text-xs font-mono"
                style={{ color: "oklch(0.48 0.12 145)" }}
              >
                Chess Tournament Platform
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-xs"
            style={{
              border: "1px solid oklch(0.35 0.15 145 / 0.5)",
              color: "oklch(0.72 0.25 145)",
              background: "oklch(0.12 0.04 145 / 0.6)",
            }}
          >
            ♟ Double Elimination
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 relative z-10">
        {canisterOffline && <CanisterOfflineBanner onRetry={handleRetry} />}
        <WinnerHistory tournaments={tournaments} />

        <section>
          <h2
            className="text-sm font-mono uppercase tracking-widest mb-4"
            style={{ color: "oklch(0.45 0.12 145)" }}
          >
            Create Tournament
          </h2>
          <form
            onSubmit={handleCreate}
            className="flex gap-3 flex-wrap sm:flex-nowrap"
          >
            <Input
              ref={createFormRef}
              data-ocid="admin.create.input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tournament name..."
              className="bg-card font-medium flex-1 min-w-0 focus-visible:ring-[oklch(0.45_0.20_145/0.6)]"
              style={{
                background: "oklch(0.11 0.02 145 / 0.8)",
                borderColor: "oklch(0.25 0.08 145 / 0.6)",
                color: "oklch(0.90 0.10 145)",
              }}
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
                data-ocid="admin.create.select"
                type="number"
                min={1}
                max={5}
                value={eliminationCount}
                onChange={(e) =>
                  setEliminationCount(
                    Math.min(5, Math.max(1, Number(e.target.value))),
                  )
                }
                className="font-mono text-center w-20 focus-visible:ring-[oklch(0.45_0.20_145/0.6)]"
                style={{
                  background: "oklch(0.11 0.02 145 / 0.8)",
                  borderColor: "oklch(0.25 0.08 145 / 0.6)",
                  color: "oklch(0.90 0.10 145)",
                }}
                disabled={createMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              data-ocid="admin.create.submit_button"
              disabled={!newName.trim() || createMutation.isPending}
              className="font-mono font-bold shrink-0 self-end transition-all"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.45 0.22 145), oklch(0.60 0.28 145))",
                border: "1px solid oklch(0.68 0.25 145 / 0.6)",
                color: "oklch(0.05 0.01 145)",
                boxShadow: "0 0 15px oklch(0.55 0.25 145 / 0.2)",
              }}
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
            <h2
              className="text-sm font-mono uppercase tracking-widest"
              style={{ color: "oklch(0.45 0.12 145)" }}
            >
              Tournaments
            </h2>
            {tournaments.length > 0 && (
              <span
                className="text-xs font-mono"
                style={{ color: "oklch(0.38 0.08 145)" }}
              >
                {tournaments.length} total
              </span>
            )}
          </div>

          {isLoading ? (
            <div
              className="space-y-3"
              data-ocid="admin.tournaments.loading_state"
            >
              {["sk1", "sk2", "sk3"].map((key) => (
                <Skeleton
                  key={key}
                  className="h-16 w-full"
                  style={{ background: "oklch(0.12 0.03 145 / 0.5)" }}
                />
              ))}
            </div>
          ) : sortedTournaments.length === 0 ? (
            <div
              className="text-center py-16 rounded-lg"
              style={{
                border: "1px dashed oklch(0.28 0.08 145 / 0.5)",
                background: "oklch(0.09 0.02 145 / 0.3)",
              }}
              data-ocid="admin.tournaments.empty_state"
            >
              <span
                className="text-4xl block mb-3 opacity-30"
                style={{ color: "oklch(0.72 0.28 145)" }}
              >
                ♜
              </span>
              <p className="text-sm" style={{ color: "oklch(0.42 0.08 145)" }}>
                No tournaments yet.
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "oklch(0.32 0.06 145)" }}
              >
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
                  onCanisterOffline={handleCanisterOffline}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer
        className="border-t mt-16 relative z-10"
        style={{ borderColor: "oklch(0.20 0.06 145 / 0.3)" }}
      >
        <div
          className="max-w-4xl mx-auto px-4 py-6 text-center text-xs font-mono"
          style={{ color: "oklch(0.28 0.06 145)" }}
        >
          © {new Date().getFullYear()}. Built with{" "}
          <span style={{ color: "oklch(0.55 0.18 145)" }}>♥</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80 underline-offset-2 hover:underline"
            style={{ color: "oklch(0.45 0.12 145)" }}
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
