import "dotenv/config";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {AgentRuntime} from "../../../packages/agent-runtime/src/index.js";
import {getProviderStatus} from "../../../packages/model-router/src/index.js";
import type {ApprovalRequest,AgentEvent} from "../../../packages/shared/src/types.js";

const port=Number(process.env.PORT||8787);
const webFile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../web/index.html");
const approvals=new Map<string,{resolve:(ok:boolean)=>void;timer:NodeJS.Timeout}>();
const MAX_BODY=1024*1024;
function headers(extra:Record<string,string>={}){return{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...extra}}
function json(res:any,status:number,data:any){res.writeHead(status,headers({"content-type":"application/json; charset=utf-8"}));res.end(JSON.stringify(data))}
function read(req:any){return new Promise<string>((resolve,reject)=>{let s="";req.on("data",(x:Buffer)=>{s+=x.toString();if(s.length>MAX_BODY){reject(new Error("Request body too large"));req.destroy()}});req.on("end",()=>resolve(s));req.on("error",reject)})}
async function runAgent(prompt:string,emit:(e:AgentEvent)=>void){
 const runtime=new AgentRuntime();
 return runtime.execute(prompt,emit,async(req:ApprovalRequest)=>new Promise<boolean>(resolve=>{
  const timer=setTimeout(()=>{approvals.delete(req.id);resolve(false)},Number(process.env.VELCLI_APPROVAL_TIMEOUT_MS||300000));
  approvals.set(req.id,{resolve,timer});
 }));
}
createServer(async(req,res)=>{
 try{
  if(req.method==="OPTIONS"){res.writeHead(204,headers());return res.end()}
  const url=new URL(req.url||"/","http://localhost");
  if(req.method==="GET"&&url.pathname==="/"){
   try{const html=await readFile(webFile,"utf8");res.writeHead(200,headers({"content-type":"text/html; charset=utf-8","content-security-policy":"default-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'"}));return res.end(html)}
   catch{return json(res,200,{name:"VelCli",by:"Velclaw",status:"online",studio:"unavailable"})}
  }
  if(req.method==="GET"&&url.pathname==="/health")return json(res,200,{ok:true,service:"velcli",providers:getProviderStatus()});
  if(req.method==="GET"&&url.pathname==="/api/models")return json(res,200,{providers:getProviderStatus()});
  if(req.method==="POST"&&url.pathname==="/api/agent"){
   const b=JSON.parse(await read(req));const prompt=String(b.prompt||"");if(!prompt.trim())return json(res,400,{error:"prompt_required"});
   const events:AgentEvent[]=[];const out=await runAgent(prompt,e=>events.push(e));return json(res,200,{...out,events})
  }
  if(req.method==="POST"&&url.pathname==="/api/agent/approve"){
   const b=JSON.parse(await read(req));const id=String(b.approvalId||"");const pending=approvals.get(id);
   if(!pending)return json(res,404,{error:"approval_not_found"});
   approvals.delete(id);clearTimeout(pending.timer);pending.resolve(b.approved===true);return json(res,200,{ok:true,approved:b.approved===true})
  }
  if(req.method==="POST"&&url.pathname==="/api/agent/stream"){
   const b=JSON.parse(await read(req));const prompt=String(b.prompt||"");if(!prompt.trim())return json(res,400,{error:"prompt_required"});
   res.writeHead(200,headers({"content-type":"text/event-stream; charset=utf-8","cache-control":"no-cache, no-transform","connection":"keep-alive"}));
   const send=(e:AgentEvent)=>{if(!res.writableEnded)res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)};
   try{await runAgent(prompt,send)}catch(e){send({type:"agent.error",runId:"unknown",error:e instanceof Error?e.message:String(e)})}
   res.end();return
  }
  json(res,404,{error:"not_found"})
 }catch(e){if(!res.headersSent)json(res,e instanceof SyntaxError?400:500,{error:e instanceof Error?e.message:String(e)});else if(!res.writableEnded)res.end()}
}).listen(port,()=>console.log(`VelCli API listening on :${port}`));
