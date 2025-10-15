import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { summarizeSellerGroupVisibility } from '@/hooks/use-shopping-lists';
import type { ShoppingListConceptLine, ShoppingListSellerGroup } from '@/types/shopping-lists';
import { ReadyLineRow } from './ready-line-row';
import { LINE_TABLE_WIDTHS } from '../table-layout';
import { SellerGroupOrderNoteDialog } from './seller-group-order-note-dialog';

interface SellerGroupCardProps {
  listId: number;
  group: ShoppingListSellerGroup;
  onOpenOrderLine: (line: ShoppingListConceptLine, trigger?: HTMLElement | null) => void;
  onOpenOrderGroup: (group: ShoppingListSellerGroup, trigger?: HTMLElement | null) => void;
  onRevertLine: (line: ShoppingListConceptLine) => void;
  onEditLine: (line: ShoppingListConceptLine) => void;
  onUpdateStock: (line: ShoppingListConceptLine, trigger?: HTMLElement | null) => void;
  pendingLineIds: Set<number>;
  highlightedLineId?: number | null;
  canBulkOrder: boolean;
  isCompleted: boolean;
}

export function SellerGroupCard({
  listId,
  group,
  onOpenOrderLine,
  onOpenOrderGroup,
  onRevertLine,
  onEditLine,
  onUpdateStock,
  pendingLineIds,
  highlightedLineId,
  canBulkOrder,
  isCompleted,
}: SellerGroupCardProps) {
  const visibility = useMemo(() => summarizeSellerGroupVisibility(group), [group]);
  const { visibleTotals, filteredDiff } = visibility;
  const showFilterNote = filteredDiff > 0;

  const readyLines = group.lines;
  const hasOrderableLines = readyLines.some(line => line.status !== 'done');
  const note = group.orderNote?.trim() ?? '';
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const showActions = !isCompleted;
  const showEditGroup = showActions && group.sellerId != null;

  return (
    <div
      className="rounded-lg border border-border bg-card shadow-sm"
      data-testid={`shopping-lists.ready.group.card.${group.groupKey}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground" data-testid={`shopping-lists.ready.group.${group.groupKey}.name`}>
            {group.sellerName}
          </h3>
          {group.sellerWebsite ? (
            <a
              href={group.sellerWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {group.sellerWebsite}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No website on file</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex flex-col text-right">
            <span className="text-xs uppercase tracking-wide">Needed</span>
            <span className="font-semibold text-foreground" data-testid={`shopping-lists.ready.group.${group.groupKey}.totals.needed`}>
              {visibleTotals.needed}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs uppercase tracking-wide">Ordered</span>
            <span className="font-semibold text-foreground" data-testid={`shopping-lists.ready.group.${group.groupKey}.totals.ordered`}>
              {visibleTotals.ordered}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs uppercase tracking-wide">Received</span>
            <span className="font-semibold text-foreground" data-testid={`shopping-lists.ready.group.${group.groupKey}.totals.received`}>
              {visibleTotals.received}
            </span>
          </div>
          {showActions && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="ml-4"
                disabled={!hasOrderableLines || !canBulkOrder}
                onClick={(event) => onOpenOrderGroup(group, event.currentTarget as HTMLElement)}
                title="Set ordered quantities for every line in this group"
                data-testid={`shopping-lists.ready.group.${group.groupKey}.order-group`}
              >
                Mark group as Ordered
              </Button>
              {showEditGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNoteDialogOpen(true)}
                  data-testid={`shopping-lists.ready.group.${group.groupKey}.edit`}
                >
                  Edit Group
                </Button>
              )}
            </div>
          )}
        </div>
        {showFilterNote && (
          <div
            className="w-full text-right text-xs text-muted-foreground"
            data-testid="shopping-lists.ready.group.filter-note"
          >
            Showing filtered totals; original: {filteredDiff} more
          </div>
        )}
      </div>

      {note && (
        <div className="border-b px-4 py-4 text-sm text-muted-foreground" data-testid={`shopping-lists.ready.group.${group.groupKey}.order-note`}>
          <div className="font-medium text-foreground">Order note</div>
          <p className="mt-2 whitespace-pre-wrap">{note}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse" data-testid={`shopping-lists.ready.group.${group.groupKey}.lines`}>
          <thead>
            <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <th className={`${LINE_TABLE_WIDTHS.part} px-4 py-2 text-left`}>Part</th>
              <th className={`${LINE_TABLE_WIDTHS.needed} px-4 py-2 text-right`}>Needed</th>
              <th className={`${LINE_TABLE_WIDTHS.ordered} px-4 py-2 text-right`}>Ordered</th>
              <th className={`${LINE_TABLE_WIDTHS.received} px-4 py-2 text-right`}>Received</th>
              <th className={`${LINE_TABLE_WIDTHS.note} px-4 py-2 text-left`}>Note</th>
              <th className={`${LINE_TABLE_WIDTHS.status} px-4 py-2 text-center`}>Status</th>
              <th className={`${LINE_TABLE_WIDTHS.actions} px-4 py-2 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {readyLines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-sm text-muted-foreground">
                  No lines remain for this seller group.
                </td>
              </tr>
            ) : (
              readyLines.map(line => (
                <ReadyLineRow
                  key={line.id}
                  line={line}
                  onOpenOrderDialog={onOpenOrderLine}
                  onRevertLine={onRevertLine}
                  onEditLine={onEditLine}
                  onUpdateStock={onUpdateStock}
                  highlight={highlightedLineId === line.id}
                  disabled={pendingLineIds.has(line.id)}
                  readOnly={isCompleted}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <SellerGroupOrderNoteDialog
        open={noteDialogOpen}
        listId={listId}
        group={group}
        onClose={() => setNoteDialogOpen(false)}
      />
    </div>
  );
}
