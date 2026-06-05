"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DismissFilled,
  ArrowDownloadFilled,
  ZoomInFilled,
  ZoomOutFilled,
  ArrowRotateClockwiseFilled,
  FullScreenMaximizeFilled,
  DocumentFilled,
  MusicNote2Filled,
  ChevronLeftFilled,
  ChevronRightFilled,
} from "@fluentui/react-icons";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import Styles from "./FileViewer.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type FileViewerFile = {
  name: string;
  url: string;
  mimeType: string;
};

type FileViewerProps = {
  file: FileViewerFile;
  onClose: () => void;
};

type ViewerType = "image" | "video" | "audio" | "pdf" | "unsupported";

function getViewerType(mimeType: string): ViewerType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  return "unsupported";
}

// Image Viewer
function ImageViewer({ file }: { file: FileViewerFile }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.25, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => setDragging(false);

  return {
    controls: (
      <>
        <button
          className={Styles.toolbarBtn}
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          title="Zoom out"
        >
          <ZoomOutFilled fontSize={18} />
        </button>
        <span className={Styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button
          className={Styles.toolbarBtn}
          onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
          title="Zoom in"
        >
          <ZoomInFilled fontSize={18} />
        </button>
        <div className={Styles.toolbarDivider} />
        <button
          className={Styles.toolbarBtn}
          onClick={() => setRotation((r) => r + 90)}
          title="Rotate"
        >
          <ArrowRotateClockwiseFilled fontSize={18} />
        </button>
        <button
          className={Styles.toolbarBtn}
          onClick={() => {
            setZoom(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
          }}
          title="Fit to screen"
        >
          <FullScreenMaximizeFilled fontSize={18} />
        </button>
      </>
    ),
    content: (
      <div
        className={Styles.imageContainer}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={file.url}
          alt={file.name}
          className={`${Styles.imageElement} ${zoom > 1 ? Styles.zoomedIn : ""} ${dragging ? Styles.dragging : ""}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>
    ),
  };
}

// Video Viewer
function VideoViewer({ file }: { file: FileViewerFile }) {
  return {
    controls: null,
    content: (
      <div className={Styles.videoContainer}>
        <video
          className={Styles.videoElement}
          src={file.url}
          controls
          autoPlay
          controlsList="nodownload"
        >
          Your browser does not support video playback.
        </video>
      </div>
    ),
  };
}

// Audio Viewer
function AudioViewer({ file }: { file: FileViewerFile }) {
  return {
    controls: null,
    content: (
      <div className={Styles.audioContainer}>
        <div className={Styles.audioIcon}>
          <MusicNote2Filled fontSize={56} color="#EC4899" />
        </div>
        <span className={Styles.audioFileName}>{file.name}</span>
        <audio className={Styles.audioElement} src={file.url} controls autoPlay>
          Your browser does not support audio playback.
        </audio>
      </div>
    ),
  };
}

// PDF Viewer
function PDFViewer({ file }: { file: FileViewerFile }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);

  const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNext = () => setPageNumber((p) => Math.min(numPages, p + 1));

  return {
    controls: (
      <>
        <button
          className={Styles.toolbarBtn}
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          title="Zoom out"
        >
          <ZoomOutFilled fontSize={18} />
        </button>
        <span className={Styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button
          className={Styles.toolbarBtn}
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          title="Zoom in"
        >
          <ZoomInFilled fontSize={18} />
        </button>
        <div className={Styles.toolbarDivider} />
        <button
          className={Styles.toolbarBtn}
          onClick={goToPrev}
          disabled={pageNumber <= 1}
          title="Previous page"
        >
          <ChevronLeftFilled fontSize={18} />
        </button>
        <span className={Styles.zoomLabel}>
          {pageNumber} / {numPages}
        </span>
        <button
          className={Styles.toolbarBtn}
          onClick={goToNext}
          disabled={pageNumber >= numPages}
          title="Next page"
        >
          <ChevronRightFilled fontSize={18} />
        </button>
      </>
    ),
    content: (
      <div className={Styles.pdfContainer}>
        <Document
          file={file.url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <span className={Styles.zoomLabel}>Loading PDF...</span>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={zoom}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    ),
  };
}

// Unsupported
function UnsupportedViewer({
  file,
  onDownload,
}: {
  file: FileViewerFile;
  onDownload: () => void;
}) {
  return {
    controls: null,
    content: (
      <div className={Styles.unsupportedContainer}>
        <DocumentFilled fontSize={64} color="rgba(255,255,255,0.3)" />
        <span className={Styles.unsupportedText}>
          Preview not available for this file type
        </span>
        <span className={Styles.downloadLink} onClick={onDownload}>
          Download file
        </span>
      </div>
    ),
  };
}

// Main Component
export default function FileViewer({ file, onClose }: FileViewerProps) {
  const viewerType = getViewerType(file.mimeType);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [file]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const getViewer = () => {
    switch (viewerType) {
      case "image":
        return ImageViewer({ file });
      case "video":
        return VideoViewer({ file });
      case "audio":
        return AudioViewer({ file });
      case "pdf":
        return PDFViewer({ file });
      default:
        return UnsupportedViewer({ file, onDownload: handleDownload });
    }
  };

  const { controls, content } = getViewer();

  return (
    <div className={Styles.backdrop}>
      {/* Toolbar */}
      <div className={Styles.toolbar}>
        <div className={Styles.toolbarLeft}>
          <span className={Styles.fileName}>{file.name}</span>
        </div>

        <div className={Styles.toolbarCenter}>{controls}</div>

        <div className={Styles.toolbarRight}>
          <button
            className={Styles.toolbarBtn}
            onClick={handleDownload}
            title="Download"
          >
            <ArrowDownloadFilled fontSize={18} />
          </button>
          <div className={Styles.toolbarDivider} />
          <button
            className={Styles.toolbarBtn}
            onClick={onClose}
            title="Close"
          >
            <DismissFilled fontSize={18} />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className={Styles.viewerContent} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>{content}</div>
      </div>
    </div>
  );
}