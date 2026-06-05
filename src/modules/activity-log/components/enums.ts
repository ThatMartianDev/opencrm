import { ActivityOutcome, ActivityType } from "@/generated/prisma/enums";

export const ACTIVITY_TYPES = [
  { value: ActivityType.CALL, label: "Call Attempt" },
  { value: ActivityType.MESSAGE, label: "WhatsApp Message" },
  { value: ActivityType.EMAIL, label: "Email" },
  { value: ActivityType.MEETING, label: "Meeting" },
] as const;

export const ACTIVITY_VERDICTS = [
  {
    parent: ActivityType.CALL,
    options: [
      { value: ActivityOutcome.NO_ANSWER, label: "No Answer" },
      { value: ActivityOutcome.VOICEMAIL, label: "Voicemail" },
      { value: ActivityOutcome.ANSWERED, label: "Customer Answered" },
    ],
  },
  {
    parent: ActivityType.MESSAGE,
    options: [
      { value: ActivityOutcome.DELIVERED, label: "Delivered" },
      { value: ActivityOutcome.READ, label: "Read" },
      { value: ActivityOutcome.REPLIED, label: "Replied" },
    ],
  },
  {
    parent: ActivityType.EMAIL,
    options: [
      { value: ActivityOutcome.DELIVERED, label: "Delivered" },
      { value: ActivityOutcome.OPENED, label: "Opened" },
      { value: ActivityOutcome.REPLIED, label: "Replied" },
    ],
  },
  {
    parent: ActivityType.MEETING,
    options: [
      { value: ActivityOutcome.SCHEDULED, label: "Scheduled" },
      { value: ActivityOutcome.COMPLETED, label: "Completed" },
      { value: ActivityOutcome.CANCELED, label: "Canceled" },
      { value: ActivityOutcome.RESCHEDULED, label: "Rescheduled" },
    ],
  },
];