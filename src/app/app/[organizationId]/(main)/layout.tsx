import Styles from "./layout.module.css";
import type { ReactNode } from "react";
import { ModalProvider } from "@/components/macro/ModalProvider/ModalProvider";
import { ToasterProvider, ToasterContainer } from "@/components/macro/Toaster";
import { ConfirmDialogProvider } from "@/components/macro/ConfirmDialog";
import SideBar from "@/modules/workspace/components/SideBar/SideBar";

type LayoutProps = {
  children: ReactNode;
};

const MainLayout = ({ children }: LayoutProps) => {
  return (
    <ToasterProvider>
      <ConfirmDialogProvider>
        <ModalProvider>
          <div className={Styles.layout}>
            <div className={Styles.container}>
              <SideBar />
              <main className={Styles.main}>{children}</main>
            </div>
          </div>
          <ToasterContainer />
        </ModalProvider>
      </ConfirmDialogProvider>
    </ToasterProvider>
  );
};

export default MainLayout;
