"use client";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";

import OverviewTab from "./tabs/Overview";
import TasksTab from "./tabs/Tasks";
import CommentsTab from "./tabs/Comments";
import FilesTab from "./tabs/Files";
import {
  TaskListSquareLtrRegular,
  
  NoteRegular,
  NoteFilled,
  TargetFilled,
  SlashForwardFilled,
  ArrowLeftRegular,
  TaskListSquareAddRegular,
  NoteAddRegular,
  CallRegular,
  FolderRegular,
  FolderFilled,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Styles from "./DealPage.module.css";
import { getDealById } from "../../actions";
import { DealWithRelations } from "../../types";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import Link from "next/link";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";

const tabs = [
  { label: "Overview", id: "overview" },
  {
    label: "Tasks",
    id: "tasks",
    color: "rgb(14, 74, 185)",
    icon: {
      regular: <TaskListSquareLtrRegular />,
      filled: <TaskListSquareLtrFilled />,
    },
  },
  {
    label: "Notes",
    id: "notes",
    color: "rgb(228, 119, 46)",
    icon: { regular: <NoteRegular />, filled: <NoteFilled /> },
  },
  {
    label: "Files",
    id: "files",
    color: "rgb(245, 197, 66)",
    icon: { regular: <FolderRegular />, filled: <FolderFilled /> },
  },
];

const DealPage = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const [deal, setDeal] = useState<DealWithRelations | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { openModal } = useModal();

  const contactPhone = deal?.contact?.phone;

  function triggerCall() {
    if (contactPhone) {
      window.open(`tel:${contactPhone}`);
    }
  }

  const iconButtons = [
    {
      id: "create_task",
      tooltip: "Create Task",
      icon: <TaskListSquareAddRegular />,
      onClick: () => openModal("task", { dealId }),
    },
    {
      id: "create_note",
      tooltip: "Add Note",
      icon: <NoteAddRegular />,
      onClick: () => openModal("note", { dealId }),
    },
    contactPhone && {
      id: "call",
      tooltip: "Call Contact",
      icon: <CallRegular />,
      onClick: triggerCall,
    },
  ].filter(Boolean) as {
    id: string;
    tooltip: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[];

  const refreshDeal = useCallback(() => {
    if (dealId) {
      getDealById(dealId).then((data) => {
        setDeal(data);
      });
    }
  }, [dealId]);

  useEffect(() => {
    refreshDeal();
  }, [refreshDeal]);

  useEffect(() => {
    if (deal?.title) {
      window.document.title = `Deal: ${deal.title}`;
    }
  }, [deal]);

  if (deal)
    return (
      <div id={Styles.leadPage}>
        <header className="global_header">
          <Link
            href={`/app/${deal.organizationId}/deals`}
            className="g_header_section_name"
          >
            <ArrowLeftRegular fontSize={14} />
          </Link>
          <div className="g_header_section_name">
            <span style={{ backgroundColor: "rgb(0, 130, 54)" }}>
              <TargetFilled fontSize={20} color="#fff" />
            </span>
            <h2>Deals</h2>
          </div>
          <span className="g_header_slash">
            <SlashForwardFilled fontSize={14} />
          </span>
          <div className="g_header_entity_name">
            <AvatarFallback
              name={deal.title || "Deal Details"}
              entityKind="customer"
              entityId={deal.id}
              size={22}
              style={{ borderRadius: 8 }}
              letterCount={1}
            />
            <h2>{deal.title || "Deal Details"}</h2>
          </div>
        </header>
        <TabsControlHeader
          tabs={tabs}
          onTabBtnClick={setActiveTab}
          showMainBtn={false}
          iconButtons={iconButtons}
        />
        <div
          className="flex-col w-full"
          style={{ height: "100%", overflow: "hidden" }}
        >
          {activeTab === "overview" && (
            <OverviewTab deal={deal} onRefresh={refreshDeal} />
          )}
          {activeTab === "tasks" && <TasksTab />}
          {activeTab === "notes" && <CommentsTab />}
          {activeTab === "files" && <FilesTab dealId={deal.id} />}
        </div>
      </div>
    );
};

export default DealPage;
