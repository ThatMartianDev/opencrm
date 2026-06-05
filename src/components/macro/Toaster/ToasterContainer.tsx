"use client";
import { useEffect } from "react";
import { useToasterState } from "./ToasterProvider";
import Toast from "./Toast";
import Styles from "./Toast.module.css";

export default function ToasterContainer() {
    const { toasts, dismiss } = useToasterState();

    // Keyboard shortcuts: press 1/2/3 to trigger action buttons on the latest toast
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = parseInt(e.key);
            if (isNaN(key) || key < 1 || key > 9) return;

            // Only trigger on the latest toast that has actions
            const target = (e.target as HTMLElement).tagName;
            if (target === "INPUT" || target === "TEXTAREA" || target === "SELECT") return;

            const latestWithActions = [...toasts].reverse().find((t) => t.actions && t.actions.length > 0);
            if (!latestWithActions || !latestWithActions.actions) return;

            const action = latestWithActions.actions[key - 1];
            if (action) {
                action.onClick();
                dismiss(latestWithActions.id);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toasts, dismiss]);

    if (toasts.length === 0) return null;

    return (
        <div className={Styles.container}>
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
        </div>
    );
}
