"use client";
import { useState, useCallback } from "react";
import { AlertOnFilled, CheckmarkCircleFilled, DismissCircleFilled, DismissRegular } from "@fluentui/react-icons";
import type { ToastData } from "./types";
import ToastProgress from "./ToastProgress";
import Styles from "./Toast.module.css";

type ToastProps = {
    toast: ToastData;
    onDismiss: (id: string) => void;
};

export default function Toast({ toast, onDismiss }: ToastProps) {
    const [hovered, setHovered] = useState(false);

    const handleDismiss = useCallback(() => {
        onDismiss(toast.id);
    }, [onDismiss, toast.id]);

    return (
        <div
            className={`${Styles.toast} ${Styles[toast.status]}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={Styles.header}>
                <div className={Styles.statusIcon}>
                    {toast.status === "loading" && <div className={Styles.spinner} />}
                    {toast.status === "success" && <CheckmarkCircleFilled className={Styles.successIcon} />}
                    {toast.status === "error" && <DismissCircleFilled className={Styles.errorIcon} />}
                    {toast.status === "notify" && <AlertOnFilled className={Styles.notifyIcon} />}
                </div>
                <div className={Styles.content}>
                    <span className={Styles.title}>{toast.title}</span>
                    {toast.description && (
                        <span className={Styles.description}>{toast.description}</span>
                    )}
                </div>
                {toast.status !== "loading" && (
                    <button className={Styles.closeBtn} onClick={handleDismiss} aria-label="Close">
                        <DismissRegular />
                    </button>
                )}
            </div>

            {toast.actions && toast.actions.length > 0 && (
                <div className={Styles.actions}>
                    {toast.actions.map((action, i) => (
                        <button
                            key={i}
                            className={`${Styles.actionBtn} ${action.primary ? Styles.primaryAction : ""}`}
                            onClick={() => {
                                action.onClick();
                                handleDismiss();
                            }}
                        >
                            {action.label}
                            <span className={Styles.shortcut}>{i + 1}</span>
                        </button>
                    ))}
                </div>
            )}

            {(toast.status === "success" || toast.status === "notify") && toast.duration && (
                <ToastProgress
                    duration={toast.duration}
                    onComplete={handleDismiss}
                    paused={hovered}
                />
            )}
        </div>
    );
}
