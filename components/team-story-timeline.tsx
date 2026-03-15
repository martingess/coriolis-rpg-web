"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { SectionCard } from "@/components/field-controls";
import type { AppLanguage } from "@/lib/i18n";
import type { TeamStoryBeatRecord } from "@/lib/team-types";
import { useLocaleText } from "@/lib/use-locale-text";

type StoryBeatField = "title" | "description" | "parentBeatId";

type TeamStoryTimelineProps = {
  storyBeats: TeamStoryBeatRecord[];
  onCreateBeat: (parentBeatId?: string) => void;
  onRemoveBeat: (beatId: string) => void;
  onUpdateBeat: (
    beatId: string,
    field: StoryBeatField,
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

type StoryBeatNode = {
  beat: TeamStoryBeatRecord;
  children: StoryBeatNode[];
  depth: number;
  path: number[];
};

type StoryTimelineBranchProps = {
  ariaLabel?: string;
  collapsedBeatIds: Set<string>;
  isNested?: boolean;
  language: AppLanguage;
  latestBeatId: string | null;
  lt: (english: string, ukrainian: string) => string;
  nodes: StoryBeatNode[];
  onCreateBeat: (parentBeatId?: string) => void;
  onRemoveBeat: (beatId: string) => void;
  onToggleChildren: (beatId: string) => void;
  onUpdateBeat: (
    beatId: string,
    field: StoryBeatField,
    value: string,
  ) => void;
};

const TIMELINE_PREVIEW_ROOT_LIMIT = 5;

function parseStoryBeatDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareStoryBeats(left: TeamStoryBeatRecord, right: TeamStoryBeatRecord) {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  const dateDifference = parseStoryBeatDate(left.createdAt) - parseStoryBeatDate(right.createdAt);

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return left.id.localeCompare(right.id);
}

function formatBeatIndex(
  path: number[],
  lt: (english: string, ukrainian: string) => string,
) {
  const segments = path.map((segment, index) =>
    index === 0 ? String(segment).padStart(2, "0") : String(segment),
  );

  return lt(`Point ${segments.join(".")}`, `Пункт ${segments.join(".")}`);
}

function formatBeatCreatedAt(
  value: string,
  language: AppLanguage,
  lt: (english: string, ukrainian: string) => string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return lt("Creation time unknown", "Час створення невідомий");
  }

  return new Intl.DateTimeFormat(language === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildStoryBeatTree(storyBeats: TeamStoryBeatRecord[]) {
  const sortedBeats = [...storyBeats].sort(compareStoryBeats);
  const nodesById = new Map<string, StoryBeatNode>(
    sortedBeats.map((beat) => [
      beat.id,
      {
        beat,
        children: [],
        depth: 0,
        path: [],
      },
    ]),
  );
  const rootNodes: StoryBeatNode[] = [];

  for (const beat of sortedBeats) {
    const node = nodesById.get(beat.id);

    if (!node) {
      continue;
    }

    const parentNode = beat.parentBeatId ? nodesById.get(beat.parentBeatId) : null;

    if (parentNode && parentNode.beat.id !== beat.id) {
      parentNode.children.push(node);
      continue;
    }

    rootNodes.push(node);
  }

  function assignMetadata(nodes: StoryBeatNode[], depth: number, parentPath: number[]) {
    nodes.sort((left, right) => compareStoryBeats(left.beat, right.beat));
    nodes.forEach((node, index) => {
      node.depth = depth;
      node.path = [...parentPath, index + 1];
      assignMetadata(node.children, depth + 1, node.path);
    });
  }

  assignMetadata(rootNodes, 0, []);

  return rootNodes;
}

function toDisplayTree(nodes: StoryBeatNode[]): StoryBeatNode[] {
  return [...nodes].reverse().map((node) => ({
    ...node,
    children: toDisplayTree(node.children),
  }));
}

function getLatestBeatId(storyBeats: TeamStoryBeatRecord[]) {
  const latestBeat = [...storyBeats].sort((left, right) => {
    const dateDifference = parseStoryBeatDate(left.createdAt) - parseStoryBeatDate(right.createdAt);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return compareStoryBeats(left, right);
  }).at(-1);

  return latestBeat?.id ?? null;
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

function StoryTimelineBranch({
  ariaLabel,
  collapsedBeatIds,
  isNested = false,
  language,
  latestBeatId,
  lt,
  nodes,
  onCreateBeat,
  onRemoveBeat,
  onToggleChildren,
  onUpdateBeat,
}: StoryTimelineBranchProps) {
  return (
    <ol
      className={`coriolis-timeline__list ${isNested ? "coriolis-timeline__list--nested" : ""}`}
      aria-label={ariaLabel}
    >
      {nodes.map((node) => {
        const isLatest = node.beat.id === latestBeatId;
        const hasChildren = node.children.length > 0;
        const areChildrenCollapsed = collapsedBeatIds.has(node.beat.id);
        const childLabel =
          node.children.length === 1
            ? lt("1 sub-point", "1 підпункт")
            : lt(`${node.children.length} sub-points`, `${node.children.length} підпунктів`);
        const pointLabel = formatBeatIndex(node.path, lt);

        return (
          <li key={node.beat.id} className="coriolis-timeline__item">
            <div className="coriolis-timeline__meta">
              <span className="coriolis-timeline__index">{pointLabel}</span>
              <span className="coriolis-timeline__date">
                {formatBeatCreatedAt(node.beat.createdAt, language, lt)}
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
              } ${node.depth > 0 ? "coriolis-timeline__card--nested" : ""}`}
            >
              <div className="coriolis-timeline__card-header">
                <InlineStoryBeatField
                  ariaLabel={`${pointLabel} ${lt("title", "назва")}`}
                  placeholder={lt("Name this story point", "Назвіть цю подію")}
                  value={node.beat.title}
                  onCommit={(value) => onUpdateBeat(node.beat.id, "title", value)}
                />

                <div className="coriolis-timeline__actions">
                  {hasChildren ? (
                    <button
                      type="button"
                      className="coriolis-timeline__action coriolis-timeline__action--ghost"
                      aria-expanded={!areChildrenCollapsed}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => onToggleChildren(node.beat.id)}
                    >
                      {areChildrenCollapsed
                        ? lt("Show Sub-points", "Показати підпункти")
                        : lt("Hide Sub-points", "Сховати підпункти")}
                    </button>
                  ) : null}
                  {node.depth === 0 ? (
                    <button
                      type="button"
                      className="coriolis-timeline__action"
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => onCreateBeat(node.beat.id)}
                    >
                      {lt("Add Sub-point", "Додати підпункт")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="coriolis-timeline__remove"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => onRemoveBeat(node.beat.id)}
                  >
                    {lt("Remove", "Прибрати")}
                  </button>
                </div>
              </div>

              <InlineStoryBeatField
                ariaLabel={`${pointLabel} ${lt("description", "опис")}`}
                multiline
                placeholder={lt(
                  "What changed for the crew or this branch of the story?",
                  "Що змінилося для екіпажу або цієї гілки історії?",
                )}
                value={node.beat.description}
                onCommit={(value) => onUpdateBeat(node.beat.id, "description", value)}
              />

              {hasChildren ? (
                <section className="coriolis-timeline__children-shell" aria-label={childLabel}>
                  <div className="coriolis-timeline__children-header">
                    <p className="coriolis-timeline__children-label">{lt("Branch Thread", "Гілка сюжету")}</p>
                    <p className="coriolis-timeline__children-count">{childLabel}</p>
                  </div>
                  {areChildrenCollapsed ? (
                    <p className="coriolis-timeline__children-collapsed">
                      {lt("Sub-points are hidden for this branch.", "Підпункти для цієї гілки приховані.")}
                    </p>
                  ) : (
                    <div className="coriolis-timeline__children">
                      <StoryTimelineBranch
                        collapsedBeatIds={collapsedBeatIds}
                        isNested
                        language={language}
                        latestBeatId={latestBeatId}
                        lt={lt}
                        nodes={node.children}
                        onCreateBeat={onCreateBeat}
                        onRemoveBeat={onRemoveBeat}
                        onToggleChildren={onToggleChildren}
                        onUpdateBeat={onUpdateBeat}
                      />
                    </div>
                  )}
                </section>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function TeamStoryTimeline({
  storyBeats,
  onCreateBeat,
  onRemoveBeat,
  onUpdateBeat,
}: TeamStoryTimelineProps) {
  const { language, lt } = useLocaleText();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collapsedBeatIds, setCollapsedBeatIds] = useState<string[]>([]);
  const dialogTitleId = useId();
  const rootNodes = buildStoryBeatTree(storyBeats);
  const timelineRoots = toDisplayTree(rootNodes);
  const previewRoots = timelineRoots.slice(0, TIMELINE_PREVIEW_ROOT_LIMIT);
  const hasHiddenRoots = timelineRoots.length > TIMELINE_PREVIEW_ROOT_LIMIT;
  const latestBeatId = getLatestBeatId(storyBeats);
  const collapsedBeatIdSet = useMemo(() => {
    const availableBeatIds = new Set(storyBeats.map((beat) => beat.id));

    return new Set(
      collapsedBeatIds.filter((beatId) => availableBeatIds.has(beatId)),
    );
  }, [collapsedBeatIds, storyBeats]);

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

  function toggleChildren(beatId: string) {
    setCollapsedBeatIds((currentIds) =>
      currentIds.includes(beatId)
        ? currentIds.filter((currentBeatId) => currentBeatId !== beatId)
        : [...currentIds, beatId],
    );
  }

  return (
    <>
      <SectionCard
        id="team-timeline"
        title={lt("Timeline", "Хронологія")}
        eyebrow={lt("Major Events", "Ключові події")}
        className="xl:col-span-2"
        actions={
          <button type="button" className="coriolis-chip" onClick={() => onCreateBeat()}>
            {lt("Add Story Point", "Додати подію")}
          </button>
        }
      >
        {timelineRoots.length === 0 ? (
          <div className="coriolis-timeline__empty">
            <div className="coriolis-timeline__meta">
              <span className="coriolis-timeline__index">{lt("No Story Points Yet", "Подій історії ще немає")}</span>
              <span className="coriolis-timeline__date">{lt("Creation date appears here", "Тут з'явиться дата створення")}</span>
            </div>
            <div className="coriolis-timeline__axis" aria-hidden="true">
              <span className="coriolis-timeline__connector" />
              <span className="coriolis-timeline__dot coriolis-timeline__dot--active" />
            </div>
            <div className="coriolis-timeline__card coriolis-timeline__card--active">
              <p className="text-sm uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                {lt("Bridge Memory", "Пам'ять містка")}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-muted)]">
                {lt(
                  "Capture the crew's main story points, then nest the smaller fallout, betrayals, and discoveries underneath them so every arc keeps its own thread.",
                  "Фіксуйте головні події екіпажу, а під ними вкладайте менші наслідки, зради й відкриття, щоб кожна арка зберігала власну гілку.",
                )}
              </p>
            </div>
          </div>
        ) : (
          <StoryTimelineBranch
            ariaLabel={lt("Crew timeline with nested story points, latest roots first", "Хронологія екіпажу з вкладеними подіями, новіші гілки показані першими")}
            collapsedBeatIds={collapsedBeatIdSet}
            language={language}
            latestBeatId={latestBeatId}
            lt={lt}
            nodes={previewRoots}
            onCreateBeat={onCreateBeat}
            onRemoveBeat={onRemoveBeat}
            onToggleChildren={toggleChildren}
            onUpdateBeat={onUpdateBeat}
          />
        )}

        {hasHiddenRoots ? (
          <div className="coriolis-timeline__footer">
            <button
              type="button"
              className="coriolis-chip"
              onClick={() => setIsModalOpen(true)}
            >
              {lt("Show all", "Показати все")}
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
                <p className="coriolis-modal__eyebrow">{lt("Complete Crew History", "Повна історія екіпажу")}</p>
                <h2 id={dialogTitleId} className="coriolis-modal__title">
                  {lt("Full Timeline", "Повна хронологія")}
                </h2>
              </div>
              <button
                type="button"
                className="coriolis-chip"
                onClick={() => setIsModalOpen(false)}
              >
                {lt("Close", "Закрити")}
              </button>
            </div>

            <div className="coriolis-modal__body">
              <StoryTimelineBranch
                ariaLabel={lt("Full crew timeline with nested story points", "Повна хронологія екіпажу з вкладеними подіями")}
                collapsedBeatIds={collapsedBeatIdSet}
                language={language}
                latestBeatId={latestBeatId}
                lt={lt}
                nodes={timelineRoots}
                onCreateBeat={onCreateBeat}
                onRemoveBeat={onRemoveBeat}
                onToggleChildren={toggleChildren}
                onUpdateBeat={onUpdateBeat}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
