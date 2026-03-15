"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { SectionCard } from "@/components/field-controls";
import type { TeamStoryBeatRecord } from "@/lib/team-types";

type TeamStoryTimelineProps = {
  storyBeats: TeamStoryBeatRecord[];
  onCreateBeat: () => void;
  onRemoveBeat: (beatId: string) => void;
  onUpdateBeat: (
    beatId: string,
    field: "title" | "description",
    value: string,
  ) => void;
};

type InlineStoryBeatFieldProps = {
  ariaLabel: string;
  className?: string;
  multiline?: boolean;
  onCommit: (value: string) => Promise<void> | void;
  placeholder: string;
  rows?: number;
  value: string;
};

function formatBeatIndex(index: number) {
  return `Beat ${String(index + 1).padStart(2, "0")}`;
}

function formatBeatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Creation date unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function InlineStoryBeatField({
  ariaLabel,
  className = "",
  multiline = false,
  onCommit,
  placeholder,
  rows = 3,
  value,
}: InlineStoryBeatFieldProps) {
  const [draft, setDraft] = useState(value);
  const skipNextCommitRef = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function handleCommit() {
    if (skipNextCommitRef.current) {
      skipNextCommitRef.current = false;
      setDraft(value);
      return;
    }

    if (draft === value) {
      return;
    }

    await onCommit(draft);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (event.key === "Escape") {
      skipNextCommitRef.current = true;
      setDraft(value);
      event.currentTarget.blur();
      return;
    }

    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }

    if (multiline && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  if (multiline) {
    return (
      <textarea
        aria-label={ariaLabel}
        className={`coriolis-timeline__inline coriolis-timeline__inline--body ${className}`}
        rows={Math.max(rows, draft.split("\n").length)}
        value={draft}
        placeholder={placeholder}
        onBlur={() => {
          void handleCommit();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <input
      aria-label={ariaLabel}
      className={`coriolis-timeline__inline coriolis-timeline__inline--title ${className}`}
      value={draft}
      placeholder={placeholder}
      onBlur={() => {
        void handleCommit();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}

export function TeamStoryTimeline({
  storyBeats,
  onCreateBeat,
  onRemoveBeat,
  onUpdateBeat,
}: TeamStoryTimelineProps) {
  return (
    <SectionCard
      id="team-timeline"
      title="Timeline"
      eyebrow="Major Events"
      className="xl:col-span-2"
      actions={
        <button type="button" className="coriolis-chip" onClick={onCreateBeat}>
          Add Beat
        </button>
      }
    >
      {storyBeats.length === 0 ? (
        <div className="coriolis-timeline__empty">
          <div className="coriolis-timeline__meta">
            <span className="coriolis-timeline__index">No Beats Yet</span>
            <span className="coriolis-timeline__date">Creation date appears here</span>
          </div>
          <div className="coriolis-timeline__axis" aria-hidden="true">
            <span className="coriolis-timeline__connector" />
            <span className="coriolis-timeline__dot coriolis-timeline__dot--active" />
          </div>
          <div className="coriolis-timeline__card coriolis-timeline__card--active">
            <p className="text-sm uppercase tracking-[0.28em] text-[var(--ink-faint)]">
              Bridge Memory
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-muted)]">
              Pin major jumps, betrayals, discoveries, and debts paid in blood or
              birr. Each beat edits in place, so the timeline stays readable while
              the crew keeps writing.
            </p>
          </div>
        </div>
      ) : (
        <ol className="coriolis-timeline__list" aria-label="Crew timeline">
          {storyBeats.map((beat, index) => {
            const isLatest = index === storyBeats.length - 1;

            return (
              <li key={beat.id} className="coriolis-timeline__item">
                <div className="coriolis-timeline__meta">
                  <span className="coriolis-timeline__index">
                    {formatBeatIndex(index)}
                  </span>
                  <span className="coriolis-timeline__date">
                    {formatBeatCreatedAt(beat.createdAt)}
                  </span>
                </div>

                <div className="coriolis-timeline__axis" aria-hidden="true">
                  <span className="coriolis-timeline__connector" />
                  <span
                    className={`coriolis-timeline__dot ${
                      isLatest ? "coriolis-timeline__dot--active" : ""
                    }`}
                  />
                </div>

                <article
                  className={`coriolis-timeline__card ${
                    isLatest ? "coriolis-timeline__card--active" : ""
                  }`}
                >
                  <div className="coriolis-timeline__card-header">
                    <InlineStoryBeatField
                      ariaLabel={`${formatBeatIndex(index)} title`}
                      placeholder="Name this beat"
                      value={beat.title}
                      onCommit={(value) => onUpdateBeat(beat.id, "title", value)}
                    />

                    <button
                      type="button"
                      className="coriolis-timeline__remove"
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => onRemoveBeat(beat.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <InlineStoryBeatField
                    ariaLabel={`${formatBeatIndex(index)} description`}
                    multiline
                    placeholder="What changed for the crew?"
                    value={beat.description}
                    onCommit={(value) => onUpdateBeat(beat.id, "description", value)}
                  />
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
