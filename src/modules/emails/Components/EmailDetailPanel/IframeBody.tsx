import MainButton from "@/components/micro/MainButton/MainButton";
import Styles from "./EmailDetailPanel.module.css";
import DOMPurify from "dompurify";
import { useEffect, useMemo, useState } from "react";

function IframeBody({ html }: { html: string }) {
  const [showImages, setShowImages] = useState(false);

  useEffect(() => {
    setShowImages(false);
  }, [html]);

  const safeHtml = useMemo(() => {
    if (typeof window === "undefined") return "";

    const clean = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target"],
    });

    // enforce rel="noopener noreferrer" + target="_blank" on every link.
    const doc = new DOMParser().parseFromString(clean, "text/html");
    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("target", "_blank");
    });
    return doc.body.innerHTML;
  }, [html]);

  // Detect whether the sanitized content contains any remote images.
  const hasRemoteImages = useMemo(
    () => /<img[^>]+src=["']https?:/i.test(safeHtml),
    [safeHtml],
  );

  // When images are blocked, strip src/srcset to prevent network requests
  // Restore when the user explicitly allows them.
  const displayHtml = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (showImages) return safeHtml;

    const doc = new DOMParser().parseFromString(safeHtml, "text/html");
    doc.querySelectorAll("img").forEach((img) => {
      img.removeAttribute("src");
      img.removeAttribute("srcset");
    });
    return doc.body.innerHTML;
  }, [safeHtml, showImages]);

  const srcdoc =
    `<!DOCTYPE html><html><head>` +
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<base target="_blank">` +
    `<style>` +
    `*{box-sizing:border-box}` +
    `body{font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;line-height:1.6;margin:0;padding:8px;word-break:break-word;overflow-x:hidden;color:#1a1a1a}` +
    `a{color:#4f6ef7}img{max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-x:auto}table{max-width:100%}` +
    `</style></head><body>` +
    displayHtml +
    `</body></html>`;

    

  return (
    <div className={Styles.iframeWrapper}>
      {hasRemoteImages && !showImages && (
        <div className={Styles.imageBlockBanner}>
          <span>Remote images are blocked to protect your privacy.</span>
          <MainButton text="Load External Images" type="secondary" onClick={()=>{setShowImages(true)}}/>
        </div>
      )}
      <iframe
        srcDoc={srcdoc}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className={Styles.bodyFrame}
        style={{ height: "100%" }}
        title="Email content"
      />
    </div>
  );
}

export default IframeBody;
