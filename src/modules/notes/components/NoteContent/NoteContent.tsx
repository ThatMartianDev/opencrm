"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { getImageUrls } from "@/modules/files/actions";
import Styles from "./NoteContent.module.css";

export default function NoteContent({ content, minimizeFontSize }: { content: string; minimizeFontSize?: boolean }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let active = true;
    const sanitized = DOMPurify.sanitize(content, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["data-file-id"],
    });
    const document = new DOMParser().parseFromString(sanitized, "text/html");

    if (!/<[a-z][\s\S]*>/i.test(content)) {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      document.body.replaceChildren(paragraph);
    }

    const images = [...document.querySelectorAll<HTMLImageElement>("img[data-file-id]")];
    const fileIds = images
      .map((image) => image.dataset.fileId)
      .filter((fileId): fileId is string => Boolean(fileId));

    const commitHtml = () => {
      if (active) setHtml(document.body.innerHTML);
    };

    if (fileIds.length === 0) {
      commitHtml();
    } else {
      getImageUrls(fileIds)
        .then((urls) => {
          for (const image of images) {
            const fileId = image.dataset.fileId;
            if (fileId && urls[fileId]) image.src = urls[fileId];
          }
          commitHtml();
        })
        .catch(commitHtml);
    }

    return () => {
      active = false;
    };
  }, [content]);

  return <div className={`${Styles.content} ${minimizeFontSize ? Styles.minimizeFontSize : ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}