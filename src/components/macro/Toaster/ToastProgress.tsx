"use client";
import { useEffect, useRef } from "react";
import Styles from "./Toast.module.css";

type ToastProgressProps = {
    duration: number;
    onComplete: () => void;
    paused: boolean;
};

export default function ToastProgress({ duration, onComplete, paused }: ToastProgressProps) {
    const startTimeRef = useRef<number>(Date.now());
    const remainingRef = useRef<number>(duration);
    const barRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (paused) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }

        startTimeRef.current = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = remainingRef.current - elapsed;

            if (remaining <= 0) {
                onComplete();
                return;
            }

            const progress = remaining / duration;
            if (barRef.current) {
                barRef.current.style.transform = `scaleX(${progress})`;
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            const elapsed = Date.now() - startTimeRef.current;
            remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        };
    }, [paused, duration, onComplete]);

    return (
        <div className={Styles.progressTrack}>
            <div ref={barRef} className={Styles.progressBar} />
        </div>
    );
}
