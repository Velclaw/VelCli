export type ChatMessage={role:"system"|"user"|"assistant"|"tool";content:string;tool_call_id?:string;tool_calls?:ModelToolCall[]};
export type ModelTool={name:string;description:string;inputSchema:Record<string,unknown>};
export type ModelToolCall={id:string;name:string;input:Record<string,unknown>};
export type ModelResponse={content:string;toolCalls:ModelToolCall[]};

export type ProviderName="openai"|"anthropic"|"gemini"|"groq"|"openrouter"|"compatible";
export type ProviderConfig={provider:ProviderName;apiKey:string;model:string;baseUrl?:string};
export type ModelInfo={id:string;provider:ProviderName;label:string};

const DEFAULT_BASE_URLS:Record<ProviderName,string>={openai:"https://api.openai.com/v1",anthropic:"https://api.anthropic.com/v1",gemini:"https://generativelanguage.googleapis.com/v1beta/openai",groq:"https://api.groq.com/openai/v1",openrouter:"https://openrouter.ai/api/v1",compatible:""};
const env=(name:string)=>process.env[name]?.trim()||"";

function configured(provider:ProviderName):ProviderConfig|undefined{
 const prefix=provider==="compatible"?"VELCLI_COMPATIBLE":`VELCLI_${provider.toUpperCase()}`;
 const apiKey=env(`${prefix}_API_KEY`)||(provider==="openai"?env("OPENAI_API_KEY"):provider==="anthropic"?env("ANTHROPIC_API_KEY"):provider==="gemini"?env("GEMINI_API_KEY"):provider==="groq"?env("GROQ_API_KEY"):provider==="openrouter"?env("OPENROUTER_API_KEY"):"");
 const model=env(`${prefix}_MODEL`)||(provider==="openai"&&env("VELCLI_MODEL")?env("VELCLI_MODEL"):provider==="anthropic"?"claude-3-5-sonnet-latest":provider==="gemini"?"gemini-2.5-flash":provider==="groq"?"llama-3.3-70b-versatile":provider==="openrouter"?"openrouter/auto":"");
 const baseUrl=env(`${prefix}_BASE_URL`)||(provider==="compatible"?env("VELCLI_BASE_URL"):DEFAULT_BASE_URLS[provider]);
 if(!apiKey||!model||!baseUrl)return undefined;
 return{provider,apiKey,model,baseUrl};
}

export class ModelRouter{
 private c:ProviderConfig;
 constructor(config?:Partial<ProviderConfig>){
  const provider=(config?.provider||env("VELCLI_PROVIDER")||"openai") as ProviderName;
  const found=config?.apiKey&&config?.model?{...configured(provider),...config,provider} as ProviderConfig:configured(provider);
  if(!found)throw new Error(`Provider "${provider}" is not configured. Set its API key and model environment variables.`);
  this.c=found;
 }
 get config():ProviderConfig{return{...this.c,apiKey:this.c.apiKey?"configured":""} as ProviderConfig;}
 async chat(messages:ChatMessage[]){return(await this.chatWithTools(messages,[])).content;}
 async chatWithTools(messages:ChatMessage[],toolDefs:ModelTool[]):Promise<ModelResponse>{if(this.c.provider==="anthropic")return this.chatAnthropic(messages,toolDefs);return this.chatOpenAICompatible(messages,toolDefs);}
 private async chatOpenAICompatible(messages:ChatMessage[],toolDefs:ModelTool[]):Promise<ModelResponse>{
  const payload:any={model:this.c.model,messages,temperature:.2};
  if(toolDefs.length)payload.tools=toolDefs.map(t=>({type:"function",function:{name:t.name,description:t.description,parameters:t.inputSchema}}));
  const r=await fetch(this.c.baseUrl!.replace(/\/$/,"")+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${this.c.apiKey}`},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(`Model request failed: ${r.status} ${await r.text()}`);
  const j=await r.json() as any;const message=j.choices?.[0]?.message||{};
  const toolCalls=Array.isArray(message.tool_calls)?message.tool_calls.map((x:any)=>({id:String(x.id),name:String(x.function?.name||""),input:(()=>{try{return typeof x.function?.arguments==="string"?JSON.parse(x.function.arguments||"{}"):x.function?.arguments||{}}catch{return{}}})()})).filter((x:any)=>x.name):[];
  return{content:String(message.content||""),toolCalls};
 }
 private async chatAnthropic(messages:ChatMessage[],toolDefs:ModelTool[]):Promise<ModelResponse>{
  const system=messages.filter(x=>x.role==="system").map(x=>x.content).join("\n");
  const userMessages:Array<{role:"user"|"assistant";content:string|Array<Record<string,unknown>>}>=[];
  for(const m of messages){
   if(m.role==="system")continue;
   if(m.role==="assistant"){
    const content:Array<Record<string,unknown>>=[];
    if(m.content)content.push({type:"text",text:m.content});
    for(const call of m.tool_calls||[])content.push({type:"tool_use",id:call.id,name:call.name,input:call.input||{}});
    userMessages.push({role:"assistant",content:content.length?content:m.content});
    continue;
   }
   if(m.role==="tool"){
    const result={type:"tool_result",tool_use_id:m.tool_call_id||"",content:m.content};
    const last=userMessages[userMessages.length-1];
    if(last?.role==="user"&&Array.isArray(last.content))last.content.push(result);
    else userMessages.push({role:"user",content:[result]});
    continue;
   }
   userMessages.push({role:"user",content:m.content});
  }
  const payload:any={model:this.c.model,max_tokens:4096,system:system||undefined,messages:userMessages,temperature:.2};
  if(toolDefs.length)payload.tools=toolDefs.map(t=>({name:t.name,description:t.description,input_schema:t.inputSchema}));
  const r=await fetch(this.c.baseUrl!.replace(/\/$/,"")+"/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":this.c.apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(`Anthropic request failed: ${r.status} ${await r.text()}`);
  const j=await r.json() as any;const blocks=Array.isArray(j.content)?j.content:[];
  return{content:blocks.filter((x:any)=>x.type==="text").map((x:any)=>x.text).join("\n"),toolCalls:blocks.filter((x:any)=>x.type==="tool_use").map((x:any)=>({id:String(x.id),name:String(x.name),input:(x.input||{}) as Record<string,unknown>}))};
 }
}

export function listConfiguredProviders():ModelInfo[]{
 const providers:ProviderName[]=["openai","anthropic","gemini","groq","openrouter","compatible"];
 return providers.flatMap(provider=>{const c=configured(provider);return c?[{id:c.model,provider,label:`${provider}: ${c.model}`}]:[]});
}
export function getProviderStatus(){return listConfiguredProviders().map(x=>({provider:x.provider,model:x.id,configured:true}));}
