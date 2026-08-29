"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRightRegular, BuildingRegular } from "@fluentui/react-icons";

import { slugify } from "@/lib/utils";
import { setupWorkspace } from "@/modules/auth/actions";
import Styles from "./WorkspaceCreationForm.module.css";

type WorkspaceCreationFormProps = {
  cancelHref: string;
};

export default function WorkspaceCreationForm({ cancelHref }: WorkspaceCreationFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;

    setError(null);
    setCreating(true);

    try {
      const result = await setupWorkspace({ name: name.trim(), slug });
      if (result.error || !result.workspaceSlug) {
        setError(result.error ?? "Could not create the workspace.");
        setCreating(false);
        return;
      }

      window.location.replace(`/app/${result.workspaceSlug}/home`);
    } catch {
      setError("Could not create the workspace. Please try again.");
      setCreating(false);
    }
  };

  return (
    <section className={Styles.panel} aria-labelledby="create-workspace-heading">
      <header className={Styles.header}>
        <span className={Styles.icon} aria-hidden="true">
          <BuildingRegular />
        </span>
        <div>
          <h1 id="create-workspace-heading">Create a workspace</h1>
          <p>Set up a separate place for a team, client, or business.</p>
        </div>
      </header>

      <form className={Styles.form} onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="workspace-name">
            Workspace name
          </label>
          <input
            className="form-input"
            id="workspace-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Acme Sales"
            minLength={3}
            maxLength={80}
            autoComplete="organization"
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="workspace-slug">
            Workspace URL
          </label>
          <div className={Styles.slugField}>
            <span>opencrm.app/</span>
            <input
              id="workspace-slug"
              name="slug"
              type="text"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              onBlur={() => setSlug(slugify(slug || name))}
              placeholder="acme-sales"
              maxLength={64}
              spellCheck={false}
              required
            />
          </div>
        </div>

        {error && (
          <p className={Styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={Styles.actions}>
          <Link className={Styles.cancel} href={cancelHref}>
            Cancel
          </Link>
          <button className={Styles.submit} type="submit" disabled={creating}>
            <span>{creating ? "Creating..." : "Create workspace"}</span>
            {!creating && <ArrowRightRegular aria-hidden="true" />}
          </button>
        </div>
      </form>

      {creating && (
        <div className={Styles.overlay} role="status" aria-live="polite">
          <span className={Styles.spinner} aria-hidden="true" />
          <p>Creating workspace</p>
          <span>{name.trim()}</span>
        </div>
      )}
    </section>
  );
}