"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { NotificationsService } from "./service";

export const getRecentNotifications = async () => {
    const session = await getSessionClaims();

    return NotificationsService.getRecentNotifications(
        session.organizationId,
        session.memberId,
    );
};

export const markNotificationRead = async (notificationId: string) => {
    const session = await getSessionClaims();

    return NotificationsService.markNotificationRead(
        notificationId,
        session.organizationId,
        session.memberId,
    );
};

export const markAllNotificationsRead = async () => {
    const session = await getSessionClaims();

    return NotificationsService.markAllNotificationsRead(
        session.organizationId,
        session.memberId,
    );
};
