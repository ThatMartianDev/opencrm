import { RecordFieldType, RecordViewType } from "@/generated/prisma/enums";
import Styles from "./ModuleViews.module.css";
import type { ModuleViewDraft, RecordFieldDraft } from "../../types";

import { BoardRegular, ListBarRegular } from "@fluentui/react-icons";
import OptionToggle from "@/components/micro/OptionToggle/OptionToggle";
import { useEffect, type Dispatch, type SetStateAction } from "react";

const Views = [
  {
    label: "List",
    type: RecordViewType.LIST,
    icon: <ListBarRegular />,
  },
  {
    label: "Board",
    type: RecordViewType.KANBAN,
    icon: <BoardRegular />,
  },
];

const ModuleViews = ({
  isActive,
  moduleViews,
  setModuleViews,
  dataFields,
}: {
  isActive: boolean;
  moduleViews: ModuleViewDraft[];
  setModuleViews: Dispatch<SetStateAction<ModuleViewDraft[]>>;
  dataFields: RecordFieldDraft[];
}) => {
  const listView = moduleViews.find(
    (view) => view.type === RecordViewType.LIST,
  );
  const kanbanView = moduleViews.find(
    (view) => view.type === RecordViewType.KANBAN,
  );
  const groupingFields = dataFields.filter(
    (field) =>
      field.type === RecordFieldType.SELECT ||
      field.type === RecordFieldType.MULTI_SELECT,
  );

  useEffect(() => {
    const validFieldKeys = new Set(dataFields.map((field) => field.key));
    const validGroupingKeys = new Set(
      dataFields
        .filter(
          (field) =>
            field.type === RecordFieldType.SELECT ||
            field.type === RecordFieldType.MULTI_SELECT,
        )
        .map((field) => field.key),
    );

    setModuleViews((currentViews) => {
      let changed = false;
      const nextViews = currentViews.map((view) => {
        if (view.type === RecordViewType.LIST) {
          const columns = view.config.columns.filter((key) =>
            validFieldKeys.has(key),
          );
          if (columns.length === view.config.columns.length) return view;
          changed = true;
          return { ...view, config: { columns } };
        }

        const groupByField =
          view.config.groupByField &&
          validGroupingKeys.has(view.config.groupByField)
            ? view.config.groupByField
            : null;
        const cardFields = view.config.cardFields.filter((key) =>
          validFieldKeys.has(key),
        );
        if (
          groupByField === view.config.groupByField &&
          cardFields.length === view.config.cardFields.length
        ) {
          return view;
        }
        changed = true;
        return { ...view, config: { groupByField, cardFields } };
      });

      return changed ? nextViews : currentViews;
    });
  }, [dataFields, setModuleViews]);

  const toggleView = (type: ModuleViewDraft["type"], checked: boolean) => {
    setModuleViews((currentViews) => {
      if (!checked) {
        const remainingViews = currentViews
          .filter((view) => view.type !== type)
          .map((view, index) => ({
            ...view,
            position: index,
            isDefault: index === 0,
          }));
        return remainingViews;
      }

      if (currentViews.some((view) => view.type === type)) return currentViews;

      const baseView = {
        position: currentViews.length,
        isDefault: currentViews.length === 0,
      };

      if (type === RecordViewType.LIST) {
        return [
          ...currentViews,
          {
            ...baseView,
            name: "List",
            type,
            config: { columns: dataFields.map((field) => field.key) },
          },
        ];
      }

      const groupByField = groupingFields[0]?.key ?? null;
      return [
        ...currentViews,
        {
          ...baseView,
          name: "Board",
          type,
          config: {
            groupByField,
            cardFields: dataFields
              .filter((field) => field.key !== groupByField)
              .slice(0, 3)
              .map((field) => field.key),
          },
        },
      ];
    });
  };

  const toggleListColumn = (fieldKey: string, checked: boolean) => {
    setModuleViews((currentViews) =>
      currentViews.map((view) => {
        if (view.type !== RecordViewType.LIST) return view;
        const columns = checked
          ? [...view.config.columns, fieldKey]
          : view.config.columns.filter((key) => key !== fieldKey);
        return { ...view, config: { columns } };
      }),
    );
  };

  const setKanbanGroup = (fieldKey: string) => {
    setModuleViews((currentViews) =>
      currentViews.map((view) =>
        view.type === RecordViewType.KANBAN
          ? {
              ...view,
              config: { ...view.config, groupByField: fieldKey || null },
            }
          : view,
      ),
    );
  };

  const toggleKanbanCardField = (fieldKey: string, checked: boolean) => {
    setModuleViews((currentViews) =>
      currentViews.map((view) => {
        if (view.type !== RecordViewType.KANBAN) return view;
        const cardFields = checked
          ? [...view.config.cardFields, fieldKey]
          : view.config.cardFields.filter((key) => key !== fieldKey);
        return { ...view, config: { ...view.config, cardFields } };
      }),
    );
  };

  return (
    <div className={`${Styles.moduleViews} ${isActive ? Styles.active : ""}`}>
      <div className={Styles.header}>
        <h3>Records Page Views</h3>
        <p>Choose how records can be displayed and configure each view.</p>
      </div>
      <div className={Styles.content}>
        <div className={Styles.views_list}>
          {Views.map((viewOption) => {
            const isEnabled = moduleViews.some(
              (view) => view.type === viewOption.type,
            );

            return (
              <section className={Styles.view_option} key={viewOption.type}>
                <div className={Styles.view_option_header}>
                  <div className={Styles.label_wrapper}>
                    <span>{viewOption.icon}</span>
                    <div>
                      <h4>{viewOption.label}</h4>
                      <p>
                        {viewOption.type === RecordViewType.LIST
                          ? "Display records in configurable columns."
                          : "Group records into columns by a select field."}
                      </p>
                    </div>
                  </div>
                  <div className={Styles.view_option_actions}>
                    <OptionToggle
                      checked={isEnabled}
                      onChange={(checked) =>
                        toggleView(viewOption.type, checked)
                      }
                    />
                  </div>
                </div>

                {viewOption.type === RecordViewType.LIST && listView && (
                  <div className={Styles.settings}>
                    <div className={Styles.settings_header}>
                      <h5>Visible columns</h5>
                      <span>{listView.config.columns.length} selected</span>
                    </div>
                    {dataFields.length > 0 ? (
                      <div className={Styles.field_grid}>
                        {dataFields.map((field) => (
                          <label className={Styles.field_option} key={field.key}>
                            <input
                              type="checkbox"
                              checked={listView.config.columns.includes(field.key)}
                              onChange={(event) =>
                                toggleListColumn(field.key, event.target.checked)
                              }
                            />
                            <span>{field.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className={Styles.empty_state}>
                        Add data fields before choosing columns.
                      </p>
                    )}
                  </div>
                )}

                {viewOption.type === RecordViewType.KANBAN && kanbanView && (
                  <div className={Styles.settings}>
                    <div className={Styles.form_field}>
                      <label htmlFor="kanban-group-field">Group records by</label>
                      <select
                        id="kanban-group-field"
                        value={kanbanView.config.groupByField ?? ""}
                        onChange={(event) => setKanbanGroup(event.target.value)}
                        disabled={groupingFields.length === 0}
                      >
                        <option value="">
                          {groupingFields.length === 0
                            ? "Add a select field first"
                            : "Choose a field"}
                        </option>
                        {groupingFields.map((field) => (
                          <option value={field.key} key={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      <p>Single-select and multi-select fields can form columns.</p>
                    </div>

                    <div className={Styles.settings_header}>
                      <h5>Fields shown on cards</h5>
                      <span>{kanbanView.config.cardFields.length} selected</span>
                    </div>
                    {dataFields.length > 0 ? (
                      <div className={Styles.field_grid}>
                        {dataFields.map((field) => (
                          <label className={Styles.field_option} key={field.key}>
                            <input
                              type="checkbox"
                              checked={kanbanView.config.cardFields.includes(
                                field.key,
                              )}
                              onChange={(event) =>
                                toggleKanbanCardField(
                                  field.key,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>{field.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className={Styles.empty_state}>
                        Add data fields before configuring cards.
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModuleViews;
