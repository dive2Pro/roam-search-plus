import test from "node:test";
import assert from "node:assert/strict";

import { createSearchIndex, querySearchIndex } from "./search-index.mjs";

test("querySearchIndex intersects token candidates before exact matching", () => {
  const index = createSearchIndex([
    {
      id: "p1",
      page: "p1",
      text: "alpha beta",
      normalizedText: "alpha beta",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "b1",
      page: "p1",
      text: "alpha gamma",
      normalizedText: "alpha gamma",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "b2",
      page: "p2",
      text: "beta gamma",
      normalizedText: "beta gamma",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta"],
    caseSensitive: false,
    matchWholeWord: true,
  });

  assert.deepEqual(result.directPageIds, ["p1"]);
  assert.equal(result.directCandidateIds.includes("b2"), false);
});

test("createSearchIndex tracks page and tag relationships for filtering", () => {
  const index = createSearchIndex([
    {
      id: "b1",
      page: "p1",
      text: "alpha",
      normalizedText: "alpha",
      isPage: false,
      refIds: [1, 2],
      parentRefIds: [3],
    },
    {
      id: "b2",
      page: "p2",
      text: "beta",
      normalizedText: "beta",
      isPage: false,
      refIds: [2],
      parentRefIds: [],
    },
  ]);

  assert.deepEqual([...index.byPage.get("p1")], ["b1"]);
  assert.deepEqual([...index.byRef.get(3)], ["b1"]);
});

test("querySearchIndex applies page and tag filters after candidate narrowing", () => {
  const index = createSearchIndex([
    {
      id: "b1",
      page: "page-a",
      text: "alpha beta",
      normalizedText: "alpha beta",
      isPage: false,
      refIds: [10],
      parentRefIds: [],
    },
    {
      id: "b2",
      page: "page-b",
      text: "alpha beta",
      normalizedText: "alpha beta",
      isPage: false,
      refIds: [20],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta"],
    caseSensitive: false,
    matchWholeWord: true,
    includePages: ["page-b"],
    includeTags: [20],
  });

  assert.deepEqual(result.directBlockIds, ["b2"]);
});

test("includeTags keeps parent-tag matches as related blocks instead of direct block hits", () => {
  const index = createSearchIndex([
    {
      id: "page-1",
      page: "page-1",
      text: "Project Notes",
      normalizedText: "project notes",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-1",
      page: "page-1",
      text: "alpha roadmap",
      normalizedText: "alpha roadmap",
      isPage: false,
      refIds: [],
      parentRefIds: [99],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha"],
    caseSensitive: false,
    matchWholeWord: true,
    includeTags: [99],
  });

  assert.deepEqual(result.directBlockIds, []);
  assert.deepEqual(result.relatedPageIds, ["page-1"]);
  assert.deepEqual([...result.partialByPage.get("page-1")], ["block-1"]);
});

test("distributed keywords across blocks still surface the page as a related result", () => {
  const index = createSearchIndex([
    {
      id: "page-2",
      page: "page-2",
      text: "Weekly Review",
      normalizedText: "weekly review",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-a",
      page: "page-2",
      text: "alpha planning",
      normalizedText: "alpha planning",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-b",
      page: "page-2",
      text: "beta recap",
      normalizedText: "beta recap",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta"],
    caseSensitive: false,
    matchWholeWord: true,
  });

  assert.deepEqual(result.directBlockIds, []);
  assert.deepEqual(result.relatedPageIds, ["page-2"]);
  assert.deepEqual([...result.partialByPage.get("page-2")].sort(), ["block-a", "block-b"]);
});

test("three keywords distributed across three blocks on the same page stay related", () => {
  const index = createSearchIndex([
    {
      id: "page-2b",
      page: "page-2b",
      text: "Quarterly Review",
      normalizedText: "quarterly review",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-a1",
      page: "page-2b",
      text: "alpha planning",
      normalizedText: "alpha planning",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-b1",
      page: "page-2b",
      text: "beta recap",
      normalizedText: "beta recap",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-c1",
      page: "page-2b",
      text: "gamma followup",
      normalizedText: "gamma followup",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta", "gamma"],
    caseSensitive: false,
    matchWholeWord: true,
  });

  assert.deepEqual(result.directBlockIds, []);
  assert.deepEqual(result.relatedPageIds, ["page-2b"]);
  assert.deepEqual([...result.partialByPage.get("page-2b")].sort(), [
    "block-a1",
    "block-b1",
    "block-c1",
  ]);
});

test("a direct block on a page does not turn sibling partial matches into a related page hit", () => {
  const index = createSearchIndex([
    {
      id: "page-2c",
      page: "page-2c",
      text: "Sprint Plan",
      normalizedText: "sprint plan",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-direct",
      page: "page-2c",
      text: "alpha beta summary",
      normalizedText: "alpha beta summary",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-partial",
      page: "page-2c",
      text: "alpha backlog",
      normalizedText: "alpha backlog",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta"],
    caseSensitive: false,
    matchWholeWord: true,
  });

  assert.deepEqual(result.directBlockIds, ["block-direct"]);
  assert.deepEqual(result.relatedPageIds, []);
  assert.deepEqual([...result.partialByPage.get("page-2c")], ["block-partial"]);
});

test("same-page distributed keyword matches still work when includeTags comes from parent refs", () => {
  const index = createSearchIndex([
    {
      id: "page-2d",
      page: "page-2d",
      text: "Tagged Review",
      normalizedText: "tagged review",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-left",
      page: "page-2d",
      text: "alpha planning",
      normalizedText: "alpha planning",
      isPage: false,
      refIds: [],
      parentRefIds: [77],
    },
    {
      id: "block-right",
      page: "page-2d",
      text: "beta recap",
      normalizedText: "beta recap",
      isPage: false,
      refIds: [],
      parentRefIds: [77],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta"],
    caseSensitive: false,
    matchWholeWord: true,
    includeTags: [77],
  });

  assert.deepEqual(result.directBlockIds, []);
  assert.deepEqual(result.relatedPageIds, ["page-2d"]);
  assert.deepEqual([...result.partialByPage.get("page-2d")].sort(), ["block-left", "block-right"]);
});

test("excludeTags removes both direct and related matches", () => {
  const index = createSearchIndex([
    {
      id: "page-3",
      page: "page-3",
      text: "Chinese Notes",
      normalizedText: "chinese notes",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-c",
      page: "page-3",
      text: "alpha beta",
      normalizedText: "alpha beta",
      isPage: false,
      refIds: [88],
      parentRefIds: [],
    },
    {
      id: "block-d",
      page: "page-3",
      text: "alpha only",
      normalizedText: "alpha only",
      isPage: false,
      refIds: [],
      parentRefIds: [88],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha"],
    caseSensitive: false,
    matchWholeWord: true,
    excludeTags: [88],
  });

  assert.deepEqual(result.directBlockIds, []);
  assert.deepEqual(result.relatedPageIds, []);
  assert.equal(result.partialByPage.size, 0);
});

test("empty keywords with includePages returns only the included page scope", () => {
  const index = createSearchIndex([
    {
      id: "page-a",
      page: "page-a",
      text: "Alpha Page",
      normalizedText: "alpha page",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "page-b",
      page: "page-b",
      text: "Beta Page",
      normalizedText: "beta page",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-e",
      page: "page-b",
      text: "some block",
      normalizedText: "some block",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: [],
    caseSensitive: false,
    matchWholeWord: true,
    includePages: ["page-b"],
  });

  assert.deepEqual(result.directPageIds, ["page-b"]);
  assert.deepEqual(result.directBlockIds, ["block-e"]);
});

test("matchWholeWord false matches substrings but true does not", () => {
  const index = createSearchIndex([
    {
      id: "block-f",
      page: "page-c",
      text: "cartwheel",
      normalizedText: "cartwheel",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const substringResult = querySearchIndex(index, {
    keywords: ["art"],
    caseSensitive: false,
    matchWholeWord: false,
  });
  const wholeWordResult = querySearchIndex(index, {
    keywords: ["art"],
    caseSensitive: false,
    matchWholeWord: true,
  });

  assert.deepEqual(substringResult.directBlockIds, ["block-f"]);
  assert.deepEqual(wholeWordResult.directBlockIds, []);
});

test("caseSensitive true distinguishes differently cased text", () => {
  const index = createSearchIndex([
    {
      id: "block-g",
      page: "page-d",
      text: "Roam",
      normalizedText: "roam",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const insensitive = querySearchIndex(index, {
    keywords: ["roam"],
    caseSensitive: false,
    matchWholeWord: true,
  });
  const sensitive = querySearchIndex(index, {
    keywords: ["roam"],
    caseSensitive: true,
    matchWholeWord: true,
  });

  assert.deepEqual(insensitive.directBlockIds, ["block-g"]);
  assert.deepEqual(sensitive.directBlockIds, []);
});

test("excludePages removes included content from both direct and related results", () => {
  const index = createSearchIndex([
    {
      id: "page-e",
      page: "page-e",
      text: "Target Page",
      normalizedText: "target page",
      isPage: true,
      refIds: [],
      parentRefIds: [],
    },
    {
      id: "block-h",
      page: "page-e",
      text: "alpha beta",
      normalizedText: "alpha beta",
      isPage: false,
      refIds: [],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha"],
    caseSensitive: false,
    matchWholeWord: true,
    excludePages: ["page-e"],
  });

  assert.deepEqual(result.directPageIds, []);
  assert.deepEqual(result.directBlockIds, []);
  assert.deepEqual(result.relatedPageIds, []);
});

test("includeTags and excludeTags together keep only surviving direct matches", () => {
  const index = createSearchIndex([
    {
      id: "block-i",
      page: "page-f",
      text: "alpha keep",
      normalizedText: "alpha keep",
      isPage: false,
      refIds: [11],
      parentRefIds: [],
    },
    {
      id: "block-j",
      page: "page-f",
      text: "alpha drop",
      normalizedText: "alpha drop",
      isPage: false,
      refIds: [11, 22],
      parentRefIds: [],
    },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha"],
    caseSensitive: false,
    matchWholeWord: true,
    includeTags: [11],
    excludeTags: [22],
  });

  assert.deepEqual(result.directBlockIds, ["block-i"]);
});
