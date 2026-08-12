import { DismissFilled } from "@fluentui/react-icons";
import Styles from "./RecordModuleBuilder.module.css";
import { useEffect, useState, useTransition } from "react";
import MainButton from "@/components/micro/MainButton/MainButton";
import { useToast } from "@/components/macro/Toaster";
import {
  createRecordModule,
  getRecordModuleBuilder,
  updateRecordModule,
} from "../../actions";
import ModuleDetails from "./tabs/ModuleDetails/ModuleDetails";
import type {
  ModuleDetails as ModuleDetailsType,
  ModuleViewDraft,
  RecordFieldDraft,
} from "./types";
import DataFields from "./tabs/DataFields/DataFields";
import ModuleViews from "./tabs/ModuleViews/ModuleViews";
import ModuleFeatures from "./tabs/ModuleFeatures/ModuleFeatures";
import type { ModuleFeature } from "@/generated/prisma/enums";
import { useRouter } from "next/navigation";

type RecordModuleBuilderProps = {
  moduleId?: string;
  onClose: () => void;
  onDataChanged?: () => void;
};

const steps = [
  {
    id: "1.1",
    name: "Details",
    description:
      "Configure the basic details of the module, such as its name, description, and icon.",
  },
  {
    id: "1.2",
    name: "Data Fields",
    description:
      "Define the data fields that will be used to capture information in the module. This includes field types, validation rules, and any custom logic.",
  },
  {
    id: "2",
    name: "Views",
    description:
      "Configure the views for the module, such as list views, detail views, and custom views.",
  },
  {
    id: "3",
    name: "Features",
    description:
      "Enable or disable notes, tasks, files, email, and calendar features.",
  },
];

const RecordModuleBuilder = ({
  moduleId,
  onClose,
  onDataChanged,
}: RecordModuleBuilderProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState("1.1");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(Boolean(moduleId));
  const [loadError, setLoadError] = useState("");

  const [moduleDetails, setModuleDetails] = useState<ModuleDetailsType>({
    name: "",
    pluralName: "",
    icon: "TargetFilled",
    accentColor: "#0dc98a",
  });
  const [dataFields, setDataFields] = useState<RecordFieldDraft[]>([]);
  const [moduleViews, setModuleViews] = useState<ModuleViewDraft[]>([]);
  const [moduleFeatures, setModuleFeatures] = useState<ModuleFeature[]>([]);

  useEffect(() => {
    if (!moduleId) return;
    let cancelled = false;

    getRecordModuleBuilder(moduleId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setLoadError("This module does not exist or is not available.");
          return;
        }
        setModuleDetails(data.moduleDetails);
        setDataFields(data.dataFields);
        setModuleViews(data.moduleViews);
        setModuleFeatures(data.moduleFeatures);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Unable to load the module settings.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  const handleSave = () => {
    startTransition(async () => {
      const actionToast = toast.loading(
        moduleId ? "Saving module..." : "Creating module...",
      );

      try {
        const payload = {
          moduleDetails,
          dataFields,
          moduleViews,
          moduleFeatures,
        };
        const result = moduleId
          ? await updateRecordModule(moduleId, payload)
          : await createRecordModule(payload);

        if (!result.success) {
          actionToast.error({
            title: moduleId ? "Module not saved" : "Module not created",
            description: result.error,
          });
          return;
        }

        actionToast.success({
          title: moduleId ? "Module saved" : "Module created",
          description: moduleId
            ? `${moduleDetails.name} was updated.`
            : `${moduleDetails.name} is ready to use.`,
        });
        onDataChanged?.();
        onClose();
        router.refresh();
      } catch {
        actionToast.error({
          title: moduleId ? "Module not saved" : "Module not created",
          description: `Unable to ${moduleId ? "save" : "create"} the module. Please try again.`,
        });
      }
    });
  };

  return (
    <div className={Styles.recordModuleBuilder}>
      <div className={Styles.header}>
        <h3>{moduleId ? "Manage Module" : "Module Builder"}</h3>
        <button onClick={onClose}>
          <DismissFilled fontSize={20} />
        </button>
      </div>
      {isLoading || loadError ? (
        <div className={Styles.status}>
          {loadError || "Loading module settings..."}
        </div>
      ) : (
      <div className={Styles.content}>
        <div className={Styles.sidebar}>
          <ul className={Styles.stepsList}>
            {steps.map((step, index) => (
              <li
                key={index}
                className={`${activeStep === step.id ? Styles.active : ""} ${Styles.step_btn}`}
              >
                <button onClick={() => setActiveStep(step.id)}>
                  {step.name}
                </button>
              </li>
            ))}
          </ul>
          <div className={Styles.main_actions}>
            <MainButton
              type="primary"
              size="full-width"
              text={
                isPending
                  ? moduleId ? "Saving..." : "Creating..."
                  : moduleId ? "Save changes" : "Create module"
              }
              disabled={isPending}
              onClick={handleSave}
            />
          </div>
        </div>
        <div className={Styles.step_wrapper}>
          <ModuleDetails
            isActive={activeStep === "1.1"}
            moduleDetails={moduleDetails}
            setDetails={setModuleDetails}
          />
          <DataFields
            isActive={activeStep === "1.2"}
            moduleId={moduleId}
            dataFields={dataFields}
            setDataFields={setDataFields}
          />
          <ModuleViews
            isActive={activeStep === "2"}
            moduleViews={moduleViews}
            setModuleViews={setModuleViews}
            dataFields={dataFields}
          />
          <ModuleFeatures
            isActive={activeStep === "3"}
            features={moduleFeatures}
            setFeatures={setModuleFeatures}
          />
        </div>
      </div>
      )}
    </div>
  );
};

export default RecordModuleBuilder;
