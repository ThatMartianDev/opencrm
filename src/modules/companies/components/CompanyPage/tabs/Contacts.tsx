"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getContacts } from "@/modules/contacts/actions";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";

type ContactRow = Awaited<ReturnType<typeof getContacts>>[number];

type ContactsTabProps = {
    companyId: string;
};

const ContactsTab = ({ companyId }: ContactsTabProps) => {
    const [contacts, setContacts] = useState<ContactRow[]>([]);
    const router = useRouter();
    const { organization } = useWorkspaceData();

    useEffect(() => {
        getContacts()
            .then((all) => setContacts(all.filter((c) => c.companyId === companyId)))
            .catch(console.error);
    }, [companyId]);

    return (
        <div style={{ padding: 24, overflow: "auto", height: "100%" }}>
            {contacts.length === 0 ? (
                <p style={{ color: "var(--text-color)", opacity: 0.6, fontSize: "var(--font-size-sm)" }}>
                    No contacts linked to this company yet.
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {contacts.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => router.push(`/app/${organization.slug}/contacts/${contact.id}`)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border-100)",
                                cursor: "pointer",
                            }}
                        >
                            <AvatarFallback
                                name={contact.name}
                                entityKind="customer"
                                entityId={contact.id}
                                size={28}
                                letterCount={1}
                            />
                            <div>
                                <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{contact.name}</p>
                                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-color)", opacity: 0.6 }}>
                                    {contact.jobTitle || contact.email || "—"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactsTab;
