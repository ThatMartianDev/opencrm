import { z } from "zod";

export const catcherInputTypeSchema = z.enum([
    "command",
    "transcript",
    "email",
    "chat",
]);

const timezoneSchema = z.string().trim().min(1).max(100).refine(
    (timezone) => {
        try {
            new Intl.DateTimeFormat("en-US", { timeZone: timezone });
            return true;
        } catch {
            return false;
        }
    },
    { message: "Invalid timezone." },
);

export const catcherActionPropsSchema = z.object({
    threadId: z.string().trim().min(1).max(100).optional(),
    selection: z.object({
        recordId: z.string().trim().min(1).max(100),
    }).optional(),
    clarification: z.object({
        answers: z.record(
            z.string().trim().min(1).max(100),
            z.string().trim().min(1).max(10_000),
        ),
    }).optional(),
    input: z.string().trim().min(1).max(10_000),
    context: z.object({
        inputType: catcherInputTypeSchema.default("command"),
        current_page: z.string().trim().min(1).max(500),
        timezone: timezoneSchema,
        localDatetime: z.string().refine(
            (value) => !Number.isNaN(Date.parse(value)),
            { message: "Invalid local datetime." },
        ),
    }),
});

export const searchRecordsToolSchema = z.object({
    moduleIds: z.array(z.string().trim().min(1)).max(20),
    query: z.string().trim().min(1).max(500),
    limit: z.number().int().min(1).max(10).default(5),
});

const actionValueSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string()),
]);

const recordFieldValueSchema = z.object({
    fieldId: z.string().min(1),
    value: actionValueSchema,
});

const actionPresentationSchema = z.object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    details: z.array(z.object({
        label: z.string().min(1),
        value: z.string(),
    })),
    module: z.object({
        name: z.string().min(1),
        icon: z.string().min(1),
        accentColor: z.string().nullable(),
    }).optional(),
});

export const catcherActionSchema = z.discriminatedUnion("type", [
    z.object({
        id: z.string().min(1),
        type: z.literal("record.create"),
        moduleId: z.string().min(1),
        values: z.array(recordFieldValueSchema).min(1),
        presentation: actionPresentationSchema.optional(),
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal("record.patch_fields"),
        moduleId: z.string().min(1),
        recordId: z.string().min(1),
        changes: z.array(recordFieldValueSchema).min(1),
        presentation: actionPresentationSchema.optional(),
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal("task.create"),
        name: z.string().min(1),
        description: z.string().nullable(),
        dueDate: z.string().nullable(),
        recordId: z.string().nullable(),
        recordActionId: z.string().nullable().optional(),
        presentation: actionPresentationSchema.optional(),
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal("note.create"),
        title: z.string().min(1),
        content: z.string().min(1),
        recordId: z.string().nullable(),
        recordActionId: z.string().nullable().optional(),
        presentation: actionPresentationSchema.optional(),
    }),
]);

const catcherCandidateSchema = z.object({
    id: z.string().min(1),
    moduleId: z.string().min(1),
    moduleKey: z.string().min(1),
    moduleName: z.string().min(1),
    moduleIcon: z.string().min(1).optional(),
    moduleAccentColor: z.string().nullable().optional(),
    displayName: z.string().min(1),
    summary: z.array(z.object({
        label: z.string(),
        value: z.string(),
    })),
});

const legacyClarificationSchema = z.object({
    kind: z.literal("clarification"),
    runId: z.string().min(1),
    question: z.string().min(1),
    choices: z.array(z.object({
        recordId: z.string().min(1),
        label: z.string().min(1),
    })),
    candidates: z.array(catcherCandidateSchema),
});

const typedClarificationSchema = z.object({
    kind: z.literal("clarification"),
    runId: z.string().min(1),
    question: z.string().min(1),
    fields: z.array(z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(["text", "single_choice", "record_choice"]),
        options: z.array(z.object({
            value: z.string().min(1),
            label: z.string().min(1),
        })),
    })).min(1),
    candidates: z.array(catcherCandidateSchema),
    pendingRecord: z.object({
        moduleId: z.string().min(1),
        values: z.array(recordFieldValueSchema),
    }).nullable(),
});

export const catcherResponseSchema = z.union([
    legacyClarificationSchema,
    typedClarificationSchema,
    z.object({
        kind: z.literal("proposal"),
        runId: z.string().min(1),
        summary: z.string().min(1),
        actions: z.array(catcherActionSchema).min(1),
    }),
    z.object({
        kind: z.literal("info"),
        runId: z.string().min(1),
        message: z.string().min(1),
    }),
    z.object({
        kind: z.literal("error"),
        runId: z.string().min(1).optional(),
        error: z.string().min(1),
    }),
]);

export const approveCatcherSchema = z.object({
    runId: z.string().trim().min(1).max(100),
    actionIds: z.array(z.string().trim().min(1).max(100)).min(1).max(50)
        .refine((ids) => new Set(ids).size === ids.length, {
            message: "Action IDs must be unique.",
        }),
});

export const linkedRecordsToolSchema = z.object({
    recordId: z.string().trim().min(1).max(100),
    query: z.string().trim().max(500),
    limit: z.number().int().min(1).max(20).default(10),
});