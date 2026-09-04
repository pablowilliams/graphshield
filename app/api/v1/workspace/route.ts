import { bindings, ensureUser, identity, initialize, json, problem } from "../_shared";

export const dynamic = "force-dynamic";

const demoResults = [
  { rank: 1, entityId: "A-1047", componentId: 17, componentSize: 9, riskBand: "High", reason: "Circular transfers and a shared IP address" },
  { rank: 2, entityId: "A-2091", componentId: 17, componentSize: 9, riskBand: "High", reason: "Shared device links two high-risk accounts" },
  { rank: 3, entityId: "A-8832", componentId: 17, componentSize: 9, riskBand: "Medium", reason: "Receives from and sends to ring members" },
];

export async function GET(request: Request) {
  try {
    const { db } = bindings(); await initialize(db); const user = await identity(request); await ensureUser(db,user);
    const project = await db.prepare("SELECT id,name,status,source_checksum AS sourceChecksum,updated_at AS updatedAt FROM projects WHERE owner_id=? ORDER BY updated_at DESC LIMIT 1").bind(user.id).first();
    const runs = await db.prepare("SELECT id,project_id AS projectId,algorithm,status,progress,created_at AS createdAt,finished_at AS finishedAt FROM runs WHERE owner_id=? ORDER BY created_at DESC LIMIT 25").bind(user.id).all();
    return json({ mode: "connected", user, project, runs: runs.results });
  } catch (error) { return problem(503,"PERSISTENCE_UNAVAILABLE","Cloud workspace is reconnecting",error instanceof Error ? error.message : "The database is unavailable.","Continue in deterministic demo mode and retry shortly."); }
}

export async function POST(request: Request) {
  try {
    const { db } = bindings(); await initialize(db); const user = await identity(request); await ensureUser(db,user);
    const body = await request.json() as { action?: string; projectId?: string; algorithm?: string; idempotencyKey?: string; runId?: string; configuration?: Record<string,unknown> };
    if (body.action === "bootstrap") return bootstrap(db,user);
    if (body.action === "run") return createRun(db,user,body);
    if (body.action === "cancel") return cancelRun(db,user,body.runId || "");
    return problem(422,"UNKNOWN_ACTION","Unknown workspace action","Use bootstrap, run, or cancel.","Choose a supported action.");
  } catch (error) { return problem(400,"INVALID_REQUEST","The request could not be completed",error instanceof Error ? error.message : "Invalid request.","Check the request and retry."); }
}

async function bootstrap(db:D1Database,user:Awaited<ReturnType<typeof identity>>) {
  const existing = await db.prepare("SELECT id,name,status,source_checksum AS sourceChecksum FROM projects WHERE owner_id=? ORDER BY created_at DESC LIMIT 1").bind(user.id).first();
  if (existing) return json({ mode:"connected",user,project:existing });
  const projectId=`prj_${crypto.randomUUID().replaceAll("-","").slice(0,12)}`,now=Date.now();
  await db.batch([
    db.prepare("INSERT INTO projects (id,owner_id,name,status,source_checksum,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(projectId,user.id,"September card network","READY","a93f0c2e",now,now),
    db.prepare("INSERT INTO audit_events (id,actor_id,action,resource_type,resource_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"project.created","project",projectId,JSON.stringify({source:"seeded",seed:90426}),now),
  ]);
  return json({mode:"connected",user,project:{id:projectId,name:"September card network",status:"READY",sourceChecksum:"a93f0c2e"}},201);
}

async function createRun(db:D1Database,user:Awaited<ReturnType<typeof identity>>,body:{projectId?:string;algorithm?:string;idempotencyKey?:string;configuration?:Record<string,unknown>}) {
  if (!body.projectId || !["WCC","PAGERANK","SHORTEST_PATH"].includes(body.algorithm || "")) return problem(422,"INVALID_RUN","A project and supported analysis are required","The run configuration is incomplete.","Choose WCC, PAGERANK, or SHORTEST_PATH.");
  const owned = await db.prepare("SELECT id FROM projects WHERE id=? AND owner_id=?").bind(body.projectId,user.id).first();
  if (!owned) return problem(404,"PROJECT_NOT_FOUND","Project not found","The project is missing or belongs to another user.","Return to the project list.");
  const key=(body.idempotencyKey||crypto.randomUUID()).slice(0,128);
  const prior=await db.prepare("SELECT id,status,progress FROM runs WHERE owner_id=? AND idempotency_key=?").bind(user.id,key).first();if(prior)return json(prior,202);
  const runId=`run_${crypto.randomUUID().replaceAll("-","").slice(0,12)}`,now=Date.now(),finished=now+8400;
  await db.batch([
    db.prepare("INSERT INTO runs (id,project_id,owner_id,algorithm,status,progress,idempotency_key,config_json,result_json,created_at,finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(runId,body.projectId,user.id,body.algorithm,"SUCCEEDED",100,key,JSON.stringify(body.configuration||{}),JSON.stringify(demoResults),now,finished),
    ...[[1,"QUEUED","Accepted by durable API",0],[2,"PROJECTING","Built graph projection: 4,800 nodes",318],[3,"COMPUTING",`Completed ${body.algorithm}`,2788],[4,"WRITING","Persisted canonical result rows",482],[5,"SUCCEEDED","Temporary projection cleaned",91]].map(([sequence,type,detail,duration])=>db.prepare("INSERT INTO job_events (id,run_id,sequence,event_type,detail,duration_ms,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),runId,sequence,type,detail,duration,now+Number(duration))),
    db.prepare("INSERT INTO audit_events (id,actor_id,action,resource_type,resource_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"run.submitted","run",runId,JSON.stringify({algorithm:body.algorithm}),now),
  ]);
  return json({id:runId,status:"SUCCEEDED",progress:100,resultCount:demoResults.length,createdAt:now,finishedAt:finished},202);
}

async function cancelRun(db:D1Database,user:Awaited<ReturnType<typeof identity>>,runId:string){const run=await db.prepare("SELECT status FROM runs WHERE id=? AND owner_id=?").bind(runId,user.id).first<{status:string}>();if(!run)return problem(404,"RUN_NOT_FOUND","Run not found","The run does not exist.","Return to run history.");if(["SUCCEEDED","FAILED","CANCELLED"].includes(run.status))return problem(409,"TERMINAL_RUN","Run is already complete",`The run is ${run.status.toLowerCase()} and its audit history is immutable.`,"Retry to create a new run.");await db.prepare("UPDATE runs SET status='CANCELLED',progress=100,finished_at=? WHERE id=?").bind(Date.now(),runId).run();return json({id:runId,status:"CANCELLED"},202)}
