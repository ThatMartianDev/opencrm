import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import Styles from "./QuickActions.module.css";

import { useState, type ReactNode } from "react";

import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useWorkspaceData } from "../workspace-provider";
import ModuleIcon from "@/modules/RecordModule/ui/components/ModuleIcon";

import {
  DismissRegular,
  SearchRegular,
  CalendarRegular,
  TaskListSquareLtrRegular,
  NoteRegular,
  MailRegular,
  BotSparkleRegular,
} from "@fluentui/react-icons";

type QuickActionItem = {
  id: string;
  title: string;
  action: () => void;
  icon: ReactNode;
};

type QuickActionCategory = {
  category: string;
  items: QuickActionItem[];
};

const QuickActions = ({ onClose }: { onClose: () => void }) => {
  const { openModal } = useModal();
  const { recordModules } = useWorkspaceData();
  const [results, setResults] = useState<QuickActionCategory[]>([]);
  const [foundDefaultResults, setFoundDefaultResults] = useState(false);

  const defaultResults: QuickActionCategory[] = [
    {
      category: "my-space",
      items: [
        {
          id: "quick-catcher",
          title: "Quick Catcher",
          action: () => openModal("quick_catcher"),
          icon: <BotSparkleRegular fontSize={20} />,
        },
        {
          id: "1",
          title: "New Task",
          action: () => openModal("task"),
          icon: <TaskListSquareLtrRegular fontSize={20} />,
        },
        {
          id: "2",
          title: "New Note",
          action: () => openModal("note"),
          icon: <NoteRegular fontSize={20} />,
        },
        {
          id: "3",
          title: "Compose Email",
          action: () => openModal("compose-email"),
          icon: <MailRegular fontSize={20} />,
        },
        {
          id: "4",
          title: "Create Calendar Event",
          action: () => openModal("calendar-event"),
          icon: <CalendarRegular fontSize={20} />,
        },
      ],
    },
    {
      category: "records",
      items: [
        /* Legacy fixed record actions are replaced by configurable record modules.
        {
          id: "1",
          title: "Create New Deal",
          action: () => openModal("new-deal"),
          icon: (
            <span
              className={Styles.icon_wrapper}
              style={{ backgroundColor: "#008236" }}
            >
              <TargetFilled fontSize={16} />
            </span>
          ),
        },
        {
          id: "2",
          title: "Add New Contact",
          action: () => openModal("new-contact"),
          icon: (
            <span
              className={Styles.icon_wrapper}
              style={{ backgroundColor: "#6D3A92" }}
            >
              <PeopleFilled fontSize={16} />
            </span>
          ),
        },
        {
          id: "3",
          title: "Add Company",
          action: () => openModal("new-company"),
          icon: (
            <span
              className={Styles.icon_wrapper}
              style={{ backgroundColor: "#0E76B9" }}
            >
              <BuildingFilled fontSize={16} />
            </span>
          ),
        },
        */
        ...recordModules.map((module) => ({
          id: module.id,
          title: `New ${module.name}`,
          action: () =>
            openModal("create-record", { moduleKey: module.key }),
          icon: (
            <span
              className={Styles.icon_wrapper}
              style={{ backgroundColor: module.accentColor ?? "#5670ff" }}
            >
              <ModuleIcon name={module.icon} />
            </span>
          ),
        })),
      ],
    },
  ];

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value.toLowerCase();
    if (!query) {
      setResults([]);
      setFoundDefaultResults(false);
      return;
    }
    const FilterDefaultResults = defaultResults
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.title.toLowerCase().includes(query),
        ),
      }))
      .filter((category) => category.items.length > 0);
    setResults(FilterDefaultResults);
    setFoundDefaultResults(FilterDefaultResults.length > 0);
  }

  return (
    <div className={S.modalCard}>
      <div
        className={S.modalHeader}
        style={{ justifyContent: "space-between" }}
      >
        <h2>Quick Actions</h2>
        <button className={S.closeButton} onClick={onClose}>
          <DismissRegular fontSize={20} />
        </button>
      </div>
      <div className={S.modalBody} style={{ gap: "10px" }}>
        <div className={Styles.search_bar}>
          <input
            type="search"
            name="search_platform"
            id="search_platform"
            placeholder="Search through the Platform Features and Your Records..."
            onChange={handleSearch}
          />
          <SearchRegular fontSize={20} />
        </div>
        <div className={Styles.actions_wrapper}>
          {!results.length
            ? defaultResults.map((category) => (
                <div key={category.category} className={Styles.category}>
                  <h3>{category.category.replace("-", " ")}</h3>
                  <div className={Styles.actions}>
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={item.action}
                        className={Styles.action_button}
                      >
                        {item?.icon && item.icon}
                        <p>{item.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            : null}

          {results.length > 0 &&
            foundDefaultResults &&
            results.map((result) => (
              <div key={result.category} className={Styles.actions}>
                {result.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className={Styles.action_button}
                  >
                    {item?.icon && item.icon}
                    <p>{item.title}</p>
                  </button>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
