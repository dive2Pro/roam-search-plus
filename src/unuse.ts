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



