"use client";

import { useCallback, useState } from "react";

type CompanyPickerState = {
    isOpen: boolean;
    triggerRect: DOMRect | null;
};

export function useCompanyPicker() {
    const [state, setState] = useState<CompanyPickerState>({
        isOpen: false,
        triggerRect: null,
    });

    const open = useCallback((triggerElement: HTMLElement) => {
        const rect = triggerElement.getBoundingClientRect();
        setState({ isOpen: true, triggerRect: rect });
    }, []);

    const close = useCallback(() => {
        setState({ isOpen: false, triggerRect: null });
    }, []);

    return {
        isOpen: state.isOpen,
        triggerRect: state.triggerRect,
        open,
        close,
    };
}
