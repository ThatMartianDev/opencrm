"use client";

import { MoneyFilled } from "@fluentui/react-icons";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useEffect, useState } from "react";
import { getCompanies } from "./actions";
import CompanyList from "./components/CompanyList/CompanyList";
import Styles from "./CompaniesPage.module.css";

type CompanyRow = Awaited<ReturnType<typeof getCompanies>>[number];

const CompaniesPage = () => {
    const [companies, setCompanies] = useState<CompanyRow[]>([]);
    const { openModal } = useModal();

    function handleCreateCompany() {
        openModal("new-company");
    }

    useEffect(() => {
        window.document.title = "Companies | OpenCRM";
        getCompanies()
            .then(setCompanies)
            .catch((error) => {
                console.error("Error fetching companies:", error);
            });
    }, []);

    return (
        <div className={Styles.companiesPage}>
            <header className="global_header">
                <div className="g_header_section_name">
                    <span style={{ backgroundColor: "#0E76B9" }}>
                        <MoneyFilled fontSize={20} color="#fff" />
                    </span>
                    <h2>Companies</h2>
                </div>
            </header>
            <div className="flex-col" style={{ height: "100%" }}>
                <TabsControlHeader
                    tabs={[]}
                    onTabBtnClick={() => {}}
                    showMainBtn={true}
                    mainButton={{ text: "New Company", onClick: handleCreateCompany }}
                />
                <CompanyList companies={companies} />
            </div>
        </div>
    );
};

export default CompaniesPage;
