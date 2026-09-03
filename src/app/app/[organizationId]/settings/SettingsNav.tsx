"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ArrowLeftRegular,
    PersonRegular,
    BuildingRegular,
    PeopleRegular,
    PlugConnectedRegular,
} from "@fluentui/react-icons";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import Styles from "./layout.module.css";

type NavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
};

export default function SettingsNav() {
    const pathname = usePathname();
    const { organization } = useWorkspaceData();
    const base = `/app/${organization.slug}/settings`;

    const personalItems: NavItem[] = [
        { label: "Profile", href: `${base}/profile`, icon: <PersonRegular /> },
        { label: "Accounts", href: `${base}/accounts`, icon: <PlugConnectedRegular /> },
    ];

    const workspaceItems: NavItem[] = [
        { label: "General", href: `${base}/general`, icon: <BuildingRegular /> },
        { label: "Members", href: `${base}/members`, icon: <PeopleRegular /> },
    ];

    return (
        <nav className={Styles.nav}>
            <Link href={`/app/${organization.slug}/home`} className={Styles.navHeader}>
                <span className={Styles.backIcon}><ArrowLeftRegular /></span>
                <h2>Settings</h2>
            </Link>

            <div className={Styles.category}>
                <p className={Styles.categoryLabel}>Personal</p>
                {personalItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${Styles.navItem} ${pathname === item.href ? Styles.navItemActive : ""}`}
                    >
                        <span className={Styles.navIcon}>{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </div>

            <div className={Styles.category}>
                <p className={Styles.categoryLabel}>Workspace</p>
                {workspaceItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${Styles.navItem} ${pathname === item.href ? Styles.navItemActive : ""}`}
                    >
                        <span className={Styles.navIcon}>{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
