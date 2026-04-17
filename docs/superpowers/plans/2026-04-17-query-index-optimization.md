# Query Index Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repeated full-scan keyword matching with an indexed query path that reduces total search work while preserving progressive result delivery.

**Architecture:** Build a pure search-index module that preprocesses searchable text, token metadata, and filterable relationships for pages and blocks. Integrate that index into cache initialization so queries can intersect candidate sets first, then run exact matching and related-result expansion only on narrowed candidates.

**Tech Stack:** TypeScript, Node built-in test runner, Roam Alpha API cache layer, existing bundle build via `roamjs-scripts`

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-17-query-index-optimization.md`
- Create: `src/search-index.ts`
- Create: `src/search-index.test.mjs`
- Modify: `src/roam.ts`
- Modify: `src/query.ts`
- Modify: `package.json`

### Task 1: Add testable search-index primitives

**Files:**
- Create: `src/search-index.ts`
- Test: `src/search-index.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createSearchIndex, querySearchIndex } from "./search-index.js";

test("querySearchIndex intersects token candidates before exact matching", () => {
  const index = createSearchIndex([
    { id: "p1", page: "p1", text: "alpha beta", normalizedText: "alpha beta", isPage: true, refIds: [], parentRefIds: [] },
    { id: "b1", page: "p1", text: "alpha gamma", normalizedText: "alpha gamma", isPage: false, refIds: [], parentRefIds: [] },
    { id: "b2", page: "p2", text: "beta gamma", normalizedText: "beta gamma", isPage: false, refIds: [], parentRefIds: [] },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta"],
    caseSensitive: false,
    matchWholeWord: true,
  });

  assert.deepEqual(result.directMatches.sort(), ["p1"]);
  assert.equal(result.candidateIds.includes("b2"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/search-index.test.mjs`
Expected: FAIL with module-not-found or missing export errors for `search-index.js`

- [ ] **Step 3: Write minimal implementation**

```ts
export type SearchIndexEntry = {
  id: string;
  page: string;
  text: string;
  normalizedText: string;
  isPage: boolean;
  refIds: number[];
  parentRefIds: number[];
};

export function createSearchIndex(entries: SearchIndexEntry[]) {
  return { entries };
}

export function querySearchIndex() {
  return { directMatches: [], candidateIds: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/search-index.test.mjs`
Expected: PASS for the new search-index test

- [ ] **Step 5: Commit**

```bash
git add src/search-index.ts src/search-index.test.mjs package.json
git commit -m "test: add indexed query primitives"
```

### Task 2: Build index metadata from Roam cache

**Files:**
- Modify: `src/roam.ts`
- Modify: `src/search-index.ts`
- Test: `src/search-index.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test("createSearchIndex tracks page and tag relationships for filtering", () => {
  const index = createSearchIndex([
    { id: "b1", page: "p1", text: "alpha", normalizedText: "alpha", isPage: false, refIds: [1, 2], parentRefIds: [3] },
    { id: "b2", page: "p2", text: "beta", normalizedText: "beta", isPage: false, refIds: [2], parentRefIds: [] },
  ]);

  assert.deepEqual([...index.byPage.get("p1")], ["b1"]);
  assert.deepEqual([...index.byRef.get(3)], ["b1"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/search-index.test.mjs`
Expected: FAIL because `byPage` / `byRef` are not built yet

- [ ] **Step 3: Write minimal implementation**

```ts
const appendToSetMap = <TKey, TValue>(map: Map<TKey, Set<TValue>>, key: TKey, value: TValue) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
};
```

Add `byPage`, `byRef`, and token maps while building the index, and expose getters in `src/roam.ts` for the active index.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/search-index.test.mjs`
Expected: PASS for the relationship assertions

- [ ] **Step 5: Commit**

```bash
git add src/roam.ts src/search-index.ts src/search-index.test.mjs
git commit -m "feat: build searchable cache index"
```

### Task 3: Route query execution through the index

**Files:**
- Modify: `src/query.ts`
- Modify: `src/roam.ts`
- Test: `src/search-index.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test("querySearchIndex applies page and tag filters after candidate narrowing", () => {
  const index = createSearchIndex([
    { id: "b1", page: "page-a", text: "alpha beta", normalizedText: "alpha beta", isPage: false, refIds: [10], parentRefIds: [] },
    { id: "b2", page: "page-b", text: "alpha beta", normalizedText: "alpha beta", isPage: false, refIds: [20], parentRefIds: [] },
  ]);

  const result = querySearchIndex(index, {
    keywords: ["alpha", "beta"],
    caseSensitive: false,
    matchWholeWord: true,
    includePages: ["page-b"],
    includeTags: [20],
  });

  assert.deepEqual(result.directMatches, ["b2"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/search-index.test.mjs`
Expected: FAIL because include filters are not enforced in query results

- [ ] **Step 3: Write minimal implementation**

```ts
const applyEntryFilters = (entry, options) => {
  if (options.includePages?.length && !options.includePages.includes(entry.page)) return false;
  if (options.includeTags?.length && !options.includeTags.some((tagId) => entry.allRefIds.has(tagId))) return false;
  return true;
};
```

Update `Query` so it:
- pulls candidate ids from the index
- maps direct page/block matches without re-scanning all cached blocks
- computes related blocks from indexed page buckets
- preserves `queryResult.setResult` / `pushToResult` progressive updates

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/search-index.test.mjs`
Expected: PASS for all indexed query behaviors

- [ ] **Step 5: Commit**

```bash
git add src/query.ts src/roam.ts src/search-index.ts src/search-index.test.mjs
git commit -m "feat: route search through cache index"
```

### Task 4: Verify build and integration behavior

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add verification command**

```json
{
  "scripts": {
    "test": "node --test src/search-index.test.mjs",
    "build-web": "roamjs-scripts build",
    "build": "roamjs-scripts build --depot",
    "dev": "roamjs-scripts dev --depot"
  }
}
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS with the indexed query tests green

- [ ] **Step 3: Run build**

Run: `npm run build-web`
Expected: Successful bundle build without TypeScript errors caused by the new index integration

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add indexed query verification"
```
