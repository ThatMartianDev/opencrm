import { z } from "zod";

const paginationInputSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export type PaginationInput = Partial<z.input<typeof paginationInputSchema>>;
export type PaginationQuery = z.output<typeof paginationInputSchema>;

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationQuery & {
    hasNext: boolean;
  };
};

export function parsePaginationInput(input?: PaginationInput): PaginationQuery {
  return paginationInputSchema.parse(input ?? {});
}

export function createPaginatedResult<T>(
  rows: T[],
  query: PaginationQuery,
): PaginatedResult<T> {
  return {
    items: rows.slice(0, query.pageSize),
    pagination: {
      ...query,
      hasNext: rows.length > query.pageSize,
    },
  };
}