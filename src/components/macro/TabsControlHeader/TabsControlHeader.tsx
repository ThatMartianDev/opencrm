"use client";
import { useState } from "react";
import Styles from "./TabsControlHeader.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

type TabsControlHeaderProps = {
  tabs: {
    id: string;
    label: string;
    icon?: {
        regular: React.ReactNode;
        filled: React.ReactNode;
    };
    color?: string;
    bgActiveColor?: string;
  }[];
  showSearch?: boolean;
  showFilter?: boolean;
  showMainBtn?: boolean;

  searchValue?: string;
  onSearchChange?: (value: string) => void;

  filterOptions?: {
    id: string;
    label: string;
  }[];
  onFilterSelect?: (id: string) => void;

  mainButton?: {
    text: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  iconButtons?: {
    id: string;
    icon: React.ReactNode;
    tooltip?: string;
    onClick: () => void;
  }[];
  onTabBtnClick?: (id: string) => void;
};

const TabsControlHeader = ({
  tabs,
  showSearch,
  showFilter,
  showMainBtn,
  searchValue,
  onSearchChange,
  filterOptions,
  onFilterSelect,
  mainButton,
  iconButtons,
  onTabBtnClick,
}: TabsControlHeaderProps) => {
  const [showFiltersWindow, setShowFiltersWindow] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "");

  return (
    <div className={Styles.TabsControlHeader}>
      <div className={Styles.header_content}>
        <div className={Styles.tabs_btns}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${Styles.tab_btn} ${tab.icon ? Styles.with_icon : ""} ${activeTab === tab.id ? Styles.active : ""}`}
              style={{ "--tab-color": tab.color, "--tab-bg-active-color": tab.bgActiveColor } as React.CSSProperties}
              onClick={() => {
                setActiveTab(tab.id);
                onTabBtnClick?.(tab.id);
              }}
            >
              {tab.icon && <span className={Styles.tab_icon}>{activeTab === tab.id ? tab.icon.filled : tab.icon.regular}</span>}
              <p>{tab.label}</p>
            </button>
          ))}
        </div>
        {(showSearch || showFilter) && (
          <div className={Styles.controls}>
            {showSearch && (
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className={Styles.search_input}
              />
            )}
            {showFilter && filterOptions && (
              <button onClick={() => setShowFiltersWindow(!showFiltersWindow)}>
                Filter
              </button>
            )}
          </div>
        )}
        {(showMainBtn || iconButtons) && (
          <div className={Styles.main_controls}>
            {iconButtons && (
              <div className={Styles.icon_buttons}>
                {iconButtons.map((button) => (
                  <button
                    key={button.id}
                    onClick={button.onClick}
                    title={button.tooltip}
                    className={Styles.icon_button}
                  >
                    {button.icon}
                  </button>
                ))}
              </div>
            )}

            {showMainBtn && mainButton && (
              <MainButton
                type="primary"
                text={mainButton.text}
                icon={
                  mainButton.icon
                    ? { type: "svg", src: mainButton.icon }
                    : undefined
                }
                onClick={mainButton.onClick}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabsControlHeader;
