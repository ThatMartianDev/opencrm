"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { FORMAT_TEXT_COMMAND, type LexicalEditor } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";
import { SELECTION_CHANGE_COMMAND } from "lexical";
import { LinkNode, AutoLinkNode } from "@lexical/link";

import { TextBulletListLtrFilled, TextNumberListLtrFilled, MoreHorizontalFilled } from "@fluentui/react-icons";

import {
  ListNode,
  ListItemNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $generateHtmlFromNodes } from "@lexical/html";
import Styles from "./ComposeEmailModal.module.css";
import { MATCHERS } from "./utils";

const editorTheme = {
  text: {
    bold: Styles.editorBold,
    italic: Styles.editorItalic,
    underline: Styles.editorUnderline,
    strikethrough: Styles.editorStrikethrough,
  },
  list: {
    ul: Styles.editorUl,
    ol: Styles.editorOl,
    listitem: Styles.editorListItem,
  },
  paragraph: Styles.editorParagraph,
  link: Styles.editorLink,
};

const initialConfig = {
  namespace: "EmailBody",
  theme: editorTheme,
  nodes: [ListNode, ListItemNode, LinkNode, AutoLinkNode],
  onError: (error: Error) => console.error("[Lexical]", error),
};

type BodyInputProps = {
  quoteHtml?: string;
  placeholder?: string;
};

export type BodyInputHandle = {
  getHtml: () => string;
};

function EditorRefPlugin({
  editorRef,
}: {
  editorRef: React.MutableRefObject<LexicalEditor | null>;
}) {
  const [editor] = useLexicalComposerContext();
  editorRef.current = editor;
  return null;
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  useEffect(() => {
    const updateToolbar = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return;
        }

        setFormats({
          bold: selection.hasFormat("bold"),
          italic: selection.hasFormat("italic"),
          underline: selection.hasFormat("underline"),
          strikethrough: selection.hasFormat("strikethrough"),
        });
      });
    };

    updateToolbar();

    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      1,
    );
  }, [editor]);

  editor.read(() => {
    const html = $generateHtmlFromNodes(editor, null);
    console.log(html);
  });

  return (
    <div className={Styles.editorToolbar}>
      <button
        type="button"
        className={`${Styles.toolbarBtn} ${formats.bold ? Styles.active : ""}`}
        title="Bold (ctrl + b)"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        }}
      >
        <b>B</b>
      </button>

      <button
        type="button"
        className={`${Styles.toolbarBtn} ${formats.italic ? Styles.active : ""}`}
        title="Italic (ctrl + i)"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        }}
      >
        <i>I</i>
      </button>
      <button
        type="button"
        className={`${Styles.toolbarBtn} ${formats.underline ? Styles.active : ""}`}
        title="Underline (ctrl + u)"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
        }}
      >
        <u>U</u>
      </button>
      {/* find the shortcut for strikethrough */}
      <button
        type="button"
        className={`${Styles.toolbarBtn} ${formats.strikethrough ? Styles.active : ""}`}
        title="Strikethrough"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
        }}
      >
        <s>S</s>
      </button>
      <div className={Styles.toolbarSep} />
      <button
        type="button"
        className={Styles.toolbarBtn}
        title="Bullet list"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        }}
      >
        <TextBulletListLtrFilled fontSize={20}/>
      </button>
      <button
        type="button"
        className={Styles.toolbarBtn}
        title="Numbered list"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }}
      >
        <TextNumberListLtrFilled fontSize={20}/>
      </button>
      {/* "Add insert link option + modal to handle label and URL */}
    </div>
  );
}

const BodyInput = forwardRef<BodyInputHandle, BodyInputProps>(
  function BodyInput(
    { quoteHtml, placeholder = "Write your email here..." },
    ref,
  ) {
    const editorRef = useRef<LexicalEditor | null>(null);
    const [showQuote, setShowQuote] = useState(false);

    useImperativeHandle(ref, () => ({
      getHtml() {
        const editor = editorRef.current;
        if (!editor) return "";
        return editor.read(() => $generateHtmlFromNodes(editor, null));
      },
    }));

    return (
      <div className={Styles.BodyInput}>
        <div className={Styles.bodyEditorWrap}>
          <LexicalComposer initialConfig={initialConfig}>
          <div className={Styles.editorInner}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={Styles.bodyEditor}
                  placeholder={
                    <div className={Styles.editorPlaceholder}>
                      {placeholder}
                    </div>
                  }
                  aria-placeholder={placeholder}
                />
              }
              ErrorBoundary={LexicalErrorBoundary as any}
            />
            <HistoryPlugin />
            <ListPlugin />
            <AutoLinkPlugin matchers={MATCHERS} />
            <LinkPlugin />
            <EditorRefPlugin editorRef={editorRef} />
          </div>
          <ToolbarPlugin />
        </LexicalComposer>
        </div>

        {/* html is already sanitized when we send an email, so we can safely use dangerouslySetInnerHTML here.. for now */}
        {quoteHtml && (
          <div className={Styles.quoteBlockWrap}>
            <button onClick={()=>{setShowQuote(!showQuote)}} title={`${showQuote ? "Hide" : "Show"} Trimmed Content`} className={Styles.showQuoteBtn}>
              <MoreHorizontalFilled fontSize={16} color="#434445"/>
              {/* <p>{showQuote ? "Hide" : "Show"} Trimmed Content</p> */}
            </button>
            {showQuote && (
              <div
                className={Styles.quoteBlock}
                dangerouslySetInnerHTML={{ __html: quoteHtml }}
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

export default BodyInput;
