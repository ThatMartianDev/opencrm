export type ToastStatus = "loading" | "success" | "error";

export type ToastAction = {
    label: string;
    onClick: () => void;
    primary?: boolean;
};

export type ToastData = {
    id: string;
    status: ToastStatus;
    title: string;
    description?: string;
    duration?: number;
    actions?: ToastAction[];
};

export type ToastSuccessOptions = {
    title: string;
    description?: string;
    duration?: number;
    actions?: ToastAction[];
};

export type ToastErrorOptions = {
    title: string;
    description?: string;
    actions?: ToastAction[];
};

export type ToastControls = {
    id: string;
    success: (options: ToastSuccessOptions) => void;
    error: (options: ToastErrorOptions) => void;
    dismiss: () => void;
};
