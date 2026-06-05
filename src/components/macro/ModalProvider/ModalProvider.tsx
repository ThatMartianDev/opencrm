"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import NewDeal from "@/modules/deals/components/NewDeal/NewDeal";
import { TaskModal } from "@/modules/tasks";
import { NoteModal } from "@/modules/notes";
import { LogActivityModal } from "@/modules/activity-log";
import { NewCompanyModal } from "@/modules/companies";
import { NewContactModal } from "@/modules/contacts";
import InviteMemberModal from "@/modules/workspace/components/InviteMemberModal/InviteMemberModal";
import CreateEventModal from "@/modules/calendar/components/CreateEventModal/CreateEventModal";

import Styles from "./ModalProvider.module.css";

type ModalId = "new-deal" | "task" | "note" | "log-activity" | "new-company" | "new-contact" | "invite-member" | "calendar-event";

type ModalState = {
    id: ModalId;
    props?: Record<string, unknown>;
    onDataChanged?: () => void;
} | null;

type ModalContextValue = {
    openModal: (id: ModalId, props?: Record<string, unknown>, onDataChanged?: () => void) => void;
    closeModal: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const MODAL_COMPONENTS: Record<ModalId, React.ComponentType<{ onClose: () => void } & Record<string, unknown>>> = {
    "new-deal": NewDeal,
    "task": TaskModal as React.ComponentType<{ onClose: () => void } & Record<string, unknown>>,
    "note": NoteModal as React.ComponentType<{ onClose: () => void } & Record<string, unknown>>,
    "log-activity": LogActivityModal as React.ComponentType<{ onClose: () => void } & Record<string, unknown>>,
    "new-company": NewCompanyModal as React.ComponentType<{ onClose: () => void } & Record<string, unknown>>,
    "new-contact": NewContactModal as React.ComponentType<{ onClose: () => void } & Record<string, unknown>>,
    "invite-member": InviteMemberModal as React.ComponentType<{ onClose: () => void } & Record<string, unknown>>,
    "calendar-event": CreateEventModal as React.ComponentType<{ onClose: () => void } & Record<string, unknown>>,
};

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<ModalState>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Sync modal state from URL query params (only on initial load / external navigation)
    useEffect(() => {
        const modalType = searchParams.get("modal") as ModalId | null;
        const modalId = searchParams.get("id");
        if (modalType && MODAL_COMPONENTS[modalType]) {
            setModal((prev) => {
                // Don't overwrite if already set programmatically (preserves onDataChanged)
                if (prev?.id === modalType) return prev;
                return { id: modalType, props: modalId ? { id: modalId } : undefined };
            });
        }
    }, [searchParams]);

    const openModal = useCallback((id: ModalId, props?: Record<string, unknown>, onDataChanged?: () => void) => {
        setModal({ id, props, onDataChanged });
        // Update URL with modal query params
        const params = new URLSearchParams(searchParams.toString());
        params.set("modal", id);
        if (props?.id) {
            params.set("id", props.id as string);
        } else {
            params.delete("id");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [router, pathname, searchParams]);

    const closeModal = useCallback(() => {
        setModal(null);
        // Remove modal query params from URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete("modal");
        params.delete("id");
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [router, pathname, searchParams]);

    const ModalComponent = modal ? MODAL_COMPONENTS[modal.id] : null;

    return (
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            {modal && ModalComponent && (
                <div className={Styles.modalBackdrop} onClick={closeModal}>
                    <div className={Styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <ModalComponent onClose={closeModal} onDataChanged={modal.onDataChanged} {...(modal.props ?? {})} />
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
}
