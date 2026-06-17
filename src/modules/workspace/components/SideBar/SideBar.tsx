"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AddRegular, CalendarRegular, PanelLeftRegular } from "@fluentui/react-icons";
import { ChevronDownFilled } from "@fluentui/react-icons";
import { AddFilled } from "@fluentui/react-icons";

import {
  HomeRegular,
  AlertRegular,
  TaskListSquareLtrRegular,
  NoteRegular,
  MailRegular,
  PeopleTeamRegular,
  SettingsRegular,
  PersonRegular,
  SignOutRegular,
  CheckmarkFilled,
} from "@fluentui/react-icons";
import {
  TargetFilled,
  PeopleFilled,
  MoneyFilled,
  BoxFilled,
} from "@fluentui/react-icons";

import { useWorkspaceData } from "../workspace-provider";
import { signOut } from "@/modules/auth/actions";
import InviteMemberModal from "../InviteMemberModal/InviteMemberModal";

import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";

import Styles from "./SideBar.module.css";
import ModalStyles from "@/components/macro/ModalProvider/ModalProvider.module.css";

const SideBar = () => {
  const pathname = usePathname();
  const { organizationId, organization } = useWorkspaceData();
  const linksPrefix = "/app/" + organizationId;
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div id={Styles.sideBar}>
      <div id={Styles.sideBarContent}>
        <div id={Styles.header}>
          <div id={Styles.organization} onClick={() => setShowOrgMenu(!showOrgMenu)}>
            <AvatarFallback
              name={organization.name}
              entityKind="organization"
              entityId={organizationId}
              size={24}
              style={{ borderRadius: 8 }}
              letterCount={1}
              imageUrl={organization.logoUrl ?? undefined}
            />
            <p>{organization.name}</p>
            <ChevronDownFilled />
          </div>
          <button className={Styles.barToggle}>
            <PanelLeftRegular />
          </button>
        </div>
        {showOrgMenu && (
          <>
            <div className={Styles.orgMenuBackdrop} onClick={() => setShowOrgMenu(false)} />
            <div className={Styles.orgMenu} ref={orgMenuRef}>
              <div className={Styles.orgMenuSection}>
                <div className={`${Styles.orgMenuItem} ${Styles.orgMenuItemActive}`}>
                  <AvatarFallback
                    name={organization.name}
                    entityKind="organization"
                    entityId={organizationId}
                    size={22}
                    style={{ borderRadius: 6 }}
                    imageUrl={organization.logoUrl ?? undefined}
                    letterCount={1}
                  />
                  <span>{organization.name}</span>
                  <CheckmarkFilled className={Styles.orgMenuCheck} />
                </div>
                <Link href={"/create-workspace"} className={Styles.orgMenuItem}>
                  <AddRegular />
                  <span>New Workspace</span>
                </Link>
              </div>
              <div className={Styles.orgMenuDivider} />
              <div className={Styles.orgMenuSection}>
                <Link
                  href={linksPrefix + "/settings"}
                  className={Styles.orgMenuItem}
                  onClick={() => setShowOrgMenu(false)}
                >
                  <SettingsRegular />
                  <span>settings</span>
                </Link>
                <button
                  className={Styles.orgMenuItem}
                  onClick={() => { setShowOrgMenu(false); setShowInviteModal(true); }}
                >
                  <PeopleTeamRegular />
                  <span>Invite member</span>
                </button>
              </div>
              <div className={Styles.orgMenuDivider} />
              <div className={Styles.orgMenuSection}>
                <button
                  className={Styles.orgMenuItem}
                  onClick={() => signOut()}
                >
                  <SignOutRegular />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </>
        )}
        <div id={Styles.quickActions}>
          <button className={Styles.quickActionsButton}>
            <div className={Styles.qaLeft}>
              <span>
                <AddFilled />
              </span>
              <p>Quick Actions</p>
            </div>
            <div className={Styles.qaRight}>
              <span>CTRL</span>
              <span>K</span>
            </div>
          </button>
        </div>
        <nav className={Styles.nav}>
          <Link
            href={linksPrefix + "/home"}
            className={isActive(linksPrefix + "/home") ? Styles.active : ""}
          >
            <HomeRegular />
            <p>Home</p>
          </Link>
          <Link
            href={linksPrefix + "/notifications"}
            className={
              isActive(linksPrefix + "/notifications") ? Styles.active : ""
            }
          >
            <AlertRegular />
            <p>Notifications</p>
          </Link>
          <Link
            href={linksPrefix + "/tasks"}
            className={isActive(linksPrefix + "/tasks") ? Styles.active : ""}
          >
            <TaskListSquareLtrRegular />
            <p>Tasks</p>
          </Link>
          <Link
            href={linksPrefix + "/notes"}
            className={isActive(linksPrefix + "/notes") ? Styles.active : ""}
          >
            <NoteRegular />
            <p>Notes</p>
          </Link>
          <Link
            href={linksPrefix + "/emails"}
            className={isActive(linksPrefix + "/emails") ? Styles.active : ""}
          >
            <MailRegular />
            <p>Emails</p>
          </Link>
          <Link
            href={linksPrefix + "/calendar"}
            className={isActive(linksPrefix + "/calendar") ? Styles.active : ""}
          >
            <CalendarRegular />
            <p>Calendar</p>
          </Link>
        </nav>
        <nav className={Styles.nav}>
          <Link
            href={linksPrefix + "/deals"}
            className={isActive(linksPrefix + "/deals") ? Styles.active : ""}
          >
            <span style={{ backgroundColor: "#008236" }}>
              <TargetFilled />
            </span>
            <p>Deals</p>
          </Link>
          <Link
            href={linksPrefix + "/contacts"}
            className={isActive(linksPrefix + "/contacts") ? Styles.active : ""}
          >
            <span style={{ backgroundColor: "#6D3A92" }}>
              <PeopleFilled />
            </span>
            <p>Contacts</p>
          </Link>
          <Link
            href={linksPrefix + "/companies"}
            className={
              isActive(linksPrefix + "/companies") ? Styles.active : ""
            }
          >
            <span style={{ backgroundColor: "#0E76B9" }}>
              <MoneyFilled />
            </span>
            <p>Companies</p>
          </Link>
        </nav>
      </div>
      {showInviteModal && (
        <div className={ModalStyles.modalBackdrop} onClick={() => setShowInviteModal(false)}>
          <div className={ModalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <InviteMemberModal onClose={() => setShowInviteModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SideBar;
