import fs from "node:fs/promises";
import path from "node:path";
import {exec} from "node:child_process";
import {promisify} from "node:util";
const sh=promisify(exec);
const root=path.resolve(process.env.VELCLI_WORKSPACE||process.cwd());
function safe(p:string){const x=path.resolve(root,p);if(x!==root&&!x.startsWith(root+path.sep))throw new Error("Path escapes workspace");return x}
const blocked=[/rm\s+-rf\s+\//i,/mkfs/i,/shutdown/i,/reboot/i,/:\(\)\{/i,/git\s+reset\s+--hard/i,/git\s+clean\s+-fd/i];
export const tools={
 "fs.read":async(i:{path:string})=>fs.readFile(safe(i.path),"utf8"),
 "fs.write":async(i:{path:string,content:string})=>{const p=safe(i.path);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,i.content,"utf8");return{path:i.path,bytes:Buffer.byteLength(i.content),message:"written"}},
 "fs.list":async(i:{path?:string})=>fs.readdir(safe(i.path||"."),{withFileTypes:true}).then(x=>x.map(v=>({name:v.name,type:v.isDirectory()?"dir":"file"}))),
 "terminal.exec":async(i:{command:string})=>{if(blocked.some(r=>r.test(i.command)))throw new Error("Command blocked by safety policy");const r=await sh(i.command,{cwd:root,maxBuffer:2*1024*1024,timeout:120000});return{stdout:r.stdout,stderr:r.stderr}}
};
export function toolNeedsApproval(tool:string){return tool==="terminal.exec"||tool==="fs.write"}