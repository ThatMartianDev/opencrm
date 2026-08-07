"use client";

import { ChevronDownRegular, SearchRegular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import type { ColorEntityKind } from "@/components/micro/AvatarFallback/entityColor";
import Styles from "./AvatarSelect.module.css";

export type AvatarSelectOption = {
  id: string;
  name: string;
};

type AvatarSelectProps = {
  options: AvatarSelectOption[];
  value: string;
  placeholder: string;
  emptyText: string;
  entityKind: ColorEntityKind;
  disabled?: boolean;
  allowClear?: boolean;
  selectedName?: string;
  className?: string;
  onChange: (option: AvatarSelectOption | null) => void;
};

type Position = { top: number; left: number; width: number };

const getPosition = (triggerRect: DOMRect, panelHeight: number): Position => {
  const gap = 6;
  const viewportPadding = 8;
  const width = Math.max(240, triggerRect.width);
  const left = Math.max(
    viewportPadding,
    Math.min(triggerRect.left, window.innerWidth - width - viewportPadding),
  );
  const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
  const top =
    spaceBelow >= panelHeight
      ? triggerRect.bottom + gap
      : Math.max(viewportPadding, triggerRect.top - panelHeight - gap);

  return { top, left, width };
};

const AvatarSelect = ({
  options,
  value,
  placeholder,
  emptyText,
  entityKind,
  disabled = false,
  allowClear = false,
  selectedName,
  className,
  onChange,
}: AvatarSelectProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, width: 240 });
  const selected = options.find((option) => option.id === value);
  const selectedOption = selected ??
    (value && selectedName ? { id: value, name: selectedName } : null);
  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    setPosition(getPosition(trigger.getBoundingClientRect(), panel.offsetHeight));
    searchRef.current?.focus();
  }, [isOpen, filteredOptions.length]);

  const close = () => {
    setIsOpen(false);
    setSearch("");
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${Styles.trigger}${className ? ` ${className}` : ""}`}
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        {selectedOption ? (
          <AvatarFallback
            name={selectedOption.name}
            entityKind={entityKind}
            entityId={selectedOption.id}
            size={22}
            letterCount={1}
            style={{ borderRadius: 5 }}
          />
        ) : (
          <span className={Styles.emptyAvatar} />
        )}
        <span className={selectedOption ? Styles.value : Styles.placeholder}>
          {selectedOption?.name ?? placeholder}
        </span>
        <ChevronDownRegular className={Styles.chevron} fontSize={16} />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className={Styles.backdrop} onClick={close} />
            <div
              ref={panelRef}
              className={Styles.panel}
              style={position}
            >
              <div className={Styles.searchBox}>
                <SearchRegular fontSize={16} />
                <input
                  ref={searchRef}
                  value={search}
                  placeholder="Search..."
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className={Styles.options}>
                {allowClear && !search && (
                  <button
                    type="button"
                    className={`${Styles.option} ${!value ? Styles.active : ""}`}
                    onClick={() => {
                      onChange(null);
                      close();
                    }}
                  >
                    <span className={Styles.emptyAvatar} />
                    <span>None</span>
                  </button>
                )}
                {filteredOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={`${Styles.option} ${option.id === value ? Styles.active : ""}`}
                    onClick={() => {
                      onChange(option);
                      close();
                    }}
                  >
                    <AvatarFallback
                      name={option.name}
                      entityKind={entityKind}
                      entityId={option.id}
                      size={24}
                      letterCount={1}
                      style={{ borderRadius: 5 }}
                    />
                    <span>{option.name}</span>
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <p className={Styles.empty}>{emptyText}</p>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export default AvatarSelect;