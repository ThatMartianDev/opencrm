import type { ModuleDetails as ModuleDetailsType } from "../../types";
import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from "react";
import Styles from "./ModuleDetails.module.css";

import {
  BoxFilled,
  BuildingFilled,
  CalendarFilled,
  ChartMultipleFilled,
  DocumentFilled,
  FolderFilled,
  LocationFilled,
  MoneyFilled,
  PeopleFilled,
  PersonFilled,
  ShieldFilled,
  StarFilled,
  TagFilled,
  TargetFilled,
} from "@fluentui/react-icons";

const MODULE_ICONS = [
  { name: "TargetFilled", component: TargetFilled },
  { name: "PeopleFilled", component: PeopleFilled },
  { name: "MoneyFilled", component: MoneyFilled },
  { name: "PersonFilled", component: PersonFilled },
  { name: "BuildingFilled", component: BuildingFilled },
  { name: "DocumentFilled", component: DocumentFilled },
  { name: "CalendarFilled", component: CalendarFilled },
  { name: "TagFilled", component: TagFilled },
  { name: "BoxFilled", component: BoxFilled },
  { name: "FolderFilled", component: FolderFilled },
  { name: "ChartMultipleFilled", component: ChartMultipleFilled },
  { name: "LocationFilled", component: LocationFilled },
  { name: "ShieldFilled", component: ShieldFilled },
  { name: "StarFilled", component: StarFilled },
] as const;

type ModuleIconOption = (typeof MODULE_ICONS)[number];

const IconSelector = ({
  backgroundColor,
  selectedIcon,
  setSelectedIcon,
  setShowIconSelector,
}: {
  backgroundColor: string;
  selectedIcon: { name: ModuleDetailsType["icon"] };
  setSelectedIcon: (icon: ModuleIconOption) => void;
  setShowIconSelector: (show: boolean) => void;
}) => {
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setShowIconSelector(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [setShowIconSelector]);

  return (
    <div className={Styles.icon_selector} ref={selectorRef}>
      {MODULE_ICONS.map((icon) => (
        <button
          key={icon.name}
          style={{ backgroundColor: backgroundColor }}
          className={`${Styles.icon_button} ${selectedIcon.name === icon.name ? Styles.selected : ""}`}
          onClick={() => setSelectedIcon(icon)}
        >
          <icon.component fontSize={24} color="#FFF" />
        </button>
      ))}
    </div>
  );
};

const ColorSelector = ({
  selectedColor,
  setSelectedColor,
  setShowColorSelector,
}: {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  setShowColorSelector: (show: boolean) => void;
}) => {
  const colors = [
    "#0dc98a",
    "#ff5733",
    "#33c1ff",
    "#ff33a8",
    "#a833ff",
    "#33ff57",
    "#ffb833",
    "#33ffb8",
  ];

  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setShowColorSelector(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [setShowColorSelector]);

  return (
    <div className={Styles.color_selector} ref={selectorRef}>
      {colors.map((color) => (
        <button
          key={color}
          className={`${Styles.color_button} ${selectedColor === color ? Styles.selected : ""}`}
          style={{ backgroundColor: color }}
          onClick={() => setSelectedColor(color)}
        />
      ))}
    </div>
  );
};

const ModuleDetails = ({
  isActive,
  moduleDetails,
  setDetails,
}: {
  isActive: boolean;
  moduleDetails: ModuleDetailsType;
  setDetails: Dispatch<SetStateAction<ModuleDetailsType>>;
}) => {
  const icons = Object.fromEntries(
    MODULE_ICONS.map((icon) => [icon.name, icon.component]),
  ) as Record<ModuleIconOption["name"], ModuleIconOption["component"]>;
  const SelectedIcon = icons[moduleDetails.icon as keyof typeof icons] ?? TargetFilled;

  const updateDetails = (details: Partial<ModuleDetailsType>) => {
    setDetails((currentDetails) => ({ ...currentDetails, ...details }));
  };

  const [showIconSelector, setShowIconSelector] = useState(false);
  const [showColorSelector, setShowColorSelector] = useState(false);

  return (
    <div className={`${Styles.moduleDetails} ${isActive ? Styles.active : ""}`}>
      <div className={Styles.header}>
        <h3>Module Details</h3>
      </div>
      <div className={Styles.content}>
        <div className={Styles.icon}>
          <div
            className={Styles.icon_preview}
            style={{ backgroundColor: moduleDetails.accentColor }}
          >
            <SelectedIcon fontSize={30} color="#fff" />
          </div>
          <div className={Styles.selection_options}>
            <button
              onClick={() => {
                setShowIconSelector(!showIconSelector);
                setShowColorSelector(false);
              }}
            >
              Select Icon
            </button>
            {showIconSelector && (
              <IconSelector
                setShowIconSelector={setShowIconSelector}
                backgroundColor={moduleDetails.accentColor}
                selectedIcon={{ name: moduleDetails.icon }}
                setSelectedIcon={(icon) => updateDetails({ icon: icon.name })}
              />
            )}
            <button
              onClick={() => {
                setShowColorSelector(!showColorSelector);
                setShowIconSelector(false);
              }}
            >
              Choose Color
            </button>
            {showColorSelector && (
              <ColorSelector
                setShowColorSelector={setShowColorSelector}
                selectedColor={moduleDetails.accentColor}
                setSelectedColor={(accentColor) =>
                  updateDetails({ accentColor })
                }
              />
            )}
          </div>
        </div>
        <div className={Styles.two_columns}>
          <div className="form-group">
            <label htmlFor="moduleName" className="form-label required">
              Short Name
            </label>
            <input
              className="form-input"
              type="text"
              id="moduleName"
              placeholder="e.g: Deal"
              value={moduleDetails.name}
              onChange={(event) => updateDetails({ name: event.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="modulePluralName" className="form-label required">
              Plural Name
            </label>
            <input
              className="form-input"
              type="text"
              id="modulePluralName"
              placeholder="e.g: Deals"
              value={moduleDetails.pluralName}
              onChange={(event) =>
                updateDetails({ pluralName: event.target.value })
              }
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetails;
