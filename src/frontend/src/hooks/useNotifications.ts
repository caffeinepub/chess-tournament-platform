import { useEffect, useRef, useState } from "react";
import { createActorWithConfig } from "../config";

export type NotificationPermission = "default" | "granted" | "denied";

export function useNotifications(tournamentId: string, playerName: string) {
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>(
      typeof Notification !== "undefined"
        ? (Notification.permission as NotificationPermission)
        : "default",
    );
  const [unreadCount, setUnreadCount] = useState(0);
  const shownKey = `notif_shown_${tournamentId}_${playerName}`;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getShownIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem(shownKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveShownIds = (ids: Set<string>) => {
    try {
      localStorage.setItem(shownKey, JSON.stringify([...ids]));
    } catch {
      // ignore
    }
  };

  const poll = async () => {
    if (!tournamentId || !playerName) return;
    try {
      const actor = await createActorWithConfig();
      const notifications = await actor.getNotificationsForPlayer(
        tournamentId,
        playerName,
      );

      const shownIds = getShownIds();
      const newNotifs = notifications.filter((n) => !shownIds.has(n.id));

      const unread = notifications.filter(
        (n) => !n.readByPlayerNames.includes(playerName),
      ).length;
      setUnreadCount(unread);

      if (newNotifs.length > 0) {
        const canShow =
          typeof Notification !== "undefined" &&
          Notification.permission === "granted";

        for (const notif of newNotifs) {
          if (canShow) {
            try {
              new Notification(notif.title, {
                body: notif.body,
                icon: "/chess-icon.png",
              });
            } catch {
              // Notification API may be blocked
            }
          }
          shownIds.add(notif.id);
        }
        saveShownIds(shownIds);

        const ids = newNotifs.map((n) => n.id);
        try {
          await actor.markNotificationsRead(tournamentId, playerName, ids);
        } catch {
          // best-effort
        }
      }
    } catch {
      // silently ignore poll errors
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: poll is stable within the effect scope
  useEffect(() => {
    if (!tournamentId || !playerName) return;
    poll();
    pollRef.current = setInterval(poll, 15_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tournamentId, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermissionStatus(result as NotificationPermission);
  };

  return { permissionStatus, requestPermission, unreadCount };
}
