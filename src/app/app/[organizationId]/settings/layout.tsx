import type { ReactNode } from "react";
import { ModalProvider } from "@/components/macro/ModalProvider/ModalProvider";
import { ToasterProvider, ToasterContainer } from "@/components/macro/Toaster";
import SettingsNav from "./SettingsNav";
import Styles from "./layout.module.css";

type LayoutProps = {
    children: ReactNode;
};

export default function SettingsLayout({ children }: LayoutProps) {
    return (
        <ToasterProvider>
            <ModalProvider>
                <div className={Styles.settingsLayout}>
                    <SettingsNav />
                    <main className={Styles.content}>
                        {children}
                    </main>
                </div>
                <ToasterContainer />
            </ModalProvider>
        </ToasterProvider>
    );
}
