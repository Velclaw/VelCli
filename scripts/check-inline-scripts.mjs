import {readFile} from "node:fs/promises";
import {Script} from "node:vm";

const file="apps/web/index.html";
const html=await readFile(file,"utf8");
const matches=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
if(matches.length===0)throw new Error(`No inline script found in ${file}`);
let checked=0;
for(let i=0;i<matches.length;i++){
 const attrs=matches[i][1]||"";
 const source=matches[i][2]||"";
 if(/\bsrc\s*=/i.test(attrs)||!source.trim())continue;
 new Script(source,{filename:`${file}#inline-script-${i+1}`});
 checked++;
}
if(checked===0)throw new Error(`No inline script checked in ${file}`);
console.log(`Inline JavaScript syntax passed: ${checked} script(s) in ${file}`);
