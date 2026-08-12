import { DismissRegular } from "@fluentui/react-icons";
import { useState, useTransition } from "react";
import MainButton from "@/components/micro/MainButton/MainButton";
import { useToast } from "@/components/macro/Toaster";
import { createModuleRecord } from "../../actions";
import type { RecordModulePageData, RecordValueState } from "../../types";
import RecordFieldsForm from "../components/RecordFieldsForm/RecordFieldsForm";
import { createInitialValues } from "../components/record-values";
import SharedStyles from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import RecordOwnerField from "../components/RecordOwnerField/RecordOwnerField";
import Styles from "./CreateRecordModal.module.css";
import type { PickerMember } from "@/components/macro/MemberPicker";

export type CreateRecordModalProps = {
  module: RecordModulePageData;
  onClose: () => void;
  onCreated?: () => void;
};

const CreateRecordModal = ({
  module,
  onClose,
  onCreated,
}: CreateRecordModalProps) => {
  const { toast } = useToast();
  const { organizationId, member, user } = useWorkspaceData();
  const [isPending, startTransition] = useTransition();
  const [owner, setOwner] = useState<PickerMember>({
    id: member.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
  const [values, setValues] = useState<RecordValueState>(() =>
    createInitialValues(module.fields),
  );

  const handleCreate = () => {
    const t = toast.loading(`Creating a new ${module.name.toLowerCase()}...`);
    startTransition(async () => {
      const result = await createModuleRecord(module.key, values, owner.id);
      if (!result.success) {
        t.error({ title: "Record not created", description: result.error });
        return;
      }

      t.success({
        title: "Record created",
        description: `The ${module.name.toLowerCase()} was created.`,
      });
      onCreated?.();
      onClose();
    });
  };

  return (
    <div
      className={SharedStyles.modalCard}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className={SharedStyles.modalHeader}>
        <h2>New {module.name}</h2>
        <button
          className={SharedStyles.closeBtn}
          onClick={onClose}
          title="Close"
        >
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
        <div className={Styles.ownerField}>
          <label>Assigned to</label>
          <RecordOwnerField
            organizationId={organizationId}
            owner={owner}
            onChange={setOwner}
            disabled={isPending}
          />
        </div>
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
