import Styles from "./MainButton.module.css";

type ButtonProps = {
  type: "primary" | "secondary" | "tertiary";
  text: string;
  htmlTag?: "button" | "a";
  size?: "small" | "default" | "medium" | "large" | "full-width";
  href?: string;
  icon?: {
    type: "svg" | "image";
    src?: string | React.ReactNode;
    onFillColor?: string;
    defaultFillColor?: string;
  };
  disabled?: boolean;
  onClick?: () => void;
};

const MainButton = ({
  type,
  text,
  icon,
  size = "default",
  htmlTag = "button",
  href,
  disabled = false,
  onClick,
}: ButtonProps) => {
  const HtmlContent = () => {
    return (
      <>
        {icon && icon.type === "svg" && (
          <span className="icon">{icon.src}</span>
        )}
        {icon && icon.type === "image" && typeof icon.src === "string" && (
          <img src={icon.src} alt={`${text} icon`} className="icon" />
        )}
        <p>{text}</p>
      </>
    );
  };

  if (htmlTag === "a") {
    return (
      <a
        href={href}
        className={`${Styles.button} ${Styles[type]} ${icon ? Styles.withIcon : ""} ${size ? Styles[size] : ""}`}
        style={
          {
            "--icon-fill-color": icon?.onFillColor,
            "--icon-default-fill-color": icon?.defaultFillColor,
          } as React.CSSProperties
        }
        aria-disabled={disabled}
      >
        <HtmlContent />
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${Styles.button} ${Styles[type]} ${icon ? Styles.withIcon : ""} ${size ? Styles[size] : ""}`}
      style={
        {
          "--icon-fill-color": icon?.onFillColor,
          "--icon-default-fill-color": icon?.defaultFillColor,
        } as React.CSSProperties
      }
      disabled={disabled}
    >
      <HtmlContent />
    </button>
  );
};

export default MainButton;
