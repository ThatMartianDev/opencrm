import {
  FolderRegular,
  NoteRegular,
  TaskListSquareLtrRegular,
} from "@fluentui/react-icons";
import {
  ModuleFeature,
  type ModuleFeature as ModuleFeatureValue,
} from "@/generated/prisma/enums";
import OptionToggle from "@/components/micro/OptionToggle/OptionToggle";
import type { Dispatch, SetStateAction } from "react";
import Styles from "./ModuleFeatures.module.css";

const FEATURE_OPTIONS = [
  {
    type: ModuleFeature.NOTES,
    label: "Notes",
    description: "Attach notes and context to records.",
    icon: <NoteRegular />,
  },
  {
    type: ModuleFeature.TASKS,
    label: "Tasks",
    description: "Create and track work related to records.",
    icon: <TaskListSquareLtrRegular />,
  },
  {
    type: ModuleFeature.FILES,
    label: "Files",
    description: "Upload and organize files on records.",
    icon: <FolderRegular />,
  },
] as const;

type ModuleFeaturesProps = {
  isActive: boolean;
  features: ModuleFeatureValue[];
  setFeatures: Dispatch<SetStateAction<ModuleFeatureValue[]>>;
};

const ModuleFeatures = ({
  isActive,
  features,
  setFeatures,
}: ModuleFeaturesProps) => {
  const toggleFeature = (feature: ModuleFeatureValue, checked: boolean) => {
    setFeatures((currentFeatures) => {
      if (checked) {
        return currentFeatures.includes(feature)
          ? currentFeatures
          : [...currentFeatures, feature];
      }

      return currentFeatures.filter(
        (currentFeature) => currentFeature !== feature,
      );
    });
  };

  return (
    <div className={`${Styles.moduleFeatures} ${isActive ? Styles.active : ""}`}>
      <div className={Styles.header}>
        <h3>Module Features</h3>
        <p>Choose the tools available on records in this module.</p>
      </div>
      <div className={Styles.featureList}>
        {FEATURE_OPTIONS.map((feature) => (
          <div className={Styles.featureOption} key={feature.type}>
            <div className={Styles.featureDetails}>
              <span className={Styles.icon}>{feature.icon}</span>
              <div>
                <h4>{feature.label}</h4>
                <p>{feature.description}</p>
              </div>
            </div>
            <OptionToggle
              checked={features.includes(feature.type)}
              onChange={(checked) => toggleFeature(feature.type, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleFeatures;
