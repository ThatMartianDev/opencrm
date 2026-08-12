import {
  CalendarDateRegular,
  CalendarRegular,
  CallRegular,
  CheckmarkSquareRegular,
  DocumentRegular,
  FolderRegular,
  LinkRegular,
  MailRegular,
  MoneyRegular,
  NumberCircle1Regular,
  PersonRegular,
  RadioButtonFilled,
  SelectAllOnRegular,
  TextFieldRegular,
} from "@fluentui/react-icons";
import type { ComponentType } from "react";
import { RecordFieldType } from "@/generated/prisma/enums";

const FIELD_ICONS: Partial<
  Record<RecordFieldType, ComponentType<{ fontSize?: number }>>
> = {
  [RecordFieldType.TEXT]: TextFieldRegular,
  [RecordFieldType.LONG_TEXT]: TextFieldRegular,
  [RecordFieldType.NUMBER]: NumberCircle1Regular,
  [RecordFieldType.CURRENCY]: MoneyRegular,
  [RecordFieldType.PERCENT]: NumberCircle1Regular,
  [RecordFieldType.BOOLEAN]: CheckmarkSquareRegular,
  [RecordFieldType.DATE]: CalendarDateRegular,
  [RecordFieldType.DATETIME]: CalendarRegular,
  [RecordFieldType.EMAIL]: MailRegular,
  [RecordFieldType.PHONE]: CallRegular,
  [RecordFieldType.URL]: LinkRegular,
  [RecordFieldType.SELECT]: RadioButtonFilled,
  [RecordFieldType.MULTI_SELECT]: SelectAllOnRegular,
  [RecordFieldType.RELATIONSHIP]: LinkRegular,
  [RecordFieldType.USER]: PersonRegular,
  [RecordFieldType.FILE]: FolderRegular,
};

const RecordFieldIcon = ({
  type,
  fontSize = 16,
}: {
  type: RecordFieldType;
  fontSize?: number;
}) => {
  const Icon = FIELD_ICONS[type] ?? DocumentRegular;
  return <Icon fontSize={fontSize} />;
};

export default RecordFieldIcon;