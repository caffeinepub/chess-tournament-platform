import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MatchResult, type Match, type Player } from "../backend.d";
import PlayerBadge from "./PlayerBadge";

interface MatchCardProps {
  match: Match;
  players?: Map<string, Player>;
  onWin?: (winnerId: string, loserId: string) => Promise<void>;
  isLoading?: boolean;
  isAdmin?: boolean;
}

export default function MatchCard({ match, players, onWin, isLoading, isAdmin }: MatchCardProps) {
  const isBye = !!match.byePlayerId;
  const isCompleted = match.result === MatchResult.completed;

  const player1 = players?.get(match.player1Id);
  const player2 = players?.get(match.player2Id);

  const player1Name = player1?.name ?? match.player1Name;
  const player2Name = player2?.name ?? match.player2Name;

  // Bye match
  if (isBye) {
    const byePlayerName = match.byePlayerId === match.player1Id
      ? player1Name
      : player2Name;
    const byePlayer = match.byePlayerId === match.player1Id ? player1 : player2;

    return (
      <div className={cn(
        "rounded-lg border border-border/50 bg-card/50 p-4",
        "flex items-center gap-3 opacity-70"
      )}>
        <span className="text-gold text-lg">♟</span>
        <div className="flex-1">
          <span className="text-muted-foreground text-sm font-mono uppercase tracking-wider">BYE — </span>
          {byePlayer ? (
            <PlayerBadge player={byePlayer} showLosses={false} className="font-semibold" />
          ) : (
            <span className="font-semibold text-foreground">{byePlayerName}</span>
          )}
          <span className="text-muted-foreground text-sm ml-2">advances automatically</span>
        </div>
      </div>
    );
  }

  // Completed match
  if (isCompleted) {
    const winnerName = match.winnerId === match.player1Id ? player1Name : player2Name;
    return (
      <div className={cn(
        "rounded-lg border border-border/30 bg-card/30 p-4",
        "flex items-center justify-between opacity-60"
      )}>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className={cn("font-medium", match.winnerId === match.player1Id ? "text-gold" : "line-through")}>
            {player1Name}
          </span>
          <span className="text-xs font-mono text-muted-foreground/60">VS</span>
          <span className={cn("font-medium", match.winnerId === match.player2Id ? "text-gold" : "line-through")}>
            {player2Name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-gold font-mono font-bold">✓</span>
          <span>{winnerName} won</span>
        </div>
      </div>
    );
  }

  // Active match (admin view with win buttons)
  if (isAdmin && onWin) {
    return (
      <div className={cn(
        "rounded-lg border border-border bg-card p-4",
        "flex flex-col sm:flex-row items-start sm:items-center gap-3",
        "transition-all hover:border-gold/30 hover:shadow-card-hover"
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {player1 ? (
              <PlayerBadge player={player1} className="font-semibold truncate" />
            ) : (
              <span className="font-semibold text-foreground truncate">{player1Name}</span>
            )}
            <span className="text-xs font-mono font-bold text-muted-foreground px-2 shrink-0">VS</span>
            {player2 ? (
              <PlayerBadge player={player2} className="font-semibold truncate" />
            ) : (
              <span className="font-semibold text-foreground truncate">{player2Name}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 sm:flex-none border-gold/30 text-gold hover:bg-gold/10 hover:border-gold font-mono text-xs"
            disabled={isLoading}
            onClick={() => onWin(match.player1Id, match.player2Id)}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              `${player1Name} Wins`
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 sm:flex-none border-gold/30 text-gold hover:bg-gold/10 hover:border-gold font-mono text-xs"
            disabled={isLoading}
            onClick={() => onWin(match.player2Id, match.player1Id)}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              `${player2Name} Wins`
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Viewer mode — pending match
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {player1 ? (
          <PlayerBadge player={player1} className="font-semibold" />
        ) : (
          <span className="font-semibold">{player1Name}</span>
        )}
        <span className="text-xs font-mono font-bold text-muted-foreground px-2">VS</span>
        {player2 ? (
          <PlayerBadge player={player2} className="font-semibold" />
        ) : (
          <span className="font-semibold">{player2Name}</span>
        )}
      </div>
      <span className="text-xs font-mono text-muted-foreground/60 bg-muted px-2 py-1 rounded shrink-0">
        PENDING
      </span>
    </div>
  );
}
