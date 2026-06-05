"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Styles from "./OptionPicker.module.css";

export type PickerOption = {
    value: string;
    label: string;
    color: string;
};

type Position = { top: number; left: number };

type OptionPickerProps = {
    options: PickerOption[];
    currentValue?: string | null;
    triggerRect: DOMRect;
    onSelect: (option: PickerOption) => void;
    onClose: () => void;
};

function computePosition(triggerRect: DOMRect, popoverHeight: number, popoverWidth: number): Position {
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(left, vw - popoverWidth - 8));

    const spaceBelow = vh - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;

    if (spaceBelow >= popoverHeight) {
        top = triggerRect.bottom + gap;
    } else if (spaceAbove >= popoverHeight) {
        top = triggerRect.top - popoverHeight - gap;
    } else {
        if (spaceBelow >= spaceAbove) {
            top = triggerRect.bottom + gap;
        } else {
            top = Math.max(8, triggerRect.top - popoverHeight - gap);
        }
    }

    return { top, left };
}

export default function OptionPicker({ options, currentValue, triggerRect, onSelect, onClose }: OptionPickerProps) {
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = popoverRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        setPosition(computePosition(triggerRect, rect.height, rect.width));
    }, [triggerRect]);

    const handleSelect = useCallback(
        (option: PickerOption) => {
            onSelect(option);
            onClose();
        },
        [onSelect, onClose],
    );

    return (
        <>
            <div className={Styles.backdrop} onClick={onClose} />
            <div
                ref={popoverRef}
                className={Styles.popover}
                style={{ top: position.top, left: position.left }}
            >
                {options.map((option) => (
                    <button
                        key={option.value}
                        className={`${Styles.optionItem}${option.value === currentValue ? ` ${Styles.active}` : ""}`}
                        onClick={() => handleSelect(option)}
                    >
                        <span className={Styles.dot} style={{ backgroundColor: option.color }} />
                        <span className={Styles.optionLabel}>{option.label}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
