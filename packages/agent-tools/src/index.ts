import fs from "node:fs/promises";
import path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {workspaceRoot} from "./workspace.js";
const run=promisify(execFile);
const MAX_OUTPUT=2*1024*1024;
const TIMEOUT=120000;
function safe(p:string){const root=workspaceRoot();const x=path.resolve(root,p||".");if(x!==root&&!x.startsWith(root+path.sep))throw new Error("Path escapes workspace");return x}
function validateCommand(args:string[]){
 if(!args.length||args.some(x=>x.includes("\0")))throw new Error("Empty or invalid command.");
 const [bin,...argv]=args,joined=args.join(" ");
 const exact=new Set([
  "npm run build","npm test","npm run check","npm install","npm ci",
  "npm ls --depth=0","npm audit --omit=dev",
  "git status --short --branch","git diff --no-ext-diff --unified=3",
  "git diff --cached --no-ext-diff --unified=3","node --version","npm --version",
  "pwd","ls -la","find . -maxdepth 2 -type f"
 ]);
 if(exact.has(joined))return;
 if(bin==="npm"&&(argv[0]==="install"||argv[0]==="i")&&argv.length>=2&&argv.length<=30){
  const pkgs=argv.slice(1);
  if(pkgs.every(p=>/^[a-zA-Z0-9@._/-]+(?:@[a-zA-Z0-9*^~._-]+)?$/.test(p)&&!p.startsWith("-")&&!p.includes("..")))return;
 }
 if(bin==="npm"&&argv[0]==="run"&&["build","test","check","lint","typecheck"].includes(argv[1])&&argv.length===2)return;
 if(bin==="npx"&&argv.length>=1&&argv.length<=3&&["vite","tsc","next","astro"].includes(argv[0])&&argv.slice(1).every(x=>/^[a-zA-Z0-9._/-]+$/.test(x)))return;
 throw new Error("Command blocked by VelCli workspace policy. Allowed: npm install/ci, npm install of named packages, build/test/check/lint/typecheck scripts, supported npx build tools, git status/diff, and read-only inspection commands. Arbitrary shell, network piping, privilege escalation, and destructive commands are disabled.");
}
async function command(args:string[]){
 validateCommand(args);
 const [bin,...argv]=args;
 return run(bin,argv,{cwd:workspaceRoot(),maxBuffer:MAX_OUTPUT,timeout:TIMEOUT,windowsHide:true,env:{...process.env,CI:"1",npm_config_yes:"true",npm_config_audit:"false",npm_config_fund:"false"}});
}
export const tools={
 "fs.read":async(i:{path:string})=>fs.readFile(safe(i.path),"utf8"),
 "fs.write":async(i:{path:string,content:string})=>{if(typeof i.content!=="string"||i.content.length>500000)throw new Error("File content exceeds the 500 KB limit.");const p=safe(i.path);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,i.content,"utf8");return{path:i.path,bytes:Buffer.byteLength(i.content),message:"written"}},
 "fs.list":async(i:{path?:string})=>fs.readdir(safe(i.path||"."),{withFileTypes:true}).then(x=>x.filter(v=>!["node_modules",".git",".next","dist"].includes(v.name)).map(v=>({name:v.name,type:v.isDirectory()?"dir":"file"}))),
 "git.status":async()=>{const r=await command(["git","status","--short","--branch"]);return{stdout:r.stdout,stderr:r.stderr}},
 "git.diff":async()=>{const r=await command(["git","diff","--no-ext-diff","--unified=3"]);return{stdout:r.stdout,stderr:r.stderr}},
 "build.run":async(i:{command?:string})=>{const c=i.command||"npm run build";const r=await command(c.trim().split(/\s+/));return{command:c,stdout:r.stdout,stderr:r.stderr}},
 "test.run":async(i:{command?:string})=>{const c=i.command||"npm test";const r=await command(c.trim().split(/\s+/));return{command:c,stdout:r.stdout,stderr:r.stderr}},
 "terminal.exec":async(i:{command:string})=>{if(typeof i.command!=="string"||i.command.length>300)throw new Error("Command must be a string under 300 characters.");const r=await command(i.command.trim().split(/\s+/));return{stdout:r.stdout,stderr:r.stderr}}
};
export function toolNeedsApproval(tool:string){return ["terminal.exec","fs.write","build.run","test.run"].includes(tool)}
