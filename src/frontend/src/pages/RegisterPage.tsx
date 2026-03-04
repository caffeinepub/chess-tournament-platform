import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "@tanstack/react-router";
import { Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TournamentStatus } from "../backend.d";
import {
  useAddPlayer,
  useGetAllTournamentsPublic,
  useGetTournamentPublic,
} from "../hooks/useQueries";

// ─────────────────────────────────────────────
// Particle system for name reveal
// ─────────────────────────────────────────────
function DustParticles({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${20 + Math.random() * 60}%`,
    bottom: `${10 + Math.random() * 50}%`,
    size: 3 + Math.random() * 6,
    drift: (Math.random() - 0.5) * 80,
    delay: Math.random() * 1.2,
    duration: 1 + Math.random() * 1.5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={
            {
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              background: "oklch(0.72 0.28 145 / 0.7)",
              boxShadow: `0 0 ${p.size * 2}px oklch(0.72 0.28 145 / 0.5)`,
              animation: `particle-rise ${p.duration}s ease-out ${p.delay}s forwards`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Smoke background particles
// ─────────────────────────────────────────────
function SmokeParticles() {
  const smokes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + i * 11}%`,
    bottom: `${5 + Math.random() * 20}%`,
    size: 40 + Math.random() * 60,
    delay: Math.random() * 4,
    duration: 5 + Math.random() * 4,
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

// ─────────────────────────────────────────────
// Stone shatter fragments
// ─────────────────────────────────────────────
function StoneShatter({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Top-left fragment */}
      <div
        className="absolute w-24 h-20 rounded-sm opacity-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.04 90), oklch(0.28 0.02 90))",
          border: "1px solid oklch(0.52 0.03 90 / 0.5)",
          animation: "shatter-tl 0.6s ease-out 0.1s forwards",
          clipPath: "polygon(0 0, 100% 20%, 80% 100%, 10% 90%)",
        }}
      />
      {/* Top-right fragment */}
      <div
        className="absolute w-20 h-24 rounded-sm opacity-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.38 0.03 90), oklch(0.25 0.02 90))",
          border: "1px solid oklch(0.48 0.03 90 / 0.5)",
          animation: "shatter-tr 0.6s ease-out 0.15s forwards",
          clipPath: "polygon(20% 0, 100% 0, 90% 90%, 0 80%)",
        }}
      />
      {/* Bottom-left fragment */}
      <div
        className="absolute w-20 h-16 rounded-sm opacity-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.45 0.04 90), oklch(0.30 0.02 90))",
          border: "1px solid oklch(0.50 0.03 90 / 0.5)",
          animation: "shatter-bl 0.6s ease-out 0.2s forwards",
          clipPath: "polygon(0 10%, 90% 0, 100% 100%, 5% 100%)",
        }}
      />
      {/* Bottom-right fragment */}
      <div
        className="absolute w-28 h-20 rounded-sm opacity-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.40 0.03 90), oklch(0.27 0.02 90))",
          border: "1px solid oklch(0.48 0.03 90 / 0.5)",
          animation: "shatter-br 0.6s ease-out 0.25s forwards",
          clipPath: "polygon(10% 0, 100% 5%, 100% 100%, 0 95%)",
        }}
      />
      {/* Center burst */}
      <div
        className="absolute w-32 h-32 rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle, oklch(0.82 0.32 145 / 0.9), transparent 70%)",
          animation: "shatter-center 0.5s ease-out 0.1s forwards",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Stone block (before punch)
// ─────────────────────────────────────────────
function StoneBlock({
  visible,
  punched,
}: { visible: boolean; punched: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 180,
          height: 140,
          background:
            "linear-gradient(135deg, oklch(0.40 0.04 90) 0%, oklch(0.28 0.02 90) 50%, oklch(0.35 0.03 90) 100%)",
          border: "3px solid oklch(0.52 0.04 90 / 0.8)",
          borderRadius: 6,
          boxShadow:
            "inset 0 0 30px oklch(0 0 0 / 0.5), 0 8px 30px oklch(0 0 0 / 0.6)",
          transform: punched ? "scale(0.85)" : "scale(1)",
          transition: "transform 0.1s ease-out",
        }}
      >
        {/* Stone texture lines */}
        <div
          className="absolute inset-0 rounded"
          style={{
            backgroundImage: `
              linear-gradient(45deg, oklch(0 0 0 / 0.1) 1px, transparent 1px),
              linear-gradient(-45deg, oklch(0 0 0 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />
        {/* Crack lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 180 140"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M90 70 L70 30 L50 10"
            stroke="oklch(0.20 0.02 90 / 0.6)"
            strokeWidth="1.5"
          />
          <path
            d="M90 70 L110 40 L140 20"
            stroke="oklch(0.20 0.02 90 / 0.6)"
            strokeWidth="1.5"
          />
          <path
            d="M90 70 L60 90 L30 130"
            stroke="oklch(0.20 0.02 90 / 0.6)"
            strokeWidth="1.5"
          />
          <path
            d="M90 70 L120 100 L160 120"
            stroke="oklch(0.20 0.02 90 / 0.6)"
            strokeWidth="1.5"
          />
          <path
            d="M90 70 L90 140"
            stroke="oklch(0.20 0.02 90 / 0.5)"
            strokeWidth="1"
          />
        </svg>
        <span
          className="relative z-10 text-sm font-bold tracking-widest uppercase"
          style={{ color: "oklch(0.55 0.06 90 / 0.7)" }}
        >
          ???
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Hulk Fists image
// ─────────────────────────────────────────────
function HulkFists({
  phase,
}: { phase: "hidden" | "dropping" | "punching" | "gone" }) {
  if (phase === "hidden" || phase === "gone") return null;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ top: "-20%" }}
    >
      <img
        src="/assets/generated/hulk-smash-fists-transparent.dim_500x400.png"
        alt="Hulk Smash"
        className={phase === "dropping" ? "hulk-drop" : ""}
        style={{
          width: 260,
          objectFit: "contain",
          filter: "drop-shadow(0 0 30px oklch(0.72 0.28 145 / 0.8))",
          transform:
            phase === "punching" ? "translateY(40px) scale(1.1)" : undefined,
          transition:
            phase === "punching" ? "transform 0.12s ease-out" : undefined,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Ground crack image
// ─────────────────────────────────────────────
function GroundCrack({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none crack-appear"
      style={{ width: 320, zIndex: 2 }}
    >
      <img
        src="/assets/generated/ground-crack-impact-transparent.dim_600x300.png"
        alt=""
        style={{
          width: "100%",
          objectFit: "contain",
          filter: "drop-shadow(0 0 20px oklch(0.65 0.28 145 / 0.6))",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Impact flash overlay
// ─────────────────────────────────────────────
function ImpactFlash({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 pointer-events-none impact-flash"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, oklch(0.82 0.32 145 / 0.5), transparent 70%)",
        zIndex: 100,
      }}
    />
  );
}

// ─────────────────────────────────────────────
// Main animation sequence phases:
// idle → registering → shaking → crack → hulk-drop → punch → shatter → reveal
// ─────────────────────────────────────────────
type AnimPhase =
  | "idle"
  | "registering"
  | "shaking"
  | "crack"
  | "hulk-drop"
  | "punch"
  | "shatter"
  | "flash"
  | "reveal";

export default function RegisterPage() {
  const { id } = useParams({ from: "/register/$id" });
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [cardShaking, setCardShaking] = useState(false);
  const [bgDarken, setBgDarken] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const pendingNameRef = useRef("");

  const { data: tournament, isLoading, error } = useGetTournamentPublic(id);
  const { data: allTournaments = [] } = useGetAllTournamentsPublic();
  const addPlayerMutation = useAddPlayer();

  const openTournaments = allTournaments.filter(
    (t) => t.status === TournamentStatus.registration && t.id !== id,
  );

  const runAnimation = async (playerName: string) => {
    // Phase 1: Button shake + screen vibrate + bg darkens
    setAnimPhase("shaking");
    setCardShaking(true);
    setBgDarken(true);
    await delay(600);
    setCardShaking(false);

    // Phase 2: Ground crack appears
    setAnimPhase("crack");
    await delay(400);

    // Phase 3: Hulk drops in
    setAnimPhase("hulk-drop");
    await delay(800);

    // Phase 4: Punch
    setAnimPhase("punch");
    await delay(200);

    // Phase 5: Flash + shatter
    setShowFlash(true);
    setAnimPhase("shatter");
    setTimeout(() => setShowFlash(false), 400);
    await delay(700);

    // Phase 6: Name reveal
    setAnimPhase("reveal");
    setRegisteredName(playerName);
    setRegistered(true);
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setAnimPhase("registering");
    pendingNameRef.current = trimmed;

    try {
      await addPlayerMutation.mutateAsync({ tournamentId: id, name: trimmed });
      toast.success("Player registered!");
      await runAnimation(trimmed);
    } catch (err) {
      setAnimPhase("idle");
      setBgDarken(false);
      setCardShaking(false);
      toast.error(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    }
  };

  const inAnimation =
    animPhase !== "idle" &&
    animPhase !== "registering" &&
    animPhase !== "reveal";

  return (
    <div
      className={`min-h-screen hulk-bg flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-700 ${cardShaking ? "screen-vibrate" : ""}`}
      style={{
        background: bgDarken
          ? "linear-gradient(180deg, oklch(0.02 0.005 145) 0%, oklch(0.05 0.015 145) 100%)"
          : undefined,
      }}
    >
      {/* Smoke background */}
      <SmokeParticles />

      {/* Impact flash */}
      <ImpactFlash active={showFlash} />

      {/* Green ambient glow at bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "80%",
          height: 200,
          background:
            "radial-gradient(ellipse at bottom, oklch(0.45 0.22 145 / 0.15), transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* Ground crack */}
      <GroundCrack
        visible={
          animPhase === "crack" ||
          animPhase === "hulk-drop" ||
          animPhase === "punch" ||
          animPhase === "shatter"
        }
      />

      {/* Animation stage — overlays the card during animation */}
      {inAnimation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="relative" style={{ width: 400, height: 400 }}>
            <StoneBlock
              visible={
                animPhase === "crack" ||
                animPhase === "hulk-drop" ||
                animPhase === "punch"
              }
              punched={animPhase === "punch"}
            />
            <HulkFists
              phase={
                animPhase === "hulk-drop"
                  ? "dropping"
                  : animPhase === "punch"
                    ? "punching"
                    : "hidden"
              }
            />
            <StoneShatter active={animPhase === "shatter"} />
          </div>
        </div>
      )}

      {/* Main card — hidden during animation, shown otherwise */}
      <div
        className={`w-full max-w-md relative z-10 transition-opacity duration-300 ${inAnimation ? "opacity-0" : "opacity-100"}`}
        style={{
          animation:
            !inAnimation && !registered
              ? "fadeInUp 0.5s ease-out forwards"
              : undefined,
        }}
      >
        {/* Title */}
        <div className="text-center mb-6">
          <h1
            className="text-4xl font-black uppercase tracking-widest mb-1"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              background:
                "linear-gradient(135deg, oklch(0.92 0.32 145), oklch(0.62 0.25 145))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 20px oklch(0.72 0.28 145 / 0.5))",
              textShadow: "none",
            }}
          >
            ⚡ Tournament
          </h1>
          <p
            className="text-xs uppercase tracking-[0.4em] font-bold"
            style={{ color: "oklch(0.55 0.12 145)" }}
          >
            Registration Portal
          </p>
        </div>

        {/* Card */}
        <div
          className={`relative overflow-hidden rounded-xl ${cardShaking ? "hulk-shake" : ""}`}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.10 0.025 145 / 0.95), oklch(0.07 0.015 145 / 0.98))",
            border: "1px solid oklch(0.30 0.12 145 / 0.5)",
            boxShadow: `
              0 0 0 1px oklch(0.20 0.08 145 / 0.3),
              0 4px 40px oklch(0 0 0 / 0.6),
              inset 0 1px 0 oklch(0.55 0.20 145 / 0.15)
            `,
          }}
        >
          {/* Top green accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.72 0.28 145), transparent)",
            }}
          />

          {/* Decorative corner cracks */}
          <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none opacity-20">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="w-full h-full"
              aria-hidden="true"
            >
              <path
                d="M0 0 L20 15 L10 30 L30 45"
                stroke="oklch(0.55 0.12 145)"
                strokeWidth="1"
              />
              <path
                d="M0 0 L30 5 L25 20"
                stroke="oklch(0.55 0.12 145)"
                strokeWidth="0.5"
              />
            </svg>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20 scale-x-[-1]">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="w-full h-full"
              aria-hidden="true"
            >
              <path
                d="M0 0 L20 15 L10 30 L30 45"
                stroke="oklch(0.55 0.12 145)"
                strokeWidth="1"
              />
              <path
                d="M0 0 L30 5 L25 20"
                stroke="oklch(0.55 0.12 145)"
                strokeWidth="0.5"
              />
            </svg>
          </div>

          <div className="p-8">
            {/* Tournament name header */}
            {isLoading ? (
              <div className="space-y-2 mb-6 text-center">
                <Skeleton
                  className="h-7 w-48 mx-auto"
                  style={{ background: "oklch(0.20 0.04 145 / 0.4)" }}
                />
                <Skeleton
                  className="h-4 w-32 mx-auto"
                  style={{ background: "oklch(0.20 0.04 145 / 0.3)" }}
                />
              </div>
            ) : error || !tournament ? null : (
              <div className="text-center mb-6">
                <h2
                  className="text-2xl font-black uppercase tracking-wide"
                  style={{ color: "oklch(0.88 0.20 145)" }}
                  data-ocid="register.tournament_name"
                >
                  {tournament.name}
                </h2>
                <p
                  className="text-xs uppercase tracking-[0.3em] mt-1"
                  style={{ color: "oklch(0.48 0.12 145)" }}
                >
                  Double Elimination
                </p>
              </div>
            )}

            {/* Content based on state */}
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton
                  className="h-12 w-full"
                  style={{ background: "oklch(0.18 0.04 145 / 0.4)" }}
                />
                <Skeleton
                  className="h-12 w-full"
                  style={{ background: "oklch(0.18 0.04 145 / 0.4)" }}
                />
              </div>
            ) : error || !tournament ? (
              /* Invalid link */
              <div className="space-y-4 py-2" data-ocid="register.error_state">
                <div
                  className="flex items-center justify-center gap-2"
                  style={{ color: "oklch(0.62 0.22 27)" }}
                >
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Link Expired or Invalid
                  </span>
                </div>
                <p
                  className="text-center text-xs"
                  style={{ color: "oklch(0.48 0.08 145)" }}
                >
                  Ask your organizer for a new registration link.
                </p>
                {openTournaments.length > 0 && (
                  <div
                    className="space-y-2 pt-3 border-t"
                    style={{ borderColor: "oklch(0.22 0.06 145 / 0.4)" }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-[0.3em] text-center"
                      style={{ color: "oklch(0.48 0.12 145)" }}
                    >
                      Open Tournaments
                    </p>
                    <div
                      className="space-y-1.5"
                      data-ocid="register.open_tournaments.list"
                    >
                      {openTournaments.map((t, idx) => (
                        <a
                          key={t.id}
                          href={`/register/${t.id}`}
                          data-ocid={`register.open_tournaments.item.${idx + 1}`}
                          className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all group"
                          style={{
                            background: "oklch(0.14 0.04 145 / 0.5)",
                            border: "1px solid oklch(0.28 0.10 145 / 0.4)",
                          }}
                        >
                          <span
                            className="font-bold text-sm"
                            style={{ color: "oklch(0.82 0.18 145)" }}
                          >
                            {t.name}
                          </span>
                          <span
                            className="text-xs font-bold"
                            style={{ color: "oklch(0.65 0.22 145)" }}
                          >
                            JOIN →
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : tournament.status !== TournamentStatus.registration ? (
              /* Registration closed */
              <div
                className="text-center space-y-4 py-4"
                data-ocid="register.closed_state"
              >
                <div
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider"
                  style={{
                    background: "oklch(0.18 0.08 145 / 0.4)",
                    border: "1px solid oklch(0.45 0.18 145 / 0.4)",
                    color: "oklch(0.72 0.22 145)",
                  }}
                >
                  {tournament.status === TournamentStatus.completed
                    ? "⚔ Tournament Completed"
                    : "⚡ Tournament In Progress"}
                </div>
                <p
                  className="text-sm"
                  style={{ color: "oklch(0.50 0.08 145)" }}
                >
                  Registration is closed. The tournament has already{" "}
                  {tournament.status === TournamentStatus.completed
                    ? "concluded"
                    : "started"}
                  .
                </p>
                <a
                  href={`/view/${id}`}
                  data-ocid="register.watch_link"
                  className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
                  style={{ color: "oklch(0.72 0.25 145)" }}
                >
                  Watch Live →
                </a>
              </div>
            ) : registered ? (
              /* SUCCESS — Name Reveal */
              <NameReveal
                name={registeredName}
                tournamentId={id}
                showParticles={showParticles}
              />
            ) : (
              /* Registration form */
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-ocid="register.form"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="player-name"
                    className="block text-xs font-bold uppercase tracking-[0.35em]"
                    style={{ color: "oklch(0.55 0.12 145)" }}
                  >
                    Your Battle Name
                  </label>
                  <Input
                    id="player-name"
                    data-ocid="register.name.input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    disabled={
                      addPlayerMutation.isPending || animPhase !== "idle"
                    }
                    autoFocus
                    maxLength={50}
                    className="h-12 text-base font-bold"
                    style={{
                      background: "oklch(0.08 0.02 145 / 0.8)",
                      border: "1px solid oklch(0.30 0.10 145 / 0.6)",
                      color: "oklch(0.90 0.15 145)",
                      letterSpacing: "0.05em",
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  data-ocid="register.submit_button"
                  disabled={
                    !name.trim() ||
                    addPlayerMutation.isPending ||
                    animPhase !== "idle"
                  }
                  className="w-full h-12 text-sm font-black uppercase tracking-[0.3em] transition-all"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.45 0.22 145), oklch(0.60 0.28 145))",
                    border: "1px solid oklch(0.68 0.25 145 / 0.6)",
                    color: "oklch(0.05 0.01 145)",
                    boxShadow:
                      "0 0 20px oklch(0.55 0.25 145 / 0.3), inset 0 1px 0 oklch(0.82 0.28 145 / 0.3)",
                  }}
                >
                  {addPlayerMutation.isPending ||
                  animPhase === "registering" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "⚡ Enter The Tournament"
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Bottom accent line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.45 0.20 145 / 0.5), transparent)",
            }}
          />
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6 font-bold tracking-widest uppercase"
          style={{ color: "oklch(0.28 0.06 145)" }}
        >
          © 2026 · Powered by{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            style={{ color: "oklch(0.45 0.12 145)" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Name Reveal component
// ─────────────────────────────────────────────
function NameReveal({
  name,
  tournamentId,
  showParticles,
}: {
  name: string;
  tournamentId: string;
  showParticles: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative text-center py-6 space-y-4"
      data-ocid="register.success_state"
    >
      {/* Particle dust */}
      <DustParticles active={showParticles} />

      {/* Fire emojis */}
      <div
        className="text-3xl"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.5)",
          transition: "all 0.4s ease-out 0.2s",
        }}
      >
        🔥
      </div>

      {/* Player name — metallic green reveal */}
      <div
        className={`relative ${visible ? "name-reveal name-pulse" : "opacity-0"}`}
        style={{ animationDelay: visible ? "0.1s" : undefined }}
      >
        <h2
          className="text-4xl font-black uppercase tracking-widest leading-tight"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            background:
              "linear-gradient(180deg, oklch(0.94 0.32 145) 0%, oklch(0.72 0.28 145) 40%, oklch(0.55 0.22 145) 70%, oklch(0.82 0.30 145) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter:
              "drop-shadow(0 0 20px oklch(0.72 0.28 145 / 0.8)) drop-shadow(0 0 40px oklch(0.55 0.22 145 / 0.5))",
          }}
        >
          {name.toUpperCase()}
        </h2>
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s ease-out 0.6s",
        }}
      >
        <p
          className="text-sm font-black uppercase tracking-[0.35em]"
          style={{ color: "oklch(0.68 0.18 145)" }}
        >
          HAS ENTERED THE TOURNAMENT
        </p>
      </div>

      {/* Fire emoji bottom */}
      <div
        className="text-3xl"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.5)",
          transition: "all 0.4s ease-out 0.8s",
        }}
      >
        🔥
      </div>

      {/* Divider */}
      <div
        className="mx-auto w-48 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.55 0.22 145 / 0.6), transparent)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease-out 1s",
        }}
      />

      {/* Info and watch link */}
      <div
        className="space-y-3"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.4s ease-out 1s",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "oklch(0.40 0.08 145)" }}
        >
          The admin will start the battle when everyone is ready.
        </p>
        <a
          href={`/view/${tournamentId}`}
          data-ocid="register.watch_bracket_link"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:opacity-80"
          style={{
            background: "oklch(0.14 0.05 145 / 0.6)",
            border: "1px solid oklch(0.38 0.14 145 / 0.5)",
            color: "oklch(0.72 0.22 145)",
          }}
        >
          ⚔ Watch the Bracket →
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
