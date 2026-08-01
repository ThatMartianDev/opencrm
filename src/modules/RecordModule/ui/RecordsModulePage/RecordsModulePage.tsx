

"use client";

import {
    BoardFilled,
    BoardRegular,
    ListBarFilled,
    ListBarRegular,
} from "@fluentui/react-icons";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { RecordViewType } from "@/generated/prisma/enums";
import { getRecordModulePage } from "../../actions";
import type { RecordModulePageData } from "../../types";
import ModuleIcon from "../components/ModuleIcon";
import RecordKanbanView from "../components/RecordKanbanView/RecordKanbanView";
import RecordListView from "../components/RecordListView/RecordListView";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import Styles from "./RecordsModulePage.module.css";

type RecordsModulePageProps = {
    moduleKey: string;
};

const RecordsModulePage = ({ moduleKey }: RecordsModulePageProps) => {
    const { openModal } = useModal();
    const [module, setModule] = useState<RecordModulePageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [activeViewId, setActiveViewId] = useState("");
    const [searchValue, setSearchValue] = useState("");
    const [page, setPage] = useState(1);
    const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
    const loadRequestId = useRef(0);

    const applyModuleData = useCallback((data: RecordModulePageData | null) => {
        if (!data) {
            setLoadError("This module does not exist or is not available.");
            setModule(null);
            return;
        }

        setModule(data);
        setPage(data.pagination.page);
        setLoadError("");
        setActiveViewId((current) => {
            if (data.views.some((view) => view.id === current)) return current;
            return data.views.find((view) => view.isDefault)?.id ?? data.views[0]?.id ?? "";
        });
    }, []);

    const loadModule = useCallback(async () => {
        const requestId = ++loadRequestId.current;
        try {
            const data = await getRecordModulePage(moduleKey, {
                page,
                pageSize: 50,
                search: deferredSearch,
            });
            if (requestId !== loadRequestId.current) return;
            applyModuleData(data);
        } catch (error) {
            if (requestId !== loadRequestId.current) return;
            console.error("Failed to load record module", error);
            setLoadError("Unable to load this module.");
        } finally {
            if (requestId === loadRequestId.current) setIsLoading(false);
        }
    }, [applyModuleData, deferredSearch, moduleKey, page]);

    useEffect(() => {
        const requestId = ++loadRequestId.current;
        getRecordModulePage(moduleKey, {
            page,
            pageSize: 50,
            search: deferredSearch,
        })
            .then((data) => {
                if (requestId === loadRequestId.current) applyModuleData(data);
            })
            .catch((error) => {
                if (requestId !== loadRequestId.current) return;
                console.error("Failed to load record module", error);
                setLoadError("Unable to load this module.");
            })
            .finally(() => {
                if (requestId === loadRequestId.current) setIsLoading(false);
            });
    }, [applyModuleData, deferredSearch, moduleKey, page]);

    useEffect(() => {
        if (module) window.document.title = `${module.pluralName ?? module.name} | OpenCRM`;
    }, [module]);

    if (isLoading) return <div className={Styles.status}>Loading module...</div>;
    if (!module) return <div className={Styles.status}>{loadError}</div>;

    const orderedViews = [...module.views].sort(
        (first, second) => Number(second.isDefault) - Number(first.isDefault),
    );
    const activeView =
        module.views.find((view) => view.id === activeViewId) ?? orderedViews[0];
    const tabs = orderedViews.map((view) => ({
        id: view.id,
        label: view.name,
        color: "var(--primary-color)",
        bgActiveColor: `var(--primary-color)14`,
        icon:
            view.type === RecordViewType.KANBAN
                ? { regular: <BoardRegular />, filled: <BoardFilled /> }
                : { regular: <ListBarRegular />, filled: <ListBarFilled /> },
    }));

    return (
        <div className={Styles.page}>
            <header className="global_header">
                <div className="g_header_section_name">
                    <span style={{ backgroundColor: module.accentColor ?? "#5670ff" }}>
                        <ModuleIcon name={module.icon} />
                    </span>
                    <h2>{module.pluralName ?? module.name}</h2>
                </div>
            </header>
            <div className={Styles.content}>
                <TabsControlHeader
                    tabs={tabs}
                    onTabBtnClick={setActiveViewId}
                    showSearch
                    searchValue={searchValue}
                    searchPlaceholder={`Search ${module.pluralName?.toLowerCase() ?? "records"}...`}
                    onSearchChange={(value) => {
                        setSearchValue(value);
                        setPage(1);
                    }}
                    showMainBtn
                    mainButton={{
                        text: `New ${module.name}`,
                        onClick: () => openModal("create-record", { moduleKey }, loadModule),
                    }}
                />
                <div className={Styles.view}>
                    {!activeView ? (
                        <div className={Styles.status}>No views are configured for this module.</div>
                    ) : activeView.type === RecordViewType.KANBAN ? (
                        <RecordKanbanView
                            module={module}
                            view={activeView}
                            records={module.records}
                            onRecordsChanged={loadModule}
                        />
                    ) : (
                        <RecordListView
                            module={module}
                            view={activeView}
                            records={module.records}
                            onModuleChanged={loadModule}
                        />
                    )}
                </div>
                {module.pagination.totalPages > 1 && (
                    <nav className={Styles.pagination} aria-label="Record pages">
                        <button
                            type="button"
                            disabled={module.pagination.page === 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                            Previous
                        </button>
                        <span>
                            Page {module.pagination.page} of {module.pagination.totalPages}
                            <small>{module.pagination.totalRecords} records</small>
                        </span>
                        <button
                            type="button"
                            disabled={module.pagination.page === module.pagination.totalPages}
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(module.pagination.totalPages, current + 1),
                                )
                            }
                        >
                            Next
                        </button>
                    </nav>
                )}
            </div>
        </div>
    );
};

export default RecordsModulePage;