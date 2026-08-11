import { ActivitySource, ActivityType } from "@/generated/prisma/enums";
import { ActivityLogService } from "@/modules/activity-log/service";

type RecordActivityInput = {
    organizationId: string;
    memberId: string;
    recordId: string;
};

export type RecordFieldChange = {
    fieldName: string;
    previousValue: unknown;
    nextValue: unknown;
};

const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "empty";
    const formatted = typeof value === "string" ? value : JSON.stringify(value);
    const truncated = formatted.length > 120
        ? `${formatted.slice(0, 117)}...`
        : formatted;
    return `"${truncated}"`;
};

const logRecordEvent = (
    input: RecordActivityInput,
    event: {
        activityType: ActivityType;
        title: string;
        metadata?: Record<string, unknown>;
    },
) => ActivityLogService.log({
    organizationId: input.organizationId,
    memberId: input.memberId,
    entity: { entityType: "record", entityId: input.recordId },
    source: ActivitySource.SYSTEM,
    ...event,
});

export const RecordActivityService = {
    created(input: RecordActivityInput & { recordName: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.CREATION,
            title: `Record "${input.recordName}" created`,
        });
    },

    async fieldsUpdated(input: RecordActivityInput & { changes: RecordFieldChange[] }) {
        for (const change of input.changes) {
            await logRecordEvent(input, {
                activityType: ActivityType.STATUS_CHANGE,
                title: `Record ${change.fieldName} has been updated from ${formatValue(change.previousValue)} to ${formatValue(change.nextValue)}`,
                metadata: {
                    fieldName: change.fieldName,
                    previousValue: change.previousValue,
                    nextValue: change.nextValue,
                },
            });
        }
    },

    ownershipTransferred(input: RecordActivityInput & {
        previousOwnerId: string;
        previousOwnerName: string;
        nextOwnerId: string;
        nextOwnerName: string;
    }) {
        return logRecordEvent(input, {
            activityType: ActivityType.ASSIGNMENT,
            title: `Record ownership transferred from ${input.previousOwnerName} to ${input.nextOwnerName}`,
            metadata: {
                previousOwnerId: input.previousOwnerId,
                nextOwnerId: input.nextOwnerId,
            },
        });
    },

    archived(input: RecordActivityInput & { recordName: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.DELETION,
            title: `Record "${input.recordName}" archived`,
        });
    },

    taskCreated(input: RecordActivityInput & { taskName: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.TASK,
            title: `Task added: "${input.taskName}"`,
        });
    },

    taskUpdated(input: RecordActivityInput & { taskName: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.TASK,
            title: `Task updated: "${input.taskName}"`,
        });
    },

    taskStatusChanged(input: RecordActivityInput & {
        taskName: string;
        previousStatus: string;
        nextStatus: string;
    }) {
        return logRecordEvent(input, {
            activityType: ActivityType.TASK,
            title: `Task "${input.taskName}" status changed from ${input.previousStatus} to ${input.nextStatus}`,
            metadata: {
                previousStatus: input.previousStatus,
                nextStatus: input.nextStatus,
            },
        });
    },

    taskDeleted(input: RecordActivityInput & { taskName: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.TASK,
            title: `Task deleted: "${input.taskName}"`,
        });
    },

    noteCreated(input: RecordActivityInput & { noteTitle: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.NOTE,
            title: `Note added: "${input.noteTitle || "Untitled note"}"`,
        });
    },

    noteUpdated(input: RecordActivityInput & { noteTitle: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.NOTE,
            title: `Note updated: "${input.noteTitle || "Untitled note"}"`,
        });
    },

    noteDeleted(input: RecordActivityInput & { noteTitle: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.NOTE,
            title: `Note deleted: "${input.noteTitle || "Untitled note"}"`,
        });
    },

    fileAdded(input: RecordActivityInput & { fileName: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.FILE,
            title: `File added: "${input.fileName}"`,
        });
    },

    fileDeleted(input: RecordActivityInput & { fileName: string }) {
        return logRecordEvent(input, {
            activityType: ActivityType.FILE,
            title: `File deleted: "${input.fileName}"`,
        });
    },
};