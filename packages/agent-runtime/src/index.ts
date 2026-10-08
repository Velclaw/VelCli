import {randomUUID} from "node:crypto";
import {ModelRouter} from "../../model-router/src/index.js";
import {tools,toolNeedsApproval} from "../../agent-tools/src/index.js";
import type {AgentEvent,ApprovalRequest} from "../../shared/src/types.js";

type Emit=(e:AgentEvent)=>void;
type Approve=(request:ApprovalRequest)=>Promise<boolean>;
type ToolName=keyof typeof tools;
type ModelDecision={final?:string;tool?:string;input?:Record<string,unknown>};

const MAX_STEPS=Number(process.env.VELCLI_MAX_STEPS||12);
const MAX_CONTEXT_CHARS=Number(process.env.VELCLI_MAX_CONTEXT_CHARS||24000);
const MAX_MODEL_RETRIES=2;

const toolDescriptions:Record<ToolName,string>={
 "fs.read":"Read a UTF-8 file inside the workspace.",
 "fs.write":"Create or overwrite a UTF-8 file inside the workspace.",
 "fs.list":"List files/directories inside the workspace.",
 "git.status":"Inspect current git status.",
 "git.diff":"Inspect current unstaged git diff.",
 "build.run":"Run the project build command.",
 "test.run":"Run the project test command.",
 "terminal.exec":"Execute a shell command inside the workspace."
};

function trimContext(value:string){
 if(value.length<=MAX_CONTEXT_CHARS)return value;
 return value.slice(-MAX_CONTEXT_CHARS);
}

function parseDecision(raw:string):ModelDecision{
 const cleaned=raw.trim().replace(/^\`\`\`json\s*/i,"").replace(/\s*\`\`\`$/,"");
 const parsed=JSON.parse(cleaned) as ModelDecision;
 if(typeof parsed.final==="string")return{final:parsed.final};
 if(typeof parsed.tool==="string")return{tool:parsed.tool,input:parsed.input||{}};
 throw new Error("Model returned neither final nor tool decision");
}

function toolReason(tool:ToolName){
 if(tool==="terminal.exec")return "Terminal command execution";
 if(tool==="fs.write")return "Workspace file modification";
 if(tool==="build.run")return "Project build execution";
 if(tool==="test.run")return "Project test execution";
 return "Tool execution";
}

function systemPrompt(){
 const toolsText=(Object.keys(toolDescriptions) as ToolName[]).map(name=>`- ${name}: ${toolDescriptions[name]}`).join("\n");
 return `You are VelCli, Velclaw's autonomous engineering agent.
You operate inside a real software workspace. Inspect before modifying. Use tools deliberately and verify changes with git.diff, build.run, or test.run when appropriate.
Return EXACTLY ONE JSON object and no markdown.
For a tool call: {"tool":"<tool-name>","input":{...}}
For completion: {"final":"<concise result>"}
Available tools:
${toolsText}
Never claim a tool ran unless its result appears in Context. Never invent file contents or command output.`;
}

export class AgentRuntime{
 private model=new ModelRouter();

 private async decide(messages:import("../../model-router/src/index.js").ChatMessage[]){
   let lastError="";
   for(let attempt=1;attempt<=MAX_MODEL_RETRIES;attempt++){
     try{return await this.model.chatWithTools(messages,(Object.keys(toolDescriptions) as ToolName[]).map(name=>({name,description:toolDescriptions[name],inputSchema:{type:"object",properties:{path:{type:"string"},content:{type:"string"},command:{type:"string"}},additionalProperties:true}}))));}
     catch(error){lastError=error instanceof Error?error.message:String(error);if(attempt<MAX_MODEL_RETRIES)await new Promise(r=>setTimeout(r,250*attempt));}
   }
   throw new Error(`Model decision failed after retries: ${lastError}`);
 }

 async execute(prompt:string,emit:Emit,approve:Approve=async()=>true){
   const runId=randomUUID();
   let context="";
   const messages:import("../../model-router/src/index.js").ChatMessage[]=[{role:"system",content:systemPrompt()},{role:"user",content:prompt}];
   emit({type:"agent.started",runId,message:"Agent run started"});
   if(!prompt.trim()){
     const message="A non-empty task prompt is required.";
     emit({type:"agent.error",runId,error:message});
     throw new Error(message);
   }

   for(let step=0;step<MAX_STEPS;step++){
     emit({type:"agent.thinking",runId,step:step+1,message:`Planning step ${step+1} of ${MAX_STEPS}`});
     const response=await this.decide(messages);
     messages.push({role:"assistant",content:response.content,tool_calls:response.toolCalls});
     if(!response.toolCalls.length){const final=response.content||"Agent completed without a final message.";emit({type:"agent.completed",runId,step:step+1,message:final});return{runId,message:final,steps:step+1};}
     for(const call of response.toolCalls){
       const tool=call.name as ToolName|undefined;
       if(!tool||!(tool in tools))throw new Error(`Unknown tool request: ${String(call.name)}`);
       const input=call.input||{};emit({type:"agent.tool.call",runId,step:step+1,tool,input});
       if(toolNeedsApproval(tool)){
         const approvalId=randomUUID();const request={id:approvalId,runId,tool,input,reason:toolReason(tool)};
         emit({type:"agent.approval.required",runId,step:step+1,tool,input,approvalId,message:`Approval required: ${toolReason(tool)}.`});
         const ok=await approve(request);emit({type:"agent.approval.resolved",runId,approvalId,tool,message:ok?"Approved":"Rejected"});
         if(!ok){const rejected="Approval rejected; action was not executed.";messages.push({role:"tool",tool_call_id:call.id,content:rejected});emit({type:"agent.tool.result",runId,step:step+1,tool,output:{error:rejected}});continue;}
       }
       let output:unknown;
       try{output=await tools[tool](input as never);}catch(error){output={error:error instanceof Error?error.message:String(error)};}
       messages.push({role:"tool",tool_call_id:call.id,content:trimContext(JSON.stringify(output))});
       emit({type:"agent.tool.result",runId,step:step+1,tool,output});
       if(tool==="fs.write")emit({type:"agent.file.changed",runId,path:String(input.path||""),message:"File changed"});
     }
   }

   const message=`Agent stopped after reaching the ${MAX_STEPS}-step safety limit.`;
   emit({type:"agent.error",runId,error:message});
   throw new Error(message);
 }
}
