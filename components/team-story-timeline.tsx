"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

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

const TIMELINE_PREVIEW_LIMIT = 5;

function formatBeatIndex(index: number) {
  return `Beat ${String(index + 1).padStart(2, "0")}`;
}

function formatBeatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Creation time unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
    event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
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

type TimelineEntry = {
  beat: TeamStoryBeatRecord;
  displayIndex: number;
  isLatest: boolean;
};

type StoryTimelineListProps = {
  ariaLabel: string;
  entries: TimelineEntry[];
  onRemoveBeat: (beatId: string) => void;
  onUpdateBeat: (
    beatId: string,
    field: "title" | "description",
    value: string,
  ) => void;
};

function StoryTimelineList({
  ariaLabel,
  entries,
  onRemoveBeat,
  onUpdateBeat,
}: StoryTimelineListProps) {
  if (entries.length === 0) {
    return (
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
    );
  }

  return (
    <ol className="coriolis-timeline__list" aria-label={ariaLabel}>
      {entries.map(({ beat, displayIndex, isLatest }) => (
        <li key={beat.id} className="coriolis-timeline__item">
          <div className="coriolis-timeline__meta">
            <span className="coriolis-timeline__index">
              {formatBeatIndex(displayIndex - 1)}
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
                ariaLabel={`${formatBeatIndex(displayIndex - 1)} title`}
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
              ariaLabel={`${formatBeatIndex(displayIndex - 1)} description`}
              multiline
              placeholder="What changed for the crew?"
              value={beat.description}
              onCommit={(value) => onUpdateBeat(beat.id, "description", value)}
            />
          </article>
        </li>
      ))}
    </ol>
  );
}

export function TeamStoryTimeline({
  storyBeats,
  onCreateBeat,
  onRemoveBeat,
  onUpdateBeat,
}: TeamStoryTimelineProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogTitleId = useId();
  const timelineEntries = [...storyBeats]
    .reverse()
    .map((beat, reversedIndex) => ({
      beat,
      displayIndex: storyBeats.length - reversedIndex,
      isLatest: reversedIndex === 0,
    }));
  const previewEntries = timelineEntries.slice(0, TIMELINE_PREVIEW_LIMIT);
  const hasHiddenEntries = timelineEntries.length > TIMELINE_PREVIEW_LIMIT;

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  return (
    <>
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
        <StoryTimelineList
          ariaLabel="Crew timeline, latest first"
          entries={previewEntries}
          onRemoveBeat={onRemoveBeat}
          onUpdateBeat={onUpdateBeat}
        />

        {hasHiddenEntries ? (
          <div className="coriolis-timeline__footer">
            <button
              type="button"
              className="coriolis-chip"
              onClick={() => setIsModalOpen(true)}
            >
              Show all
            </button>
          </div>
        ) : null}
      </SectionCard>

      {isModalOpen ? (
        <div
          className="coriolis-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="coriolis-modal__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="coriolis-modal__header">
              <div>
                <p className="coriolis-modal__eyebrow">Complete Crew History</p>
                <h2 id={dialogTitleId} className="coriolis-modal__title">
                  Full Timeline
                </h2>
              </div>
              <button
                type="button"
                className="coriolis-chip"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="coriolis-modal__body">
              <StoryTimelineList
                ariaLabel="Full crew timeline, latest first"
                entries={timelineEntries}
                onRemoveBeat={onRemoveBeat}
                onUpdateBeat={onUpdateBeat}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
