import Styles from "./MainButton.module.css";

type ButtonProps = {
    type: "primary" | "secondary" | "tertiary";
    text: string;
    icon?: {
        type: "svg" | "image";
        src?: string | React.ReactNode;
        onFillColor?: string;
        defaultFillColor?: string;
    };
    disabled?: boolean;
    onClick?: () => void;
}

const MainButton = ({ type, text, icon, disabled = false, onClick }: ButtonProps) => {

    return (
        <button onClick={onClick} className={`${Styles.button} ${Styles[type]} ${icon ? Styles.withIcon : ""}`} style={{"--icon-fill-color": icon?.onFillColor, "--icon-default-fill-color": icon?.defaultFillColor} as React.CSSProperties  } disabled={disabled}>
            {icon && icon.type === "svg" && (
                <span className="icon">
                    {icon.src}
                </span>
            )}
            {icon && icon.type === "image" && typeof icon.src === "string" && (
                <img src={icon.src} alt={`${text} icon`} className="icon" />
            )}
            <p>{text}</p>
        </button>
    )
}

export default MainButton;