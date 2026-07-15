"use client";

import { useRouter } from "next/navigation";
import { AlertRegular, CheckmarkRegular } from "@fluentui/react-icons";
import type { Notification } from "@/generated/prisma/client";
import { useNotifications } from "../NotificationsProvider";
import Styles from "./NotificationPanel.module.css";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const router = useRouter();
  const isUnread = !notification.readAt;

  function handleClick() {
    if (isUnread) onRead(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <button
      className={`${Styles.item} ${isUnread ? Styles.unread : ""}`}
      onClick={handleClick}
    >
      <div className={Styles.itemDot} aria-hidden />
      <div className={Styles.itemContent}>
        <p className={Styles.itemTitle}>{notification.title}</p>
        {notification.body && (
          <p className={Styles.itemBody}>{notification.body}</p>
        )}
        <p className={Styles.itemTime}>{timeAgo(notification.createdAt)}</p>
      </div>
    </button>
  );
}

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();

  return (
    <div className={Styles.panel}>
      <div className={Styles.header}>
        <div className={Styles.headerLeft}>
          <AlertRegular className={Styles.headerIcon} />
          <span className={Styles.headerTitle}>Notifications</span>
          {unreadCount > 0 && (
            <span className={Styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className={Styles.markAllBtn}
            onClick={markAllRead}
            title="Mark all as read"
          >
            <CheckmarkRegular />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className={Styles.list}>
        {notifications.length === 0 ? (
          <div className={Styles.empty}>
            <AlertRegular className={Styles.emptyIcon} />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={(id) => {
                markRead(id);
                onClose();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
