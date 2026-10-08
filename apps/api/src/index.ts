import "dotenv/config";
import {createServer} from "node:http";
import {AgentRuntime} from "../../../packages/agent-runtime/src/index.js";
import {getProviderStatus} from "../../../packages/model-router/src/index.js";
import type {ApprovalRequest,AgentEvent} from "../../../packages/shared/src/types.js";

const port=Number(process.env.PORT||8787);
const approvals=new Map<string,{resolve:(ok:boolean)=>void;timer:NodeJS.Timeout}>();
function headers(extra:Record<string,string>={}){return{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type",...extra}}
function json(res:any,status:number,data:any){res.writeHead(status,headers({"content-type":"application/json"}));res.end(JSON.stringify(data))}
function read(req:any){return new Promise<string>((resolve,reject)=>{let s="";req.on("data",(x:any)=>s+=x);req.on("end",()=>resolve(s));req.on("error",reject)})}
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
  if(req.url==="/health")return json(res,200,{ok:true,service:"velcli",providers:getProviderStatus()});
  if(req.url==="/")return json(res,200,{name:"VelCli",by:"Velclaw",status:"online"});
  if(req.method==="GET"&&req.url==="/api/models")return json(res,200,{providers:getProviderStatus()});
  if(req.method==="POST"&&req.url==="/api/agent"){
   const b=JSON.parse(await read(req));const events:AgentEvent[]=[];
   const out=await runAgent(String(b.prompt||""),e=>events.push(e));return json(res,200,{...out,events})
  }
  if(req.method==="POST"&&req.url==="/api/agent/approve"){
   const b=JSON.parse(await read(req));const id=String(b.approvalId);const pending=approvals.get(id);
   if(!pending)return json(res,404,{error:"approval_not_found"});
   approvals.delete(id);clearTimeout(pending.timer);pending.resolve(Boolean(b.approved));return json(res,200,{ok:true,approved:Boolean(b.approved)})
  }
  if(req.method==="POST"&&req.url==="/api/agent/stream"){
   const b=JSON.parse(await read(req));const prompt=String(b.prompt||"");
   res.writeHead(200,headers({"content-type":"text/event-stream","cache-control":"no-cache","connection":"keep-alive"}));
   const send=(e:AgentEvent)=>res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
   try{await runAgent(prompt,send)}catch(e){send({type:"agent.error",runId:"unknown",error:e instanceof Error?e.message:String(e)})}
   res.end();return
  }
  json(res,404,{error:"not_found"})
 }catch(e){if(!res.headersSent)json(res,500,{error:e instanceof Error?e.message:String(e)});else res.end()}
}).listen(port,()=>console.log(`VelCli API listening on :${port}`));
