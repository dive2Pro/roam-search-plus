import workerize from "workerize";

import lib from "./woker.lib.js";

const woker = lib.toString().split("\n").slice(1, -1).join("\n").replaceAll("function woker_", `export function `)
// const str = Object.entries(lib)
//   .map(([key, value]) => {
//     if (typeof value === 'function') {
//       return `export ${value.toString()}`;
//     }
//     return JSON.stringify(value;
//   })
//   .join("\n");

console.log({  woker })
export const worker = workerize(`
${woker}  
`);
