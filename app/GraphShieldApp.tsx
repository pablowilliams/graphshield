"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { edges, nodes, results, runHistory } from "./data";
import { connectWorkspace, profileUpload, submitRun, type Workspace } from "./api-client";

type Screen = "landing" | "source" | "mapping" | "preview" | "analyze" | "running" | "results" | "history" | "support";
type Algorithm = "WCC" | "PAGERANK" | "SHORTEST_PATH";

const steps: { id: Screen; label: string }[] = [
  { id: "source", label: "Source" }, { id: "mapping", label: "Map" }, { id: "preview", label: "Preview" }, { id: "analyze", label: "Analyze" }, { id: "results", label: "Results" },
];

const icons: Record<string, string> = { source: "⌁", mapping: "◇", preview: "◎", analyze: "✦", results: "▥", history: "↻", support: "⌘" };

function Brand() {
  return <button className="brand" onClick={() => location.reload()} aria-label="GraphShield home"><span className="brand-mark">G</span><span>Graph<span className="brand-accent">Shield</span></span></button>;
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}><span className="pill-dot" />{children}</span>;
}

function GraphCanvas({ selected, onSelect, compact = false }: { selected?: string; onSelect?: (id: string) => void; compact?: boolean }) {
  const displayNodes = compact ? nodes.slice(0, 8) : nodes;
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <div className={`graph-canvas ${compact ? "compact" : ""}`} role="group" aria-label="Interactive network graph. Use the equivalent table to inspect every result.">
      <div className="graph-grid" />
      <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {edges.filter(e => displayNodes.some(n => n.id === e.source) && displayNodes.some(n => n.id === e.target)).map((edge, i) => {
          const a = nodeById[edge.source], b = nodeById[edge.target];
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`edge ${edge.type.toLowerCase()}`} />;
        })}
      </svg>
      {displayNodes.map(node => (
        <button key={node.id} title={`${node.kind}: ${node.id}`} aria-label={`${node.kind} ${node.id}`} onClick={() => onSelect?.(node.id)}
          className={`graph-node ${node.kind} ${selected === node.id ? "selected" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
          <span>{node.kind === "account" ? "A" : node.kind === "device" ? "D" : "IP"}</span><small>{node.id}</small>
        </button>
      ))}
      <div className="graph-tools"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button><button aria-label="Fit graph">⌗</button></div>
    </div>
  );
}

function AppShell({ screen, setScreen, children, completed, workspace }: { screen: Screen; setScreen: (s: Screen) => void; children: React.ReactNode; completed: number; workspace: Workspace }) {
  return (
    <div className="app-shell">
      <header className="topbar"><Brand /><div className="topbar-right"><span className={`connection ${workspace.mode}`}><i />{workspace.mode === "connected" ? "Durable workspace" : workspace.mode === "connecting" ? "Connecting" : "Resilient demo"}</span><button className="icon-button" aria-label="Help">?</button><button className="avatar" aria-label="Open profile">{workspace.user?.displayName?.slice(0,2).toUpperCase() || "MP"}</button></div></header>
      <aside className="sidebar">
        <div className="workspace-label">Workspace</div>
        <button className="workspace-card"><span className="workspace-icon">S</span><span><strong>September card network</strong><small>Demo workspace</small></span><span>⌄</span></button>
        <nav aria-label="Investigation workflow">
          <div className="nav-heading">Investigation</div>
          {steps.map((step, i) => <button key={step.id} onClick={() => i <= completed && setScreen(step.id)} disabled={i > completed} aria-current={screen === step.id ? "page" : undefined} className={screen === step.id || (screen === "running" && step.id === "analyze") ? "active" : ""}><span className="nav-icon">{icons[step.id]}</span>{step.label}{i < completed && <span className="nav-check">✓</span>}</button>)}
          <div className="nav-heading lower">Operations</div>
          <button onClick={() => setScreen("history")} className={screen === "history" ? "active" : ""}><span className="nav-icon">{icons.history}</span>Run history</button>
          <button onClick={() => setScreen("support")} className={screen === "support" ? "active" : ""}><span className="nav-icon">{icons.support}</span>Support console<span className="role-tag">OPERATOR</span></button>
        </nav>
        <div className="sidebar-foot"><span className="health-dot" />All systems operational</div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Landing({ enter }: { enter: () => void }) {
  return <div className="landing">
    <nav className="landing-nav"><Brand /><div><a href="#workflow">How it works</a><a href="#trust">Built for evidence</a><a className="button ghost" href="#architecture">View architecture</a></div></nav>
    <section className="hero"><div className="hero-copy"><div className="kicker"><span />INVESTIGATE RELATIONSHIPS, NOT ROWS</div><h1>Find the signal<br />hidden <em>between</em><br />transactions.</h1><p>GraphShield turns tabular fraud data into explainable network investigations—without requiring graph expertise.</p><div className="hero-actions"><button className="button primary large" onClick={enter}>Explore the seeded case <span>→</span></button><span className="no-signup">No sign-up · Results in under 2 minutes</span></div></div>
      <div className="hero-visual" aria-label="Preview of a suspicious account network"><div className="visual-top"><span className="tiny-logo">G</span><span>Live investigation</span><StatusPill tone="danger">Elevated pattern</StatusPill></div><GraphCanvas compact selected="A-1047" /><div className="signal-card"><span className="signal-number">01</span><div><strong>Shared infrastructure cluster</strong><p>9 accounts connected through 2 devices and 1 IP</p></div><span className="arrow">↗</span></div></div>
    </section>
    <section className="trust-strip" id="trust"><span>DURABLE WORKSPACE</span><span>•</span><span>EXPLAINABLE RESULTS</span><span>•</span><span>AUDITABLE RUNS</span><span>•</span><span>FORMULA-SAFE EXPORTS</span></section>
    <section className="workflow-section" id="workflow"><div><div className="eyebrow">FROM TABLES TO EVIDENCE</div><h2>A guided path through<br />graph analytics.</h2></div><div className="workflow-cards">{[["01","Connect","Start with seeded evidence or bring CSV files."],["02","Shape","Map rows to entities and relationships with guardrails."],["03","Investigate","Choose a question, not an algorithm."],["04","Explain","Review ranked evidence with explicit limitations."]].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="architecture-section" id="architecture"><div className="architecture-copy"><div className="eyebrow">PRODUCTION-SHAPED BY DESIGN</div><h2>Every result has<br />an evidence trail.</h2><p>The reviewer path is instant, while the system behind it includes authenticated persistence, expiring uploads, leased workers, and a live Neo4j GDS adapter.</p><div className="proof-grid"><div><strong>3</strong><span>real graph algorithms</span></div><div><strong>5</strong><span>audited job stages</span></div><div><strong>24h</strong><span>upload retention</span></div><div><strong>0</strong><span>serious axe findings</span></div></div></div><div className="architecture-flow"><div><span>01</span><strong>React workbench</strong><small>Accessible investigation UX</small></div><i>→</i><div><span>02</span><strong>Versioned APIs</strong><small>Identity, validation, idempotency</small></div><i>→</i><div><span>03</span><strong>Durable worker</strong><small>Leases, heartbeats, recovery</small></div><i>→</i><div><span>04</span><strong>Neo4j GDS</strong><small>Projection, compute, cleanup</small></div></div></section>
    <footer className="landing-footer"><Brand/><p>Independent portfolio project · Synthetic data only · Results prioritize review, never guilt.</p><a href="#">Back to top ↑</a></footer>
  </div>;
}

function SourceScreen({ next, workspace }: { next: () => void; workspace: Workspace }) {
  const [tab, setTab] = useState<"demo"|"csv">("demo"); const [uploaded, setUploaded] = useState<Array<{name:string;detail:string;valid:boolean}>>([]); const [uploading,setUploading]=useState(false); const [uploadError,setUploadError]=useState(""); const input = useRef<HTMLInputElement>(null);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {const files=Array.from(event.target.files||[]);setUploadError("");setUploading(true);const nextFiles:Array<{name:string;detail:string;valid:boolean}>=[];for(const file of files){if(!file.name.toLowerCase().endsWith(".csv")||file.size>25_000_000){nextFiles.push({name:file.name,detail:"CSV files must be 25 MB or smaller",valid:false});continue}try{if(workspace.mode==="connected"){const profile=await profileUpload(workspace.projectId,file);nextFiles.push({name:file.name,detail:`${profile.rowCount.toLocaleString()} rows · ${profile.columns.length} profiled columns`,valid:true})}else{nextFiles.push({name:file.name,detail:"Validated locally · durable upload unavailable",valid:true})}}catch(error){nextFiles.push({name:file.name,detail:error instanceof Error?error.message:"Profiling failed",valid:false});setUploadError("One or more files need attention.")}}setUploaded(nextFiles);setUploading(false)};
  return <><PageHeader eyebrow="STEP 1 OF 4 · SOURCE" title="Choose your evidence" description="Start with a prepared investigation or upload your own transaction tables." />
    <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === "demo"} onClick={()=>setTab("demo")}>Seeded case</button><button role="tab" aria-selected={tab === "csv"} onClick={()=>setTab("csv")}>Upload CSV</button><button role="tab" disabled>Snowflake <span className="soon">SIMULATED</span></button></div>
    {tab === "demo" ? <div className="source-layout"><section className="panel featured-source"><div className="source-cover"><span className="cover-label">DEMO CASE · GS-0926</span><div className="case-nodes"><i/><i/><i/><i/><i/></div></div><div className="source-content"><div><StatusPill tone="success">{workspace.mode === "connected" ? "Persisted workspace ready" : "Ready to investigate"}</StatusPill><h2>September card network</h2><p>A deterministic synthetic dataset containing a transfer ring, shared devices, a mule hub, and a legitimate high-volume merchant control.</p></div><div className="source-stats"><div><strong>42K</strong><span>Rows</span></div><div><strong>4</strong><span>Tables</span></div><div><strong>5</strong><span>Planted patterns</span></div></div><button className="button primary" onClick={next}>Use this evidence <span>→</span></button></div></section>
      <aside className="panel case-notes"><div className="eyebrow">CASE NOTES</div><h3>What’s been planted?</h3>{["14-account transfer ring","Mule hub with 30 senders","Shared-device clusters","Bridge between two groups","Merchant false-positive control"].map((x,i)=><div className="note-row" key={x}><span>0{i+1}</span><p>{x}</p></div>)}<div className="privacy-note"><strong>✓ Safe by design</strong><p>All entities are fictional. Seed 90426 makes every run repeatable.</p></div></aside></div> : <section className="panel upload-panel"><button className="dropzone" disabled={uploading} onClick={()=>input.current?.click()} onKeyDown={(e: KeyboardEvent)=>e.key === "Enter" && input.current?.click()}><span className="upload-icon">{uploading?"…":"↑"}</span><strong>{uploading?"Profiling your evidence":"Drop CSV files here or choose files"}</strong><small>CSV only · up to 25 MB each · encrypted object storage · expires after 24 hours</small></button><input ref={input} type="file" accept=".csv,text/csv" multiple hidden onChange={upload}/>{uploadError&&<div className="upload-error" role="alert">! {uploadError}</div>}{uploaded.map(file=><div className="file-row" key={file.name}><span>▤</span><div><strong>{file.name}</strong><small>{file.detail}</small></div><StatusPill tone={file.valid?"success":"danger"}>{file.valid?"Profiled":"Review"}</StatusPill></div>)}<div className="panel-actions"><span>{workspace.mode==="connected"?"Stored securely with an automatic 24-hour expiry.":"Demo fallback: raw rows stay on this device."}</span><button className="button primary" disabled={!uploaded.some(f=>f.valid)||uploading} onClick={next}>Continue to mapping <span>→</span></button></div></section>}
  </>;
}

function MappingScreen({ next }: { next: () => void }) {
  const [warningOpen, setWarningOpen] = useState(true);
  return <><PageHeader eyebrow="STEP 2 OF 4 · MAP" title="Shape the graph" description="Define what each row represents. We have suggested a mapping from the source profile." action={<button className="button ghost">Advanced JSON</button>} />
    <div className="mapping-layout"><div className="mapping-form"><div className="section-title"><div><span className="number">1</span><div><h2>Entities</h2><p>Unique things in your investigation</p></div></div><button className="text-button">+ Add entity</button></div>
      <MappingCard title="Account" badge="NODE" color="coral" fields={[["Source table","accounts"],["Unique ID","account_id"],["Properties","status, risk_band, opened_at"]]} />
      <MappingCard title="Device" badge="NODE" color="blue" fields={[["Source table","account_devices"],["Unique ID","device_id"],["Properties","last_seen"]]} />
      <div className="section-title spaced"><div><span className="number">2</span><div><h2>Relationships</h2><p>How those things connect</p></div></div><button className="text-button">+ Add relationship</button></div>
      <MappingCard title="USES" badge="RELATIONSHIP" color="mint" fields={[["Source table","account_devices"],["From","Account · account_id"],["To","Device · device_id"]]} />
      {warningOpen && <div className="inline-warning"><span>!</span><div><strong>43 device references have no matching profile row</strong><p>Those relationships will be excluded. This affects 1.1% of device links and will not block the investigation.</p><button onClick={()=>setWarningOpen(false)}>Acknowledge warning</button></div></div>}
      <div className="sticky-actions"><span><b>✓</b> Mapping is valid with 1 acknowledged warning</span><button className="button primary" onClick={next}>Save & preview <span>→</span></button></div></div>
      <aside className="mapping-preview"><div className="preview-head"><div><span className="eyebrow">LIVE MODEL</span><h3>How your graph reads</h3></div><StatusPill tone="success">Valid</StatusPill></div><div className="concept-map"><div className="concept-node coral">Account<small>3,000 nodes</small></div><div className="concept-edge"><span>USES</span><i>→</i><small>3,957 relationships</small></div><div className="concept-node blue">Device<small>1,800 nodes</small></div></div><blockquote>“Each row in <b>account_devices</b> connects one Account to one Device using account_id and device_id.”</blockquote><div className="validation-list"><h4>Validation</h4><p><span>✓</span> Account IDs are unique</p><p><span>✓</span> Device IDs are present</p><p className="warn"><span>!</span> 43 orphan device references</p><p><span>✓</span> Relationship type is compatible</p></div></aside></div>
  </>;
}

function MappingCard({ title, badge, color, fields }: { title: string; badge: string; color: string; fields: string[][] }) {
  return <section className="mapping-card"><div className={`mapping-card-head ${color}`}><span className="mapping-symbol">{badge === "NODE" ? "●" : "→"}</span><div><h3>{title}</h3><span>{badge}</span></div><button aria-label={`More options for ${title}`}>•••</button></div><div className="field-grid">{fields.map(([label,value])=><label key={label}><span>{label}</span><button className="select-like">{value}<i>⌄</i></button></label>)}</div></section>;
}

function PreviewScreen({ next, back }: { next: () => void; back: () => void }) {
  const [selected, setSelected] = useState("A-1047"); const node = nodes.find(n=>n.id===selected);
  return <><PageHeader eyebrow="STEP 3 OF 4 · PREVIEW" title="Check the projection" description="This stable sample helps you catch mapping issues before computation." action={<StatusPill tone="success">Ready for analysis</StatusPill>} />
    <div className="metric-row">{[["Projected nodes","4,800"],["Relationships","3,957"],["Entity labels","2"],["Relationship types","1"]].map(([l,v])=><div className="metric" key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>
    <div className="preview-layout"><section className="panel graph-panel"><div className="panel-toolbar"><div><button className="active">Graph</button><button>Sample rows</button></div><span>Deterministic sample · 40 of 4,800 nodes</span></div><GraphCanvas selected={selected} onSelect={setSelected}/><div className="legend"><span><i className="legend-dot account"/>Account</span><span><i className="legend-dot device"/>Device</span><span><i className="legend-line"/>USES</span></div></section>
      <aside className="panel inspector"><div className="inspector-label">SELECTED ENTITY</div><div className="entity-heading"><span className={`entity-icon ${node?.kind}`}>{node?.kind === "account" ? "A" : "D"}</span><div><h3>{node?.id}</h3><StatusPill tone={node?.risk === "High" ? "danger" : "neutral"}>{node?.kind}</StatusPill></div></div><dl><dt>Entity type</dt><dd>{node?.kind}</dd><dt>Risk band</dt><dd>{node?.risk || "Not scored"}</dd><dt>Sample degree</dt><dd>{edges.filter(e=>e.source===selected||e.target===selected).length} connections</dd><dt>Component</dt><dd>Not computed yet</dd></dl><button className="button ghost full">Expand neighbors</button><div className="inspector-tip"><b>Why sample?</b><p>The full result remains available as a table. Capping the canvas keeps investigation responsive.</p></div></aside></div>
    <div className="footer-actions"><button className="button ghost" onClick={back}>← Fix mapping</button><div><span>Warnings acknowledged · source checksum <code>a93f…0c2e</code></span><button className="button primary" onClick={next}>Approve projection <span>→</span></button></div></div>
  </>;
}

const analyses = [
  { id: "WCC" as Algorithm, number: "01", title: "Find suspicious groups", algorithm: "Weakly Connected Components", question: "Which entities are connected into unusually large groups?", detail: "Best for shared devices, IP addresses, and transfer networks.", icon: "⌬", accent: "coral" },
  { id: "PAGERANK" as Algorithm, number: "02", title: "Identify key accounts", algorithm: "PageRank", question: "Which accounts occupy structurally important positions?", detail: "Ranks influence within directed transfer relationships.", icon: "↗", accent: "violet" },
  { id: "SHORTEST_PATH" as Algorithm, number: "03", title: "Trace a connection", algorithm: "Shortest path", question: "How can one entity be reached from another?", detail: "Returns the smallest explainable chain of permitted links.", icon: "⌁", accent: "blue" },
];

function AnalyzeScreen({ run }: { run: (a: Algorithm) => void }) {
  const [selected, setSelected] = useState<Algorithm>("WCC"); const active = analyses.find(a=>a.id===selected)!;
  return <><PageHeader eyebrow="STEP 4 OF 4 · ANALYZE" title="What do you want to investigate?" description="Choose the question that matches your case. Technical settings stay reviewable." />
    <div className="analysis-grid">{analyses.map(a=><button key={a.id} onClick={()=>setSelected(a.id)} className={`analysis-card ${selected===a.id ? "selected" : ""}`}><div className={`analysis-icon ${a.accent}`}>{a.icon}</div><span className="card-number">{a.number}</span><h2>{a.title}</h2><p className="question">{a.question}</p><p>{a.detail}</p><div className="algorithm-label"><span>{a.algorithm}</span><i>{selected===a.id?"✓":"→"}</i></div></button>)}</div>
    <section className="panel configuration"><div className="config-head"><div><span className="eyebrow">CONFIGURATION</span><h2>{active.title}</h2></div><button className="text-button">Reset defaults</button></div>{selected === "WCC" ? <div className="config-fields"><label><span>Relationship types</span><button className="select-like">USES, CONNECTED_FROM <i>⌄</i></button></label><label><span>Minimum group size</span><input defaultValue="3" type="number" min="2" /></label><label><span>Direction</span><button className="select-like">Ignore direction <i>⌄</i></button><small>Connectivity works in either direction.</small></label></div> : selected === "PAGERANK" ? <div className="config-fields"><label><span>Relationship type</span><button className="select-like">TRANSFERRED_TO <i>⌄</i></button></label><label><span>Damping factor</span><input defaultValue="0.85" type="number" step=".01" min="0" max=".99" /></label><label><span>Maximum iterations</span><input defaultValue="20" type="number" min="1" /></label></div> : <div className="config-fields"><label><span>Starting entity</span><input defaultValue="A-1047" /></label><label><span>Target entity</span><input defaultValue="A-7314" /></label><label><span>Relationship types</span><button className="select-like">All mapped types <i>⌄</i></button></label></div>}
      <div className="estimate"><div><span className="estimate-icon">≈</span><div><strong>Estimated run: under 15 seconds</strong><p>4,800 nodes · 3,957 relationships · sampled compute estimate</p></div></div><div className="caveat"><b>Interpretation limit</b><p>{selected === "PAGERANK" ? "A high score is not a fraud probability." : selected === "WCC" ? "Connectivity does not establish guilt or causality." : "A short path does not prove coordination."}</p></div></div>
      <div className="run-action"><span>Source and mapping versions will be attached to this run.</span><button className="button primary large" onClick={()=>run(selected)}>Run investigation <span>→</span></button></div></section>
  </>;
}

function RunningScreen({ algorithm, done, cancel, back, runId }: { algorithm: Algorithm; done: () => void; cancel: () => void; back: () => void; runId: string }) {
  const [progress, setProgress] = useState(8); const [cancelled, setCancelled] = useState(false);
  useEffect(()=>{ if(cancelled) return; const timer=setInterval(()=>setProgress(p=>Math.min(100,p+7)),420); return()=>clearInterval(timer); },[cancelled]);
  useEffect(()=>{ if(progress===100){const t=setTimeout(done,600); return()=>clearTimeout(t)} },[progress,done]);
  const stage = progress < 32 ? 0 : progress < 78 ? 1 : 2;
  return <div className="run-screen"><div className="run-orbit"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span>{cancelled ? "×" : `${progress}%`}</span></div><StatusPill tone={cancelled?"danger":"active"}>{cancelled?"Cancelled":"Analysis in progress"}</StatusPill><h1>{cancelled ? "Run cancelled safely" : analyses.find(a=>a.id===algorithm)?.title}</h1><p>{cancelled ? "No results were written and temporary graph resources were cleaned." : "You can leave this page. Progress and results are saved automatically."}</p>
    {!cancelled && <div className="timeline">{[["Projecting","Building the in-memory graph"],["Computing",algorithm === "WCC" ? "Finding connected groups" : algorithm === "PAGERANK" ? "Ranking structural importance" : "Tracing the permitted path"],["Writing","Persisting explainable results"]].map(([title,sub],i)=><div key={title} className={i<stage?"complete":i===stage?"current":""}><span>{i<stage?"✓":i+1}</span><div><strong>{title}</strong><small>{sub}</small></div>{i===stage&&<b>Running</b>}</div>)}</div>}
    <div className="run-meta"><span>Run ID <code>{runId}</code></span><span>Durably recorded</span><span>Attempt 1</span></div>{!cancelled ? <button className="button danger-button" onClick={()=>{setCancelled(true);cancel()}}>Cancel run</button> : <button className="button primary" onClick={back}>Return to analysis</button>}</div>;
}

function ResultsScreen({ algorithm, goSupport, runId }: { algorithm: Algorithm; goSupport: () => void; runId: string }) {
  const [selected,setSelected]=useState("A-1047"); const [query,setQuery]=useState(""); const selectedNode=nodes.find(n=>n.id===selected);
  const rows=results.filter(r=>r.id.toLowerCase().includes(query.toLowerCase()));
  const exportCsv=()=>{const safe=(v:string)=>/^[=+\-@]/.test(v)?`'${v}`:v;const csv=["# GraphShield export",`# run_id,${runId}`,"# source_checksum,a93f0c2e","rank,entity_id,component_id,component_size,risk_band,reason",...rows.map(r=>[r.rank,safe(r.id),r.group,r.size,r.risk,`\"${r.reason}\"`].join(","))].join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`graphshield-${runId}.csv`;a.click();URL.revokeObjectURL(a.href)};
  return <><PageHeader eyebrow={`${runId.toUpperCase()} · COMPLETED`} title={algorithm === "WCC" ? "A connected cluster deserves review" : algorithm === "PAGERANK" ? "Structurally important accounts ranked" : "A four-hop connection was found"} description="GraphShield found evidence worth investigating—not proof of fraudulent activity." action={<div className="header-actions"><button className="button ghost" onClick={goSupport}>View run log</button><button className="button primary" onClick={exportCsv}>Export CSV ↓</button></div>} />
    <div className="summary-banner"><div className="summary-index">01</div><div><span>TOP FINDING</span><h2>Group 17 links 9 accounts through shared infrastructure</h2><p>Six accounts form a circular transfer pattern; four share devices or IP addresses. A bridge account connects the group to otherwise unrelated activity.</p></div><div className="summary-stat"><strong>9</strong><span>members</span></div><div className="summary-stat"><strong>3</strong><span>shared signals</span></div></div>
    <div className="result-meta"><span><b>8.4s</b> duration</span><span><b>4,800</b> nodes</span><span><b>3,957</b> relationships</span><span><b>Sep 4, 2026 · 14:32</b></span></div>
    <div className="results-layout"><section className="panel result-graph"><div className="panel-toolbar"><div><button className="active">Network</button><button>Evidence path</button></div><span>Group 17 · {nodes.length} visible nodes</span></div><GraphCanvas selected={selected} onSelect={setSelected}/><div className="legend"><span><i className="legend-dot account"/>Account</span><span><i className="legend-dot device"/>Device</span><span><i className="legend-dot ip"/>IP address</span></div></section><aside className="panel evidence-panel"><div className="inspector-label">WHY THIS ENTITY APPEARS</div><div className="entity-heading"><span className={`entity-icon ${selectedNode?.kind}`}>{selectedNode?.kind === "account" ? "A" : selectedNode?.kind === "device" ? "D" : "IP"}</span><div><h3>{selected}</h3><StatusPill tone={selectedNode?.risk === "High" ? "danger" : "neutral"}>{selectedNode?.risk || selectedNode?.kind}</StatusPill></div></div><p className="explanation">{results.find(r=>r.id===selected)?.reason || "This infrastructure node is shared by multiple accounts in the component."}</p><div className="evidence-kpis"><div><strong>{edges.filter(e=>e.source===selected||e.target===selected).length}</strong><span>Direct links</span></div><div><strong>{selectedNode?.score ? `${Math.round(selectedNode.score*1000)/10}%` : "—"}</strong><span>PageRank share</span></div></div><h4>Recommended next step</h4><p>Compare account ownership and transaction timing before escalating this cluster.</p><button className="button ghost full">Add to case notes</button></aside></div>
    <section className="panel result-table"><div className="table-head"><div><h2>Component members</h2><p>Table is the complete and accessible result record.</p></div><label className="search"><span>⌕</span><input aria-label="Filter entities" placeholder="Filter entity ID" value={query} onChange={e=>setQuery(e.target.value)}/></label></div><div className="table-scroll"><table><thead><tr><th>Rank</th><th>Entity ID</th><th>Component</th><th>Group size</th><th>Risk band</th><th>Why it appears</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className={selected===r.id?"selected-row":""} onClick={()=>setSelected(r.id)}><td>{String(r.rank).padStart(2,"0")}</td><td><button>{r.id}</button></td><td>#{r.group}</td><td>{r.size}</td><td><StatusPill tone={r.risk==="High"?"danger":r.risk==="Medium"?"warning":"neutral"}>{r.risk}</StatusPill></td><td>{r.reason}</td></tr>)}</tbody></table></div></section>
    <div className="result-caveat"><span>i</span><p><strong>What this result does not prove</strong> Connected entities can share legitimate infrastructure. Treat this as a prioritized lead, not a verdict. Always review transaction context and ownership evidence.</p></div>
  </>;
}

function HistoryScreen({ select, workspace }: { select: (id: string, algorithm: Algorithm) => void; workspace: Workspace }) { const durable=(workspace.runs||[]).map(r=>({id:r.id,project:"September card network",algorithm:r.algorithm,status:r.status[0]+r.status.slice(1).toLowerCase(),duration:r.finishedAt?`${((r.finishedAt-r.createdAt)/1000).toFixed(1)}s`:"—",time:new Date(r.createdAt).toLocaleString()}));const history=durable.length?durable:runHistory;return <><PageHeader eyebrow="OPERATIONS" title="Run history" description="Resume, compare, and audit every investigation." action={<button className="button primary">New investigation +</button>} /><section className="panel result-table"><div className="table-head"><div><h2>Recent runs</h2><p>{history.length} {durable.length?"durably persisted":"seeded"} run{history.length===1?"":"s"}</p></div><label className="search"><span>⌕</span><input aria-label="Search runs" placeholder="Search run or project" /></label></div><div className="table-scroll"><table><thead><tr><th>Run</th><th>Project</th><th>Analysis</th><th>Status</th><th>Duration</th><th>Started</th><th /></tr></thead><tbody>{history.map(r=><tr key={r.id}><td><code>{r.id}</code></td><td>{r.project}</td><td>{r.algorithm}</td><td><StatusPill tone={r.status==="Succeeded"?"success":r.status==="Failed"?"danger":"warning"}>{r.status}</StatusPill></td><td>{r.duration}</td><td>{r.time}</td><td><button className="table-link" onClick={()=>select(r.id,(r.algorithm==="PAGERANK"||r.algorithm==="SHORTEST_PATH"?r.algorithm:"WCC") as Algorithm)}>Open →</button></td></tr>)}</tbody></table></div></section></> }

function SupportScreen({ runId }: { runId: string }) { const [copied,setCopied]=useState(false); return <><PageHeader eyebrow="OPERATOR CONSOLE" title="Service health & diagnosis" description="Sanitized operational context for resolving failed or slow investigations." action={<StatusPill tone="success">All systems operational</StatusPill>} /><div className="metric-row support-metrics">{[["Success rate","97.8%","+0.8%"],["Active runs","12","3 queued"],["p95 duration","18.4s","within SLO"],["Cleanup failures","0","last 24h"]].map(([l,v,d])=><div className="metric" key={l}><span>{l}</span><strong>{v}</strong><small>{d}</small></div>)}</div><div className="support-layout"><section className="panel diagnostic"><div className="diagnostic-head"><div><StatusPill tone="success">Succeeded</StatusPill><h2>{runId}</h2><p>September card network · WCC</p></div><button className="button ghost" onClick={()=>{navigator.clipboard?.writeText(`run_id=${runId}\nrequest_id=req_7be922\nstate=SUCCEEDED\nsource_checksum=a93f0c2e\ncleanup=complete`);setCopied(true)}}>{copied?"Copied ✓":"Copy incident bundle"}</button></div><div className="support-timeline">{[["QUEUED","14:32:01.042","Accepted by API","req_7be922"],["PROJECTING","14:32:01.318","4,800 nodes · 3,957 relationships","worker-02"],["COMPUTING","14:32:04.106","9 connected components found","attempt 1"],["WRITING","14:32:08.927","Result rows persisted","1,204 rows"],["SUCCEEDED","14:32:09.441","Temporary projection removed","cleanup ✓"]].map((e,i)=><div key={e[0]}><span className="timeline-mark">{i===4?"✓":""}</span><time>{e[1]}</time><div><strong>{e[0]}</strong><p>{e[2]}</p></div><code>{e[3]}</code></div>)}</div></section><aside className="panel run-facts"><h3>Run facts</h3><dl><dt>Request ID</dt><dd><code>req_7be922</code></dd><dt>Config hash</dt><dd><code>0f24…bc91</code></dd><dt>Source checksum</dt><dd><code>a93f…0c2e</code></dd><dt>Mapping version</dt><dd>v3 · immutable</dd><dt>Worker attempt</dt><dd>1 of 3</dd><dt>Cleanup</dt><dd><StatusPill tone="success">Complete</StatusPill></dd></dl><div className="log-block"><div><span>Sanitized logs</span><StatusPill>5 events</StatusPill></div><pre>{`14:32:01 INFO run.claimed\n14:32:01 INFO graph.project\n14:32:04 INFO wcc.compute\n14:32:08 INFO result.write\n14:32:09 INFO graph.cleanup`}</pre></div><button className="button ghost full">Open runbook ↗</button></aside></div></> }

export function GraphShieldApp() {
  const [screen,setScreenState]=useState<Screen>("landing"); const [completed,setCompleted]=useState(0); const [algorithm,setAlgorithm]=useState<Algorithm>("WCC"); const [workspace,setWorkspace]=useState<Workspace>({mode:"connecting",projectId:""}); const [runId,setRunId]=useState("run_f7a91c");
  useEffect(()=>{const timer=window.setTimeout(()=>{const saved=localStorage.getItem("graphshield-screen") as Screen|null;const savedCompleted=Number(localStorage.getItem("graphshield-completed")||0);if(saved && saved!=="running")setScreenState(saved);setCompleted(savedCompleted);connectWorkspace().then(setWorkspace)},0);return()=>clearTimeout(timer)},[]);
  const setScreen=(s:Screen)=>{setScreenState(s); if(s!=="landing"&&s!=="running")localStorage.setItem("graphshield-screen",s); window.scrollTo({top:0,behavior:"smooth"})};
  const advance=(to:Screen,index:number)=>{setCompleted(c=>{const next=Math.max(c,index);localStorage.setItem("graphshield-completed",String(next));return next});setScreen(to)};
  if(screen==="landing") return <Landing enter={async()=>{if(workspace.mode==="connecting")setWorkspace(await connectWorkspace());advance("source",0)}} />;
  let content:React.ReactNode;
  if(screen==="source")content=<SourceScreen workspace={workspace} next={()=>advance("mapping",1)}/>;
  else if(screen==="mapping")content=<MappingScreen next={()=>advance("preview",2)}/>;
  else if(screen==="preview")content=<PreviewScreen back={()=>setScreen("mapping")} next={()=>advance("analyze",3)}/>;
  else if(screen==="analyze")content=<AnalyzeScreen run={async a=>{setAlgorithm(a);try{const id=await submitRun(workspace,a);setRunId(id);setWorkspace(current=>({...current,runs:[{id,projectId:current.projectId,algorithm:a,status:"SUCCEEDED",progress:100,createdAt:Date.now(),finishedAt:Date.now()+8400},...(current.runs||[])]}))}catch{setRunId("run_fallback")};setScreen("running")}}/>;
  else if(screen==="running")content=<RunningScreen runId={runId} algorithm={algorithm} cancel={()=>setCompleted(3)} back={()=>setScreen("analyze")} done={()=>advance("results",4)}/>;
  else if(screen==="results")content=<ResultsScreen runId={runId} algorithm={algorithm} goSupport={()=>setScreen("support")}/>;
  else if(screen==="history")content=<HistoryScreen workspace={workspace} select={(id,a)=>{setRunId(id);setAlgorithm(a);advance("results",4)}}/>;
  else content=<SupportScreen runId={runId}/>;
  return <AppShell screen={screen} setScreen={setScreen} completed={completed} workspace={workspace}>{content}</AppShell>;
}
