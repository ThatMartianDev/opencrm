"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowSortRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  DismissRegular,
  FilterRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import {
  ModuleFeature,
  type ModuleFeature as ModuleFeatureName,
} from "@/generated/prisma/enums";
import { getLinkableRecords } from "@/modules/RecordModule/actions";
import ModuleIcon from "@/modules/RecordModule/ui/components/ModuleIcon";
import Styles from "./RecordBrowser.module.css";

import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";

type RecordBrowserData = Awaited<ReturnType<typeof getLinkableRecords>>;
type RecordModuleGroup = RecordBrowserData[number];

export type RecordBrowserSelection = {
  id: string;
  displayName: string;
  module: Pick<
    RecordModuleGroup,
    "id" | "key" | "name" | "icon" | "accentColor"
  >;
};

type RecordBrowserProps = {
  onClose: () => void;
  onSelect: (record: RecordBrowserSelection) => void;
  selectedRecordId?: string | null;
  requiredFeature?: ModuleFeatureName;
};

type SortOption = "name-asc" | "name-desc" | "newest" | "oldest";

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "Name, ascending",
  "name-desc": "Name, descending",
  newest: "Newest first",
  oldest: "Oldest first",
};

export function RecordBrowser({
  onClose,
  onSelect,
  selectedRecordId,
  requiredFeature = ModuleFeature.NOTES,
}: RecordBrowserProps) {
  const [modules, setModules] = useState<RecordBrowserData>([]);
  const [query, setQuery] = useState("");
  const [enabledModuleIds, setEnabledModuleIds] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<Set<string>>(
    new Set(),
  );
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getLinkableRecords(requiredFeature)
      .then((data) => {
        if (!active) return;
        setModules(data);
        setEnabledModuleIds(new Set(data.map((module) => module.id)));
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load records.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requiredFeature]);

  const visibleModules = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return modules
      .filter((module) => enabledModuleIds.has(module.id))
      .map((module) => {
        const records = module.records
          .filter((record) =>
            record.displayName.toLocaleLowerCase().includes(normalizedQuery),
          )
          .sort((left, right) => {
            if (sort === "newest" || sort === "oldest") {
              const difference =
                new Date(right.createdAt).getTime() -
                new Date(left.createdAt).getTime();
              return sort === "newest" ? difference : -difference;
            }
            const difference = left.displayName.localeCompare(
              right.displayName,
            );
            return sort === "name-asc" ? difference : -difference;
          });
        return { ...module, records };
      })
      .filter((module) => !normalizedQuery || module.records.length > 0);
  }, [enabledModuleIds, modules, query, sort]);

  function toggleModule(moduleId: string) {
    setEnabledModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  function toggleCollapsed(moduleId: string) {
    setCollapsedModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  return (
    <section className={Styles.browser} aria-label="Record browser">
      <header className={Styles.header}>
        <div>
          <h2>Link a record</h2>
        </div>
        <button
          className={Styles.iconButton}
          onClick={onClose}
          aria-label="Close record browser"
        >
          <DismissRegular fontSize={18} />
        </button>
      </header>

      <div className={Styles.toolbar}>
        <label className={Styles.search}>
          <SearchRegular fontSize={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            autoFocus
          />
        </label>

        <div className={Styles.menuWrap}>
          <button
            className={`${Styles.iconButton} ${enabledModuleIds.size !== modules.length ? Styles.active : ""}`}
            onClick={() => {
              setFilterOpen((current) => !current);
              setSortOpen(false);
            }}
            aria-label="Filter modules"
            title="Filter modules"
          >
            <FilterRegular fontSize={18} />
          </button>
          {filterOpen && (
            <div className={Styles.popup}>
              <strong>Modules</strong>
              {modules.map((module) => (
                <label key={module.id} className={Styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={enabledModuleIds.has(module.id)}
                    onChange={() => toggleModule(module.id)}
                  />
                  <span>{module.pluralName || module.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={Styles.menuWrap}>
          <button
            className={Styles.iconButton}
            onClick={() => {
              setSortOpen((current) => !current);
              setFilterOpen(false);
            }}
            aria-label="Sort records"
            title="Sort records"
          >
            <ArrowSortRegular fontSize={18} />
          </button>
          {sortOpen && (
            <div className={`${Styles.popup} ${Styles.sortPopup}`}>
              <strong>Sort</strong>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                <button
                  key={option}
                  className={sort === option ? Styles.selectedOption : ""}
                  onClick={() => {
                    setSort(option);
                    setSortOpen(false);
                  }}
                >
                  {SORT_LABELS[option]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={Styles.groups}>
        {loading && <div className={Styles.status}>Loading records...</div>}
        {!loading && error && <div className={Styles.status}>{error}</div>}
        {!loading && !error && visibleModules.length === 0 && (
          <div className={Styles.status}>No matching records.</div>
        )}
        {!loading &&
          !error &&
          visibleModules.map((module) => {
            const collapsed = collapsedModuleIds.has(module.id);
            return (
              <section className={Styles.group} key={module.id}>
                <button
                  className={Styles.groupHeader}
                  onClick={() => toggleCollapsed(module.id)}
                >
                  <span
                    className={Styles.moduleIcon}
                    style={{ backgroundColor: module.accentColor || "#5670ff" }}
                  >
                    <ModuleIcon name={module.icon} size={15} />
                  </span>
                  <span>{module.pluralName || module.name}</span>
                  <small>{module.records.length}</small>
                  {collapsed ? <ChevronRightRegular /> : <ChevronDownRegular />}
                </button>
                {!collapsed && (
                  <div className={Styles.recordList}>
                    {module.records.length === 0 ? (
                      <div className={Styles.emptyGroup}>
                        No records in this module.
                      </div>
                    ) : (
                      module.records.map((record) => (
                        <button
                          key={record.id}
                          className={`${Styles.recordRow} ${selectedRecordId === record.id ? Styles.selectedRecord : ""}`}
                          onClick={() => {
                            onSelect({
                              id: record.id,
                              displayName: record.displayName,
                              module: {
                                id: module.id,
                                key: module.key,
                                name: module.name,
                                icon: module.icon,
                                accentColor: module.accentColor,
                              },
                            });
                            onClose();
                          }}
                        >
                          <AvatarFallback
                            entityId={record.id}
                            entityKind="organization"
                            name={record.displayName}
                            size={25}
                          />
                          <span>{record.displayName}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </section>
            );
          })}
      </div>
    </section>
  );
}

export function RecordBrowserOverlay(props: RecordBrowserProps) {
  return (
    <div className={Styles.overlay} onMouseDown={props.onClose}>
      <div onMouseDown={(event) => event.stopPropagation()}>
        <RecordBrowser {...props} />
      </div>
    </div>
  );
}

export default function RecordBrowserModal(props: RecordBrowserProps) {
  return <RecordBrowser {...props} />;
}
