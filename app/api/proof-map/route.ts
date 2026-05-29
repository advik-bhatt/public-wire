import { NextResponse } from "next/server";

type ProofInput = {
  targetRole?: string;
  missionResult?: string;
  resumeText?: string;
  githubSummary?: string;
  projectSummary?: string;
  recruiterAgentContext?: string;
};

function listSignals(input: ProofInput) {
  const signals = [];

  if (input.missionResult) {
    signals.push({
      label: "Mission performance",
      evidence: input.missionResult,
      strength: "high",
    });
  }

  if (input.githubSummary) {
    signals.push({
      label: "Repository evidence",
      evidence: input.githubSummary,
      strength: "medium",
    });
  }

  if (input.projectSummary) {
    signals.push({
      label: "Project evidence",
      evidence: input.projectSummary,
      strength: "medium",
    });
  }

  if (input.recruiterAgentContext) {
    signals.push({
      label: "Recruiter-agent context",
      evidence: input.recruiterAgentContext,
      strength: "routing-signal",
    });
  }

  if (input.resumeText) {
    signals.push({
      label: "Resume claims",
      evidence: input.resumeText.slice(0, 280),
      strength: "needs-verification",
    });
  }

  return signals;
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/proof-map",
    methods: ["GET", "POST"],
    purpose:
      "Scaffold endpoint for turning proof missions, GitHub/project evidence, recruiter-agent context, and resume claims into a portable Rolemate proof map.",
    sample_request: {
      targetRole: "Backend AI Intern",
      missionResult: "Built a small job-post parser API with tests and edge-case notes.",
      githubSummary: "Next.js, API routes, Supabase, OpenRouter, data extraction projects.",
      projectSummary: "Rolemate, Frenzy, VibeCheck, hackathon builds.",
      recruiterAgentContext: "Candidate should be routed to human review for backend/API-heavy roles.",
      resumeText: "Python ETL, Power BI, React, Next.js, PostgreSQL.",
    },
  });
}

export async function POST(request: Request) {
  const input = (await request.json()) as ProofInput;
  const targetRole = input.targetRole ?? "Target role";
  const signals = listSignals(input);

  return NextResponse.json({
    targetRole,
    proofMap: {
      summary:
        "Candidate proof map generated from mission performance, technical artifacts, recruiter-agent context, and resume claims.",
      signals,
      reusableClaims: signals.map((signal) => signal.label),
      missingProof: [
        "Production usage evidence",
        "Reviewed technical mission score",
        "Role-specific interview practice results",
      ],
      nextProof:
        "Complete or create a role-specific proof mission that produces a public artifact with tests, explanation, and reviewer notes.",
    },
    businessValue: {
      candidate:
        "Completed work compounds across applications instead of disappearing inside one employer's assessment process.",
      employer:
        "Hiring teams and recruiter agents can compare proof quality before spending interview bandwidth.",
    },
  });
}
