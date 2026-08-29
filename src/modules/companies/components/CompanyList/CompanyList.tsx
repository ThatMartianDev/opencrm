"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { getCompanies } from "../../actions";
import Styles from "./CompanyList.module.css";

type CompanyRow = Awaited<ReturnType<typeof getCompanies>>[number];

type CompanyListProps = {
    companies: CompanyRow[];
};

const CompanyListItem = ({ company, workspaceSlug }: { company: CompanyRow; workspaceSlug: string }) => {
    const router = useRouter();

    return (
        <div
            className={Styles.table_row}
            onClick={() => router.push(`/app/${workspaceSlug}/companies/${company.id}`)}
        >
            <div className={Styles.item_name}>
                <AvatarFallback
                    name={company.name}
                    entityKind="customer"
                    entityId={company.id}
                    size={24}
                    letterCount={1}
                    style={{ borderRadius: 8 }}
                />
                <p>{company.name}</p>
            </div>
            <div>
                <p>{company.email || "—"}</p>
            </div>
            <div>
                <p>{company.phone || "—"}</p>
            </div>
            <div>
                <p>{company.industry || "—"}</p>
            </div>
            <div>
                <p>{company._count.contacts}</p>
            </div>
            <div>
                <p>{company._count.deals}</p>
            </div>
        </div>
    );
};

const CompanyList = ({ companies }: CompanyListProps) => {
    const workspace = useWorkspaceData();

    return (
        <div className={Styles.listTab}>
            <div id={Styles.table}>
                <div className={Styles.table_header}>
                    <div><p>Name</p></div>
                    <div><p>Email</p></div>
                    <div><p>Phone</p></div>
                    <div><p>Industry</p></div>
                    <div><p>Contacts</p></div>
                    <div><p>Deals</p></div>
                </div>
                {companies.map((company) => (
                    <CompanyListItem
                        key={company.id}
                        company={company}
                        workspaceSlug={workspace.organization.slug}
                    />
                ))}
            </div>
        </div>
    );
};

export default CompanyList;
