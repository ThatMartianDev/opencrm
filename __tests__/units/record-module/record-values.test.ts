import { RecordFieldType } from "@/generated/prisma/enums";
import {
  createInitialValues,
  formatRecordValue,
  getFieldOptions,
  getRecordFieldValue,
} from "@/modules/RecordModule/ui/components/record-values";
import type {
  RecordModuleField,
  RecordModuleItem,
} from "@/modules/RecordModule/types";

const field = (
  overrides: Partial<RecordModuleField> = {},
): RecordModuleField =>
  ({
    id: "field_text",
    moduleId: "module_1",
    key: "text",
    label: "Text",
    type: RecordFieldType.TEXT,
    required: false,
    unique: false,
    isPrimary: false,
    isSystem: false,
    position: 1,
    config: null,
    defaultValue: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  }) as RecordModuleField;

const selectField = field({
  id: "field_status",
  key: "status",
  label: "Status",
  type: RecordFieldType.SELECT,
  config: {
    options: [
      { label: "Open", value: "open", color: "#00aa00" },
      { label: "Closed", value: "closed", color: "#aa0000" },
    ],
  },
});

describe("RecordModule record values", () => {
  test("returns only structurally valid select options", () => {
    const configuredField = field({
      config: {
        options: [
          { label: "Open", value: "open", color: "#00aa00" },
          { label: "Missing value" },
          null,
        ],
      } as never,
    });

    expect(getFieldOptions(configuredField)).toEqual([
      { label: "Open", value: "open", color: "#00aa00" },
    ]);
    expect(getFieldOptions(field({ config: [] as never }))).toEqual([]);
  });

  test("creates type-appropriate initial values and applies defaults", () => {
    const fields = [
      field(),
      field({
        id: "field_count",
        key: "count",
        type: RecordFieldType.NUMBER,
        defaultValue: 5,
      }),
      field({
        id: "field_enabled",
        key: "enabled",
        type: RecordFieldType.BOOLEAN,
      }),
      field({
        id: "field_tags",
        key: "tags",
        type: RecordFieldType.MULTI_SELECT,
      }),
    ];

    expect(createInitialValues(fields)).toEqual({
      text: "",
      count: 5,
      enabled: false,
      tags: [],
    });
  });

  test("saved values take precedence over configured defaults", () => {
    const countField = field({
      id: "field_count",
      key: "count",
      type: RecordFieldType.NUMBER,
      defaultValue: 5,
    });

    expect(
      createInitialValues([countField], [
        { fieldId: "field_count", value: 0 },
      ]),
    ).toEqual({ count: 0 });
  });

  test("hydrates relationship fields from outgoing links", () => {
    const contactField = field({
      id: "field_contact",
      key: "contact",
      type: RecordFieldType.RELATIONSHIP,
    });

    expect(
      createInitialValues([contactField], [], [
        { fieldId: "field_contact", targetRecordId: "record_contact_1" },
      ]),
    ).toEqual({ contact: "record_contact_1" });
  });

  test("looks up a value by field ID", () => {
    const record = {
      values: [
        { id: "value_1", recordId: "record_1", fieldId: "field_status", value: "open" },
      ],
    } as RecordModuleItem;

    expect(getRecordFieldValue(record, "field_status")).toBe("open");
    expect(getRecordFieldValue(record, "missing")).toBeUndefined();
  });

  test("formats select and multi-select values using configured labels", () => {
    const multiSelectField = field({
      ...selectField,
      id: "field_tags",
      key: "tags",
      type: RecordFieldType.MULTI_SELECT,
    });

    expect(formatRecordValue(selectField, "open")).toBe("Open");
    expect(formatRecordValue(selectField, "legacy")).toBe("legacy");
    expect(formatRecordValue(multiSelectField, ["open", "legacy"])).toBe(
      "Open, legacy",
    );
  });

  test("formats empty, boolean, array, and object values consistently", () => {
    expect(formatRecordValue(field(), null)).toBe("—");
    expect(
      formatRecordValue(field({ type: RecordFieldType.BOOLEAN }), true),
    ).toBe("Yes");
    expect(formatRecordValue(field(), ["one", "two"])).toBe("one, two");
    expect(formatRecordValue(field(), { count: 2 })).toBe('{"count":2}');
  });
});
