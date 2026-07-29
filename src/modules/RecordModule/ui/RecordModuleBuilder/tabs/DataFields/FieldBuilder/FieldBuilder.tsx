import type { SelectOption, ShortnedRecordField } from "../types";
import { RecordFieldType } from "@/generated/prisma/enums";
import Styles from "./FieldBuilder.module.css";
import SharedModalStyles from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { useState } from "react";
import MainButton from "@/components/micro/MainButton/MainButton";
import { useToast } from "@/components/macro/Toaster";

import {
  DismissFilled,
  ChevronRightFilled,
  AddRegular,
  DeleteRegular,
} from "@fluentui/react-icons";

import { FieldTypes } from "../config";
const DEFAULT_OPTION_COLOR = "#5670ff";

const FieldBuilder = ({
  onClose,
  fieldToEdit,
  setDataFields,
  hasRecordTitle,
}: {
  onClose: () => void;
  fieldToEdit: ShortnedRecordField | null;
  setDataFields: React.Dispatch<
    React.SetStateAction<ShortnedRecordField[] | null>
  >;
  hasRecordTitle: boolean;
}) => {
  const { toast } = useToast();
  const [type, setType] = useState<RecordFieldType | null>(
    fieldToEdit?.type || null,
  );
  const [step, setStep] = useState<"type" | "customize">(
    fieldToEdit ? "customize" : "type",
  );
  const [label, setLabel] = useState(fieldToEdit?.label || "");
  const [isRecordTitle, setIsRecordTitle] = useState(
    fieldToEdit?.isPrimary || (!fieldToEdit && !hasRecordTitle),
  );
  const [required, setRequired] = useState(
    isRecordTitle ? true : fieldToEdit?.required || false,
  );
  const [unique, setUnique] = useState(fieldToEdit?.unique || false);
  const [minimum, setMinimum] = useState(
    fieldToEdit?.config?.minimum?.toString() || "",
  );
  const [maximum, setMaximum] = useState(
    fieldToEdit?.config?.maximum?.toString() || "",
  );
  const [currency, setCurrency] = useState(
    fieldToEdit?.config?.currency || "USD",
  );
  const [isPrimaryEmail, setIsPrimaryEmail] = useState(
    fieldToEdit?.config?.isPrimaryEmail || false,
  );

  const [options, setOptions] = useState<SelectOption[]>(
    fieldToEdit?.config?.options?.map((option) => ({
      ...option,
      color: option.color || DEFAULT_OPTION_COLOR,
    })) || [],
  );
  const [error, setError] = useState("");

  const isSelectType =
    type === RecordFieldType.SELECT || type === RecordFieldType.MULTI_SELECT;
  const hasNumericRange =
    type === RecordFieldType.NUMBER || type === RecordFieldType.CURRENCY;

  const updateOption = (
    index: number,
    property: "label" | "color",
    value: string,
  ) => {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [property]: value } : option,
      ),
    );
  };

  const addOption = () => {
    setOptions((current) => [
      ...current,
      {
        label: "",
        value: crypto.randomUUID(),
        color: DEFAULT_OPTION_COLOR,
      },
    ]);
  };

  const handleAddField = () => {
    if (step === "type") {
      setStep("customize");
      return;
    }

    if (!type || !label.trim()) {
      setError("Enter a field label.");
      toast.error({
        title: "Field label required",
        description: "Enter a label before saving this field.",
      });
      return;
    }

    if (fieldToEdit?.isPrimary && type !== RecordFieldType.TEXT) {
      setError(
        "Choose another record title before changing this field's type.",
      );
      toast.error({
        title: "Record title required",
        description:
          "Choose another text field as the record title before changing this field's type.",
      });
      return;
    }

    if (
      isSelectType &&
      (options.length === 0 || options.some((option) => !option.label.trim()))
    ) {
      setError("Add at least one option and give every option a label.");
      toast.error({
        title: "Select options incomplete",
        description: "Add at least one option and label every option.",
      });
      return;
    }

    const parsedMinimum = minimum === "" ? undefined : Number(minimum);
    const parsedMaximum = maximum === "" ? undefined : Number(maximum);

    if (
      hasNumericRange &&
      parsedMinimum !== undefined &&
      parsedMaximum !== undefined &&
      parsedMinimum > parsedMaximum
    ) {
      setError("Minimum cannot be greater than maximum.");
      toast.error({
        title: "Invalid numeric range",
        description: "Minimum cannot be greater than maximum.",
      });
      return;
    }

    let recordTitleWasAssigned = false;
    let recordTitleWasTransferred = false;
    let primaryEmailWasTransferred = false;

    setDataFields((currentFields) => {
      const fields = currentFields || [];
      const hasRecordTitle = fields.some(
        (existingField) =>
          existingField.isPrimary && existingField !== fieldToEdit,
      );
      const shouldBeRecordTitle =
        type === RecordFieldType.TEXT &&
        (isRecordTitle || (!fieldToEdit?.isPrimary && !hasRecordTitle));

      recordTitleWasAssigned =
        shouldBeRecordTitle && !fieldToEdit?.isPrimary && !hasRecordTitle;
      recordTitleWasTransferred = shouldBeRecordTitle && hasRecordTitle;
      primaryEmailWasTransferred =
        type === RecordFieldType.EMAIL &&
        isPrimaryEmail &&
        fields.some(
          (existingField) =>
            existingField !== fieldToEdit &&
            existingField.type === RecordFieldType.EMAIL &&
            existingField.config?.isPrimaryEmail,
        );

      const config = isSelectType
        ? {
            options: options.map((option) => ({
              ...option,
              label: option.label.trim(),
            })),
          }
        : hasNumericRange
          ? {
              ...(type === RecordFieldType.CURRENCY && { currency }),
              ...(parsedMinimum !== undefined && { minimum: parsedMinimum }),
              ...(parsedMaximum !== undefined && { maximum: parsedMaximum }),
            }
          : type === RecordFieldType.EMAIL
            ? { isPrimaryEmail }
            : {};
      const savedField: ShortnedRecordField = {
        label: label.trim(),
        type,
        required,
        unique,
        defaultValue: fieldToEdit?.defaultValue ?? null,
        isPrimary: shouldBeRecordTitle,
        position: fieldToEdit?.position ?? fields.length + 1,
        config,
      };

      const fieldsWithPrimaryEmailCleared = isPrimaryEmail
        ? fields.map((existingField) =>
            existingField.type === RecordFieldType.EMAIL &&
            existingField !== fieldToEdit
              ? {
                  ...existingField,
                  config: {
                    ...existingField.config,
                    isPrimaryEmail: false,
                  },
                }
              : existingField,
          )
        : fields;

      const fieldsWithRecordTitleCleared = shouldBeRecordTitle
        ? fieldsWithPrimaryEmailCleared.map((existingField) =>
            existingField !== fieldToEdit && existingField.isPrimary
              ? { ...existingField, isPrimary: false }
              : existingField,
          )
        : fieldsWithPrimaryEmailCleared;

      if (!fieldToEdit) return [...fieldsWithRecordTitleCleared, savedField];

      return fieldsWithRecordTitleCleared.map((existingField) =>
        existingField === fieldToEdit ? savedField : existingField,
      );
    });

    if (recordTitleWasTransferred) {
      toast.notify({
        title: "Record title changed",
        description: `"${label.trim()}" will now supply each record's display name.`,
      });
    } else if (recordTitleWasAssigned) {
      toast.notify({
        title: "Record title assigned",
        description: `"${label.trim()}" will supply each record's display name.`,
      });
    } else if (primaryEmailWasTransferred) {
      toast.notify({
        title: "Primary email changed",
        description: `Email actions will now use "${label.trim()}".`,
      });
    } else if (!hasRecordTitle && type !== RecordFieldType.TEXT) {
      toast.notify({
        title: "Record title still needed",
        description:
          "Add a text field to supply the display name shown for each record.",
      });
    } else {
      toast.success({
        title: fieldToEdit ? "Field updated" : "Field added",
        description: `"${label.trim()}" was ${fieldToEdit ? "updated" : "added"}.`,
      });
    }
    onClose();
  };

  return (
    <div className={Styles.FieldBuilderWrapper}>
      <div className={Styles.FieldBuilder}>
        <div className={SharedModalStyles.modalHeader}>
          <p>Field Builder</p>
          <button onClick={onClose} className={SharedModalStyles.closeBtn}>
            <DismissFilled fontSize={20} />
          </button>
        </div>
        <div className={SharedModalStyles.modalBody}>
          {step === "type" && (
            <div className={Styles.typeStep}>
              <h3>1. Select Field Type</h3>
              <div className={Styles.fieldTypes}>
                {FieldTypes.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => {
                      setType(fieldType.type);
                      setStep("customize");
                    }}
                    className={Styles.fieldTypeButton}
                  >
                    <span>
                      <fieldType.icon fontSize={20} color="#5670ff" />
                    </span>
                    <p>{fieldType.name}</p>
                    <ChevronRightFilled fontSize={20} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "customize" && type && (
            <div className={Styles.customizeStep}>
              <div className={Styles.stepHeading}>
                <h3>2. Customize Field</h3>
                <span>
                  {
                    FieldTypes.find((fieldType) => fieldType.type === type)
                      ?.name
                  }
                </span>
              </div>

              <div className={Styles.formField}>
                <label htmlFor="field-label">Label</label>
                <input
                  id="field-label"
                  value={label}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    setError("");
                  }}
                  placeholder="e.g. Customer status"
                  autoFocus
                />
              </div>

              {hasNumericRange && (
                <div className={Styles.inlineFields}>
                  {type === RecordFieldType.CURRENCY && (
                    <div className={Styles.formField}>
                      <label htmlFor="field-currency">Currency</label>
                      <select
                        id="field-currency"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                      </select>
                    </div>
                  )}
                  <div className={Styles.formField}>
                    <label htmlFor="field-minimum">Minimum</label>
                    <input
                      id="field-minimum"
                      type="number"
                      value={minimum}
                      onChange={(event) => setMinimum(event.target.value)}
                      placeholder="No minimum"
                    />
                  </div>
                  <div className={Styles.formField}>
                    <label htmlFor="field-maximum">Maximum</label>
                    <input
                      id="field-maximum"
                      type="number"
                      value={maximum}
                      onChange={(event) => setMaximum(event.target.value)}
                      placeholder="No maximum"
                    />
                  </div>
                </div>
              )}

              {isSelectType && (
                <div className={Styles.optionsSection}>
                  <div className={Styles.optionsHeader}>
                    <div>
                      <h4>Options</h4>
                      <p>Add the choices available for this field.</p>
                    </div>
                    <button type="button" onClick={addOption}>
                      <AddRegular fontSize={16} /> Add option
                    </button>
                  </div>
                  <div className={Styles.optionsList}>
                    {options.map((option, index) => (
                      <div className={Styles.optionRow} key={option.value}>
                        <input
                          className={Styles.colorInput}
                          type="color"
                          value={option.color}
                          onChange={(event) =>
                            updateOption(index, "color", event.target.value)
                          }
                          aria-label={`Color for option ${index + 1}`}
                        />
                        <input
                          value={option.label}
                          onChange={(event) => {
                            updateOption(index, "label", event.target.value);
                            setError("");
                          }}
                          placeholder={`Option ${index + 1}`}
                          aria-label={`Option ${index + 1} label`}
                        />
                        <button
                          type="button"
                          className={Styles.deleteOption}
                          onClick={() =>
                            setOptions((current) =>
                              current.filter(
                                (_, optionIndex) => optionIndex !== index,
                              ),
                            )
                          }
                          aria-label={`Delete option ${index + 1}`}
                          title="Delete option"
                        >
                          <DeleteRegular fontSize={18} />
                        </button>
                      </div>
                    ))}
                    {options.length === 0 && (
                      <button
                        type="button"
                        className={Styles.emptyOptions}
                        onClick={addOption}
                      >
                        Add your first option
                      </button>
                    )}
                  </div>
                </div>
              )}

              {type === RecordFieldType.EMAIL && (
                <div className={Styles.toggleGroup}>
                  <label className={Styles.toggleRow}>
                    <span>
                      <strong>Primary email</strong>
                      <small>
                        Use this field for email actions and contact
                        communication.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={isPrimaryEmail}
                      onChange={(event) =>
                        setIsPrimaryEmail(event.target.checked)
                      }
                    />
                  </label>
                </div>
              )}

              {type === RecordFieldType.TEXT && (
                <div className={Styles.toggleGroup}>
                  <label className={Styles.toggleRow}>
                    <span>
                      <strong>Use as record title</strong>
                      <small>
                        Supplies the display name shown for each record.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={isRecordTitle}
                      onChange={(event) => {
                        if (fieldToEdit?.isPrimary && !event.target.checked) {
                          toast.error({
                            title: "Record title required",
                            description:
                              "Select another text field as the record title first.",
                          });
                          return;
                        }
                        setIsRecordTitle(event.target.checked);
                      }}
                    />
                  </label>
                </div>
              )}

              <div className={Styles.toggleGroup}>
                <label className={Styles.toggleRow}>
                  <span>
                    <strong>Required</strong>
                    <small>A value must be provided for every record.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={isRecordTitle ? true : required}
                    onChange={(event) => setRequired(event.target.checked)}
                  />
                </label>
                <label className={Styles.toggleRow}>
                  <span>
                    <strong>Unique</strong>
                    <small>
                      Prevent two records from using the same value.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={unique}
                    onChange={(event) => setUnique(event.target.checked)}
                  />
                </label>
              </div>

              {error && <p className={Styles.error}>{error}</p>}
            </div>
          )}
        </div>
        <div className={SharedModalStyles.modalFooter}>
          <MainButton
            type="secondary"
            text={step === "type" ? "Discard" : "Back"}
            onClick={step === "type" ? onClose : () => setStep("type")}
          />
          {step === "customize" && (
            <MainButton type="primary" text={"Save"} onClick={handleAddField} />
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldBuilder;
