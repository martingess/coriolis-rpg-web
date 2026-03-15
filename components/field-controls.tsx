"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type CommitHandler<T> = (value: T) => Promise<void> | void;

type FieldShellProps = {
  children: ReactNode;
  label: string;
  hint?: string;
  className?: string;
};

function FieldShell({ children, label, hint, className = "" }: FieldShellProps) {
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <span className="block max-w-full text-[0.72rem] leading-snug uppercase tracking-[0.32em] text-[var(--ink-faint)] [overflow-wrap:anywhere]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-xs text-[var(--ink-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

type SavableTextFieldProps = {
  className?: string;
  hint?: string;
  label: string;
  multiline?: boolean;
  onCommit: CommitHandler<string>;
  placeholder?: string;
  rows?: number;
  value: string;
};

export function SavableTextField({
  className,
  hint,
  label,
  multiline = false,
  onCommit,
  placeholder,
  rows = 3,
  value,
}: SavableTextFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function handleCommit() {
    if (draft === value) {
      return;
    }

    await onCommit(draft);
  }

  return (
    <FieldShell label={label} hint={hint} className={className}>
      {multiline ? (
        <textarea
          className="coriolis-textarea"
          rows={rows}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            void handleCommit();
          }}
        />
      ) : (
        <input
          className="coriolis-input"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            void handleCommit();
          }}
        />
      )}
    </FieldShell>
  );
}

type SavableNumberFieldProps = {
  action?: ReactNode;
  className?: string;
  hint?: string;
  label: string;
  max?: number;
  min?: number;
  onCommit: CommitHandler<number>;
  step?: number;
  value: number;
};

export function SavableNumberField({
  action,
  className,
  hint,
  label,
  max,
  min,
  onCommit,
  step = 1,
  value,
}: SavableNumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  async function handleCommit() {
    const nextValue = Number.parseInt(draft, 10);
    const numericValue = Number.isFinite(nextValue) ? nextValue : 0;

    if (numericValue === value) {
      setDraft(String(value));
      return;
    }

    await onCommit(numericValue);
  }

  return (
    <FieldShell label={label} hint={hint} className={className}>
      {action ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <input
            className="coriolis-input min-w-0 w-full text-center"
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              void handleCommit();
            }}
          />
          <div className="justify-self-start sm:justify-self-end">{action}</div>
        </div>
      ) : (
        <input
          className="coriolis-input min-w-0 w-full text-center"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            void handleCommit();
          }}
        />
      )}
    </FieldShell>
  );
}

type SelectOption = {
  label: string;
  value: string;
};

type SavableSelectFieldProps = {
  className?: string;
  disabled?: boolean;
  hint?: string;
  label: string;
  onCommit: CommitHandler<string>;
  options: SelectOption[];
  value: string;
};

export function SavableSelectField({
  className,
  disabled = false,
  hint,
  label,
  onCommit,
  options,
  value,
}: SavableSelectFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <FieldShell label={label} hint={hint} className={className}>
      <select
        className="coriolis-select"
        disabled={disabled}
        value={draft}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraft(nextValue);
          if (nextValue !== value) {
            void onCommit(nextValue);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type CounterTrackProps = {
  headerAction?: ReactNode;
  label: string;
  max: number;
  onCommit: CommitHandler<number>;
  value: number;
};

type SegmentedValueFieldProps = {
  className?: string;
  headerAction?: ReactNode;
  hint?: ReactNode;
  label: string;
  max: number;
  onCommit: CommitHandler<number>;
  value: number;
};

export function SegmentedValueField({
  className = "",
  headerAction,
  hint,
  label,
  max,
  onCommit,
  value,
}: SegmentedValueFieldProps) {
  const { t } = useTranslation();
  const labelId = useId();
  const hintId = useId();

  return (
    <div
      className={`flex flex-col gap-3 rounded-[1.4rem] border border-[var(--line-strong)] bg-[var(--panel-soft)] px-4 py-4 shadow-[0_18px_60px_rgba(9,12,18,0.22)] ${className}`}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={hint ? hintId : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            id={labelId}
            className="text-[0.76rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]"
          >
            {label}
          </span>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
        <span className="text-sm font-medium text-[var(--ink)]">
          {value}/{max}
        </span>
      </div>
      <div className="coriolis-counter-track flex flex-wrap gap-2">
        {Array.from({ length: max }, (_, index) => {
          const isActive = index < value;

          return (
            <button
              key={`${label}-${index}`}
              type="button"
              className={`coriolis-counter coriolis-counter--track ${
                isActive ? "coriolis-counter--active" : ""
              }`}
              aria-label={
                value === index + 1
                  ? `${label}: ${t("controls.decreaseTo", { value: index })}`
                  : `${label}: ${t("controls.setTo", { value: index + 1 })}`
              }
              aria-pressed={isActive}
              onClick={() => {
                const nextValue = value === index + 1 ? index : index + 1;
                void onCommit(nextValue);
              }}
            />
          );
        })}
      </div>
      {hint ? (
        <span id={hintId} className="text-xs text-[var(--ink-muted)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function CounterTrack(props: CounterTrackProps) {
  return <SegmentedValueField {...props} />;
}

type SectionCardProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  eyebrow?: string;
  title: string;
};

export function SectionCard({
  actions,
  children,
  className = "",
  id,
  eyebrow,
  title,
}: SectionCardProps) {
  return (
    <section
      id={id}
      className={`coriolis-panel relative overflow-hidden rounded-[1.75rem] border border-[var(--line-strong)] p-4 scroll-mt-[20rem] md:p-5 md:scroll-mt-[18rem] lg:scroll-mt-[16rem] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-xl uppercase tracking-[0.14em] text-[var(--ink)] md:text-2xl">
            {title}
          </h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
