import {
  BoxFilled,
  BuildingFilled,
  CalendarFilled,
  ChartMultipleFilled,
  DocumentFilled,
  FolderFilled,
  LocationFilled,
  MoneyFilled,
  PeopleFilled,
  PersonFilled,
  ShieldFilled,
  StarFilled,
  TagFilled,
  TargetFilled,
} from "@fluentui/react-icons";

const ICONS = {
  TargetFilled,
  PeopleFilled,
  MoneyFilled,
  PersonFilled,
  BuildingFilled,
  DocumentFilled,
  CalendarFilled,
  TagFilled,
  BoxFilled,
  FolderFilled,
  ChartMultipleFilled,
  LocationFilled,
  ShieldFilled,
  StarFilled,
};

const ModuleIcon = ({ name, size = 20 }: { name: string; size?: number }) => {
  const Icon = ICONS[name as keyof typeof ICONS] ?? TargetFilled;
  return <Icon fontSize={size} color="#fff" />;
};

export default ModuleIcon;
