import { getDeals } from "@/modules/deals/actions";

type DealRow = Awaited<ReturnType<typeof getDeals>>[number];

import Styles from "./ListTab.module.css";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useRouter } from "next/dist/client/components/navigation";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { DEAL_STAGE_OPTIONS, DEAL_STATUS_OPTIONS } from "../../../config";

type ListTabProps = {
  deals: DealRow[];
};

const ListItem = ({
  deal,
  workSpaceId,
}: {
  deal: DealRow;
  workSpaceId: string;
}) => {
  const router = useRouter();

  const assignee = deal.assignedTo
    ? { id: deal.assignedToId!, name: deal.assignedTo.user.name || "Unknown", avatarUrl: deal.assignedTo.user.avatarUrl }
    : null;

  function handleClickDeal(dealId: string) {
    router.push(`/app/${workSpaceId}/deals/${dealId}`);
  }

  return (
    <div className={Styles.table_row} onClick={() => handleClickDeal(deal.id)}>
      <div className={Styles.item_name}>
        <AvatarFallback
          name={deal.title}
          entityKind="customer"
          entityId={deal.id}
          size={24}
          letterCount={1}
          style={{ borderRadius: 8 }}
        />
        <p>{deal.title}</p>
      </div>
      <div className="flex">
        <span
          style={{
            backgroundColor: DEAL_STAGE_OPTIONS.find(
              (opt) => opt.value === deal.stage,
            )?.color,
            borderRadius: "50%",
            width: "8px",
            height: "8px",
            display: "inline-block",
            marginRight: "4px",
          }}
        ></span>
        <p>
          {DEAL_STAGE_OPTIONS.find((opt) => opt.value === deal.stage)?.label ||
            "Set Stage"}
        </p>
      </div>
      <div className="flex">
        <span
          style={{
            backgroundColor: DEAL_STATUS_OPTIONS.find(
              (opt) => opt.value == deal.status,
            )?.color,
            borderRadius: "50%",
            width: "8px",
            height: "8px",
            display: "inline-block",
            marginRight: "4px",
          }}
        ></span>
        <p>
          {DEAL_STATUS_OPTIONS.find((opt) => opt.value === deal.status)
            ?.label || "Set Status"}
        </p>
      </div>
      <div>
        <p>{deal.value?.toString() || "—"}</p>
      </div>
      <div className="flex">
        <AvatarFallback
          name={assignee?.name || "Unassigned"}
          entityKind="member"
          entityId={assignee?.id || ""}
          size={20}
        />
        <p>{assignee?.name || "Unassigned"}</p>
      </div>
    </div>
  );
};

const ListTab = ({ deals }: ListTabProps) => {
  const workSpace = useWorkspaceData();

  return (
    <div className={Styles.listTab}>
      <div id={Styles.table}>
        <div className={`${Styles.table_header}`}>
          <div>
            <p>Title</p>
          </div>
          <div>
            <p>Stage</p>
          </div>
          <div>
            <p>Status</p>
          </div>
          <div>
            <p>Value</p>
          </div>
          <div>
            <p>Assigned to</p>
          </div>
        </div>
        {deals.map((deal) => (
          <ListItem
            key={deal.id}
            deal={deal}
            workSpaceId={workSpace.organizationId}
          />
        ))}
      </div>
    </div>
  );
};

export default ListTab;
