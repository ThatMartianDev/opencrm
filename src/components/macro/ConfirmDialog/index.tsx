"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Styles from "./ConfirmDialog.module.css";

type ConfirmOptions = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
};

type ConfirmContextValue = {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = ConfirmOptions & {
    resolve: (value: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setPending({ ...options, resolve });
        });
    }, []);

    const handleConfirm = () => {
        pending?.resolve(true);
        setPending(null);
    };

    const handleCancel = () => {
        pending?.resolve(false);
        setPending(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {pending && (
                <div className={Styles.backdrop} onClick={handleCancel}>
                    <div className={Styles.dialog} onClick={(e) => e.stopPropagation()}>
                        <div className={Styles.body}>
                            <h3 className={Styles.title}>{pending.title}</h3>
                            {pending.description && (
                                <p className={Styles.description}>{pending.description}</p>
                            )}
                        </div>
                        <div className={Styles.actions}>
                            <button className={Styles.cancelBtn} onClick={handleCancel}>
                                {pending.cancelLabel || "Cancel"}
                            </button>
                            <button className={Styles.confirmBtn} onClick={handleConfirm} autoFocus>
                                {pending.confirmLabel || "Yes, Proceed"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmDialogProvider");
    }
    return context.confirm;
}
