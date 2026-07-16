import { redirect } from "next/navigation";

import { getSessionClaims } from "@/lib/auth/session";
import LoginForm from "@/modules/auth/components/login-form";
import Styles from "../Styles.module.css";

const LoginPage = async () => {
    let session;
    try {
        session = await getSessionClaims();
    } catch {
        session = null;
    }

    if (session) {
        redirect(`/app/${session.organizationId}/home`);
    }

    return (
        <div className={Styles.authPage}>
            <LoginForm />
        </div>
    );
};

export default LoginPage;