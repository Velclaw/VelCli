export type ChatMessage={role:"system"|"user"|"assistant"|"tool";content:string};

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
 async chat(messages:ChatMessage[]){if(this.c.provider==="anthropic")return this.chatAnthropic(messages);return this.chatOpenAICompatible(messages);}
 private async chatOpenAICompatible(messages:ChatMessage[]){
  const r=await fetch(this.c.baseUrl!.replace(/\/$/,"")+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${this.c.apiKey}`},body:JSON.stringify({model:this.c.model,messages,temperature:.2})});
  if(!r.ok)throw new Error(`Model request failed: ${r.status} ${await r.text()}`);
  const j=await r.json() as any;
  return String(j.choices?.[0]?.message?.content||"");
 }
 private async chatAnthropic(messages:ChatMessage[]){
  const system=messages.filter(x=>x.role==="system").map(x=>x.content).join("\n");
  const userMessages=messages.filter(x=>x.role!=="system").map(x=>({role:x.role==="assistant"?"assistant":"user",content:x.content}));
  const r=await fetch(this.c.baseUrl!.replace(/\/$/,"")+"/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":this.c.apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:this.c.model,max_tokens:4096,system:system||undefined,messages:userMessages,temperature:.2})});
  if(!r.ok)throw new Error(`Anthropic request failed: ${r.status} ${await r.text()}`);
  const j=await r.json() as any;
  return Array.isArray(j.content)?j.content.filter((x:any)=>x.type==="text").map((x:any)=>x.text).join("\n"):"";
 }
}

export function listConfiguredProviders():ModelInfo[]{
 const providers:ProviderName[]=["openai","anthropic","gemini","groq","openrouter","compatible"];
 return providers.flatMap(provider=>{const c=configured(provider);return c?[{id:c.model,provider,label:`${provider}: ${c.model}`}]:[]});
}
export function getProviderStatus(){return listConfiguredProviders().map(x=>({provider:x.provider,model:x.id,configured:true}));}
