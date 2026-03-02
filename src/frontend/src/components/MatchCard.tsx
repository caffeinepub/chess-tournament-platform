import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Loader2, RotateCcw } from "lucide-react";
import { type Match, MatchResult, type Player } from "../backend.d";
import PlayerBadge from "./PlayerBadge";

interface MatchCardProps {
  match: Match;
  players?: Map<string, Player>;
  onWin?: (winnerId: string, loserId: string) => Promise<void>;
  onUndo?: () => Promise<void>;
  isLoading?: boolean;
  isUndoLoading?: boolean;
  isAdmin?: boolean;
}

export default function MatchCard({
  match,
  players,
  onWin,
  onUndo,
  isLoading,
  isUndoLoading,
  isAdmin,
}: MatchCardProps) {
  const isBye = !!match.byePlayerId;
  const isCompleted = match.result === MatchResult.completed;

  const player1 = players?.get(match.player1Id);
  const player2 = players?.get(match.player2Id);

  const player1Name = player1?.name ?? match.player1Name;
  const player2Name = player2?.name ?? match.player2Name;

  // Bye match
  if (isBye) {
    const byePlayerName =
      match.byePlayerId === match.player1Id ? player1Name : player2Name;
    const byePlayer = match.byePlayerId === match.player1Id ? player1 : player2;

    return (
      <div
        className={cn(
          "rounded-lg border border-border/50 bg-card/50 p-4",
          "flex items-center gap-3 opacity-70",
        )}
      >
        <span className="text-gold text-lg">♟</span>
        <div className="flex-1">
          <span className="text-muted-foreground text-sm font-mono uppercase tracking-wider">
            BYE —{" "}
          </span>
          {byePlayer ? (
            <PlayerBadge
              player={byePlayer}
              showLosses={false}
              className="font-semibold"
            />
          ) : (
            <span className="font-semibold text-foreground">
              {byePlayerName}
            </span>
          )}
          <span className="text-muted-foreground text-sm ml-2">
            advances automatically
          </span>
        </div>
      </div>
    );
  }

  // Completed match
  if (isCompleted) {
    const winnerName =
      match.winnerId === match.player1Id ? player1Name : player2Name;
    return (
      <div
        className={cn(
          "rounded-lg border border-border/30 bg-card/30 p-4",
          "flex items-center justify-between",
          isAdmin && onUndo ? "opacity-70" : "opacity-60",
        )}
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span
            className={cn(
              "font-medium",
              match.winnerId === match.player1Id ? "text-gold" : "line-through",
            )}
          >
            {player1Name}
          </span>
          <span className="text-xs font-mono text-muted-foreground/60">VS</span>
          <span
            className={cn(
              "font-medium",
              match.winnerId === match.player2Id ? "text-gold" : "line-through",
            )}
          >
            {player2Name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-gold font-mono font-bold">✓</span>
          <span>{winnerName} won</span>
          {isAdmin && onUndo && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isUndoLoading}
                    onClick={onUndo}
                    aria-label="Undo match result"
                    className="h-6 w-6 p-0 ml-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {isUndoLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs font-mono">
                  Undo result — re-select winner
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }

  // Active match (admin view with win buttons)
  if (isAdmin && onWin) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4",
          "flex flex-col sm:flex-row items-start sm:items-center gap-3",
          "transition-all hover:border-gold/30 hover:shadow-card-hover",
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {player1 ? (
              <PlayerBadge
                player={player1}
                className="font-semibold truncate"
              />
            ) : (
              <span className="font-semibold text-foreground truncate">
                {player1Name}
              </span>
            )}
            <span className="text-xs font-mono font-bold text-muted-foreground px-2 shrink-0">
              VS
            </span>
            {player2 ? (
              <PlayerBadge
                player={player2}
                className="font-semibold truncate"
              />
            ) : (
              <span className="font-semibold text-foreground truncate">
                {player2Name}
              </span>
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
        <span className="text-xs font-mono font-bold text-muted-foreground px-2">
          VS
        </span>
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
