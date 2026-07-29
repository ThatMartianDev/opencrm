import { useState } from "react";
import type { ShortnedRecordField } from "./types";
import Styles from "./DataFields.module.css";
import FieldsList from "./FieldsList/FieldsList";

const DataFields = ({ isActive, moduleDetails, setDetails }: { isActive: boolean; moduleDetails: any; setDetails: (details: any) => void }) => {
  const [dataField, setDataField] = useState<ShortnedRecordField | null>(null);
  const [dataFields, setDataFields] = useState<ShortnedRecordField[] | null>(
    null,
  );

  return (
    <div className={`${Styles.dataFields} ${isActive ? Styles.active : ""}`}>
      <div className={Styles.header}>
        <h3>Data Fields</h3>
        <p>Manage the data fields for this module.</p>
      </div>
      <div className={Styles.content}>
        <div className={Styles.field_list}>
          <FieldsList dataFields={dataFields} setDataFields={setDataFields} />
        </div>
      </div>
    </div>
  );
};

export default DataFields;
