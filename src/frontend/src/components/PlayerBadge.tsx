import { cn } from "@/lib/utils";
import { PlayerStatus, type Player } from "../backend.d";

interface PlayerBadgeProps {
  player: Player;
  showLosses?: boolean;
  className?: string;
}

export function getPlayerStatusClasses(player: Player): string {
  if (player.eliminated) {
    return "text-player-eliminated line-through opacity-50";
  }
  if (player.status === PlayerStatus.oneLoss) {
    return "text-player-one-loss";
  }
  return "text-player-active";
}

export function getPlayerStatusLabel(player: Player): string {
  if (player.eliminated) return "Eliminated";
  if (player.status === PlayerStatus.oneLoss) return "1 Loss";
  return "Active";
}

export default function PlayerBadge({ player, showLosses = true, className }: PlayerBadgeProps) {
  const statusClasses = getPlayerStatusClasses(player);
  const losses = Number(player.losses);

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", statusClasses, className)}>
      <span>{player.name}</span>
      {showLosses && losses > 0 && (
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded font-mono font-bold",
            player.eliminated
              ? "bg-player-eliminated/20 text-player-eliminated"
              : "bg-player-one-loss/20 text-player-one-loss"
          )}
        >
          {losses}L
        </span>
      )}
    </span>
  );
}
