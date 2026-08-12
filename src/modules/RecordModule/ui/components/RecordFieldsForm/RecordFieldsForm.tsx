import { RecordFieldType } from "@/generated/prisma/enums";
import type {
  RecordModuleField,
  RecordValueState,
} from "../../../types";
import { getFieldOptions } from "../record-values";
import Styles from "./RecordFieldsForm.module.css";
import RelationshipFieldSelect from "../RelationshipFieldSelect/RelationshipFieldSelect";
import RecordDateField from "../RecordDateField/RecordDateField";

type RecordFieldsFormProps = {
  fields: RecordModuleField[];
  values: RecordValueState;
  onChange: (fieldKey: string, value: unknown) => void;
};

const RecordFieldsForm = ({ fields, values, onChange }: RecordFieldsFormProps) => {
  return (
    <div className={Styles.fields}>
      {fields.map((field) => {
        const value = values[field.key];
        const options = getFieldOptions(field);

        return (
          <div className={Styles.field} key={field.id}>
            <label htmlFor={`record-field-${field.key}`}>
              {field.label}
              {field.required && <span>*</span>}
            </label>

            {field.type === RecordFieldType.RELATIONSHIP ? (
              <RelationshipFieldSelect
                id={`record-field-${field.key}`}
                fieldId={field.id}
                value={typeof value === "string" ? value : ""}
                required={field.required}
                onChange={(targetRecordId) =>
                  onChange(field.key, targetRecordId)
                }
              />
            ) : field.type === RecordFieldType.LONG_TEXT ? (
              <textarea
                id={`record-field-${field.key}`}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            ) : field.type === RecordFieldType.SELECT ? (
              <select
                id={`record-field-${field.key}`}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(field.key, event.target.value)}
              >
                <option value="">Select {field.label}</option>
                {options.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === RecordFieldType.MULTI_SELECT ? (
              <div className={Styles.options} id={`record-field-${field.key}`}>
                {options.map((option) => {
                  const selected = Array.isArray(value) && value.includes(option.value);
                  return (
                    <label className={Styles.option} key={option.value}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          const current = Array.isArray(value)
                            ? value.filter((item): item is string => typeof item === "string")
                            : [];
                          onChange(
                            field.key,
                            event.target.checked
                              ? [...current, option.value]
                              : current.filter((item) => item !== option.value),
                          );
                        }}
                      />
                      <span style={{ backgroundColor: option.color ?? "#5670ff" }} />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            ) : field.type === RecordFieldType.BOOLEAN ? (
              <label className={Styles.booleanField}>
                <input
                  id={`record-field-${field.key}`}
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => onChange(field.key, event.target.checked)}
                />
                Enabled
              </label>
            ) : field.type === RecordFieldType.DATE ||
              field.type === RecordFieldType.DATETIME ? (
              <RecordDateField
                id={`record-field-${field.key}`}
                className={Styles.dateField}
                field={field}
                value={value}
                onChange={(nextValue) => onChange(field.key, nextValue)}
              />
            ) : (
              <input
                id={`record-field-${field.key}`}
                type={
                  field.type === RecordFieldType.NUMBER ||
                  field.type === RecordFieldType.CURRENCY ||
                  field.type === RecordFieldType.PERCENT
                    ? "number"
                    : field.type === RecordFieldType.EMAIL
                      ? "email"
                      : field.type === RecordFieldType.URL
                        ? "url"
                        : field.type === RecordFieldType.PHONE
                          ? "tel"
                          : "text"
                }
                value={
                  typeof value === "string" || typeof value === "number"
                    ? value
                    : ""
                }
                min={
                  typeof field.config === "object" && field.config !== null &&
                  "minimum" in field.config
                    ? Number(field.config.minimum)
                    : undefined
                }
                max={
                  typeof field.config === "object" && field.config !== null &&
                  "maximum" in field.config
                    ? Number(field.config.maximum)
                    : undefined
                }
                onChange={(event) =>
                  onChange(
                    field.key,
                    event.target.type === "number"
                      ? event.target.value === ""
                        ? ""
                        : Number(event.target.value)
                      : event.target.value,
                  )
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RecordFieldsForm;
