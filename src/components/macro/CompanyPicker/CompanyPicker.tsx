"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { fetchOrganizationCompanies } from "./actions";
import Styles from "./CompanyPicker.module.css";

export type PickerCompany = {
    id: string;
    name: string;
    industry: string | null;
};

type Position = { top: number; left: number };

type CompanyPickerProps = {
    triggerRect: DOMRect;
    onSelect: (company: PickerCompany) => void;
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

export default function CompanyPicker({ triggerRect, onSelect, onClose }: CompanyPickerProps) {
    const [companies, setCompanies] = useState<PickerCompany[]>([]);
    const [search, setSearch] = useState("");
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchOrganizationCompanies().then((data) => {
            if (data) setCompanies(data);
        });
    }, []);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const el = popoverRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setPosition(computePosition(triggerRect, rect.height, rect.width));
    }, [triggerRect, companies]);

    const filtered = companies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.industry && c.industry.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSelect = useCallback(
        (company: PickerCompany) => {
            onSelect(company);
            onClose();
        },
        [onSelect, onClose],
    );

    return createPortal(
        <>
            <div className={Styles.backdrop} onClick={onClose} />
            <div
                ref={popoverRef}
                className={Styles.popover}
                style={{ top: position.top, left: position.left }}
            >
                <div className={Styles.searchWrapper}>
                    <input
                        ref={inputRef}
                        className={Styles.searchInput}
                        type="text"
                        placeholder="Search companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className={Styles.itemList}>
                    {filtered.length === 0 && (
                        <div className={Styles.empty}>No companies found</div>
                    )}
                    {filtered.map((company) => (
                        <button
                            key={company.id}
                            className={Styles.item}
                            onClick={() => handleSelect(company)}
                        >
                            <AvatarFallback
                                name={company.name}
                                entityKind="customer"
                                entityId={company.id}
                                size={24}
                                letterCount={1}
                                style={{ borderRadius: 6 }}
                            />
                            <div className={Styles.itemInfo}>
                                <p className={Styles.itemName}>{company.name}</p>
                                {company.industry && (
                                    <p className={Styles.itemSub}>{company.industry}</p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </>,
        document.body
    );
}
