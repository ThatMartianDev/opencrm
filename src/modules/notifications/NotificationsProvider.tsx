"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Notification } from "@/generated/prisma/client";
import { getSocket, disconnectSocket } from "@/lib/realtime/client";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useToast } from "@/components/macro/Toaster";
import {
  getRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";
import Navigation from "next/navigation";

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { member } = useWorkspaceData();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const memberId = member.id;
  const socketInitialized = useRef(false);

  useEffect(() => {
    getRecentNotifications()
      .then(setNotifications)
      .catch(console.error);
  }, [memberId]);

  // Socket connection
  useEffect(() => {
    if (socketInitialized.current) return;
    socketInitialized.current = true;

    const socket = getSocket();

    socket.on("notification", (notification: Notification) => {
      setNotifications((prev) => {
        // Dedup, replace if exists, otherwise prepend
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) return prev.map((n) => (n.id === notification.id ? notification : n));
        return [notification, ...prev];
      });

      toast.notify({
        title: notification.title,
        description: notification.body ?? undefined,
        duration: 20000,
        ...(notification.link
          ? {
              actions: [
                {
                  label: "View",
                  primary: true,
                  onClick: () => {
                    Navigation.redirect(notification.link!);
                  },
                },
              ],
            }
          : {}),
      });
    });

    return () => {
      disconnectSocket();
      socketInitialized.current = false;
    };
  }, [memberId]);

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id && !n.readAt ? { ...n, readAt: new Date() } : n,
        ),
      );
      markNotificationRead(id).catch(console.error);
    },
    [],
  );

  const markAllRead = useCallback(() => {
    const now = new Date();
    setNotifications((prev) =>
      prev.map((n) => (!n.readAt ? { ...n, readAt: now } : n)),
    );
    markAllNotificationsRead().catch(console.error);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
