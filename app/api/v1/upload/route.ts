import { bindings, ensureUser, identity, initialize, json, problem, safeName, shortHash } from "../_shared";

export const dynamic = "force-dynamic";
const maxBytes = 25_000_000;

export async function POST(request: Request) {
  try {
    const { db, uploads } = bindings(); if(!uploads)return problem(503,"UPLOAD_STORAGE_UNAVAILABLE","Upload storage is unavailable","The object-storage binding is missing.","Use the seeded case or retry after storage is configured.");
    await initialize(db); const user=await identity(request); await ensureUser(db,user);
    const form=await request.formData(); const file=form.get("file"),projectId=String(form.get("projectId")||"");
    if(!(file instanceof File))return problem(422,"FILE_REQUIRED","Choose a CSV file","No file was attached.","Choose a .csv file up to 25 MB.");
    const genericMime=!file.type||file.type==="application/octet-stream";
    if(!file.name.toLowerCase().endsWith(".csv")||(!genericMime&&!file.type.includes("csv")))return problem(415,"INVALID_FILE_TYPE","Only CSV files are supported",`${file.name} is not recognized as CSV.`,"Export the table as UTF-8 CSV and try again.");
    if(file.size===0||file.size>maxBytes)return problem(413,"INVALID_FILE_SIZE","The file size is not supported",`${file.name} is ${file.size.toLocaleString()} bytes.`,"Choose a non-empty CSV file no larger than 25 MB.");
    const owned=await db.prepare("SELECT id FROM projects WHERE id=? AND owner_id=?").bind(projectId,user.id).first();if(!owned)return problem(404,"PROJECT_NOT_FOUND","Project not found","Create or open your workspace before uploading.","Return to source selection.");
    const bytes=await file.arrayBuffer(),checksum=await shortHash(new TextDecoder().decode(bytes)),text=new TextDecoder().decode(bytes),rows=parseCSV(text,5001);
    if(rows.length<2)return problem(422,"EMPTY_TABLE","The CSV has no data rows","A header was found without usable records.","Add at least one record and retry.");
    const profile=profileRows(rows),uploadId=`upl_${crypto.randomUUID().replaceAll("-","").slice(0,12)}`,objectKey=`${user.id}/${uploadId}/${safeName(file.name)}`,now=Date.now();
    await uploads.put(objectKey,bytes,{httpMetadata:{contentType:"text/csv"},customMetadata:{ownerId:user.id,projectId,checksum}});
    await db.batch([
      db.prepare("INSERT INTO uploads (id,project_id,owner_id,object_key,original_name,checksum,size_bytes,row_count,profile_json,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(uploadId,projectId,user.id,objectKey,safeName(file.name),checksum,file.size,rows.length-1,JSON.stringify(profile),now+86_400_000,now),
      db.prepare("UPDATE projects SET source_checksum=?,status='PROFILED',updated_at=? WHERE id=?").bind(checksum,now,projectId),
      db.prepare("INSERT INTO audit_events (id,actor_id,action,resource_type,resource_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"source.profiled","upload",uploadId,JSON.stringify({rows:rows.length-1,columns:profile.length}),now),
    ]);
    return json({id:uploadId,name:safeName(file.name),checksum,sizeBytes:file.size,rowCount:rows.length-1,columns:profile,expiresAt:now+86_400_000},201);
  } catch(error){return problem(400,"CSV_PROFILE_FAILED","The CSV could not be profiled",error instanceof Error?error.message:"Malformed CSV.","Confirm UTF-8 CSV formatting and retry.")}
}

function parseCSV(text:string,limit:number){const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;for(let i=0;i<text.length&&rows.length<limit;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=""}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==""))rows.push(row);row=[];cell=""}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}if(quoted)throw new Error("An unclosed quoted field was found.");return rows}
function profileRows(rows:string[][]){const headers=rows[0].map((h,i)=>h.trim()||`column_${i+1}`),data=rows.slice(1);return headers.map((name,index)=>{const values=data.map(r=>(r[index]||"").trim()),nonNull=values.filter(Boolean),distinct=new Set(nonNull),numeric=nonNull.length>0&&nonNull.every(v=>Number.isFinite(Number(v))),dates=!numeric&&nonNull.length>0&&nonNull.every(v=>/^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+-]+Z?)?$/.test(v)&&!Number.isNaN(Date.parse(v)));return{name,inferredType:numeric?"number":dates?"datetime":"string",nullPercent:Math.round((1-nonNull.length/Math.max(values.length,1))*1000)/10,distinctCount:distinct.size,samples:Array.from(distinct).slice(0,3)}})}
