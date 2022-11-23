export const findAllRelatedBlocksInPages = (generator: {
  find(): string;
  where(): string;
  pages: string[];
}) => {
  return window.roamAlphaAPI.q(
    `[
  :find ${generator.find()} ?page
  :in $ % [?page ...]
  :where
    
    [?ancestor :block/uid ?page]
    ${generator.where()}
  ]`,
    // ancestorrule,
    generator.pages
  );
};



const findAllParentsUidsByBlockUid = (uid: string) => {
  return window.roamAlphaAPI.q(
    `
    [
     :find [?e ...]
     :where
       [?b :block/uid "${uid}"]
       [?b :block/parents ?p]
       [?p :block/uid ?e]
    ]
    `
  ) as unknown as string[];
};


const getParentsInfoOfBlockUid = (uid: string) => {
  const result = window.roamAlphaAPI.data.fast
    .q(
      `[:find (pull ?p [:block/uid :block/string :node/title]) :where [?b :block/uid "${uid}"] [?b :block/parents ?p] ]`
    )
    .map((item) => item[0]);
  return result as {
    ":block/uid": string;
    ":block/string": string;
    ":node/title": string;
  }[];
};

