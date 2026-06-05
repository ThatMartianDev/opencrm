"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { getContacts } from "../../actions";
import Styles from "./ContactList.module.css";

type ContactRow = Awaited<ReturnType<typeof getContacts>>[number];

type ContactListProps = {
    contacts: ContactRow[];
};

const ContactListItem = ({ contact, workspaceId }: { contact: ContactRow; workspaceId: string }) => {
    const router = useRouter();

    return (
        <div
            className={Styles.table_row}
            onClick={() => router.push(`/app/${workspaceId}/contacts/${contact.id}`)}
        >
            <div className={Styles.item_name}>
                <AvatarFallback
                    name={contact.name}
                    entityKind="customer"
                    entityId={contact.id}
                    size={24}
                    letterCount={1}
                />
                <p>{contact.name}</p>
            </div>
            <div>
                <p>{contact.email || "—"}</p>
            </div>
            <div>
                <p>{contact.phone || "—"}</p>
            </div>
            <div>
                <p>{contact.jobTitle || "—"}</p>
            </div>
            <div>
                <p>{contact.company?.name || "—"}</p>
            </div>
            <div>
                <p>{contact.source || "—"}</p>
            </div>
        </div>
    );
};

const ContactList = ({ contacts }: ContactListProps) => {
    const workspace = useWorkspaceData();

    return (
        <div className={Styles.listTab}>
            <div id={Styles.table}>
                <div className={Styles.table_header}>
                    <div><p>Name</p></div>
                    <div><p>Email</p></div>
                    <div><p>Phone</p></div>
                    <div><p>Job Title</p></div>
                    <div><p>Company</p></div>
                    <div><p>Source</p></div>
                </div>
                {contacts.map((contact) => (
                    <ContactListItem
                        key={contact.id}
                        contact={contact}
                        workspaceId={workspace.organizationId}
                    />
                ))}
            </div>
        </div>
    );
};

export default ContactList;
