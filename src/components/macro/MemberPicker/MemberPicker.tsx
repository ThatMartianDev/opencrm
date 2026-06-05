"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { fetchOrganizationMembers } from "./actions";
import Styles from "./MemberPicker.module.css";

export type PickerMember = {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
};

type Position = { top: number; left: number };

type MemberPickerProps = {
    organizationId: string;
    triggerRect: DOMRect;
    onSelect: (member: PickerMember) => void;
    onClose: () => void;
};

function computePosition(triggerRect: DOMRect, popoverHeight: number, popoverWidth: number): Position {
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    // Horizontal: center-align with trigger, clamp to viewport
    left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(left, vw - popoverWidth - 8));

    // Vertical: prefer below
    const spaceBelow = vh - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;

    if (spaceBelow >= popoverHeight) {
        top = triggerRect.bottom + gap;
    } else if (spaceAbove >= popoverHeight) {
        top = triggerRect.top - popoverHeight - gap;
    } else {
        // Neither fits fully — pick whichever side has more room, and clamp
        if (spaceBelow >= spaceAbove) {
            top = triggerRect.bottom + gap;
        } else {
            top = Math.max(8, triggerRect.top - popoverHeight - gap);
        }
    }

    return { top, left };
}

export default function MemberPicker({ organizationId, triggerRect, onSelect, onClose }: MemberPickerProps) {
    const [members, setMembers] = useState<PickerMember[]>([]);
    const [search, setSearch] = useState("");
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMembers = async () => {
            const members = await fetchOrganizationMembers(organizationId);
            if (members) {
                setMembers(members);
            }
        };
        fetchMembers();
    }, [organizationId]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Position calculation
    useEffect(() => {
        const el = popoverRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        setPosition(computePosition(triggerRect, rect.height, rect.width));
    }, [triggerRect, members]);

    const filtered = members.filter((m) =>
        (m.name || m.email).toLowerCase().includes(search.toLowerCase()),
    );

    const handleSelect = useCallback(
        (member: PickerMember) => {
            onSelect(member);
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
                        placeholder="Search or enter email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className={Styles.memberList}>
                    {filtered.length === 0 && (
                        <div className={Styles.empty}>No members found</div>
                    )}
                    {filtered.map((member) => (
                        <button
                            key={member.id}
                            className={Styles.memberItem}
                            onClick={() => handleSelect(member)}
                        >
                            <AvatarFallback
                                name={member.name || member.email}
                                imageUrl={member.avatarUrl ?? undefined}
                                entityKind="member"
                                entityId={member.id}
                                size={24}
                            />
                            <p className={Styles.memberName}>{member.name || member.email}</p>
                        </button>
                    ))}
                </div>
            </div>
        </>,
        document.body
    );
}
