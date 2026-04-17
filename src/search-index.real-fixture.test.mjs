import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { querySearchIndex, createSearchIndex } from "./search-index.mjs";

const fixturePath = new URL("../tests/fixtures/roam-local-api-fixture.json", import.meta.url);

test("real local-api fixtures stay aligned with expected search behavior", { skip: !fs.existsSync(fixturePath) }, () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

  for (const scenario of fixture.scenarios) {
    const index = createSearchIndex(scenario.entries);
    const result = querySearchIndex(index, scenario.options);

    assert.deepEqual(
      {
        directPageIds: [...result.directPageIds].sort(),
        directBlockIds: [...result.directBlockIds].sort(),
        relatedPageIds: [...result.relatedPageIds].sort(),
        partialByPage: Object.fromEntries(
          [...result.partialByPage.entries()].map(([pageUid, ids]) => [pageUid, [...ids].sort()]),
        ),
      },
      scenario.expected,
      scenario.name,
    );

    if (scenario.alternateOptions) {
      const alternateResult = querySearchIndex(index, scenario.alternateOptions);
      assert.deepEqual(
        {
          directPageIds: [...alternateResult.directPageIds].sort(),
          directBlockIds: [...alternateResult.directBlockIds].sort(),
          relatedPageIds: [...alternateResult.relatedPageIds].sort(),
          partialByPage: Object.fromEntries(
            [...alternateResult.partialByPage.entries()].map(([pageUid, ids]) => [
              pageUid,
              [...ids].sort(),
            ]),
          ),
        },
        scenario.alternateExpected,
        `${scenario.name}:alternate`,
      );
    }
  }
});
