"use client";

import { PeopleFilled } from "@fluentui/react-icons";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useEffect, useState } from "react";
import { getContacts } from "./actions";
import ContactList from "./components/ContactList/ContactList";
import Styles from "./ContactsPage.module.css";

type ContactRow = Awaited<ReturnType<typeof getContacts>>[number];

const ContactsPage = () => {
    const [contacts, setContacts] = useState<ContactRow[]>([]);
    const { openModal } = useModal();

    function handleCreateContact() {
        openModal("new-contact");
    }

    useEffect(() => {
        window.document.title = "Contacts | OpenCRM";
        getContacts()
            .then(setContacts)
            .catch((error) => {
                console.error("Error fetching contacts:", error);
            });
    }, []);

    return (
        <div className={Styles.contactsPage}>
            <header className="global_header">
                <div className="g_header_section_name">
                    <span style={{ backgroundColor: "#6D3A92" }}>
                        <PeopleFilled fontSize={20} color="#fff" />
                    </span>
                    <h2>Contacts</h2>
                </div>
            </header>
            <div className="flex-col" style={{ height: "100%" }}>
                <TabsControlHeader
                    tabs={[]}
                    onTabBtnClick={() => {}}
                    showMainBtn={true}
                    mainButton={{ text: "New Contact", onClick: handleCreateContact }}
                />
                <ContactList contacts={contacts} />
            </div>
        </div>
    );
};

export default ContactsPage;
