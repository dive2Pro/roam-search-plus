import fs from "node:fs";
import path from "node:path";

import { queryBaseline } from "../src/search-index-baseline.mjs";

const token = process.env.ROAM_LOCAL_API_TOKEN;
const graph = process.env.ROAM_GRAPH || "thoughtfull";
const outputPath =
  process.env.ROAM_FIXTURE_PATH ||
  path.resolve(process.cwd(), "tests/fixtures/roam-local-api-fixture.json");

if (!token) {
  throw new Error("ROAM_LOCAL_API_TOKEN is required");
}

const apiUrl = `http://127.0.0.1:3333/api/${graph}`;

const queryApi = async (query) => {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "data.q",
      args: [query],
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(JSON.stringify(json));
  }

  return json.result;
};

const pages = await queryApi(`[:find [(pull ?e [:block/uid :node/title {:block/refs [:db/id]}]) ...]
  :where [?e :node/title]]`);

const blocks = await queryApi(`[:find (pull ?e [:block/uid :block/string {:block/refs [:db/id]} {:block/parents [:db/id]}]) ?pageUid
  :where [?e :block/page ?p]
         [?p :block/uid ?pageUid]]`);

const pageEntries = pages.map((page) => ({
  id: page.uid,
  page: page.uid,
  text: page.title || "",
  normalizedText: (page.title || "").toLowerCase(),
  isPage: true,
  refIds: (page.refs || []).map((ref) => ref.id),
  parentRefIds: [],
}));

const blockEntries = blocks
  .filter(([block]) => !!block?.string)
  .map(([block, pageUid]) => ({
    id: block.uid,
    page: pageUid,
    text: block.string || "",
    normalizedText: (block.string || "").toLowerCase(),
    isPage: false,
    refIds: (block.refs || []).map((ref) => ref.id),
    parentRefIds: (block.parents || []).map((parent) => parent.id),
  }));

const allEntries = [...pageEntries, ...blockEntries];

const englishTokens = (text) =>
  (text.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || []).filter((token) => token.length >= 3);

const chineseTokens = (text) =>
  [...new Set((text.match(/[\u4e00-\u9fa5]{1,2}/g) || []).filter((token) => token.trim().length > 0))];

const byPage = new Map();
for (const entry of blockEntries) {
  if (!byPage.has(entry.page)) {
    byPage.set(entry.page, []);
  }
  byPage.get(entry.page).push(entry);
}

const findDirectPageScenario = () => {
  for (const page of pageEntries) {
    const token = englishTokens(page.text)[0];
    if (!token) {
      continue;
    }

    return {
      name: "real-direct-page",
      options: {
        keywords: [token],
        caseSensitive: false,
        matchWholeWord: true,
      },
      entries: [page],
    };
  }
  return null;
};

const findDistributedScenario = () => {
  for (const [pageUid, entries] of byPage.entries()) {
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const left = entries[leftIndex];
        const right = entries[rightIndex];
        const leftTokens = englishTokens(left.text);
        const rightTokens = englishTokens(right.text);

        const leftOnlyToken = leftTokens.find(
          (token) => !rightTokens.includes(token) && !right.text.toLowerCase().includes(token),
        );
        const rightOnlyToken = rightTokens.find(
          (token) => !leftTokens.includes(token) && !left.text.toLowerCase().includes(token),
        );

        if (!leftOnlyToken || !rightOnlyToken) {
          continue;
        }

        const page = pageEntries.find((entry) => entry.id === pageUid);
        if (!page) {
          continue;
        }

        return {
          name: "real-distributed-keywords",
          options: {
            keywords: [leftOnlyToken, rightOnlyToken],
            caseSensitive: false,
            matchWholeWord: true,
          },
          entries: [page, left, right],
        };
      }
    }
  }
  return null;
};

const findTripleDistributedScenario = () => {
  for (const [pageUid, entries] of byPage.entries()) {
    for (let firstIndex = 0; firstIndex < entries.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < entries.length; secondIndex += 1) {
        for (let thirdIndex = secondIndex + 1; thirdIndex < entries.length; thirdIndex += 1) {
          const first = entries[firstIndex];
          const second = entries[secondIndex];
          const third = entries[thirdIndex];

          const firstTokens = englishTokens(first.text);
          const secondTokens = englishTokens(second.text);
          const thirdTokens = englishTokens(third.text);

          const firstOnlyToken = firstTokens.find(
            (token) =>
              !secondTokens.includes(token) &&
              !thirdTokens.includes(token) &&
              !second.text.toLowerCase().includes(token) &&
              !third.text.toLowerCase().includes(token),
          );
          const secondOnlyToken = secondTokens.find(
            (token) =>
              !firstTokens.includes(token) &&
              !thirdTokens.includes(token) &&
              !first.text.toLowerCase().includes(token) &&
              !third.text.toLowerCase().includes(token),
          );
          const thirdOnlyToken = thirdTokens.find(
            (token) =>
              !firstTokens.includes(token) &&
              !secondTokens.includes(token) &&
              !first.text.toLowerCase().includes(token) &&
              !second.text.toLowerCase().includes(token),
          );

          if (!firstOnlyToken || !secondOnlyToken || !thirdOnlyToken) {
            continue;
          }

          const page = pageEntries.find((entry) => entry.id === pageUid);
          if (!page) {
            continue;
          }

          return {
            name: "real-distributed-keywords-three-blocks",
            options: {
              keywords: [firstOnlyToken, secondOnlyToken, thirdOnlyToken],
              caseSensitive: false,
              matchWholeWord: true,
            },
            entries: [page, first, second, third],
          };
        }
      }
    }
  }
  return null;
};

const findDirectBlockScenario = () => {
  for (const entry of blockEntries) {
    const token = englishTokens(entry.text)[0];
    if (!token) {
      continue;
    }

    const page = pageEntries.find((candidate) => candidate.id === entry.page);
    if (!page) {
      continue;
    }

    return {
      name: "real-direct-block",
      options: {
        keywords: [token],
        caseSensitive: false,
        matchWholeWord: true,
      },
      entries: [page, entry],
    };
  }
  return null;
};

const findChineseScenario = () => {
  for (const entry of blockEntries) {
    const token = chineseTokens(entry.text).find((candidate) => candidate.length >= 1);
    if (!token) {
      continue;
    }

    const page = pageEntries.find((candidate) => candidate.id === entry.page);
    if (!page) {
      continue;
    }

    return {
      name: "real-chinese-keyword",
      options: {
        keywords: [token],
        caseSensitive: false,
        matchWholeWord: true,
      },
      entries: [page, entry],
    };
  }
  return null;
};

const findEmptyKeywordIncludePageScenario = () => {
  for (const [pageUid, entries] of byPage.entries()) {
    if (!entries.length) {
      continue;
    }

    const page = pageEntries.find((candidate) => candidate.id === pageUid);
    if (!page) {
      continue;
    }

    return {
      name: "real-empty-keywords-include-page",
      options: {
        keywords: [],
        caseSensitive: false,
        matchWholeWord: true,
        includePages: [pageUid],
      },
      entries: [page, ...entries.slice(0, 2)],
    };
  }
  return null;
};

const findExcludeTagScenario = () => {
  for (const entry of blockEntries) {
    const tagId = entry.refIds[0] || entry.parentRefIds[0];
    const token = englishTokens(entry.text)[0] || chineseTokens(entry.text)[0];

    if (!tagId || !token) {
      continue;
    }

    const sibling = blockEntries.find(
      (candidate) =>
        candidate.page === entry.page &&
        candidate.id !== entry.id &&
        !candidate.refIds.includes(tagId) &&
        !candidate.parentRefIds.includes(tagId) &&
        ((englishTokens(candidate.text)[0] && englishTokens(candidate.text)[0] !== token) ||
          chineseTokens(candidate.text)[0]),
    );

    const page = pageEntries.find((candidate) => candidate.id === entry.page);
    if (!page) {
      continue;
    }

    return {
      name: "real-exclude-tag",
      options: {
        keywords: [token],
        caseSensitive: false,
        matchWholeWord: true,
        excludeTags: [tagId],
      },
      entries: sibling ? [page, entry, sibling] : [page, entry],
    };
  }
  return null;
};

const findMatchWholeWordScenario = () => {
  for (const entry of blockEntries) {
    const token = englishTokens(entry.text).find((candidate) => candidate.length >= 4);
    if (!token) {
      continue;
    }

    const substring = token.slice(1, Math.max(2, token.length - 1));
    if (substring.length < 2 || entry.text.toLowerCase() === substring) {
      continue;
    }

    const page = pageEntries.find((candidate) => candidate.id === entry.page);
    if (!page) {
      continue;
    }

    return {
      name: "real-match-whole-word-toggle",
      options: {
        keywords: [substring],
        caseSensitive: false,
        matchWholeWord: false,
      },
      alternateOptions: {
        keywords: [substring],
        caseSensitive: false,
        matchWholeWord: true,
      },
      entries: [page, entry],
    };
  }
  return null;
};

const findCaseSensitiveScenario = () => {
  for (const entry of blockEntries) {
    const token = englishTokens(entry.text).find(
      (candidate) => candidate !== candidate.toLowerCase() || entry.text.includes(candidate[0].toUpperCase()),
    );

    if (!token) {
      continue;
    }

    const lowered = token.toLowerCase();
    if (lowered === token && !/[A-Z]/.test(entry.text)) {
      continue;
    }

    const page = pageEntries.find((candidate) => candidate.id === entry.page);
    if (!page) {
      continue;
    }

    return {
      name: "real-case-sensitive-toggle",
      options: {
        keywords: [lowered],
        caseSensitive: false,
        matchWholeWord: true,
      },
      alternateOptions: {
        keywords: [lowered],
        caseSensitive: true,
        matchWholeWord: true,
      },
      entries: [page, entry],
    };
  }
  return null;
};

const findExcludePageScenario = () => {
  for (const [pageUid, entries] of byPage.entries()) {
    const entry = entries.find((candidate) => englishTokens(candidate.text)[0] || chineseTokens(candidate.text)[0]);
    if (!entry) {
      continue;
    }

    const keyword = englishTokens(entry.text)[0] || chineseTokens(entry.text)[0];
    const page = pageEntries.find((candidate) => candidate.id === pageUid);
    if (!page) {
      continue;
    }

    return {
      name: "real-exclude-page",
      options: {
        keywords: [keyword],
        caseSensitive: false,
        matchWholeWord: true,
        excludePages: [pageUid],
      },
      entries: [page, entry],
    };
  }
  return null;
};

const findIncludeExcludeTagScenario = () => {
  for (const [pageUid, entries] of byPage.entries()) {
    const keep = entries.find((entry) => entry.refIds.length >= 1);
    const drop = entries.find(
      (entry) =>
        entry.id !== keep?.id &&
        entry.refIds.length >= 2 &&
        keep &&
        entry.refIds.includes(keep.refIds[0]),
    );

    if (!keep || !drop) {
      continue;
    }

    const keyword = englishTokens(keep.text)[0] || chineseTokens(keep.text)[0];
    if (!keyword) {
      continue;
    }

    const page = pageEntries.find((candidate) => candidate.id === pageUid);
    if (!page) {
      continue;
    }

    return {
      name: "real-include-exclude-tags",
      options: {
        keywords: [keyword],
        caseSensitive: false,
        matchWholeWord: true,
        includeTags: [keep.refIds[0]],
        excludeTags: [drop.refIds[1]],
      },
      entries: [page, keep, drop],
    };
  }
  return null;
};

const findParentTagDistributedScenario = () => {
  for (const [pageUid, entries] of byPage.entries()) {
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const left = entries[leftIndex];
        const right = entries[rightIndex];
        const sharedParentTag = left.parentRefIds.find((tagId) => right.parentRefIds.includes(tagId));

        if (!sharedParentTag) {
          continue;
        }

        const leftTokens = englishTokens(left.text);
        const rightTokens = englishTokens(right.text);
        const leftOnlyToken = leftTokens.find(
          (token) => !rightTokens.includes(token) && !right.text.toLowerCase().includes(token),
        );
        const rightOnlyToken = rightTokens.find(
          (token) => !leftTokens.includes(token) && !left.text.toLowerCase().includes(token),
        );

        if (!leftOnlyToken || !rightOnlyToken) {
          continue;
        }

        const page = pageEntries.find((candidate) => candidate.id === pageUid);
        if (!page) {
          continue;
        }

        return {
          name: "real-parent-tag-distributed-keywords",
          options: {
            keywords: [leftOnlyToken, rightOnlyToken],
            caseSensitive: false,
            matchWholeWord: true,
            includeTags: [sharedParentTag],
          },
          entries: [page, left, right],
        };
      }
    }
  }
  return null;
};

const scenarios = [
  findDirectPageScenario(),
  findDirectBlockScenario(),
  findDistributedScenario(),
  findTripleDistributedScenario(),
  findChineseScenario(),
  findEmptyKeywordIncludePageScenario(),
  findExcludeTagScenario(),
  findMatchWholeWordScenario(),
  findCaseSensitiveScenario(),
  findExcludePageScenario(),
  findIncludeExcludeTagScenario(),
  findParentTagDistributedScenario(),
].filter(Boolean);

if (scenarios.length === 0) {
  throw new Error("Could not derive any fixture scenarios from the current graph");
}

const output = {
  generatedAt: new Date().toISOString(),
  graph,
  scenarios: scenarios.map((scenario) => ({
    ...scenario,
    expected: queryBaseline(scenario.entries, scenario.options),
    alternateExpected: scenario.alternateOptions
      ? queryBaseline(scenario.entries, scenario.alternateOptions)
      : undefined,
  })),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${output.scenarios.length} scenarios to ${outputPath}`);
