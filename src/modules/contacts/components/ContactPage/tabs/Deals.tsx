"use client";

type DealsTabProps = {
    contactId: string;
};

const DealsTab = ({ contactId }: DealsTabProps) => {
    return (
        <div style={{ padding: 24, overflow: "auto", height: "100%" }}>
            <p style={{ color: "var(--text-color)", opacity: 0.6, fontSize: "var(--font-size-sm)" }}>
                Deals associated with this contact will appear here.
            </p>
        </div>
    );
};

export default DealsTab;
