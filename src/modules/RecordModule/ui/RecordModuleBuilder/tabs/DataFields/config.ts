import { RecordFieldType } from "@/generated/prisma/enums";
import {
  DismissFilled,
  TextFieldRegular,
  NumberCircle1Regular,
  MailRegular,
  CallRegular,
  CalendarRegular,
  CalendarDateRegular,
  SelectAllOnRegular,
  RadioButtonFilled,
  MoneyRegular,
  LinkRegular,
  ChevronRightFilled,
  AddRegular,
  DeleteRegular,
} from "@fluentui/react-icons";

export const FieldTypes = [
  {
    name: "Text",
    type: RecordFieldType.TEXT,
    icon: TextFieldRegular,
  },
  {
    name: "Number",
    type: RecordFieldType.NUMBER,
    icon: NumberCircle1Regular,
  },
  {
    name: "Email",
    type: RecordFieldType.EMAIL,
    icon: MailRegular,
  },
  {
    name: "Phone",
    type: RecordFieldType.PHONE,
    icon: CallRegular,
  },
  {
    name: "Date & Time",
    type: RecordFieldType.DATETIME,
    icon: CalendarRegular,
  },
  {
    name: "Date",
    type: RecordFieldType.DATE,
    icon: CalendarDateRegular,
  },
  {
    name: "Multi Select",
    type: RecordFieldType.MULTI_SELECT,
    icon: SelectAllOnRegular,
  },
  {
    name: "Single Select",
    type: RecordFieldType.SELECT,
    icon: RadioButtonFilled,
  },
  {
    name: "Currency",
    type: RecordFieldType.CURRENCY,
    icon: MoneyRegular,
  },
  {
    name: "Relationship",
    type: RecordFieldType.RELATIONSHIP,
    icon: LinkRegular,
  },
];
