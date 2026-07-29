import { DismissFilled } from "@fluentui/react-icons";
import Styles from "./RecordModuleBuilder.module.css";
import { useState } from "react";
import ModuleDetails from "./tabs/ModuleDetails/ModuleDetails";
import type { ModuleDetails as ModuleDetailsType } from "./types";
import DataFields from "./tabs/DataFields/DataFields";

type RecordModuleBuilderProps = {
  moduleId?: string;
  onClose: () => void;
};

const steps = [
  {
    id: "1",
    name: "Setup",
    description: "Configure the data aspects of the module.",
    substeps: [
      {
        id: "1.1",
        name: "Module Details",
        description:
          "Configure the basic details of the module, such as its name, description, and icon.",
      },
      {
        id: "1.2",
        name: "Data Fields",
        description:
          "Define the data fields that will be used to capture information in the module. This includes field types, validation rules, and any custom logic.",
      },
    ],
  },
  {
    id: "2",
    name: "Module Views",
    description:
      "Configure the views for the module, such as list views, detail views, and custom views.",
  },
  {
    id: "3",
    name: "Features",
    description:
      "Enable or disable specific features for the module, such as tasks, notes, activities, and more.",
  },
];

const RecordModuleBuilder = ({
  moduleId,
  onClose,
}: RecordModuleBuilderProps) => {
  const [activeStep, setActiveStep] = useState("1.1");

  const [moduleDetails, setModuleDetails] = useState<ModuleDetailsType | null>(null);

  return (
    <div className={Styles.recordModuleBuilder}>
      <div className={Styles.header}>
        <h3>Module Builder</h3>
        <button onClick={onClose}>
          <DismissFilled fontSize={20} />
        </button>
      </div>
      <div className={Styles.content}>
        <div className={Styles.sidebar}>
          <ul className={Styles.stepsList}>
            {steps.map((step, index) => (
              <li
                key={index}
                className={`${activeStep === step.id ? Styles.active : ""} ${Styles.step_btn} ${step.substeps ? Styles.has_substeps : ""}`}
              >
                {!step.substeps && (
                  <button onClick={() => setActiveStep(step.id)}>
                    {step.name}
                  </button>
                )}
                {step.substeps && (
                  <>
                    <button>{step.name}</button>
                    <ul className={Styles.stepsList}>
                      {step.substeps.map((substep, subIndex) => (
                        <button
                          key={subIndex}
                          className={`${activeStep === substep.id ? Styles.active : ""} ${Styles.substep_btn}`}
                          onClick={() => setActiveStep(substep.id)}
                        >
                          {substep.name}
                        </button>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className={Styles.step_wrapper}>
            <ModuleDetails isActive={activeStep === "1.1"} moduleDetails={moduleDetails} setDetails={setModuleDetails} />
            <DataFields isActive={activeStep === "1.2"} moduleDetails={moduleDetails} setDetails={setModuleDetails}/>
        </div>
      </div>
    </div>
  );
};

export default RecordModuleBuilder;
