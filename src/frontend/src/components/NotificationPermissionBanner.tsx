import { Bell, BellOff, X } from "lucide-react";
import { useState } from "react";
import type { NotificationPermission } from "../hooks/useNotifications";

interface Props {
  permissionStatus: NotificationPermission;
  onEnable: () => void;
}

export default function NotificationPermissionBanner({
  permissionStatus,
  onEnable,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (
    dismissed ||
    permissionStatus === "granted" ||
    permissionStatus === "denied"
  ) {
    return null;
  }

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-3 rounded-lg mt-4"
      style={{
        background: "oklch(0.09 0.03 145 / 0.85)",
        border: "1px solid oklch(0.45 0.20 145 / 0.6)",
        boxShadow: "0 0 20px oklch(0.45 0.20 145 / 0.15)",
      }}
      data-ocid="notification.permission.panel"
    >
      {/* Bell icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: "oklch(0.15 0.06 145 / 0.8)",
          border: "1px solid oklch(0.40 0.16 145 / 0.5)",
        }}
      >
        <Bell className="h-4 w-4" style={{ color: "oklch(0.72 0.28 145)" }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "oklch(0.82 0.18 145)" }}
        >
          Stay in the fight
        </p>
        <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.10 145)" }}>
          Get match alerts &amp; results directly in your browser
        </p>
      </div>

      {/* Enable button */}
      <button
        type="button"
        onClick={onEnable}
        data-ocid="notification.enable.button"
        className="shrink-0 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.20 145), oklch(0.58 0.26 145))",
          color: "oklch(0.06 0.01 145)",
          boxShadow: "0 2px 8px oklch(0.45 0.22 145 / 0.4)",
        }}
      >
        <Bell className="h-3 w-3" />
        Enable Notifications
      </button>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded transition-opacity hover:opacity-70"
        style={{ color: "oklch(0.38 0.08 145)" }}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
