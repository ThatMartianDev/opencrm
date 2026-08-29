"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronDownFilled } from "@fluentui/react-icons";
import { AddFilled } from "@fluentui/react-icons";

import {
  AddRegular,
  CalendarRegular,
  MoreVerticalFilled,
  PanelLeftRegular,
  HomeRegular,
  AlertRegular,
  TaskListSquareLtrRegular,
  NoteRegular,
  MailRegular,
  PeopleTeamRegular,
  SettingsRegular,
  SignOutRegular,
  CheckmarkFilled,
} from "@fluentui/react-icons";

import { useWorkspaceData } from "../workspace-provider";
import { signOut } from "@/modules/auth/actions";
import { switchWorkspace } from "@/modules/workspace/actions";
import InviteMemberModal from "../InviteMemberModal/InviteMemberModal";
import { useNotifications } from "@/modules/notifications/NotificationsProvider";
import NotificationPanel from "@/modules/notifications/NotificationPanel/NotificationPanel";
import { disconnectSocket } from "@/lib/realtime/client";

import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";

import Styles from "./SideBar.module.css";
import ModalStyles from "@/components/macro/ModalProvider/ModalProvider.module.css";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useToast } from "@/components/macro/Toaster";
import ModuleIcon from "@/modules/RecordModule/ui/components/ModuleIcon";

const NotificationBadge = ({
  unreadCount,
  showNotifications,
  setShowNotifications,
  setShowUserMenu,
  setShowOrgMenu,
}: {
  unreadCount: number;
  showNotifications: boolean;
  setShowNotifications: (v: boolean) => void;
  setShowUserMenu: (v: boolean) => void;
  setShowOrgMenu: (v: boolean) => void;
}) => {
  return (
    <button
      className={`${Styles.memberBarButton} ${showNotifications ? Styles.memberBarButtonActive : ""}`}
      title="Notifications"
      onClick={() => {
        setShowNotifications(!showNotifications);
        setShowUserMenu(false);
        setShowOrgMenu(false);
      }}
    >
      <AlertRegular fontSize={16} />
      {unreadCount > 0 && (
        <span className={Styles.notifBadge}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

const SideBar = () => {
  const { openModal, closeModal } = useModal();
  const { toast } = useToast();
  const pathname = usePathname();
  const { organizationId, organization, workspaces, user, recordModules } =
    useWorkspaceData();
  const linksPrefix = "/app/" + organization.slug;
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openRecordMenuId, setOpenRecordMenuId] = useState<string | null>(null);
  const [switchingWorkspaceName, setSwitchingWorkspaceName] = useState<string | null>(null);
  const { unreadCount } = useNotifications();

  const [showMySpaceNav, setShowMySpaceNav] = useState(true);
  const [showRecordsNav, setShowRecordsNav] = useState(true);
  const [openSideBar, setOpenSideBar] = useState(true);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleWorkspaceSwitch = async (targetId: string, targetName: string) => {
    if (targetId === organizationId || switchingWorkspaceName) return;

    setShowOrgMenu(false);
    setSwitchingWorkspaceName(targetName);

    try {
      const result = await switchWorkspace(targetId);
      disconnectSocket();
      window.location.replace(`/app/${result.workspaceSlug}/home`);
    } catch {
      setSwitchingWorkspaceName(null);
      toast.error({
        title: "Could not change workspace",
        description: "Your access may have changed. Refresh and try again.",
      });
    }
  };

  useEffect(() => {
    const handleONkeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeModal();
          break;
        case "k":
          if (e.ctrlKey) {
            e.preventDefault();
            openModal("quick_actions");
          }
          break;
      }
    };
    window.addEventListener("keydown", handleONkeydown);
    return () => {
      window.removeEventListener("keydown", handleONkeydown);
    };
  }, [closeModal, openModal]);

  return (
    <div
      id={Styles.sideBar}
      className={openSideBar ? Styles.open : Styles.closed}
    >
      <div id={Styles.sideBarContent}>
        <div id={Styles.header}>
          {openSideBar && (
            <div
              id={Styles.organization}
              onClick={() => {
                setShowOrgMenu(!showOrgMenu);
                setShowUserMenu(false);
              }}
            >
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
          )}
          <button
            className={Styles.barToggle}
            onClick={() => setOpenSideBar(!openSideBar)}
          >
            <PanelLeftRegular />
          </button>
        </div>
        {showOrgMenu && (
          <>
            <div
              className={Styles.orgMenuBackdrop}
              onClick={() => setShowOrgMenu(false)}
            />
            <div className={Styles.orgMenu}>
              <div className={Styles.orgMenuSection}>
                {workspaces.map((workspace) => {
                  const isCurrent = workspace.id === organizationId;

                  return (
                    <button
                      type="button"
                      key={workspace.id}
                      className={`${Styles.orgMenuItem} ${isCurrent ? Styles.orgMenuItemActive : ""}`}
                      disabled={isCurrent || switchingWorkspaceName !== null}
                      onClick={() => handleWorkspaceSwitch(workspace.id, workspace.name)}
                    >
                      <AvatarFallback
                        name={workspace.name}
                        entityKind="organization"
                        entityId={workspace.id}
                        size={22}
                        style={{ borderRadius: 6 }}
                        imageUrl={workspace.logoUrl ?? undefined}
                        letterCount={1}
                      />
                      <span>{workspace.name}</span>
                      {isCurrent && (
                        <CheckmarkFilled className={Styles.orgMenuCheck} />
                      )}
                    </button>
                  );
                })}
                <Link href={"/create-workspace"} className={Styles.orgMenuItem}>
                  <AddRegular />
                  <span>New Workspace</span>
                </Link>
              </div>
              <div className={Styles.orgMenuDivider} />
              <div className={Styles.orgMenuSection}>
                <Link
                  href={linksPrefix + "/settings/general"}
                  className={Styles.orgMenuItem}
                  onClick={() => setShowUserMenu(false)}
                >
                  <SettingsRegular />
                  <span>Workspace Settings</span>
                </Link>
                <button
                  className={Styles.orgMenuItem}
                  onClick={() => {
                    setShowOrgMenu(false);
                    setShowInviteModal(true);
                  }}
                >
                  <PeopleTeamRegular />
                  <span>Invite member</span>
                </button>
              </div>
            </div>
          </>
        )}
        {!openSideBar && (
          <button
            className={Styles.qaButtonSmall}
            title="Quick Actions"
            onClick={() => {
              openModal("quick_actions");
            }}
          >
            <AddFilled />
          </button>
        )}
        {openSideBar && (
          <div id={Styles.quickActions}>
            <button
              className={Styles.quickActionsButton}
              title="Quick Actions"
              onClick={() => {
                openModal("quick_actions");
              }}
            >
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
        )}

        <nav className={`${Styles.nav} ${showMySpaceNav ? Styles.expanded : ""}`}>
          <div className={Styles.nav_header}>
            <button className={`${Styles.expand_nav_btn}`} onClick={()=>{setShowMySpaceNav(!showMySpaceNav)}}>
              <ChevronDownFilled />
              <p>My Space</p>
            </button>
          </div>
          <div className={Styles.nav_body}>
            <Link
              title="Home"
              href={linksPrefix + "/home"}
              className={isActive(linksPrefix + "/home") ? Styles.active : ""}
            >
              <HomeRegular />
              <p>Home</p>
            </Link>
            <Link
              title="Tasks"
              href={linksPrefix + "/tasks"}
              className={isActive(linksPrefix + "/tasks") ? Styles.active : ""}
            >
              <TaskListSquareLtrRegular />
              <p>Tasks</p>
            </Link>
            <Link
              title="Notes"
              href={linksPrefix + "/notes"}
              className={isActive(linksPrefix + "/notes") ? Styles.active : ""}
            >
              <NoteRegular />
              <p>Notes</p>
            </Link>
            <Link
              title="Emails"
              href={linksPrefix + "/emails"}
              className={isActive(linksPrefix + "/emails") ? Styles.active : ""}
            >
              <MailRegular />
              <p>Emails</p>
            </Link>
            <Link
              title="Calendar"
              href={linksPrefix + "/calendar"}
              className={
                isActive(linksPrefix + "/calendar") ? Styles.active : ""
              }
            >
              <CalendarRegular />
              <p>Calendar</p>
            </Link>
          </div>
        </nav>
        <nav className={`${Styles.nav} ${showRecordsNav ? Styles.expanded : ""}`}>
          {/* Legacy fixed record modules are replaced by configurable record modules.
          <Link
            title="Deals"
            href={linksPrefix + "/deals"}
            className={isActive(linksPrefix + "/deals") ? Styles.active : ""}
          >
            <span style={{ backgroundColor: "#008236" }}>
              <TargetFilled />
            </span>
            <p>Deals</p>
          </Link>
          <Link
            title="Contacts"
            href={linksPrefix + "/contacts"}
            className={isActive(linksPrefix + "/contacts") ? Styles.active : ""}
          >
            <span style={{ backgroundColor: "#6D3A92" }}>
              <PeopleFilled />
            </span>
            <p>Contacts</p>
          </Link>
          <Link
            title="Companies"
            href={linksPrefix + "/companies"}
            className={
              isActive(linksPrefix + "/companies") ? Styles.active : ""
            }
          >
            <span style={{ backgroundColor: "#0E76B9" }}>
              <BuildingFilled />
            </span>
            <p>Companies</p>
          </Link>
          */}
          <div className={Styles.nav_header}>
            <button className={Styles.expand_nav_btn} onClick={()=>{setShowRecordsNav(!showRecordsNav)}}>
              <ChevronDownFilled />
              <p>Records</p>
            </button>
            <button className={Styles.nav_icon_btn}
              onClick={() => openModal("new-module")}
              title="New Record Module"
            >
              <AddFilled fontSize={14}/>
            </button>
          </div>
          <div className={Styles.nav_body}>
            {recordModules.map((module) => {
              const moduleName = module.pluralName ?? module.name;
              const moduleHref = `${linksPrefix}/${module.key}`;

              return (
                <div
                  className={`${Styles.recordModuleItem} ${isActive(moduleHref) ? Styles.active : ""}`}
                  key={module.id}
                >
                  <Link title={moduleName} href={moduleHref}>
                    <span
                      style={{
                        backgroundColor: module.accentColor ?? "#5670ff",
                      }}
                    >
                      <ModuleIcon name={module.icon} />
                    </span>
                    <p>{moduleName}</p>
                  </Link>
                  {openSideBar && (
                    <button
                      type="button"
                      className={Styles.recordMenuButton}
                      title={`${moduleName} options`}
                      aria-label={`${moduleName} options`}
                      aria-expanded={openRecordMenuId === module.id}
                      onClick={() =>
                        setOpenRecordMenuId((current) =>
                          current === module.id ? null : module.id,
                        )
                      }
                    >
                      <MoreVerticalFilled />
                    </button>
                  )}
                  {openRecordMenuId === module.id && (
                    <>
                      <button
                        className={Styles.recordMenuBackdrop}
                        aria-label="Close module options"
                        onClick={() => setOpenRecordMenuId(null)}
                      />
                      <div className={Styles.recordMenu}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenRecordMenuId(null);
                            openModal("new-module", { moduleId: module.id });
                          }}
                        >
                          <SettingsRegular />
                          <span>Manage</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenRecordMenuId(null);
                            openModal("create-record", {
                              moduleKey: module.key,
                            });
                          }}
                        >
                          <AddRegular />
                          <span>New {module.name}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {recordModules.length === 0 && (
              <button
                className={Styles.newModuleButton}
                onClick={() => openModal("new-module")}
              >
                <AddFilled />
                <p>New Module</p>
              </button>
            )}
          </div>
        </nav>

        {!openSideBar && (
          <div className={Styles.memberBarSmall}>
            <NotificationBadge
              unreadCount={unreadCount}
              showNotifications={showNotifications}
              setShowNotifications={setShowNotifications}
              setShowUserMenu={setShowUserMenu}
              setShowOrgMenu={setShowOrgMenu}
            />
            <button
              className={Styles.profileButtonSmall}
              title="Show Options"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowOrgMenu(false);
              }}
            >
              <AvatarFallback
                size={24}
                entityKind="member"
                entityId={user.id}
                name={user.name}
                imageUrl={user.avatarUrl || undefined}
              />
            </button>
          </div>
        )}
        {openSideBar && (
          <div className={Styles.memberBar}>
            <button
              className={Styles.memberInfo}
              title="Show Options"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowOrgMenu(false);
              }}
            >
              <AvatarFallback
                size={24}
                entityKind="member"
                entityId={user.id}
                name={user.name}
                imageUrl={user.avatarUrl || undefined}
              />
              <p>
                <span>{user.name}</span>
              </p>
              <MoreVerticalFilled fontSize={16} />
            </button>
            <NotificationBadge
              unreadCount={unreadCount}
              showNotifications={showNotifications}
              setShowNotifications={setShowNotifications}
              setShowUserMenu={setShowUserMenu}
              setShowOrgMenu={setShowOrgMenu}
            />
          </div>
        )}
        {showNotifications && (
          <>
            <div
              className={Styles.orgMenuBackdrop}
              onClick={() => setShowNotifications(false)}
            />
            <NotificationPanel onClose={() => setShowNotifications(false)} />
          </>
        )}
        {showUserMenu && (
          <>
            <div
              className={Styles.orgMenuBackdrop}
              onClick={() => setShowUserMenu(false)}
            />
            <div className={Styles.userMenu}>
              <div className={Styles.orgMenuSection}>
                <Link
                  href={linksPrefix + "/settings/profile"}
                  className={Styles.orgMenuItem}
                  onClick={() => setShowUserMenu(false)}
                >
                  <SettingsRegular />
                  <span>My Settings</span>
                </Link>
                <button
                  className={Styles.orgMenuItem}
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                >
                  <SignOutRegular />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {showInviteModal && (
        <div
          className={ModalStyles.modalBackdrop}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className={ModalStyles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <InviteMemberModal onClose={() => setShowInviteModal(false)} />
          </div>
        </div>
      )}
      {switchingWorkspaceName && (
        <div className={Styles.workspaceSwitchOverlay} role="status" aria-live="polite">
          <span className={Styles.workspaceSwitchSpinner} aria-hidden="true" />
          <p>Changing workspace</p>
          <span>{switchingWorkspaceName}</span>
        </div>
      )}
    </div>
  );
};

export default SideBar;
