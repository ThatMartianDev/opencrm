import EmailsPage from "@/modules/emails/EmailsPage";



const EmailsTab = ({contactId}: {contactId: string}) => {

    return (
        <div style={{ height: "100%" }}>
            <EmailsPage isMinimized={true} passedContactId={contactId}/>
        </div>
    )
}

export default EmailsTab;