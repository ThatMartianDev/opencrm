import { DealStage } from "@/generated/prisma/enums";

export type OptionConfig = {
    value: string;
    label: string;
    color: string;
};

export const DEAL_STAGE_OPTIONS: OptionConfig[] = [
    { value: DealStage.PROSPECT, label: "Prospect", color: "#3B82F6" },
    { value: DealStage.QUALIFIED, label: "Qualified", color: "#8B5CF6" },
    { value: DealStage.PROPOSAL, label: "Proposal", color: "#F59E0B" },
    { value: DealStage.NEGOTIATION, label: "Negotiation", color: "#14B8A6" },
    { value: DealStage.WON, label: "Won", color: "#10B981" },
    { value: DealStage.LOST, label: "Lost", color: "#EF4444" },
];

export const DEAL_STATUS_OPTIONS: OptionConfig[] = [
    { value: "contacted", label: "Contacted", color: "#6366F1" },
    { value: "not_responding", label: "Not Responding", color: "#F97316" },
    { value: "stale", label: "Stale", color: "#9CA3AF" },
    { value: "proposal_sent", label: "Proposal Sent", color: "#8B5CF6" },
    { value: "negotiating", label: "Negotiating", color: "#14B8A6" },
    { value: "follow_up", label: "Follow Up", color: "#F59E0B" },
];
