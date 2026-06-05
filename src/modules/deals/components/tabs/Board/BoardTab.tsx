
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import KanbanBoard from "@/components/macro/KanbanBoard/KanbanBoard";
import type { KanbanColumn } from "@/components/macro/KanbanBoard/KanbanBoard";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useToast } from "@/components/macro/Toaster";
import { DEAL_STAGE_OPTIONS } from "@/modules/deals/config";
import { updateDealStage } from "@/modules/deals/actions";
import { getDeals } from "@/modules/deals/actions";
import { DealStage } from "@/generated/prisma/enums";

import Styles from "./BoardTab.module.css";

type DealRow = Awaited<ReturnType<typeof getDeals>>[number];

type BoardTabProps = {
    deals: DealRow[];
};

const DealCard = ({ deal, workspaceId }: { deal: DealRow; workspaceId: string }) => {
    const router = useRouter();

    return (
        <div
            className={Styles.deal_card}
            onClick={() => router.push(`/app/${workspaceId}/deals/${deal.id}`)}
        >
            <div className={Styles.card_header}>
                <AvatarFallback
                    name={deal.title}
                    entityKind="customer"
                    entityId={deal.id}
                    size={20}
                    letterCount={1}
                    style={{ borderRadius: 6 }}
                />
                <span className={Styles.card_title}>{deal.title}</span>
            </div>
            <div className={Styles.card_details}>
                <div>
                    <p>Value</p>
                    <p className={Styles.card_value}>{deal.value != null ? `$${deal.value.toLocaleString()}` : "—"}</p>
                </div>
                <div>
                    <p>Contact</p>
                    <p>{deal.contact ? deal.contact.name : "—"}</p>
                </div>
                <div>
                    <p>Assignee</p>
                    <p>{deal.assignedTo ? <AvatarFallback entityKind="member" entityId={deal.assignedToId} name={deal.assignedTo.user.name || "Unknown"} size={20} /> : "—"}</p>
                </div>
            </div>
        </div>
    );
};

const BoardTab = ({ deals }: BoardTabProps) => {
    const workspace = useWorkspaceData();
    const { toast } = useToast();

    const columns: KanbanColumn[] = useMemo(() => {
        return DEAL_STAGE_OPTIONS.map((stage) => ({
            id: stage.value,
            title: stage.label,
            color: stage.color,
            cards: deals
                .filter((deal) => deal.stage === stage.value)
                .map((deal) => ({
                    id: deal.id,
                    element: <DealCard deal={deal} workspaceId={workspace.organizationId} />,
                })),
        }));
    }, [deals, workspace.organizationId]);

    const handleCardMove = async (
        cardId: string,
        _fromColumnId: string,
        toColumnId: string,
    ): Promise<boolean> => {
        const deal = deals.find((d) => d.id === cardId);
        const stageName = DEAL_STAGE_OPTIONS.find((s) => s.value === toColumnId)?.label || toColumnId;
        const t = toast.loading(`Moving deal to ${stageName}...`);
        try {
            await updateDealStage(cardId, toColumnId as DealStage);
            t.success({
                title: "Deal stage updated",
                description: `"${deal?.title || "Deal"}" moved to ${stageName}.`,
                duration: 4000,
                actions: [
                    { label: "View deal", onClick: () => window.location.href = `/app/${workspace.organizationId}/deals/${cardId}`, primary: true },
                ],
            });
            return true;
        } catch (error) {
            t.error({
                title: "Failed to move deal",
                description: error instanceof Error ? error.message : "You may not have permission to update this deal.",
            });
            return false;
        }
    };

    return (
        <div className={Styles.board_tab}>
            <KanbanBoard
                columns={columns}
                onCardMove={handleCardMove}
            />
        </div>
    );
};

export default BoardTab;