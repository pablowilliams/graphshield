export type BackendMode = "connecting" | "connected" | "demo";
export type WorkspaceRun = { id: string; projectId: string; algorithm: string; status: string; progress: number; createdAt: number; finishedAt?: number };
export type Workspace = { mode: BackendMode; projectId: string; user?: { displayName: string; email: string; role: string }; runs?: WorkspaceRun[] };

async function request<T>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers||{})}});const data=await response.json();if(!response.ok)throw new Error(data.detail||data.title||"GraphShield API request failed");return data as T}

export async function connectWorkspace():Promise<Workspace>{try{const current=await request<{project?:{id:string};user?:Workspace["user"];runs?:WorkspaceRun[]}>("/api/v1/workspace");if(current.project?.id)return{mode:"connected",projectId:current.project.id,user:current.user,runs:current.runs};const created=await request<{project:{id:string};user?:Workspace["user"]}>("/api/v1/workspace",{method:"POST",body:JSON.stringify({action:"bootstrap"})});return{mode:"connected",projectId:created.project.id,user:created.user,runs:[]}}catch{return{mode:"demo",projectId:"prj_demo_seeded"}}}

export async function submitRun(workspace:Workspace,algorithm:string):Promise<string>{if(workspace.mode!=="connected")return"run_f7a91c";const run=await request<{id:string}>("/api/v1/workspace",{method:"POST",body:JSON.stringify({action:"run",projectId:workspace.projectId,algorithm,idempotencyKey:crypto.randomUUID(),configuration:{mappingVersion:"v3",sourceChecksum:"a93f0c2e"}})});return run.id}

export async function profileUpload(projectId:string,file:File){const form=new FormData();form.set("projectId",projectId);form.set("file",file);const response=await fetch("/api/v1/upload",{method:"POST",body:form});const data=await response.json();if(!response.ok)throw new Error(data.detail||data.title||"CSV profiling failed");return data as {id:string;name:string;rowCount:number;columns:Array<{name:string;inferredType:string;nullPercent:number;distinctCount:number;samples:string[]}>}}
