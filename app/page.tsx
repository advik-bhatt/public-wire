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
];

const artifacts = [
  {
    title: "Proof map",
    body: "Shows what a candidate can credibly claim, where the evidence lives, and which claims need stronger support.",
  },
  {
    title: "Gap plan",
    body: "Turns a target role into missing proof, next projects, technical prep, and the smallest artifact that improves fit.",
  },
  {
    title: "Referral context",
    body: "Gives referrers, mentors, and managers enough evidence to understand why the candidate is relevant.",
  },
  {
    title: "Employer view",
    body: "Helps teams review candidates through evidence, fit, and growth signal before spending interview bandwidth.",
  },
];

const mcpTools = [
  "rolemate.generate_proof_map",
  "rolemate.compare_to_role",
  "rolemate.recommend_next_proof",
  "rolemate.draft_referral_context",
];

const competitors = [
  {
    name: "AIApply, JobCopilot, LazyApply",
    focus: "Application volume, autofill, resume tailoring, cover letters",
    rolemate: "Lower-volume targeting based on proof, fit, and next evidence to build",
  },
  {
    name: "Simplify, Teal, Huntr",
    focus: "Job tracking, resume tools, keyword matching, browser extensions",
    rolemate: "Portable proof graph that moves across ChatGPT, Claude, recruiters, referrers, and company tools",
  },
  {
    name: "Final Round AI",
    focus: "Interview practice and real-time interview assistance",
    rolemate: "Interview prep grounded in the candidate's real proof and target-role gaps",
  },
  {
    name: "Velric",
    focus: "Employer missions, standardized proof-of-work scoring, validated talent pool",
    rolemate: "Candidate-owned evidence layer that grows before, during, and after any hiring process",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] text-[#111111]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-black/15 pb-4 text-xs uppercase tracking-[0.22em]">
          <span className="font-semibold">Rolemate</span>
          <span className="hidden text-black/55 sm:inline">Proof infrastructure for technical hiring</span>
          <a href="#mcp" className="font-semibold underline underline-offset-4">MCP ready</a>
        </nav>

        <div className="grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex border border-black/20 bg-white px-3 py-2 text-xs uppercase tracking-[0.18em]">
              Candidate-owned proof graph
            </div>
            <h1 className="max-w-5xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
              Hiring signal for the AI application era.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-black/68">
              Rolemate turns scattered technical work into role-specific proof maps, gap plans, referral context, and interview prep. It gives candidates stronger signal and gives companies faster evidence before interviews.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/api/mcp" className="btn-solid-dark">View MCP endpoint</a>
              <a href="#strategy" className="btn-outline-dark">See the wedge</a>
            </div>
          </div>

          <div className="border border-black bg-white p-4 shadow-[10px_10px_0_#111]">
            <div className="border-b border-black/15 pb-3 text-xs uppercase tracking-[0.2em] text-black/55">
              Live proof packet
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-black/50">Target</div>
                <div className="mt-1 text-2xl font-semibold">Backend AI Intern</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Credible claims", "API design, data pipelines, RAG, product shipping"],
                  ["Evidence", "GitHub repos, Voya ETL, Rolemate, hackathon builds"],
                  ["Missing proof", "Load testing, production users, eval results"],
                  ["Next artifact", "Deploy a public MCP demo with usage logs"],
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
                  Apply to fewer roles. Show stronger evidence. Ask warmer people with a packet they can trust.
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
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">Why now</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                AI made applying cheap. Proof becomes the bottleneck.
              </h2>
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

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">Inputs</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Rolemate reads the work candidates already create.
            </h2>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {proofInputs.map((input) => (
              <span key={input} className="border border-black bg-white px-3 py-2 text-sm font-medium">
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
              Rolemate does not need to trap users inside another chatbot.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/65">
              ChatGPT, Claude, Cursor, internal company agents, or a future recruiter console can call Rolemate as a tool. The product value becomes the structured career evidence layer, not the chat box around it.
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
          The category is crowded. The defensible surface is portable proof.
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
            <p className="mt-1 text-sm text-white/55">Free for builders. Businesses pay for stronger technical signal.</p>
          </div>
          <a href="/api/proof-map" className="btn-outline-light">View proof-map API</a>
        </div>
      </section>
    </main>
  );
}
