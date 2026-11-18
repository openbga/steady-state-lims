import { Fragment, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-aria-components";
import { EmptyState } from "@/components/EmptyState";
import { Page, PageHeader } from "@/components/Page";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import type { SessionInfo } from "@/generated/SessionInfo";
import { CURRENT_SESSION, useCommandQuery } from "@/lib/commands";
import {
  type ChangeEntry,
  type ChangeGroup,
  changeGroups,
  groupEntries,
  isUnread,
  markAllSeen,
  readSeen,
} from "./changelog";
import styles from "./WhatsNew.module.css";

const TYPE_LABELS: Record<ChangeEntry["type"], string> = {
  added: "Added",
  changed: "Changed",
  fixed: "Fixed",
  removed: "Removed",
  deprecated: "Deprecated",
  security: "Security",
};

/**
 * What's new: every change recorded in `changelog.d/`, in the groups and order of
 * CHANGELOG.md. Opening it marks the list as seen for this account on this computer; entries
 * that were new when it opened keep a "New" badge until the person leaves.
 */
export function WhatsNewPage({ groups = changeGroups }: { groups?: readonly ChangeGroup[] }) {
  const userId = useCommandQuery<SessionInfo | null>(CURRENT_SESSION).data?.userId;
  // What this person had seen before this visit; `undefined` until the session is known.
  const [seenAtOpen, setSeenAtOpen] = useState<string | null>();
  useEffect(() => {
    if (!userId) return;
    const before = readSeen(userId);
    // A repeated effect (StrictMode) keeps the first reading, taken before anything was marked.
    setSeenAtOpen((current) => (current === undefined ? before : current));
    markAllSeen(userId, groupEntries(groups));
  }, [userId, groups]);
  return (
    <Page>
      <PageHeader
        title="What's new"
        description="Changes to this app, newest release first. Within a release, the changes with the most effect on your work come first."
      />
      {groups.length === 0 ? (
        <EmptyState title="No changes are recorded yet" />
      ) : (
        groups.map((group) => (
          <Section key={group.release ?? "unreleased"} title={<GroupTitle group={group} />}>
            {group.impacts.map(({ impact, entries }) => (
              <Fragment key={impact}>
                <h3 className={styles.impact}>{IMPACT_HEADINGS[impact]}</h3>
                <ul className={styles.entries}>
                  {entries.map((entry) => (
                    <Entry
                      key={entry.id}
                      entry={entry}
                      isNew={isUnread(entry, seenAtOpen ?? null)}
                    />
                  ))}
                </ul>
              </Fragment>
            ))}
          </Section>
        ))
      )}
    </Page>
  );
}

const IMPACT_HEADINGS = { high: "High impact", medium: "Medium impact", low: "Low impact" };

function GroupTitle({ group }: { group: ChangeGroup }) {
  const range = group.from === group.to ? group.from : `${group.from} to ${group.to}`;
  return (
    <>
      {group.release ? `Version ${group.release}` : "Unreleased"}
      <span className={styles.range}>{range}</span>
    </>
  );
}

function Entry({ entry, isNew }: { entry: ChangeEntry; isNew: boolean }) {
  return (
    <li className={styles.entry}>
      <h4 className={styles.title}>{entry.title}</h4>
      <div className={styles.meta}>
        <span className={styles.type}>{TYPE_LABELS[entry.type]}</span>
        <span>{entry.date}</span>
        {entry.area && <span>{entry.area}</span>}
        {entry.pr !== undefined && <span>Pull request #{entry.pr}</span>}
        {isNew && <StatusBadge tone="info">New</StatusBadge>}
      </div>
      {paragraphs(entry.summary).map((text) => (
        <p key={text} className={styles.text}>
          {inline(text)}
        </p>
      ))}
      {entry.link && (
        <Link href={entry.link} aria-label={`Go to the page: ${entry.title}`}>
          Go to the page
        </Link>
      )}
      {entry.notes && (
        <details className={styles.notes}>
          <summary>Technical notes</summary>
          {paragraphs(entry.notes).map((text) => (
            <p key={text}>{inline(text)}</p>
          ))}
        </details>
      )}
    </li>
  );
}

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((part) => part.trim());
}

/** Entries are plain text with `**bold**` and `` `code` `` marks; nothing renders as HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, index) => {
    // The split keeps each mark at an odd index, so the index identifies the part.
    const key = `${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
