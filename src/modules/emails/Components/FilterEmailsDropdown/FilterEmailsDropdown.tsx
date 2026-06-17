import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import Styles from "./FilterEmailsDropdown.module.css";

import Selectable from "@/components/micro/FormFields/Selectable";
import { useEffect, useRef } from "react";

type DropdownProps = {
  showDropDown: boolean;
  setShowDropDown: (show: boolean) => void;
  setViewAll: (viewAll: boolean) => void;
  viewAll: boolean;
  setPage: (page: number) => void;
  linkedContacts: {
    id: string;
    name: string;
  }[];
  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;
};

const FilterEmailsDropdown = ({
  showDropDown,
  setShowDropDown,
  setViewAll,
  viewAll,
  setPage,
  linkedContacts,
  selectedContactId,
  setSelectedContactId,
}: DropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropDown(false);
      }
    }

    if (showDropDown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropDown]);

  return (
    <div className={`${Styles.dropdown} ${showDropDown ? Styles.show : ""}`} ref={dropdownRef}>
      <div className={Styles.contactsFilter}>
        <Selectable
          type="checkbox"
          label="View All Emails"
          id="view_all"
          name="view_all"
          value={viewAll ? "true" : "false"}
          isFormInput={true}
          onChange={(e) => {
            setViewAll(e.target.checked);
            setPage(1);
          }}
        />
        <span className={Styles.divider}></span>
        <i>Contacts from your Workspace</i>
        {linkedContacts.length > 0 &&
          linkedContacts.map((contact) => {
            const icon = (
              <AvatarFallback
                entityKind="customer"
                name={contact.name}
                entityId={contact.id}
                size={20}
              />
            );
            return (
              <Selectable
                key={contact.id}
                type="checkbox"
                label={contact.name}
                id={contact.id}
                name={contact.id}
                value={selectedContactId === contact.id ? "true" : "false"}
                icon={icon}
                isFormInput={true}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedContactId(contact.id);
                  } else {
                    setSelectedContactId(null);
                  }
                  setPage(1);
                }}
              />
            );
          })}
      </div>
    </div>
  );
};

export default FilterEmailsDropdown;
