import {
  createPaginatedResult,
  parsePaginationInput,
} from "@/lib/pagination";

describe("pagination", () => {
  it("applies defaults and reports an additional page", () => {
    const query = parsePaginationInput();
    const rows = Array.from({ length: 21 }, (_, index) => index);

    expect(createPaginatedResult(rows, query)).toEqual({
      items: rows.slice(0, 20),
      pagination: { page: 1, pageSize: 20, hasNext: true },
    });
  });

  it("preserves a short final page", () => {
    const query = parsePaginationInput({ page: 3, pageSize: 2 });

    expect(createPaginatedResult(["last"], query)).toEqual({
      items: ["last"],
      pagination: { page: 3, pageSize: 2, hasNext: false },
    });
  });

  it("rejects invalid page input", () => {
    expect(() => parsePaginationInput({ page: 0 })).toThrow();
    expect(() => parsePaginationInput({ pageSize: 51 })).toThrow();
  });
});