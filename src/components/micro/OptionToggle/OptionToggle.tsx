import Styles from "./OptionToggle.module.css";

type OptionToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

const OptionToggle = ({
  checked,
  onChange,
  disabled = false,
}: OptionToggleProps) => {
  return (
    <input
      className={Styles.toggle}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
};

export default OptionToggle;