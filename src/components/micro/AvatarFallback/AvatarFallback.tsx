import { useMemo, useState } from "react";

import {
  getEntityColorWithFallback,
  getReadableTextColor,
} from "./entityColor";

import type { ColorEntityKind } from "./entityColor";

import Styles from "./AvatarFallback.module.css";
import Image from "next/image";

type AvatarFallbackProps = {
  name: string;
  imageUrl?: string;
  entityKind: ColorEntityKind;
  entityId?: string | null;
  fallbackSeed?: string;
  bgColor?: string;
  size?: number;
  letterCount?: number;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
};

function getInitials(name: string, letterCount: number): string {
  const clean = name.trim();
  if (!clean) {
    return "?";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, letterCount);
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.slice(0, letterCount);
}

export default function AvatarFallback({
  name,
  imageUrl,
  entityKind,
  entityId,
  fallbackSeed,
  bgColor,
  size = 32,
  className,
  letterCount = 2,
  alt,
  style
}: AvatarFallbackProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const shouldRenderImage = Boolean(imageUrl) && !hasImageError;

  const resolvedBgColor = useMemo(() => {
    if (bgColor) {
      return bgColor;
    }

    return getEntityColorWithFallback(
      entityKind,
      entityId,
      fallbackSeed ?? `${name}:${size}`,
    );
  }, [bgColor, entityKind, entityId, fallbackSeed, name, size]);

  const textColor = useMemo(() => getReadableTextColor(resolvedBgColor), [resolvedBgColor]);
  const initials = useMemo(() => getInitials(name, letterCount), [name, letterCount]);
  const fontSize = Math.max(10, Math.round(size * 0.36));

  return (
    <span
      className={`${Styles.avatar}${className ? ` ${className}` : ""}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: resolvedBgColor,
        color: textColor,
        ...style,
      }}
      aria-label={alt ?? `${name} avatar`}
      title={name}
    >
      {shouldRenderImage && imageUrl ? (
        <Image
          loading="lazy"
          src={imageUrl}
          alt={alt ?? `${name}'s profile picture`}
          onError={() => setHasImageError(true)}
          width={size}
          height={size}
        />
      ) : (
        <span className={Styles.initials} style={{ fontSize: `${fontSize}px` }}>
          {initials}
        </span>
      )}
    </span>
  );
}