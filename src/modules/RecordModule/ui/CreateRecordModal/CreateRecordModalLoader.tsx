"use client";

import { useEffect, useState } from "react";
import { getRecordModulePage } from "../../actions";
import type { RecordModulePageData } from "../../types";
import CreateRecordModal from "./CreateRecordModal";
import SharedStyles from "@/components/macro/ModalProvider/SharedStyles.module.css";

type CreateRecordModalLoaderProps = {
  moduleKey: string;
  onClose: () => void;
  onDataChanged?: () => void;
};

const CreateRecordModalLoader = ({
  moduleKey,
  onClose,
  onDataChanged,
}: CreateRecordModalLoaderProps) => {
  const [module, setModule] = useState<RecordModulePageData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getRecordModulePage(moduleKey, { page: 1, pageSize: 1 })
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError("This module does not exist or is not available.");
          return;
        }
        setModule(data);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this module.");
      });

    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  if (module) {
    return (
      <CreateRecordModal
        module={module}
        onClose={onClose}
        onCreated={onDataChanged}
      />
    );
  }

  return (
    <div className={SharedStyles.modalCard}>
      <div className={SharedStyles.modalBody}>
        <p>{error || "Loading module..."}</p>
      </div>
    </div>
  );
};

export default CreateRecordModalLoader;