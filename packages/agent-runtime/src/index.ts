import {randomUUID} from "node:crypto";
import {ModelRouter} from "../../model-router/src/index.js";
import {tools,toolNeedsApproval} from "../../agent-tools/src/index.js";
import type {AgentEvent,ApprovalRequest} from "../../shared/src/types.js";
type Emit=(e:AgentEvent)=>void;
type Approve=(request:ApprovalRequest)=>Promise<boolean>;
export class AgentRuntime{
 private model=new ModelRouter();
 async execute(prompt:string,emit:Emit,approve:Approve=async()=>true){
   const runId=randomUUID();let context="";
   emit({type:"agent.started",runId,message:"Agent run started"});
   for(let step=0;step<8;step++){
     emit({type:"agent.thinking",runId,step:step+1,message:`Planning step ${step+1}`});
     const answer=await this.model.chat([
       {role:"system",content:`You are VelCli, an autonomous engineering agent by Velclaw. Use ONLY JSON. Tool call: {"tool":"fs.read|fs.write|fs.list|git.status|git.diff|build.run|test.run|terminal.exec","input":{...}}. Finish: {"final":"..."}. Never claim a tool ran unless its result is in Context.`},
       {role:"user",content:prompt+"\nContext:\n"+context}
     ]);
     let parsed:any;try{parsed=JSON.parse(answer)}catch{emit({type:"agent.completed",runId,message:answer});return{runId,message:answer}};
     if(parsed.final){const message=String(parsed.final);emit({type:"agent.completed",runId,message});return{runId,message}}
     if(!parsed.tool||!(parsed.tool in tools))throw new Error("Unknown tool request");
     const input=parsed.input||{};
     emit({type:"agent.tool.call",runId,step:step+1,tool:parsed.tool,input});
     if(toolNeedsApproval(parsed.tool)){
       const approvalId=randomUUID();
       const request={id:approvalId,runId,tool:parsed.tool,input,reason:parsed.tool==="terminal.exec"?"Terminal command execution":"Workspace file modification"};
       emit({type:"agent.approval.required",runId,step:step+1,tool:parsed.tool,input,approvalId,message:"Approval required before this tool can execute."});
       const ok=await approve(request);
       emit({type:"agent.approval.resolved",runId,approvalId,tool:parsed.tool,message:ok?"Approved":"Rejected"});
       if(!ok){context+=`\nApproval rejected for ${parsed.tool}.`;continue}
     }
     const out=await (tools as any)[parsed.tool](input);
     context+=`\nTool ${parsed.tool}: ${JSON.stringify(out)}`;
     emit({type:"agent.tool.result",runId,step:step+1,tool:parsed.tool,output:out});
     if(parsed.tool==="fs.write")emit({type:"agent.file.changed",runId,path:String(input.path),message:"File changed"});
   }
   throw new Error("Agent step limit reached");
 }
}