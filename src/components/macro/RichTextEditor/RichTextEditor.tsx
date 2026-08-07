"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from "@lexical/react/LexicalAutoLinkPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $setBlocksType } from "@lexical/selection";
import {
  $createHeadingNode,
  HeadingNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $nodesOfType,
  DecoratorNode,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type DOMConversionMap,
  type DOMExportOutput,
  type LexicalEditor,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import DOMPurify from "dompurify";
import {
  ImageAddRegular,
  TextBulletListLtrFilled,
  TextNumberListLtrFilled,
} from "@fluentui/react-icons";
import { getImageUrls } from "@/modules/files/actions";
import Styles from "./RichTextEditor.module.css";

type SerializedImageNode = Spread<
  {
    altText: string;
    fileId: string;
    src: string;
    type: "inline-image";
    version: 1;
  },
  SerializedLexicalNode
>;

function convertImageElement(element: Node): { node: ImageNode } | null {
  if (!(element instanceof HTMLImageElement)) return null;
  const fileId = element.dataset.fileId;
  if (!fileId) return null;
  return {
    node: new ImageNode(fileId, element.src, element.alt || "Inline image"),
  };
}

class ImageNode extends DecoratorNode<ReactNode> {
  __fileId: string;
  __src: string;
  __altText: string;

  static getType() {
    return "inline-image";
  }

  static clone(node: ImageNode) {
    return new ImageNode(node.__fileId, node.__src, node.__altText, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode) {
    return new ImageNode(
      serializedNode.fileId,
      serializedNode.src,
      serializedNode.altText,
    );
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({ conversion: convertImageElement, priority: 1 }),
    };
  }

  constructor(fileId: string, src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__fileId = fileId;
    this.__src = src;
    this.__altText = altText;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: "inline-image",
      version: 1,
      fileId: this.__fileId,
      src: this.__src,
      altText: this.__altText,
    };
  }

  exportDOM(): DOMExportOutput {
    const image = document.createElement("img");
    image.src = this.__src;
    image.alt = this.__altText;
    image.dataset.fileId = this.__fileId;
    return { element: image };
  }

  createDOM() {
    return document.createElement("span");
  }

  updateDOM() {
    return false;
  }

  isInline() {
    return true;
  }

  getFileId() {
    return this.__fileId;
  }

  setSrc(src: string) {
    this.getWritable().__src = src;
  }

  decorate() {
    // Signed user uploads do not have the static dimensions required by next/image.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={Styles.inlineImage} src={this.__src} alt={this.__altText} />;
  }
}

function $createImageNode(fileId: string, src: string, altText: string) {
  return new ImageNode(fileId, src, altText);
}

const MATCHERS = [
  createLinkMatcherWithRegExp(/https?:\/\/[^\s]+/i, (text) => text),
  createLinkMatcherWithRegExp(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    (text) => `mailto:${text}`,
  ),
];

const editorTheme = {
  heading: {
    h1: Styles.headingOne,
    h2: Styles.headingTwo,
    h3: Styles.headingThree,
  },
  text: {
    bold: Styles.bold,
    italic: Styles.italic,
    underline: Styles.underline,
    strikethrough: Styles.strikethrough,
  },
  list: {
    ul: Styles.unorderedList,
    ol: Styles.orderedList,
    listitem: Styles.listItem,
  },
  link: Styles.link,
};

export type RichTextEditorHandle = {
  getHtml: () => string;
  getImageFileIds: () => string[];
  isEmpty: () => boolean;
};

type RichTextEditorProps = {
  initialHtml?: string;
  placeholder?: string;
  onImageUploaded?: (fileId: string) => void;
};

function EditorRefPlugin({ editorRef }: { editorRef: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);
  return null;
}

function InitialContentPlugin({ initialHtml }: { initialHtml: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let active = true;
    let imageFileIds: string[] = [];
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      if (/<[a-z][\s\S]*>/i.test(initialHtml)) {
        const sanitized = DOMPurify.sanitize(initialHtml, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ["data-file-id"],
        });
        const document = new DOMParser().parseFromString(sanitized, "text/html");
        root.append(...$generateNodesFromDOM(editor, document));
      } else {
        const lines = initialHtml.split(/\r?\n/);
        for (const line of lines) {
          root.append($createParagraphNode().append($createTextNode(line)));
        }
      }
      if (root.getChildrenSize() === 0) root.append($createParagraphNode());
      imageFileIds = $nodesOfType(ImageNode).map((node) => node.getFileId());
    });

    if (imageFileIds.length > 0) {
      getImageUrls(imageFileIds).then((urls) => {
        if (!active) return;
        editor.update(() => {
          for (const node of $nodesOfType(ImageNode)) {
            const url = urls[node.getFileId()];
            if (url) node.setSrc(url);
          }
        });
      }).catch(() => undefined);
    }

    return () => {
      active = false;
    };
  }, [editor, initialHtml]);

  return null;
}

function ToolbarPlugin({ onImageUploaded }: Pick<RichTextEditorProps, "onImageUploaded">) {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  useEffect(() => editor.registerCommand(
    SELECTION_CHANGE_COMMAND,
    () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setFormats({
          bold: selection.hasFormat("bold"),
          italic: selection.hasFormat("italic"),
          underline: selection.hasFormat("underline"),
          strikethrough: selection.hasFormat("strikethrough"),
        });
      }
      return false;
    },
    1,
  ), [editor]);

  function setBlockType(value: "paragraph" | HeadingTagType) {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () =>
        value === "paragraph" ? $createParagraphNode() : $createHeadingNode(value),
      );
    });
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Images must be 10 MB or smaller.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/files/upload", { method: "POST", body: formData });
      const uploaded = await response.json() as { id?: string; error?: string };
      if (!response.ok || !uploaded.id) throw new Error(uploaded.error || "Upload failed.");
      const urls = await getImageUrls([uploaded.id]);
      const src = urls[uploaded.id];
      if (!src) throw new Error("The uploaded image could not be opened.");
      editor.update(() => {
        $insertNodes([$createImageNode(uploaded.id!, src, file.name)]);
      });
      onImageUploaded?.(uploaded.id);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const formatButton = (
    format: "bold" | "italic" | "underline" | "strikethrough",
    label: ReactNode,
    title: string,
  ) => (
    <button
      type="button"
      className={`${Styles.toolbarButton} ${formats[format] ? Styles.active : ""}`}
      title={title}
      onMouseDown={(event) => {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className={Styles.toolbar}>
        <select
          className={Styles.blockSelect}
          defaultValue="paragraph"
          onChange={(event) => setBlockType(event.target.value as "paragraph" | HeadingTagType)}
          aria-label="Text style"
        >
          <option value="paragraph">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <span className={Styles.separator} />
        {formatButton("bold", <b>B</b>, "Bold")}
        {formatButton("italic", <i>I</i>, "Italic")}
        {formatButton("underline", <u>U</u>, "Underline")}
        {formatButton("strikethrough", <s>S</s>, "Strikethrough")}
        <span className={Styles.separator} />
        <button
          type="button"
          className={Styles.toolbarButton}
          title="Bulleted list"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }}
        >
          <TextBulletListLtrFilled fontSize={19} />
        </button>
        <button
          type="button"
          className={Styles.toolbarButton}
          title="Numbered list"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          }}
        >
          <TextNumberListLtrFilled fontSize={19} />
        </button>
        <span className={Styles.separator} />
        <button
          type="button"
          className={Styles.toolbarButton}
          title="Insert image"
          aria-label="Insert image"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <ImageAddRegular fontSize={19} />
        </button>
        <input
          ref={inputRef}
          className={Styles.hiddenInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
          }}
        />
      </div>
      {uploadError && <div className={Styles.uploadError}>{uploadError}</div>}
    </>
  );
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    { initialHtml = "", placeholder = "Start writing...", onImageUploaded },
    ref,
  ) {
    const editorRef = useRef<LexicalEditor | null>(null);

    useImperativeHandle(ref, () => ({
      getHtml() {
        const editor = editorRef.current;
        if (!editor) return "";
        const html = editor.read(() => $generateHtmlFromNodes(editor, null));
        return DOMPurify.sanitize(html, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ["data-file-id"],
        });
      },
      getImageFileIds() {
        const editor = editorRef.current;
        if (!editor) return [];
        return editor.read(() => $nodesOfType(ImageNode).map((node) => node.getFileId()));
      },
      isEmpty() {
        const editor = editorRef.current;
        if (!editor) return true;
        return editor.read(() =>
          $getRoot().getTextContent().trim().length === 0 && $nodesOfType(ImageNode).length === 0,
        );
      },
    }));

    const initialConfig = {
      namespace: "OpenCRMDocumentEditor",
      theme: editorTheme,
      nodes: [HeadingNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, ImageNode],
      onError: (error: Error) => console.error("[Lexical]", error),
    };

    return (
      <div className={Styles.editorShell}>
        <LexicalComposer initialConfig={initialConfig}>
          <ToolbarPlugin onImageUploaded={onImageUploaded} />
          <div className={Styles.editorInner}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={Styles.editor}
                  aria-placeholder={placeholder}
                  placeholder={<div className={Styles.placeholder}>{placeholder}</div>}
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <AutoLinkPlugin matchers={MATCHERS} />
          <EditorRefPlugin editorRef={editorRef} />
          <InitialContentPlugin initialHtml={initialHtml} />
        </LexicalComposer>
      </div>
    );
  },
);

export default RichTextEditor;