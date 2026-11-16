import { FindField } from "@/components/FindField";
import { ListCount } from "@/components/ListLimit";
import { RefreshControl } from "@/components/RefreshControl";
import { Select } from "@/components/Select";
import { Toolbar } from "@/components/Toolbar";
import type { IntakeDeferralPage } from "@/generated/IntakeDeferralPage";
import type { IntakeShow } from "@/generated/IntakeShow";
import { useCursorPages } from "@/lib/useCursorPages";
import { showOptions } from "./intakeLabels";

/** The engine's page size for intake. */
const PAGE_SIZE = 50;

/**
 * The intake the engine finds by `search` and filters by `show`, page by page, oldest first;
 * every page carries the counts by state for the same find text.
 */
export function useIntakePages(show: IntakeShow, search: string | null) {
  return useCursorPages<IntakeDeferralPage>("list_intake_deferrals", {
    key: { show, search },
    pageArgs: (afterId) => ({ input: { show, search, afterId: afterId ?? null } }),
    nextCursor: (page) => (page.rows.length === PAGE_SIZE ? page.rows.at(-1)?.intakeId : undefined),
  });
}

interface IntakeToolbarProps {
  query: ReturnType<typeof useIntakePages>;
  search: string;
  onSearch: (text: string) => void;
  show: IntakeShow;
  onShow: (show: string | null) => void;
}

/** Find, Show with the engine's counts, the count of loaded intake and Refresh. */
export function IntakeToolbar({ query, search, onSearch, show, onShow }: IntakeToolbarProps) {
  const pages = query.data?.pages;
  return (
    <Toolbar
      variant="collection"
      count={
        pages && (
          <ListCount
            shown={pages.reduce((total, page) => total + page.rows.length, 0)}
            noun="intake records"
            one="intake record"
            hasMore={query.hasNextPage}
          />
        )
      }
      actions={<RefreshControl query={query} />}
    >
      <FindField
        label="Find intake by name as supplied or source reference"
        placeholder="Name or source reference"
        isLabelHidden
        value={search}
        onChange={onSearch}
      />
      <Select
        label="Show"
        name="show"
        options={showOptions(pages?.[0]?.counts)}
        value={show}
        onChange={onShow}
      />
    </Toolbar>
  );
}
