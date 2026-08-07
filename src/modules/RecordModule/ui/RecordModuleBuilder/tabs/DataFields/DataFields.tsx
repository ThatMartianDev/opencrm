import type { Dispatch, SetStateAction } from "react";
import type { RecordFieldDraft } from "../../types";
import Styles from "./DataFields.module.css";
import FieldsList from "./FieldsList/FieldsList";

type DataFieldsProps = {
  isActive: boolean;
  moduleId?: string;
  dataFields: RecordFieldDraft[];
  setDataFields: Dispatch<SetStateAction<RecordFieldDraft[]>>;
};

const DataFields = ({
  isActive,
  moduleId,
  dataFields,
  setDataFields,
}: DataFieldsProps) => {
  return (
    <div className={`${Styles.dataFields} ${isActive ? Styles.active : ""}`}>
      <div className={Styles.header}>
        <h3>Data Fields</h3>
        <p>Manage the data fields for this module.</p>
      </div>
      <div className={Styles.content}>
        <div className={Styles.field_list}>
          <FieldsList
            moduleId={moduleId}
            dataFields={dataFields}
            setDataFields={setDataFields}
          />
        </div>
      </div>
    </div>
  );
};

export default DataFields;
