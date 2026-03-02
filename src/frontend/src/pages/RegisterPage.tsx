import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useParams } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TournamentStatus } from "../backend.d";
import {
  useAddPlayer,
  useGetAllTournamentsPublic,
  useGetTournamentPublic,
} from "../hooks/useQueries";

export default function RegisterPage() {
  const { id } = useParams({ from: "/register/$id" });
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState("");

  const { data: tournament, isLoading, error } = useGetTournamentPublic(id);
  const { data: allTournaments = [] } = useGetAllTournamentsPublic();
  const addPlayerMutation = useAddPlayer();

  const openTournaments = allTournaments.filter(
    (t) => t.status === TournamentStatus.registration && t.id !== id,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await addPlayerMutation.mutateAsync({ tournamentId: id, name: trimmed });
      setRegisteredName(trimmed);
      setRegistered(true);
      toast.success("Player registered!");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen chess-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative chess pieces */}
      <div className="absolute top-8 left-8 text-6xl text-foreground/5 animate-float select-none pointer-events-none">
        ♜
      </div>
      <div
        className="absolute top-8 right-8 text-6xl text-foreground/5 animate-float select-none pointer-events-none"
        style={{ animationDelay: "0.5s" }}
      >
        ♝
      </div>
      <div
        className="absolute bottom-8 left-8 text-6xl text-foreground/5 animate-float select-none pointer-events-none"
        style={{ animationDelay: "1s" }}
      >
        ♞
      </div>
      <div
        className="absolute bottom-8 right-8 text-6xl text-foreground/5 animate-float select-none pointer-events-none"
        style={{ animationDelay: "1.5s" }}
      >
        ♛
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <Card className="bg-card/90 backdrop-blur-sm border-border shadow-gold">
          <CardHeader className="text-center pb-2">
            <div className="text-5xl mb-4 animate-float">♟</div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-48 mx-auto bg-muted/50" />
                <Skeleton className="h-4 w-32 mx-auto bg-muted/50" />
              </div>
            ) : error || !tournament ? (
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">
                  Link No Longer Valid
                </h1>
                <p className="text-sm text-muted-foreground">
                  This registration link has expired or the tournament was
                  recreated.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {tournament.name}
                </h1>
                <p className="text-sm text-muted-foreground font-mono">
                  Double Elimination Tournament
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full bg-muted/50" />
                <Skeleton className="h-10 w-full bg-muted/50" />
              </div>
            ) : error || !tournament ? (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm">
                    Ask your organizer for a new link.
                  </span>
                </div>
                {openTournaments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-center">
                      Open Tournaments
                    </p>
                    <div className="space-y-1.5">
                      {openTournaments.map((t) => (
                        <a
                          key={t.id}
                          href={`/register/${t.id}`}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-border/50 bg-card/50 hover:border-gold/40 hover:bg-gold/5 transition-colors text-sm group"
                        >
                          <span className="font-medium text-foreground group-hover:text-gold transition-colors">
                            {t.name}
                          </span>
                          <span className="text-xs text-player-active font-mono">
                            Join →
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : tournament.status !== TournamentStatus.registration ? (
              // Registration closed
              <div className="text-center space-y-3 py-4">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium",
                    tournament.status === TournamentStatus.completed
                      ? "bg-muted/30 border-border text-muted-foreground"
                      : "bg-[oklch(0.72_0.18_145/0.1)] border-[oklch(0.72_0.18_145/0.3)] text-[oklch(0.78_0.18_145)]",
                  )}
                >
                  {tournament.status === TournamentStatus.completed ? (
                    <>♛ Tournament Completed</>
                  ) : (
                    <>⚔ Tournament In Progress</>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  Registration is closed. The tournament has already{" "}
                  {tournament.status === TournamentStatus.completed
                    ? "concluded"
                    : "started"}
                  .
                </p>
                <a
                  href={`/view/${id}`}
                  className="inline-flex items-center gap-1.5 text-gold hover:text-gold-light text-sm font-medium transition-colors mt-2"
                >
                  Watch live →
                </a>
              </div>
            ) : registered ? (
              // Success state
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-player-active" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">
                    {registeredName}
                  </p>
                  <p className="text-player-active font-mono text-sm mt-1">
                    You're registered! Good luck! ♟
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  The admin will start the tournament when everyone is ready.
                </p>
                <a
                  href={`/view/${id}`}
                  className="block text-gold hover:text-gold-light text-sm font-medium transition-colors"
                >
                  Watch the bracket →
                </a>
              </div>
            ) : (
              // Registration form
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="player-name"
                    className="text-sm font-mono text-muted-foreground uppercase tracking-wider"
                  >
                    Enter your name
                  </label>
                  <Input
                    id="player-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name..."
                    className="bg-background/50 border-border focus:border-gold/50 text-foreground"
                    disabled={addPlayerMutation.isPending}
                    autoFocus
                    maxLength={50}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!name.trim() || addPlayerMutation.isPending}
                  className="w-full bg-gold text-background hover:bg-gold-light font-mono font-bold uppercase tracking-wider"
                >
                  {addPlayerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register ♟"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/40 mt-6 font-mono">
          © 2026 · Built with <span className="text-gold/60">♥</span> using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground/60 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
