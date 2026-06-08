import { useState } from "react";
import Styles from "./Selectable.module.css";
import { CheckmarkFilled } from "@fluentui/react-icons"

type CheckboxProps = {
    id?: string;
    isButton?: boolean;
    isFormInput?: boolean;
    label?: string;
    name: string;
    value: string | number;
    type?: "radio" | "checkbox";
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Selectable = ({ id, isButton, isFormInput, label, name, value, type = "checkbox", onChange }: CheckboxProps) => {
    const [isActive, setIsActive] = useState(false);

    if (isButton) {
        return (
            <button type="button"></button>
        )
    }

    if (isFormInput) {
        return (
            <label className={`${Styles.selectable} ${type === "checkbox" ? Styles.isCheckbox : Styles.isRadio} ${isActive ? Styles.active : ""}`}>
                <input
                    id={id}
                    type={type}
                    name={name}
                    value={value}
                    onChange={(event) => {
                        setIsActive(event.target.checked);
                        if (onChange) {
                            onChange(event);
                        }
                    }}
                />
                <span className={Styles.checkmark}>
                    <CheckmarkFilled />
                </span>
                <span className={Styles.label}>{label}</span>
            </label>
        )
    }
}

export default Selectable;