import { useRef, useState, type ReactNode } from "react";
import { errorMessage } from "../../lib/supabase";
export const text = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();
export const optional = (form: FormData, name: string) =>
  text(form, name) || null;
export const numeric = (form: FormData, name: string) =>
  optional(form, name) === null ? null : Number(text(form, name));
export const states = ["scheduled", "in_progress", "completed", "cancelled"];
export const labelState = (value: string) => value.replaceAll("_", " ");
export function Editor({
  children,
  save,
  submitLabel = "Save",
}: {
  children: ReactNode;
  save: (form: FormData) => Promise<void>;
  submitLabel?: string;
}) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current) return;
        const data = new FormData(event.currentTarget);
        lock.current = true;
        setBusy(true);
        setError("");
        setNotice("");
        try {
          await save(data);
          setNotice("Saved.");
        } catch (error) {
          setError(errorMessage(error));
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}
export function Field({
  label,
  name,
  value,
  required,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  value?: string | number | null;
  required?: boolean;
  type?: string;
  min?: number | string;
  max?: number | string;
  step?: number;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value ?? ""}
        required={required}
        type={type}
        min={min}
        max={max}
        step={step}
        maxLength={150}
      />
    </label>
  );
}
