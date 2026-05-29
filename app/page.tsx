const proofInputs = [
  "Resume",
  "GitHub",
  "Projects",
  "Coursework",
  "Hackathons",
  "Internships",
  "Club work",
  "Writing",
  "Coding-agent sessions",
  "Proof missions",
  "Technical assessments",
  "Interview feedback",
  "Recruiter-agent context",
];

const artifacts = [
  {
    title: "Mission builder",
    body: "Companies can create role-specific proof missions that test the work they actually need: API design, debugging, data analysis, product judgment, technical writing, or systems thinking.",
  },
  {
    title: "Proof map",
    body: "Each completed mission becomes part of a candidate-owned evidence map with claims, artifacts, timestamps, reviewer notes, and supporting work across GitHub and projects.",
  },
  {
    title: "Gap plan",
    body: "Rolemate shows which target roles the candidate is close to, which proof is missing, and what mission, project, or prep artifact would improve fit fastest.",
  },
  {
    title: "Employer view",
    body: "Hiring teams and recruiting agents get a shortlist organized by evidence quality, role fit, mission performance, communication signal, and growth trajectory before interviews.",
  },
];

const postMarketPains = [
  {
    title: "Mission fatigue",
    body: "If every company creates its own proof task, candidates will drown in unpaid assignments. Rolemate makes proof reusable, permissioned, and role-mapped.",
  },
  {
    title: "Assessment fragmentation",
    body: "A candidate may complete strong work across five companies and still have no portable record. Rolemate turns repeated assessments into a durable proof passport.",
  },
  {
    title: "Recruiter-agent opacity",
    body: "If always-on AI recruiters become common, candidates need machine-readable proof packets that show why an agent should route them forward.",
  },
  {
    title: "Reviewer bandwidth",
    body: "Proof-of-work hiring only scales if companies can review evidence quickly. Rolemate summarizes, compares, and routes the highest-signal candidates first.",
  },
];

const mcpTools = [
  "rolemate.create_mission",
  "rolemate.submit_mission_artifact",
  "rolemate.generate_proof_map",
  "rolemate.compare_to_role",
  "rolemate.recommend_next_proof",
  "rolemate.draft_referral_context",
  "rolemate.prepare_agent_packet",
];

const competitors = [
  {
    name: "Velric",
    focus: "Employer-created missions, proof-of-work hiring, standardized talent validation",
    rolemate: "Mission marketplace plus candidate-owned proof passport, reusable evidence, MCP/API access, and cross-employer fit intelligence",
  },
  {
    name: "Findr.es",
    focus: "Always-on AI recruiter layer for sourcing, screening, and routing candidates",
    rolemate: "Agent-readable proof packets that give recruiter agents verified evidence, reusable mission results, and candidate-controlled context",
  },
  {
    name: "AIApply, JobCopilot, LazyApply",
    focus: "Application volume, autofill, resume tailoring, cover letters",
    rolemate: "Lower-volume targeting based on missions, proof, fit, and next evidence to build",
  },
  {
    name: "Simplify, Teal, Huntr",
    focus: "Job tracking, resume tools, keyword matching, browser extensions",
    rolemate: "Portable proof graph that moves across ChatGPT, Claude, recruiters, referrers, and company tools",
  },
  {
    name: "Final Round AI",
    focus: "Interview practice and real-time interview assistance",
    rolemate: "Interview prep grounded in mission results, target-role gaps, and the candidate's real evidence",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] text-[#111111]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-black/15 pb-4 text-xs uppercase tracking-[0.22em]">
          <span className="font-semibold">Rolemate</span>
          <span className="hidden text-black/55 sm:inline">Proof missions + recruiter-agent signal</span>
          <a href="#mcp" className="font-semibold underline underline-offset-4">MCP ready</a>
        </nav>

        <div className="grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex border border-black/20 bg-white px-3 py-2 text-xs uppercase tracking-[0.18em]">
              Velric-level missions. Findr-ready proof packets.
            </div>
            <h1 className="max-w-5xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
              Proof-of-work hiring needs a memory layer.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-black/68">
              Rolemate gives companies role-specific proof missions and gives candidates a reusable proof passport. As AI recruiters and proof-of-work hiring spread, completed work should compound instead of disappearing after each application.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/api/mcp" className="btn-solid-dark">View MCP endpoint</a>
              <a href="#post-market" className="btn-outline-dark">Post-market wedge</a>
            </div>
          </div>

          <div className="border border-black bg-white p-4 shadow-[10px_10px_0_#111]">
            <div className="border-b border-black/15 pb-3 text-xs uppercase tracking-[0.2em] text-black/55">
              Agent-readable proof packet
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-black/50">Target</div>
                <div className="mt-1 text-2xl font-semibold">Backend AI Intern</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Mission result", "Designed a job-post parser API with tests and edge-case notes"],
                  ["Evidence", "GitHub repos, Voya ETL, Rolemate, hackathon builds"],
                  ["Reusable claims", "API design, data pipelines, RAG, product shipping"],
                  ["Agent packet", "Why this candidate should be routed to human review"],
                ].map(([label, value]) => (
                  <div key={label} className="border border-black/15 bg-[#faf7f0] p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-black/45">{label}</div>
                    <div className="mt-2 text-sm leading-6">{value}</div>
                  </div>
                ))}
              </div>
              <div className="border border-black bg-black p-4 text-white">
                <div className="text-xs uppercase tracking-[0.18em] text-white/55">System output</div>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  Completed proof should compound across roles, referrers, mentors, companies, and recruiter agents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="strategy" className="border-y border-black bg-white px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">Minimum bar</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                Rolemate starts with the thing Velric is proving: resumes are too weak.
              </h2>
              <p className="mt-5 text-base leading-7 text-black/62">
                The product must support proof missions directly. The difference is what happens after missions and always-on recruiter agents become normal.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {artifacts.map((item) => (
                <article key={item.title} className="border border-black/15 bg-[#f6f1e8] p-5">
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-black/65">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="post-market" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">Post-Velric / post-Findr wedge</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              If proof missions and AI recruiters win, the next pain is proof routing.
            </h2>
            <p className="mt-5 text-base leading-7 text-black/62">
              A successful Velric-like market creates repeated proof tasks. A successful Findr-like market creates always-on recruiter agents deciding who gets routed forward. Rolemate is built for the second-order market where proof must be reusable, comparable, permissioned, and machine-readable.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {postMarketPains.map((item) => (
              <article key={item.title} className="border border-black bg-white p-5">
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/65">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black bg-white px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">Inputs</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Rolemate reads formal missions, informal proof, and agent context.
            </h2>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {proofInputs.map((input) => (
              <span key={input} className="border border-black bg-[#f6f1e8] px-3 py-2 text-sm font-medium">
                {input}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="mcp" className="bg-black px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">MCP and API layer</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Rolemate should be callable from any serious AI hiring surface.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/65">
              ChatGPT, Claude, Cursor, internal recruiting agents, career-center tools, or a company ATS can call Rolemate as a tool. The moat is structured proof, mission memory, and agent-readable context.
            </p>
          </div>
          <div className="border border-white/20 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/45">Available tools</div>
            <div className="mt-4 space-y-2 font-mono text-sm">
              {mcpTools.map((tool) => (
                <div key={tool} className="border border-white/15 bg-black px-3 py-3 text-white/80">
                  {tool}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <p className="text-xs uppercase tracking-[0.24em] text-black/45">Competitive wedge</p>
        <h2 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Match proof-of-work hiring, then own portability, reuse, and agent routing.
        </h2>
        <div className="mt-8 grid gap-3">
          {competitors.map((row) => (
            <article key={row.name} className="grid gap-3 border border-black bg-white p-4 lg:grid-cols-[0.85fr_1fr_1fr]">
              <h3 className="text-xl font-semibold">{row.name}</h3>
              <p className="text-sm leading-6 text-black/60">{row.focus}</p>
              <p className="text-sm leading-6 font-medium">{row.rolemate}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-black bg-[#111] px-5 py-12 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">Rolemate</div>
            <p className="mt-1 text-sm text-white/55">Free for builders. Businesses pay for mission design, stronger technical signal, evidence review, and recruiter-agent routing.</p>
          </div>
          <a href="/api/proof-map" className="btn-outline-light">View proof-map API</a>
        </div>
      </section>
    </main>
  );
}
