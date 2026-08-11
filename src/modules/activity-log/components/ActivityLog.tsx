"use client";

import { useCallback, useEffect, useState } from "react";
import { HistoryRegular, AddRegular } from "@fluentui/react-icons";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { getActivities } from "../actions";
import { EntityType } from "../types";
import Styles from "./ActivityLog.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

type ActivityData = Awaited<ReturnType<typeof getActivities>>[number];

function formatTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today – ${time}`;
  if (isYesterday) return `Yesterday – ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} – ${time}`;
}

function formatDateGroup(date: Date): string {
  return new Date(date).toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByDate(activities: ActivityData[]) {
  const groups: Map<string, ActivityData[]> = new Map();
  for (const activity of activities) {
    const key = new Date(activity.createdAt).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(activity);
  }
  return groups;
}

type ActivityLogProps = {
  entityType: EntityType;
  entityId: string;
  className?: string;
  onRefresh?: () => void;
  refreshKey?: number;
};

const ActivityItem = ({ activity }: { activity: ActivityData }) => {
  const memberName = activity.member?.user.name || "System";
  const memberAvatarUrl = activity.member?.user.avatarUrl ?? undefined;
  const metadata = activity.metadata;
  const legacyNote =
    metadata && typeof metadata === "object" && !Array.isArray(metadata) &&
    "note" in metadata && typeof metadata.note === "string"
      ? metadata.note
      : null;
  const note = activity.description || legacyNote;

  return (
    <div key={activity.id} className={Styles.activity_item}>
      <AvatarFallback
        name={memberName}
        entityKind="member"
        entityId={activity.memberId}
        size={24}
        letterCount={1}
        imageUrl={memberAvatarUrl}
      />
      <div className={Styles.activity_body}>
        <p>{activity.title}</p>
        <span className={Styles.activity_time}>
          {formatTime(activity.createdAt)}
        </span>
        {note && <div className={Styles.activity_note}>{note}</div>}
      </div>
    </div>
  );
};

const ActivityLog = ({
  entityType,
  entityId,
  className,
  onRefresh,
  refreshKey,
}: ActivityLogProps) => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const { openModal } = useModal();

  const refreshActivities = useCallback(() => {
    getActivities(entityType, entityId).then((data) => {
      setActivities(data);
    });
  }, [entityType, entityId]);

  useEffect(() => {
    refreshActivities();
  }, [refreshActivities, refreshKey]);

  const grouped = groupByDate(activities);

  return (
    <div className={[Styles.activityLog, className].filter(Boolean).join(" ")}>
      <div className={Styles.activity_header}>
        <h3>
          <HistoryRegular fontSize={18} />
          Activity
        </h3>
        <MainButton
          type="secondary"
          text="Log Activity"
          icon={{ type: "svg", src: <AddRegular /> }}
          onClick={() =>
            openModal("log-activity", {
              entityType,
              entityId,
              onSuccess: () => {
                refreshActivities();
                onRefresh?.();
              },
            })
          }
        />
      </div>

      {activities.length === 0 ? (
        <div className={Styles.empty_state}>No activity yet</div>
      ) : (
        <div className={Styles.content_wrapper}>
          <div className={Styles.activity_list}>
            {Array.from(grouped.entries()).map(([dateKey, items]) => (
              <div key={dateKey} className={Styles.date_group}>
                <span className={Styles.date_label}>
                  {formatDateGroup(items[0].createdAt)}
                </span>
                {items.map((activity, index) => (
                  <ActivityItem
                    activity={activity}
                    key={`${dateKey}-${index}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
