import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import Styles from "./ComposeEmailModal.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

import {
  ComposeFilled,
  PersonRegular,
  DeleteRegular,
} from "@fluentui/react-icons";
import { useRef, useState } from "react";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";

import { z } from "zod";

import {
  ContactPicker,
  PickerContact,
  useContactPicker,
} from "@/components/macro/ContactPicker";

import { sendEmailAction } from "../../actions";
import { useToast } from "@/components/macro/Toaster";
import BodyInput, { type BodyInputHandle } from "./BodyInput";
import { isBodyEmpty } from "./utils";

const RecipientPill = ({
  name,
  email,
  isCRMContact,
  onRemove,
}: {
  name: string;
  email: string;
  isCRMContact: boolean;
  onRemove: () => void;
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <button
      type="button"
      className={Styles.recipient}
      onClick={() => {
        setShowInfo(!showInfo);
      }}
    >
      {isCRMContact && (
        <AvatarFallback
          entityKind="customer"
          name={name || email || "Unknown"}
          size={20}
        />
      )}
      {!isCRMContact && <PersonRegular fontSize={20} color="#1a1a1a" />}
      <p>{name || email || "Unknown"}</p>
      <div className={`${Styles.recipientInfo} ${showInfo ? Styles.show : ""}`}>
        <p>{email}</p>
        <div className={Styles.removeRecipient} onClick={onRemove}>
          <DeleteRegular fontSize={16} color="#1a1a1a" />
          <span>Remove Recipient</span>
        </div>
      </div>
    </button>
  );
};

type ComposeEmailModalProps = {
  onClose: () => void;
  sendToEmail?: string;
  sendToName?: string;
  mode?: "compose" | "reply" | "reply-all" | "forward";
  initialTo?: string[];
  initialSubject?: string;
  quoteHtml?: string;
  replyToMessageId?: string;
  replyToThreadId?: string;
};

const ComposeEmailModal = ({
  onClose,
  sendToEmail,
  sendToName,
  mode = "compose",
  initialTo,
  initialSubject,
  quoteHtml,
  replyToMessageId,
  replyToThreadId,
}: ComposeEmailModalProps) => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const initialRecipients =
    initialTo && initialTo.length > 0
      ? initialTo.map((email) => ({
          name: email,
          email,
          isCRMContact: false,
        }))
      : sendToEmail
      ? [
          {
            name: sendToName,
            email: sendToEmail,
            isCRMContact: true,
          },
        ]
      : [];

  const [sendingTo, setSendingTo] = useState(initialRecipients);
  const [subject, setSubject] = useState(initialSubject || "");
  const bodyInputRef = useRef<BodyInputHandle>(null);

  const contactPicker = useContactPicker();
  const toFieldRef = useRef<HTMLDivElement>(null);
  const [searchForContact, setSearchForContact] = useState("");
  const handleContactSelect = (contact: PickerContact) => {
    if (!sendingTo.some((recipient) => recipient.email === contact.email)) {
      setSendingTo((prev) => [
        ...prev,
        { name: contact.name, email: contact.email || "", isCRMContact: true },
      ]);
    }
    setSearchForContact("");
    contactPicker.close();
  };

  const handleKeydownForAddingContact = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;

    const emailSchema = z.string().email();

    if (
      emailSchema.safeParse(searchForContact).success &&
      !sendingTo.some((recipient) => recipient.email === searchForContact)
    ) {
      setSendingTo((prev) => [
        ...prev,
        {
          name: searchForContact,
          email: searchForContact,
          isCRMContact: false,
        },
      ]);

      setSearchForContact("");
    }
  };

  const handleSubmit = async () => {
    const validRecipients = sendingTo
      .filter((recipient) => recipient.email)
      .map((recipient) => recipient.email);
    const t = toast.loading("Sending email...");
    if (validRecipients.length === 0) {
      t.error({
        title: "No valid recipients",
        description:
          "Please add at least one recipient with a valid email address.",
      });
      return;
    }

    if (mode === "compose" && isBodyEmpty(bodyInputRef.current?.getHtml() ?? "")) {
      t.error({
        title: "Email body is empty",
        description: "Please add some content before sending.",
      });
      return;
    }

    const bodyHtml = bodyInputRef.current?.getHtml() ?? "";
    const finalBody = quoteHtml ? `${bodyHtml}${quoteHtml}` : bodyHtml;

    setIsSending(true);
    try {
      const result = await sendEmailAction({
        to: validRecipients,
        subject,
        body: finalBody,
        ...(replyToMessageId ? { replyToMessageId } : {}),
        ...(replyToThreadId ? { replyToThreadId } : {}),
      });

      if (result.success) {
        t.success({
          title: "Email sent",
          description: `Your email has been sent successfully to ${validRecipients.join(", ")}.`,
        });
        onClose();
      }
      if (result.error) {
        t.error({ title: "Failed to send email", description: result.error });
      }
    } catch (error) {
      t.error({
        title: "Failed to send email",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={S.modalCard} id={Styles.composeEmailModal}>
      <div className={S.modalHeader}>
        <span>
          <ComposeFilled fontSize={20} color="#1a1a1a" />
        </span>
        <h2>
          {mode === "reply"
            ? "Reply"
            : mode === "reply-all"
            ? "Reply All"
            : mode === "forward"
            ? "Forward"
            : "Compose Email"}
        </h2>
      </div>

      <div className={S.modalBody}>
        <div className={Styles.composeEmailForm}>
          <div className={Styles.formField} ref={toFieldRef}>
            <label htmlFor="recipient">To</label>
            <div className={Styles.recipientsWrapper}>
              {sendingTo &&
                sendingTo.map((recipient, index) => (
                  <RecipientPill
                    key={index}
                    name={recipient.name || recipient.email}
                    email={recipient.email}
                    isCRMContact={recipient.isCRMContact}
                    onRemove={() => {
                      setSendingTo((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                  />
                ))}
              <input
                value={searchForContact}
                type="text"
                id="recipient"
                onChange={(e) => {
                  const value = e.target.value;

                  setSearchForContact(value);

                  if (toFieldRef.current) {
                    contactPicker.open(toFieldRef.current);
                  }
                }}
                onKeyDown={handleKeydownForAddingContact}
              />
            </div>
          </div>
          <div className={Styles.formField}>
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
              }}
            />
          </div>
          <BodyInput
            ref={bodyInputRef}
            quoteHtml={quoteHtml}
            placeholder="Write your email here..."
          />
        </div>
      </div>

      <div className={S.modalFooter}>
        <MainButton type="secondary" text="Discard" onClick={onClose} />
        <MainButton
          type="primary"
          text={isSending ? "Sending..." : "Send Email"}
          onClick={handleSubmit}
          disabled={isSending}
        />
      </div>
      {contactPicker.isOpen && contactPicker.triggerRect && (
        <ContactPicker
          triggerRect={contactPicker.triggerRect}
          searchTerm={searchForContact}
          noFocusOnOpen={true}
          hideSearchBar={true}
          onSelect={handleContactSelect}
          onClose={contactPicker.close}
        />
      )}
    </div>
  );
};

export default ComposeEmailModal;
