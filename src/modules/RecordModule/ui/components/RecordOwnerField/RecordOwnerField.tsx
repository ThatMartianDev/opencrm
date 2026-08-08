"use client";

import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import {
  MemberPicker,
  useMemberPicker,
  type PickerMember,
} from "@/components/macro/MemberPicker";
import Styles from "./RecordOwnerField.module.css";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";

type RecordOwnerFieldProps = {
  organizationId: string;
  owner: PickerMember;
  onChange?: (member: PickerMember) => void;
  disabled?: boolean;
  className?: string;
};

const RecordOwnerField = ({
  organizationId,
  owner,
  onChange,
  disabled = false,
  className,
}: RecordOwnerFieldProps) => {
    const {member} = useWorkspaceData();
  const picker = useMemberPicker();
  const ownerName = member.id === owner.id ? "You" : owner.name || owner.email;
  const classes = `${Styles.ownerField}${className ? ` ${className}` : ""}`;

  const content = (
    <>
      <AvatarFallback
        name={ownerName}
        imageUrl={owner.avatarUrl ?? undefined}
        entityKind="member"
        entityId={owner.id}
        size={22}
      />
      <span>{ownerName}</span>
    </>
  );

  return (
    <>
      {onChange ? (
        <button
          type="button"
          className={classes}
          disabled={disabled}
          aria-label={`Change assigned member. Currently ${ownerName}`}
          onClick={(event) => picker.open(event.currentTarget)}
        >
          {content}
        </button>
      ) : (
        <div className={classes}>{content}</div>
      )}

      {onChange && picker.isOpen && picker.triggerRect && (
        <MemberPicker
          organizationId={organizationId}
          triggerRect={picker.triggerRect}
          onSelect={onChange}
          onClose={picker.close}
        />
      )}
    </>
  );
};

export default RecordOwnerField;