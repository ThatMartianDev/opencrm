import { DismissRegular } from "@fluentui/react-icons";
import { useState, useTransition } from "react";
import MainButton from "@/components/micro/MainButton/MainButton";
import { useToast } from "@/components/macro/Toaster";
import { createModuleRecord } from "../../actions";
import type { RecordModulePageData, RecordValueState } from "../../types";
import RecordFieldsForm from "../components/RecordFieldsForm/RecordFieldsForm";
import { createInitialValues } from "../components/record-values";
import SharedStyles from "@/components/macro/ModalProvider/SharedStyles.module.css";

export type CreateRecordModalProps = {
  module: RecordModulePageData;
  onClose: () => void;
  onCreated?: () => void;
};

const CreateRecordModal = ({ module, onClose, onCreated }: CreateRecordModalProps) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<RecordValueState>(() =>
    createInitialValues(module.fields),
  );

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createModuleRecord(module.key, values);
      if (!result.success) {
        toast.error({ title: "Record not created", description: result.error });
        return;
      }

      toast.success({
        title: "Record created",
        description: `The ${module.name.toLowerCase()} was created.`,
      });
      onCreated?.();
      onClose();
    });
  };

  return (
    <div className={SharedStyles.modalCard} onMouseDown={(event) => event.stopPropagation()}>
        <div className={SharedStyles.modalHeader}>
            <h2>New {module.name}</h2>
          <button className={SharedStyles.closeBtn} onClick={onClose} title="Close">
            <DismissRegular />
          </button>
        </div>
        <div className={SharedStyles.modalBody}>
          <RecordFieldsForm
            fields={module.fields}
            values={values}
            onChange={(fieldKey, value) =>
              setValues((current) => ({ ...current, [fieldKey]: value }))
            }
          />
        </div>
        <div className={SharedStyles.modalFooter}>
          <MainButton type="secondary" text="Cancel" onClick={onClose} />
          <MainButton
            type="primary"
            text={isPending ? "Creating..." : `Create ${module.name}`}
            disabled={isPending}
            onClick={handleCreate}
          />
        </div>
    </div>
  );
};

export default CreateRecordModal;
