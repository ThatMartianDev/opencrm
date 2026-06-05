"use client";
import LoginForm from "@/modules/auth/components/login-form";
import Styles from "../Styles.module.css";

const LoginPage = () => {
    return (
        <div className={Styles.authPage}>
            <LoginForm />
        </div>
    )
}

export default LoginPage;