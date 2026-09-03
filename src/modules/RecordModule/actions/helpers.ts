import { RecordFieldType, type Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import RecordModuleService from "../service";
import type { ParsedRecordValues } from "./types";

export const isEmptyValue = (value: unknown) =>
	value === null ||
	value === undefined ||
	value === "" ||
	(Array.isArray(value) && value.length === 0);

const getConfiguredOptions = (config: unknown) => {
	if (!config || typeof config !== "object" || Array.isArray(config)) return [];
	const options = (config as { options?: unknown }).options;
	if (!Array.isArray(options)) return [];

	return options.filter(
		(option): option is { label: string; value: string; color?: string } =>
			typeof option === "object" &&
			option !== null &&
			typeof (option as { label?: unknown }).label === "string" &&
			typeof (option as { value?: unknown }).value === "string",
	);
};

const getNumericBounds = (config: unknown) => {
	if (!config || typeof config !== "object" || Array.isArray(config)) {
		return {};
	}

	const { minimum, maximum } = config as {
		minimum?: unknown;
		maximum?: unknown;
	};
	return {
		minimum: typeof minimum === "number" ? minimum : undefined,
		maximum: typeof maximum === "number" ? maximum : undefined,
	};
};


export const parseRecordValues = (
	fields: NonNullable<
		Awaited<ReturnType<typeof RecordModuleService.getModulePageData>>
	>["fields"],
	rawValues: Record<string, unknown>,
	applyDefaults: boolean,
): ParsedRecordValues => {
	const values: {
		fieldId: string;
		value: Prisma.InputJsonValue;
	}[] = [];
	const relationships: {
		fieldId: string;
		targetRecordId: string;
	}[] = [];
	let displayName = "Untitled record";

	for (const field of fields) {
		let rawValue = rawValues[field.key];
		if (
			applyDefaults &&
			isEmptyValue(rawValue) &&
			field.defaultValue !== null
		) {
			rawValue = field.defaultValue;
		}
		if (isEmptyValue(rawValue)) {
			if (field.required) {
				return { success: false, error: `${field.label} is required.` };
			}
			continue;
		}

		let value: Prisma.InputJsonValue;
		switch (field.type) {
			case RecordFieldType.RELATIONSHIP:
				if (typeof rawValue !== "string" || !rawValue.trim()) {
					return {
						success: false,
						error: `Choose a valid ${field.label} record.`,
					};
				}
				relationships.push({
					fieldId: field.id,
					targetRecordId: rawValue,
				});
				continue;
			case RecordFieldType.NUMBER:
			case RecordFieldType.CURRENCY:
			case RecordFieldType.PERCENT:
				if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
					return { success: false, error: `${field.label} must be a valid number.` };
				}
				const { minimum, maximum } = getNumericBounds(field.config);
				if (minimum !== undefined && rawValue < minimum) {
					return { success: false, error: `${field.label} must be at least ${minimum}.` };
				}
				if (maximum !== undefined && rawValue > maximum) {
					return { success: false, error: `${field.label} must be at most ${maximum}.` };
				}
				value = rawValue;
				break;
			case RecordFieldType.BOOLEAN:
				if (typeof rawValue !== "boolean") {
					return { success: false, error: `${field.label} must be true or false.` };
				}
				value = rawValue;
				break;
			case RecordFieldType.DATE:
			case RecordFieldType.DATETIME:
				if (
					typeof rawValue !== "string" ||
					Number.isNaN(Date.parse(rawValue))
				) {
					return { success: false, error: `${field.label} must be a valid date.` };
				}
				value = rawValue;
				break;
			case RecordFieldType.EMAIL:
				if (!z.string().email().safeParse(rawValue).success) {
					return { success: false, error: `${field.label} must be a valid email.` };
				}
				value = rawValue as string;
				break;
			case RecordFieldType.URL:
				if (!z.string().url().safeParse(rawValue).success) {
					return { success: false, error: `${field.label} must be a valid URL.` };
				}
				value = rawValue as string;
				break;
			case RecordFieldType.SELECT: {
				const options = getConfiguredOptions(field.config);
				if (
					typeof rawValue !== "string" ||
					!options.some((option) => option.value === rawValue)
				) {
					return { success: false, error: `Choose a valid ${field.label} option.` };
				}
				value = rawValue;
				break;
			}
			case RecordFieldType.MULTI_SELECT: {
				const options = getConfiguredOptions(field.config);
				if (
					!Array.isArray(rawValue) ||
					new Set(rawValue).size !== rawValue.length ||
					!rawValue.every(
						(item) =>
							typeof item === "string" &&
							options.some((option) => option.value === item),
					)
				) {
					return { success: false, error: `Choose valid ${field.label} options.` };
				}
				value = rawValue as string[];
				break;
			}
			default:
				if (typeof rawValue !== "string") {
					return { success: false, error: `${field.label} must be text.` };
				}
				value = rawValue.trim();
		}

		if (value === "") {
			if (field.required) {
				return { success: false, error: `${field.label} is required.` };
			}
			continue;
		}

		if (field.isPrimary) {
			displayName = Array.isArray(value) ? value.join(", ") : String(value);
		}
		values.push({ fieldId: field.id, value });
	}

	return { success: true, values, relationships, displayName };
};
