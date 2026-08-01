"use client";

import { useState, useRef, useCallback, useTransition, useEffect } from "react";
import {
  FolderFilled,
  DocumentFilled,
  ArrowUploadFilled,
  FolderAddFilled,
  ArrowDownloadFilled,
  DeleteFilled,
  CloudFilled,
  GridFilled,
  TextBulletListLtrFilled,
  ArrowLeftFilled,
  ArrowSortDownFilled,
  RenameFilled,
  ImageFilled,
  MusicNote2Filled,
  VideoFilled,
  CodeFilled,
  DocumentPdfFilled,
  ArchiveFilled,
  CheckmarkCircleFilled,
  DismissCircleFilled,
  SearchRegular,
} from "@fluentui/react-icons";
import {
  listFiles,
  createFolder,
  getDownloadUrl,
  deleteFile,
  renameFile,
  getBreadcrumbs,
  getImageUrls,
  searchFiles,
} from "../actions";
import type { EntityScope, FileRecord } from "../types";
import FileViewer, {
  type FileViewerFile,
} from "@/components/macro/FileViewer/FileViewer";
import { useToast } from "@/components/macro/Toaster";
import { useConfirm } from "@/components/macro/ConfirmDialog";
import Styles from "./FileManager.module.css";

type ViewMode = "grid" | "list";
type SortField = "name" | "date" | "size";

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
};

type Props = {
  scope: EntityScope;
};

function isImageFile(file: FileRecord) {
  return file.type === "FILE" && file.mimeType?.startsWith("image/");
}

function isPreviewable(file: FileRecord) {
  if (file.type !== "FILE" || !file.mimeType) return false;
  const mime = file.mimeType;
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf"
  );
}

function getFileIcon(file: FileRecord, size: number) {
  if (file.type === "FOLDER") {
    return <FolderFilled fontSize={size} color="#F5C542" />;
  }
  const mime = file.mimeType ?? "";
  if (mime.startsWith("image/"))
    return <ImageFilled fontSize={size} color="#8B5CF6" />;
  if (mime.startsWith("audio/"))
    return <MusicNote2Filled fontSize={size} color="#EC4899" />;
  if (mime.startsWith("video/"))
    return <VideoFilled fontSize={size} color="#EF4444" />;
  if (mime === "application/pdf")
    return <DocumentPdfFilled fontSize={size} color="#DC2626" />;
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("tar") ||
    mime.includes("gz")
  )
    return <ArchiveFilled fontSize={size} color="#F59E0B" />;
  if (
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("html") ||
    mime.includes("css") ||
    mime.includes("xml") ||
    mime.includes("typescript")
  )
    return <CodeFilled fontSize={size} color="#10B981" />;
  return <DocumentFilled fontSize={size} color="#6B7280" />;
}

export default function FileManager({ scope }: Props) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string; name: string }[]
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("name");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileRecord;
  } | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [viewerFile, setViewerFile] = useState<FileViewerFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const confirm = useConfirm();

  const refreshFiles = useCallback(
    (parentId: string | null) => {
      startTransition(async () => {
        const result = await listFiles(scope, parentId);
        setFiles(result);
      });
    },
    [scope],
  );

  useEffect(() => {
    refreshFiles(null);
  }, [refreshFiles]);

  // Fetch image thumbnails when files change
  useEffect(() => {
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) return;

    const idsToFetch = imageFiles
      .filter((f) => !imageUrls[f.id])
      .map((f) => f.id);

    if (idsToFetch.length === 0) return;

    getImageUrls(idsToFetch).then((urls) => {
      setImageUrls((prev) => ({ ...prev, ...urls }));
    });
  }, [files]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Auto-dismiss completed uploads after 3s
  useEffect(() => {
    const doneUploads = uploads.filter(
      (u) => u.status === "done" || u.status === "error",
    );
    if (doneUploads.length === 0) return;
    const timer = setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status === "uploading"));
    }, 3000);
    return () => clearTimeout(timer);
  }, [uploads]);

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === "FOLDER" ? -1 : 1;
    switch (sortField) {
      case "name":
        return a.name.localeCompare(b.name);
      case "date":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "size":
        return (b.fileSize ?? 0) - (a.fileSize ?? 0);
      default:
        return 0;
    }
  });

  const navigateTo = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setSearchQuery("");
      setIsSearching(false);
      startTransition(async () => {
        const result = await listFiles(scope, folderId);
        setFiles(result);
        if (folderId) {
          const crumbs = await getBreadcrumbs(folderId);
          setBreadcrumbs(crumbs);
        } else {
          setBreadcrumbs([]);
        }
      });
    },
    [scope],
  );

  const goBack = () => {
    if (breadcrumbs.length > 1) {
      navigateTo(breadcrumbs[breadcrumbs.length - 2].id);
    } else {
      navigateTo(null);
    }
  };

  const handleOpen = (file: FileRecord) => {
    if (file.type === "FOLDER") {
      navigateTo(file.id);
    } else if (isPreviewable(file) && file.source === "SUPABASE") {
      handlePreview(file);
    } else if (file.source !== "SUPABASE" && file.externalUrl) {
      window.open(file.externalUrl, "_blank", "noopener");
    } else {
      startTransition(async () => {
        const url = await getDownloadUrl(file.id);
        if (url) triggerDownload(url, file.name);
      });
    }
  };

  const handlePreview = (file: FileRecord) => {
    startTransition(async () => {
      const url = await getDownloadUrl(file.id);
      if (url) {
        setViewerFile({
          name: file.name,
          url,
          mimeType: file.mimeType!,
        });
      }
    });
  };

  const triggerDownload = (url: string, _fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = _fileName;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const uploadFileWithProgress = (file: File) => {
    const uploadId = `${Date.now()}_${file.name}`;

    setUploads((prev) => [
      ...prev,
      { id: uploadId, name: file.name, progress: 0, status: "uploading" },
    ]);

    const formData = new FormData();
    formData.append("file", file);
    if (currentFolderId) formData.append("parentId", currentFolderId);
    if (scope.dealId) formData.append("dealId", scope.dealId);
    if (scope.contactId) formData.append("contactId", scope.contactId);
    if (scope.companyId) formData.append("companyId", scope.companyId);
    if (scope.recordId) formData.append("recordId", scope.recordId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploads((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress: pct } : u)),
        );
      }
    };

    xhr.onload = () => {
      const status = xhr.status >= 200 && xhr.status < 300 ? "done" : "error";
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, progress: 100, status } : u,
        ),
      );
      if (status === "done") refreshFiles(currentFolderId);
    };

    xhr.onerror = () => {
      setUploads((prev) =>
        prev.map((u) => (u.id === uploadId ? { ...u, status: "error" } : u)),
      );
    };

    xhr.send(formData);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      uploadFileWithProgress(selectedFiles[i]);
    }

    e.target.value = "";
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      try {
        await createFolder({
          name: newFolderName.trim(),
          parentId: currentFolderId ?? undefined,
          ...scope,
        });
        setNewFolderName("");
        setShowNewFolder(false);
        refreshFiles(currentFolderId);
        toast.success({ title: "Folder created" });
      } catch (err) {
        toast.error({
          title: "Failed to create folder",
          description: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    });
  };

  const handleRename = (file: FileRecord) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
    setContextMenu(null);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const submitRename = () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    startTransition(async () => {
      try {
        await renameFile(renamingId, renameValue.trim());
        setRenamingId(null);
        refreshFiles(currentFolderId);
      } catch (err) {
        toast.error({
          title: "Failed to rename",
          description: err instanceof Error ? err.message : "Something went wrong.",
        });
        setRenamingId(null);
      }
    });
  };

  const handleDelete = async (file: FileRecord) => {
    setContextMenu(null);
    const confirmed = await confirm({
      title: `Delete "${file.name}"?`,
      description: file.type === "FOLDER"
        ? "This will permanently delete the folder and all its contents."
        : "This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    const t = toast.loading(`Deleting "${file.name}"...`);
    startTransition(async () => {
      try {
        await deleteFile(file.id);
        refreshFiles(currentFolderId);
        t.success({
          title: "File deleted",
          description: `"${file.name}" has been deleted.`,
        });
      } catch (err) {
        t.error({
          title: "Failed to delete",
          description: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    });
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={Styles.fileManager}>
      {/* Toolbar */}
      <div className={Styles.toolbar}>
        <button
          className={Styles.navBtn}
          onClick={goBack}
          disabled={breadcrumbs.length === 0}
          title="Back"
        >
          <ArrowLeftFilled fontSize={16} />
        </button>

        {/* Breadcrumbs / Address bar */}
        <div className={Styles.addressBar}>
          <span
            className={
              breadcrumbs.length === 0
                ? Styles.breadcrumbCurrent
                : Styles.breadcrumbItem
            }
            onClick={() => navigateTo(null)}
          >
            Files
          </span>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id}>
              <span className={Styles.breadcrumbSeparator}>&rsaquo;</span>
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? Styles.breadcrumbCurrent
                    : Styles.breadcrumbItem
                }
                onClick={() => navigateTo(crumb.id)}
              >
                {crumb.name}
              </span>
            </span>
          ))}
        </div>

        <div className={Styles.searchBar}>
            <SearchRegular fontSize={20} />
            <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  if (!val.trim()) {
                    setIsSearching(false);
                    refreshFiles(currentFolderId);
                    return;
                  }
                  searchTimeoutRef.current = setTimeout(() => {
                    setIsSearching(true);
                    startTransition(async () => {
                      const results = await searchFiles(scope, val.trim());
                      setFiles(results);
                    });
                  }, 300);
                }}
            />
        </div>
      </div>

      {/* Action bar */}
      <div className={Styles.actionBar}>
        {/* Main Actions */}
        <div className={Styles.mainActions}>
          <button
            className={Styles.actionBtn}
            onClick={() => setShowNewFolder(true)}
          >
            <FolderAddFilled fontSize={16} />
            New Folder
          </button>
          <button
            className={Styles.actionBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            <ArrowUploadFilled fontSize={16} />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className={Styles.hiddenInput}
            onChange={handleUpload}
          />
        </div>
        {/* Right actions */}
        <div className={Styles.toolbarActions}>
          {/* Sort */}
          <div className={Styles.sortGroup}>
            <ArrowSortDownFilled fontSize={14} />
            <select
              className={Styles.sortSelect}
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="size">Size</option>
            </select>
          </div>

          {/* View toggle */}
          <div className={Styles.viewToggle}>
            <button
              className={`${Styles.viewBtn} ${viewMode === "grid" ? Styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <GridFilled fontSize={16} />
            </button>
            <button
              className={`${Styles.viewBtn} ${viewMode === "list" ? Styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <TextBulletListLtrFilled fontSize={16} />
            </button>
          </div>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className={Styles.folderDialog}>
          <FolderFilled fontSize={18} color="#F5C542" />
          <input
            className={Styles.folderInput}
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") setShowNewFolder(false);
            }}
            autoFocus
          />
          <button className={Styles.actionBtn} onClick={handleCreateFolder}>
            Create
          </button>
          <button
            className={Styles.actionBtn}
            onClick={() => setShowNewFolder(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Content area */}
      <div className={Styles.content}>
        {isPending && files.length === 0 && (
          <div className={Styles.emptyState}>
            <span>Loading...</span>
          </div>
        )}

        {!isPending && files.length === 0 && !showNewFolder && (
          <div className={Styles.emptyState}>
            <FolderFilled fontSize={48} color="var(--grey-200)" />
            <span>This folder is empty</span>
            <span className={Styles.emptyHint}>
              Drop files here or use the Upload button
            </span>
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && sortedFiles.length > 0 && (
          <div className={Styles.grid}>
            {sortedFiles.map((file) => (
              <div
                key={file.id}
                className={Styles.gridItem}
                onDoubleClick={() => handleOpen(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                title={file.name}
              >
                <div className={Styles.gridIcon}>
                  {isImageFile(file) && imageUrls[file.id] ? (
                    <img
                      src={imageUrls[file.id]}
                      alt={file.name}
                      className={Styles.gridThumbnail}
                    />
                  ) : (
                    getFileIcon(file, 48)
                  )}
                </div>
                {renamingId === file.id ? (
                  <input
                    ref={renameInputRef}
                    className={Styles.renameInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={submitRename}
                    autoFocus
                  />
                ) : (
                  <span className={Styles.gridName}>{file.name}</span>
                )}
                {file.source !== "SUPABASE" && (
                  <span className={Styles.sourceTag}>
                    {file.source.replace("_", " ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && sortedFiles.length > 0 && (
          <div className={Styles.list}>
            <div className={Styles.listHeader}>
              <span className={Styles.listColName}>Name</span>
              <span className={Styles.listColDate}>Date modified</span>
              <span className={Styles.listColType}>Type</span>
              <span className={Styles.listColSize}>Size</span>
            </div>
            {sortedFiles.map((file) => (
              <div
                key={file.id}
                className={Styles.listRow}
                onDoubleClick={() => handleOpen(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
              >
                <span className={Styles.listColName}>
                  <span className={Styles.listIcon}>
                    {isImageFile(file) && imageUrls[file.id] ? (
                      <img
                        src={imageUrls[file.id]}
                        alt={file.name}
                        className={Styles.listThumbnail}
                      />
                    ) : (
                      getFileIcon(file, 18)
                    )}
                  </span>
                  {renamingId === file.id ? (
                    <input
                      ref={renameInputRef}
                      className={Styles.renameInput}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={submitRename}
                      autoFocus
                    />
                  ) : (
                    <span className={Styles.listFileName}>{file.name}</span>
                  )}
                  {file.source !== "SUPABASE" && (
                    <span className={Styles.sourceTag}>
                      {file.source.replace("_", " ")}
                    </span>
                  )}
                </span>
                <span className={Styles.listColDate}>
                  {formatDate(file.createdAt)}
                </span>
                <span className={Styles.listColType}>
                  {file.type === "FOLDER"
                    ? "Folder"
                    : (file.mimeType?.split("/")[1] ?? "File")}
                </span>
                <span className={Styles.listColSize}>
                  {file.type === "FILE" ? formatSize(file.fileSize) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={Styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file.type === "FOLDER" && (
            <button
              className={Styles.contextItem}
              onClick={() => {
                handleOpen(contextMenu.file);
                setContextMenu(null);
              }}
            >
              Open
            </button>
          )}
          {isPreviewable(contextMenu.file) &&
            contextMenu.file.source === "SUPABASE" && (
              <button
                className={Styles.contextItem}
                onClick={() => {
                  handlePreview(contextMenu.file);
                  setContextMenu(null);
                }}
              >
                <ImageFilled fontSize={14} />
                Preview
              </button>
            )}
          <button
            className={Styles.contextItem}
            onClick={() => handleRename(contextMenu.file)}
          >
            <RenameFilled fontSize={14} />
            Rename
          </button>
          {contextMenu.file.type === "FILE" &&
            contextMenu.file.source === "SUPABASE" && (
              <button
                className={Styles.contextItem}
                onClick={() => {
                  handleOpen(contextMenu.file);
                  setContextMenu(null);
                }}
              >
                <ArrowDownloadFilled fontSize={14} />
                Download
              </button>
            )}
          {contextMenu.file.source !== "SUPABASE" &&
            contextMenu.file.externalUrl && (
              <button
                className={Styles.contextItem}
                onClick={() => {
                  window.open(
                    contextMenu.file.externalUrl!,
                    "_blank",
                    "noopener",
                  );
                  setContextMenu(null);
                }}
              >
                <CloudFilled fontSize={14} />
                Open in source
              </button>
            )}
          <div className={Styles.contextDivider} />
          <button
            className={`${Styles.contextItem} ${Styles.contextDanger}`}
            onClick={() => handleDelete(contextMenu.file)}
          >
            <DeleteFilled fontSize={14} />
            Delete
          </button>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewerFile && (
        <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />
      )}

      {/* Upload Progress Popup */}
      {uploads.length > 0 && (
        <div className={Styles.uploadPopup}>
          <div className={Styles.uploadPopupHeader}>
            <span>
              Uploading {uploads.filter((u) => u.status === "uploading").length}{" "}
              file(s)
            </span>
          </div>
          <div className={Styles.uploadPopupList}>
            {uploads.map((upload) => (
              <div key={upload.id} className={Styles.uploadItem}>
                <div className={Styles.uploadItemInfo}>
                  {upload.status === "done" && (
                    <CheckmarkCircleFilled fontSize={14} color="#10B981" />
                  )}
                  {upload.status === "error" && (
                    <DismissCircleFilled fontSize={14} color="#EF4444" />
                  )}
                  {upload.status === "uploading" && (
                    <ArrowUploadFilled
                      fontSize={14}
                      color="var(--primary-color)"
                    />
                  )}
                  <span className={Styles.uploadItemName}>{upload.name}</span>
                  <span className={Styles.uploadItemPct}>
                    {upload.status === "done"
                      ? "Done"
                      : upload.status === "error"
                        ? "Failed"
                        : `${upload.progress}%`}
                  </span>
                </div>
                {upload.status === "uploading" && (
                  <div className={Styles.uploadProgressBar}>
                    <div
                      className={Styles.uploadProgressFill}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
