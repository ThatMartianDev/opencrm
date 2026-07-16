"use client";
import {
  BoardRegular,
  BoardFilled,
  ListBarRegular,
  ListBarFilled,
  TargetFilled,
} from "@fluentui/react-icons";

import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import Styles from "./DealsPage.module.css";
import { useEffect, useState } from "react";
import { getDeals } from "./actions";

type DealRow = Awaited<ReturnType<typeof getDeals>>[number];

import ListTab from "./components/tabs/ListTab/ListTab";
import BoardTab from "./components/tabs/Board/BoardTab";

const tabs = [
  {
    label: "Board",
    id: "board",
    color: "rgba(14, 118, 185, 1)",
    bgActiveColor: "rgba(14, 118, 185, 0.08)",
    icon: { regular: <BoardRegular />, filled: <BoardFilled /> },
  },
  {
    label: "List",
    id: "list",
    color: "rgba(109, 58, 146, 1)",
    bgActiveColor: "rgba(109, 58, 146, 0.06)",
    icon: { regular: <ListBarRegular />, filled: <ListBarFilled /> },
  },
];

const DealsPage = () => {
  const [activeTab, setActiveTab] = useState("board");
  const [deals, setDeals] = useState<DealRow[]>([]);
  const { openModal } = useModal();

  function handleCreateDeal() {
    openModal("new-deal");
  }

  useEffect(() => {
    window.document.title = "Deals";
    getDeals()
      .then((deals) => {
        setDeals(deals);
      })
      .catch((error) => {
        console.error("Error fetching deals:", error);
      });
  }, []);

  return (
    <div id={Styles.leadsPage}>
      <header className="global_header">
        <div className="g_header_section_name">
          <span style={{ backgroundColor: "rgb(0, 130, 54)" }}>
            <TargetFilled fontSize={20} color="#fff" />
          </span>
          <h2>Deals</h2>
        </div>
      </header>
      <div className="flex-col" style={{ height: "100%" }}>
        <TabsControlHeader
          tabs={tabs}
          onTabBtnClick={setActiveTab}
          showMainBtn={true}
          mainButton={{ text: "Create New Deal", onClick: handleCreateDeal }}
        />
        {activeTab === "board" && <BoardTab deals={deals} />}
        {activeTab === "list" && <ListTab deals={deals} />}
      </div>
    </div>
  );
};

export default DealsPage;
