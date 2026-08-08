"use client";

import {
  ArrowLeftRegular,
  FolderFilled,
  FolderRegular,
  NoteFilled,
  NoteRegular,
  SlashForwardFilled,
  TaskListSquareLtrFilled,
  TaskListSquareLtrRegular,
} from "@fluentui/react-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useToast } from "@/components/macro/Toaster";
import { ModuleFeature } from "@/generated/prisma/enums";
import { FileManager } from "@/modules/files";
import NoteList from "@/modules/notes/components/NoteList";
import TaskList from "@/modules/tasks/components/TaskList";
import {
  getRecordModuleRecord,
  transferModuleRecordOwnership,
  updateModuleRecord,
} from "../../actions";
import type { RecordModuleRecordData, RecordValueState } from "../../types";
import ModuleIcon from "../components/ModuleIcon";
import { createInitialValues } from "../components/record-values";
import RecordOverviewTab from "./components/RecordOverviewTab/RecordOverviewTab";
import Styles from "./RecordItemPage.module.css";

type RecordItemPageProps = {
  moduleKey: string;
  recordId: string;
  initialRecord: RecordModuleRecordData | null;
};

const RecordItemPage = ({
  moduleKey,
  recordId,
  initialRecord,
}: RecordItemPageProps) => {
  const { toast } = useToast();
  const [record, setRecord] = useState<RecordModuleRecordData | null>(
    initialRecord,
  );
  const [values, setValues] = useState<RecordValueState>(() =>
    initialRecord
      ? createInitialValues(
          initialRecord.module.fields,
          initialRecord.values,
          initialRecord.outgoingRelationships,
        )
      : {},
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null);
  const [savingOwner, setSavingOwner] = useState(false);

  useEffect(() => {
    if (record) window.document.title = `${record.displayName} | OpenCRM`;
  }, [record]);

  const handleFieldSave = async (
    field: RecordModuleRecordData["module"]["fields"][number],
    value: unknown,
  ) => {
    const nextValues = { ...values, [field.key]: value };
    setSavingFieldKey(field.key);
    const t = toast.loading(`Saving ${field.label}...`);

    try {
      const result = await updateModuleRecord(moduleKey, recordId, nextValues);
      if (!result.success) {
        t.error({
          title: `${field.label} not saved`,
          description: result.error,
        });
        return false;
      }

      const refreshedRecord = await getRecordModuleRecord(moduleKey, recordId);
      if (refreshedRecord) {
        setRecord(refreshedRecord);
        setValues(
          createInitialValues(
            refreshedRecord.module.fields,
            refreshedRecord.values,
            refreshedRecord.outgoingRelationships,
          ),
        );
      } else {
        setValues(nextValues);
      }
      t.success({ title: `${field.label} updated`, duration: 3000 });
      return true;
    } catch (error) {
      t.error({
        title: `${field.label} not saved`,
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
      return false;
    } finally {
      setSavingFieldKey(null);
    }
  };

  const handleOwnerChange = async (ownerId: string) => {
    if (!record || ownerId === record.ownerId) return;
    setSavingOwner(true);

    const t = toast.loading("Reassigning record...");
    try {
      const result = await transferModuleRecordOwnership(record.id, ownerId);
      if (!result.success) {
        t.error({
          title: "Assignment not changed",
          description: result.error,
        });
        return;
      }

      const refreshedRecord = await getRecordModuleRecord(moduleKey, record.id);
      if (refreshedRecord) setRecord(refreshedRecord);
      t.success({ title: "Record reassigned", duration: 3000 });
    } catch (error) {
      t.error({
        title: "Assignment not changed",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSavingOwner(false);
    }
  };

  if (!record) {
    return (
      <div className={Styles.status}>
        This record does not exist or is not available.
      </div>
    );
  }

  const moduleName = record.module.pluralName ?? record.module.name;
  const moduleHref = `/app/${record.organizationId}/${record.module.key}`;
  const tabs = [
    { label: "Overview", id: "overview" },
    ...(record.module.features.includes(ModuleFeature.TASKS)
      ? [
          {
            label: "Tasks",
            id: "tasks",
            color: "rgb(14, 74, 185)",
            icon: {
              regular: <TaskListSquareLtrRegular />,
              filled: <TaskListSquareLtrFilled />,
            },
          },
        ]
      : []),
    ...(record.module.features.includes(ModuleFeature.NOTES)
      ? [
          {
            label: "Notes",
            id: "notes",
            color: "rgb(228, 119, 46)",
            icon: { regular: <NoteRegular />, filled: <NoteFilled /> },
          },
        ]
      : []),
    ...(record.module.features.includes(ModuleFeature.FILES)
      ? [
          {
            label: "Files",
            id: "files",
            color: "rgb(245, 197, 66)",
            icon: { regular: <FolderRegular />, filled: <FolderFilled /> },
          },
        ]
      : []),
  ];

  return (
    <div id={Styles.RecordItemPage}>
      <header className="global_header">
        <Link href={moduleHref} className="g_header_section_name">
          <ArrowLeftRegular fontSize={14} />
        </Link>
        <div className="g_header_section_name">
          <span
            style={{ backgroundColor: record.module.accentColor ?? "#5670ff" }}
          >
            <ModuleIcon name={record.module.icon} />
          </span>
          <h2>{moduleName}</h2>
        </div>
        <span className="g_header_slash">
          <SlashForwardFilled fontSize={14} />
        </span>
        <div className="g_header_entity_name">
          <AvatarFallback
            name={record.displayName}
            entityKind="customer"
            entityId={record.id}
            size={22}
            letterCount={1}
          />
          <h2>{record.displayName}</h2>
        </div>
      </header>

      <TabsControlHeader
        tabs={tabs}
        onTabBtnClick={setActiveTab}
        showMainBtn={false}
      />

      <div className={Styles.tabContent}>
        {activeTab === "overview" && (
          <RecordOverviewTab
            record={record}
            values={values}
            savingFieldKey={savingFieldKey}
            savingOwner={savingOwner}
            onSave={handleFieldSave}
            onOwnerChange={handleOwnerChange}
          />
        )}
        {activeTab === "tasks" && <TaskList recordId={record.id} />}
        {activeTab === "notes" && <NoteList recordId={record.id} />}
        {activeTab === "files" && (
          <FileManager scope={{ recordId: record.id }} />
        )}
      </div>
    </div>
  );
};

export default RecordItemPage;
