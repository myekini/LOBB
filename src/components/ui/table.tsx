import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LOBB data table primitives. Design-system-native (uses --lobb-* tokens and
 * @base-ui-style slots — not shadcn colours). `Table` provides its own
 * horizontal-scroll container so wide tables never push the page sideways.
 *
 *   <Table>
 *     <TableHeader><TableRow><TableHead>Name</TableHead>…</TableRow></TableHeader>
 *     <TableBody>{rows.map(r => <TableRow key={r.id}>…</TableRow>)}</TableBody>
 *   </Table>
 */
export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto overflow-y-hidden rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
      <table
        ref={ref}
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    data-slot="table-header"
    className={cn("border-b border-[var(--lobb-border-subtle)]", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    data-slot="table-body"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    data-slot="table-row"
    className={cn(
      "border-b border-[var(--lobb-border-subtle)] transition-colors hover:bg-[var(--lobb-bg-secondary)]/60 data-[state=selected]:bg-[var(--lobb-bg-secondary)]",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    data-slot="table-head"
    className={cn(
      "h-11 whitespace-nowrap px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--lobb-text-tertiary)]",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    data-slot="table-cell"
    className={cn("px-4 py-3 align-middle text-sm text-[var(--lobb-text-primary)]", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";
