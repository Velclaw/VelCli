import fs from "node:fs/promises";
import path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {workspaceRoot} from "./workspace.js";
const run=promisify(execFile);
function safe(p:string){const root=workspaceRoot();const x=path.resolve(root,p||".");if(x!==root&&!x.startsWith(root+path.sep))throw new Error("Path escapes workspace");return x}
async function command(args:string[]){const allowed=["npm run build","npm test","npm run check","git status --short --branch","git diff --no-ext-diff --unified=3","node --version","npm --version"];const joined=args.join(" ");if(!allowed.includes(joined))throw new Error("Command blocked: only build, test, check, git status/diff, and version commands are allowed. A real isolated sandbox is not configured.");const [bin,...argv]=args;return run(bin,argv,{cwd:workspaceRoot(),maxBuffer:2*1024*1024,timeout:120000,windowsHide:true})}
export const tools={
 "fs.read":async(i:{path:string})=>fs.readFile(safe(i.path),"utf8"),
 "fs.write":async(i:{path:string,content:string})=>{const p=safe(i.path);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,i.content,"utf8");return{path:i.path,bytes:Buffer.byteLength(i.content),message:"written"}},
 "fs.list":async(i:{path?:string})=>fs.readdir(safe(i.path||"."),{withFileTypes:true}).then(x=>x.map(v=>({name:v.name,type:v.isDirectory()?"dir":"file"}))),
 "git.status":async()=>{const r=await command(["git","status","--short","--branch"]);return{stdout:r.stdout,stderr:r.stderr}},
 "git.diff":async()=>{const r=await command(["git","diff","--no-ext-diff","--unified=3"]);return{stdout:r.stdout,stderr:r.stderr}},
 "build.run":async(i:{command?:string})=>{const c=i.command||"npm run build";const r=await command(c.split(" "));return{command:c,stdout:r.stdout,stderr:r.stderr}},
 "test.run":async(i:{command?:string})=>{const c=i.command||"npm test";const r=await command(c.split(" "));return{command:c,stdout:r.stdout,stderr:r.stderr}},
 "terminal.exec":async(i:{command:string})=>{const r=await command(i.command.trim().split(/\s+/));return{stdout:r.stdout,stderr:r.stderr}}
};
export function toolNeedsApproval(tool:string){return ["terminal.exec","fs.write","build.run","test.run"].includes(tool)}
