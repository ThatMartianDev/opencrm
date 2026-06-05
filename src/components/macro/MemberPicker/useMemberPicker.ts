"use client";

import { useCallback, useState } from "react";
import type { PickerMember } from "./MemberPicker";

type MemberPickerState = {
    isOpen: boolean;
    triggerRect: DOMRect | null;
};

export function useMemberPicker() {
    const [state, setState] = useState<MemberPickerState>({
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

export type { PickerMember };
