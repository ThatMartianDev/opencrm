"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpFilled,
  ChatRegular,
  ChevronDownFilled,
  DocumentTextFilled,
  MailMultipleRegular,
  SlashForwardFilled,
} from "@fluentui/react-icons";

import type { CatcherInputType } from "../../../types";
import Styles from "./Composer.module.css";

const promptTypes: Record<CatcherInputType, { label: string; icon: ReactNode, description: string }> = {
  command: {
    label: "Command",
    icon: <SlashForwardFilled fontSize={19} />,
    description: "Tell the AI what to do. Example: 'Create a new task for tomorrow.'",
  },
  transcript: {
    label: "Transcript",
    icon: <DocumentTextFilled fontSize={19} />,
    description: "Provide a transcript of a conversation and let the AI summarize or extract information.",
  },
  email: {
    label: "Email",
    icon: <MailMultipleRegular fontSize={19} />,
    description: "Provide the content of an email and let the AI summarize or extract information.",
  },
  chat: {
    label: "Chat",
    icon: <ChatRegular fontSize={19} />,
    description: "Provide a chat conversation and let the AI summarize or extract information.",
  },
};

type QuickCatcherComposerProps = {
  input: string;
  inputType: CatcherInputType;
  prompt: string;
  focused: boolean;
  disabled: boolean;
  inputTypeDisabled: boolean;
  onInputChange: (value: string) => void;
  onInputTypeChange: (value: CatcherInputType) => void;
  onSubmit: () => void;
};

export default function QuickCatcherComposer({
  input,
  inputType,
  prompt,
  focused,
  disabled,
  inputTypeDisabled,
  onInputChange,
  onInputTypeChange,
  onSubmit,
}: QuickCatcherComposerProps) {
  const [promptTypeTriggerRect, setPromptTypeTriggerRect] =
    useState<DOMRect | null>(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setIsVisible(true), 900);
    return () => window.clearTimeout(revealTimer);
  }, []);

  return (
    <>
      <div
        className={`${Styles.composer} ${isVisible ? Styles.show : ""} ${focused ? Styles.focusGradient : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={Styles.composer_header}>
          <p>Quick Catcher</p>
        </div>
        <div className={Styles.composer_body}>
          <div className={Styles.textarea_placeholder}>
            <p className={isTextareaFocused || input ? Styles.hide : ""}>
              {prompt}
            </p>
            <textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={() => setIsTextareaFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              rows={1}
              disabled={disabled}
            />
          </div>
          <div className={Styles.composer_footer}>
            <div className={Styles.composer_options}>
              <div className={Styles.prompt_type}>
                <button
                  className={Styles.selected_prompt_type}
                  type="button"
                  disabled={inputTypeDisabled}
                  onClick={(event) => {
                    const triggerRect =
                      event.currentTarget.getBoundingClientRect();
                    setPromptTypeTriggerRect((current) =>
                      current ? null : triggerRect,
                    );
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={Boolean(promptTypeTriggerRect)}
                >
                  <span>
                    {promptTypes[inputType].icon}
                    <p>{promptTypes[inputType].label}</p>
                  </span>
                  <ChevronDownFilled fontSize={14} color="#555866" />
                </button>
              </div>
            </div>
            <button
              className={Styles.submitButton}
              type="button"
              onClick={onSubmit}
              disabled={!input.trim() || disabled}
              aria-label="Send to Quick Catcher"
            >
              <ArrowUpFilled fontSize={19} color="#fff" />
            </button>
          </div>
        </div>
      </div>
      {promptTypeTriggerRect &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              onClick={(event) => {
                event.stopPropagation();
                setPromptTypeTriggerRect(null);
              }}
              style={{ position: "fixed", inset: 0, zIndex: 1100 }}
            />
            <div
              className={Styles.prompt_type_selector}
              role="listbox"
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "fixed",
                bottom: window.innerHeight - promptTypeTriggerRect.top + 6,
                left: promptTypeTriggerRect.left,
                minWidth: promptTypeTriggerRect.width,
                zIndex: 1101,
                visibility: "visible",
                opacity: 1,
                transform: "none",
              }}
            >
              {Object.entries(promptTypes).map(([type, info]) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={inputType === type}
                  key={type}
                  onClick={() => {
                    onInputTypeChange(type as CatcherInputType);
                    setPromptTypeTriggerRect(null);
                  }}
                  className={`${Styles.prompt_type_button} ${inputType === type ? Styles.selected : ""}`}
                  title={info.description}
                >
                  {info.icon}
                  <p>{info.label}</p>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}