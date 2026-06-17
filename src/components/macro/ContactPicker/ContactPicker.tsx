"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { fetchOrganizationContacts } from "./actions";
import Styles from "./ContactPicker.module.css";

export type PickerContact = {
  id: string;
  name: string;
  email: string | null;
  companyId: string | null;
  companyName: string | null;
};

type Position = { top: number; left: number };

type ContactPickerProps = {
  triggerRect: DOMRect;
  companyId?: string;
  searchTerm?: string;
  hideSearchBar?: boolean;
  noFocusOnOpen?: boolean;
  onSelect: (contact: PickerContact) => void;
  onClose: () => void;
};

function computePosition(
  triggerRect: DOMRect,
  popoverHeight: number,
  popoverWidth: number,
): Position {
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

export default function ContactPicker({
  triggerRect,
  companyId,
  searchTerm,
  hideSearchBar = false,
  noFocusOnOpen = false,
  onSelect,
  onClose,
}: ContactPickerProps) {
  const [contacts, setContacts] = useState<PickerContact[]>([]);
  const [search, setSearch] = useState(searchTerm || "");
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchOrganizationContacts().then((data) => {
      if (data) setContacts(data);
    });
  }, []);

  useEffect(() => {
    if (!noFocusOnOpen) {
      inputRef.current?.focus();
    }
  }, [noFocusOnOpen]);

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition(computePosition(triggerRect, rect.height, rect.width));
  }, [triggerRect, contacts]);

  useEffect(() => {
    if (searchTerm !== undefined) {
      setSearch(searchTerm);
    }
  }, [searchTerm]);

  const filtered = contacts.filter((c) => {
    if (companyId && c.companyId !== companyId) return false;
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleSelect = useCallback(
    (contact: PickerContact) => {
      onSelect(contact);
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
        {!hideSearchBar && (
          <div className={Styles.searchWrapper}>
            <input
              ref={inputRef}
              className={Styles.searchInput}
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <div className={Styles.itemList}>
          {filtered.length === 0 && (
            <div className={Styles.empty}>No contacts found</div>
          )}
          {filtered.map((contact) => (
            <button
              key={contact.id}
              className={Styles.item}
              onClick={() => handleSelect(contact)}
            >
              <AvatarFallback
                name={contact.name}
                entityKind="customer"
                entityId={contact.id}
                size={24}
              />
              <div className={Styles.itemInfo}>
                <p className={Styles.itemName}>{contact.name}</p>
                {(contact.email || contact.companyName) && (
                  <p className={Styles.itemSub}>
                    {contact.companyName || contact.email}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}
