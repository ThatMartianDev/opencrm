"use client";

import { useCallback, useState } from "react";

type ContactPickerState = {
    isOpen: boolean;
    triggerRect: DOMRect | null;
};

export function useContactPicker() {
    const [state, setState] = useState<ContactPickerState>({
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
