"use client";

import { useState } from "react";
import { MoneyFilled } from "@fluentui/react-icons";
import MainButton from "@/components/micro/MainButton/MainButton";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { createCompany } from "@/modules/companies/actions";

type NewCompanyProps = {
    onClose: () => void;
};

const INDUSTRY_OPTIONS = [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "Retail",
    "Manufacturing",
    "Real Estate",
    "Consulting",
    "Media",
    "Other",
] as const;

const SIZE_OPTIONS = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1000+",
] as const;

const NewCompany = ({ onClose }: NewCompanyProps) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [industry, setIndustry] = useState("");
    const [size, setSize] = useState("");
    const [address, setAddress] = useState("");

    async function handleCreate() {
        if (!name.trim()) return;
        await createCompany({
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            website: website.trim() || undefined,
            industry: industry || undefined,
            size: size || undefined,
            address: address.trim() || undefined,
        });
        onClose();
    }

    return (
        <div className={S.modalCard}>
            <div className={S.modalHeader}>
                <span style={{ backgroundColor: "#0E76B9" }}>
                    <MoneyFilled style={{ fontSize: 22, color: "#ffffff" }} />
                </span>
                <h2>New Company</h2>
            </div>

            <div className={S.modalBody}>
                <div className="form-group">
                    <label className="form-label">
                        Company Name <span className="required">*</span>
                    </label>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. Acme Corporation"
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
                            placeholder="company@example.com"
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
                    <label className="form-label">Website</label>
                    <input
                        className="form-input"
                        type="url"
                        placeholder="https://example.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Industry</label>
                        <select
                            className={`form-select ${!industry ? "placeholder" : ""}`}
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                        >
                            <option value="" disabled>
                                Select Industry
                            </option>
                            {INDUSTRY_OPTIONS.map((i) => (
                                <option key={i} value={i}>
                                    {i}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Size</label>
                        <select
                            className={`form-select ${!size ? "placeholder" : ""}`}
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                        >
                            <option value="" disabled>
                                Select Size
                            </option>
                            {SIZE_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                    {s} employees
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Address</label>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="123 Main St, City, Country"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>
            </div>

            <div className={S.modalFooter}>
                <MainButton type="secondary" text="Discard" onClick={onClose} />
                <MainButton type="primary" text="Create" onClick={handleCreate} />
            </div>
        </div>
    );
};

export default NewCompany;
