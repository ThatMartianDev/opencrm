"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ToastData, ToastControls, ToastSuccessOptions, ToastErrorOptions, ToastNotifyOptions } from "./types";

type ToasterContextValue = {
    toasts: ToastData[];
    dismiss: (id: string) => void;
    loading: (title: string) => ToastControls;
};

const ToasterContext = createContext<ToasterContextValue | null>(null);

let toastCounter = 0;

export function ToasterProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const updateToast = useCallback((id: string, updates: Partial<ToastData>) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
    }, []);

    const loading = useCallback((title: string): ToastControls => {
        const id = `toast-${++toastCounter}`;

        const toast: ToastData = {
            id,
            status: "loading",
            title,
        };

        setToasts((prev) => [...prev, toast]);

        return {
            id,
            success: (options: ToastSuccessOptions) => {
                updateToast(id, {
                    status: "success",
                    title: options.title,
                    description: options.description,
                    duration: options.duration ?? 5000,
                    actions: options.actions,
                });
            },
            notify: (options: ToastNotifyOptions) => {
                updateToast(id, {
                    status: "notify",
                    title: options.title,
                    description: options.description,
                    duration: options.duration ?? 5000,
                    actions: options.actions,
                });
            },
            error: (options: ToastErrorOptions) => {
                updateToast(id, {
                    status: "error",
                    title: options.title,
                    description: options.description,
                    actions: options.actions,
                    duration: undefined,
                });
            },
            dismiss: () => dismiss(id),
        };
    }, [dismiss, updateToast]);

    return (
        <ToasterContext.Provider value={{ toasts, dismiss, loading }}>
            {children}
        </ToasterContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToasterContext);
    if (!context) {
        throw new Error("useToast must be used within a ToasterProvider");
    }
    return {
        toast: {
            loading: context.loading,
            success: (options: ToastSuccessOptions) => {
                const t = context.loading("");
                t.success(options);
            },
            notify: (options: ToastNotifyOptions) => {
                const t = context.loading("");
                t.notify(options);
            },
            error: (options: ToastErrorOptions) => {
                const t = context.loading("");
                t.error(options);
            },
        },
        dismiss: context.dismiss,
    };
}

export function useToasterState() {
    const context = useContext(ToasterContext);
    if (!context) {
        throw new Error("useToasterState must be used within a ToasterProvider");
    }
    return { toasts: context.toasts, dismiss: context.dismiss };
}
