import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import Styles from "./QuickActions.module.css";

import { useState } from "react";

import { useModal } from "@/components/macro/ModalProvider/ModalProvider";

import {
  DismissRegular,
  SearchRegular,
  CalendarRegular,
  TaskListSquareLtrRegular,
  NoteRegular,
  MailRegular,
  PeopleFilled,
  TargetFilled,
  BuildingFilled,
} from "@fluentui/react-icons";
import { fa } from "zod/v4/locales";

const QuickActions = ({ onClose }: { onClose: () => void }) => {
  const { openModal } = useModal();
  const [results, setResults] = useState<any>([]);
  const [foundDefaultResults, setFoundDefaultResults] = useState(false);

  const defaultResults = [
    {
      category: "my-space",
      items: [
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
            results.map((result: any) => (
              <div className={Styles.actions}>
                {result.items.map((item: any) => (
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
