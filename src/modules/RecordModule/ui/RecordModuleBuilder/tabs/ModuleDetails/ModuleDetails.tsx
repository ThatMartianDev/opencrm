import type { ModuleDetails as ModuleDetailsType } from "../../types";
import { useEffect, useState, useRef } from "react";
import Styles from "./ModuleDetails.module.css";

import {
  TargetFilled,
  PeopleFilled,
  MoneyFilled,
  PersonFilled,
} from "@fluentui/react-icons";

const IconSelector = ({
  backgroundColor,
  selectedIcon,
  setSelectedIcon,
  setShowIconSelector,
}: {
  backgroundColor: string;
  selectedIcon: any;
  setSelectedIcon: (icon: any) => void;
  setShowIconSelector: (show: boolean) => void;
}) => {
  const icons = [
    { name: "TargetFilled", component: TargetFilled },
    { name: "PeopleFilled", component: PeopleFilled },
    { name: "MoneyFilled", component: MoneyFilled },
    { name: "PersonFilled", component: PersonFilled },
  ];

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
  }, []);

  return (
    <div className={Styles.icon_selector} ref={selectorRef}>
      {icons.map((icon) => (
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
  }, []);

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
  moduleDetails: ModuleDetailsType | null;
  setDetails: (details: ModuleDetailsType) => void;
}) => {
  const [selectedIcon, setSelectedIcon] = useState({
    name: "TargetFilled",
    component: TargetFilled,
  });
  const [backgroundColor, setBackgroundColor] = useState("#0dc98a");
  const [name, setName] = useState(moduleDetails?.name || "");
  const [pluralName, setPluralName] = useState(moduleDetails?.pluralName || "");
  const [description, setDescription] = useState(
    moduleDetails?.description || "",
  );

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
            style={{ backgroundColor: backgroundColor || "#FFF" }}
          >
            {selectedIcon.component && (
              <selectedIcon.component fontSize={30} color="#fff" />
            )}
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
                backgroundColor={backgroundColor}
                selectedIcon={selectedIcon}
                setSelectedIcon={setSelectedIcon}
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
                selectedColor={backgroundColor}
                setSelectedColor={setBackgroundColor}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={pluralName}
              onChange={(e) => setPluralName(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetails;
