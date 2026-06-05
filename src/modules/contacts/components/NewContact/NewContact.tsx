"use client";

import { useState } from "react";
import { PeopleFilled } from "@fluentui/react-icons";
import MainButton from "@/components/micro/MainButton/MainButton";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { createContact } from "@/modules/contacts/actions";
import { CompanyPicker, PickerCompany, useCompanyPicker } from "@/components/macro/CompanyPicker";

type NewContactProps = {
    onClose: () => void;
    companyId?: string;
};

const SOURCE_OPTIONS = [
    "Website",
    "Referral",
    "Social Media",
    "Cold Outreach",
    "Event",
    "Advertisement",
    "Other",
] as const;

const NewContact = ({ onClose, companyId: initialCompanyId }: NewContactProps) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [source, setSource] = useState("");
    const [companyId, setCompanyId] = useState(initialCompanyId || "");
    const [companyName, setCompanyName] = useState("");

    const companyPicker = useCompanyPicker();

    const handleSelectCompany = (company: PickerCompany) => {
        setCompanyId(company.id);
        setCompanyName(company.name);
    };

    async function handleCreate() {
        if (!name.trim()) return;
        await createContact({
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            jobTitle: jobTitle.trim() || undefined,
            source: source || undefined,
            companyId: companyId || undefined,
        });
        onClose();
    }

    return (
        <>
            <div className={S.modalCard}>
            <div className={S.modalHeader}>
                <span style={{ backgroundColor: "#6D3A92" }}>
                    <PeopleFilled style={{ fontSize: 22, color: "#ffffff" }} />
                </span>
                <h2>New Contact</h2>
            </div>

            <div className={S.modalBody}>
                <div className="form-group">
                    <label className="form-label">
                        Name <span className="required">*</span>
                    </label>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                            className="form-input"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. Marketing Director"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Company</label>
                        <button
                            className={`form-select ${!companyId ? "placeholder" : ""}`}
                            onClick={(e) => companyPicker.open(e.currentTarget)}
                        >
                            {companyName || "Select Company"}
                        </button>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Source</label>
                        <select
                            className={`form-select ${!source ? "placeholder" : ""}`}
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                        >
                            <option value="" disabled>
                                Select Source
                            </option>
                            {SOURCE_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className={S.modalFooter}>
                <MainButton type="secondary" text="Discard" onClick={onClose} />
                <MainButton type="primary" text="Create" onClick={handleCreate} />
            </div>
            
        </div>
        {companyPicker.isOpen && companyPicker.triggerRect && (
                <CompanyPicker
                    triggerRect={companyPicker.triggerRect}
                    onSelect={handleSelectCompany}
                    onClose={companyPicker.close}
                />
            )}
        </>
    );
};

export default NewContact;
