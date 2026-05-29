import { NextResponse } from "next/server";

const tools = [
  {
    name: "rolemate.create_mission",
    description:
      "Create a role-specific proof mission that tests practical work instead of resume keywords.",
    input_schema: {
      type: "object",
      properties: {
        roleTitle: { type: "string" },
        companyContext: { type: "string" },
        requiredSkills: { type: "array", items: { type: "string" } },
        missionType: {
          type: "string",
          enum: ["debugging", "build", "analysis", "system_design", "technical_writing", "product_judgment"],
        },
      },
      required: ["roleTitle", "requiredSkills", "missionType"],
    },
  },
  {
    name: "rolemate.submit_mission_artifact",
    description:
      "Attach a completed mission artifact to a candidate-owned proof passport with evidence and reviewer notes.",
    input_schema: {
      type: "object",
      properties: {
        missionId: { type: "string" },
        artifactUrl: { type: "string" },
        notes: { type: "string" },
        claimedSkills: { type: "array", items: { type: "string" } },
      },
      required: ["missionId", "artifactUrl"],
    },
  },
  {
    name: "rolemate.generate_proof_map",
    description:
      "Generate a proof map from resume, GitHub, projects, mission results, recruiter-agent context, and target role context.",
    input_schema: {
      type: "object",
      properties: {
        candidateContext: { type: "string" },
        targetRole: { type: "string" },
        evidenceUrls: { type: "array", items: { type: "string" } },
        recruiterAgentContext: { type: "string" },
      },
      required: ["candidateContext", "targetRole"],
    },
  },
  {
    name: "rolemate.compare_to_role",
    description:
      "Compare a candidate proof map against a target role and return fit, missing proof, and next steps.",
    input_schema: {
      type: "object",
      properties: {
        proofMapId: { type: "string" },
        jobDescription: { type: "string" },
      },
      required: ["proofMapId", "jobDescription"],
    },
  },
  {
    name: "rolemate.recommend_next_proof",
    description:
      "Recommend the highest-ROI next mission, project, or interview-prep artifact to strengthen the candidate's proof passport.",
    input_schema: {
      type: "object",
      properties: {
        proofMapId: { type: "string" },
        targetRoles: { type: "array", items: { type: "string" } },
      },
      required: ["proofMapId"],
    },
  },
  {
    name: "rolemate.draft_referral_context",
    description:
      "Draft evidence-grounded context a candidate can send to a referrer, mentor, or hiring manager.",
    input_schema: {
      type: "object",
      properties: {
        proofMapId: { type: "string" },
        recipientContext: { type: "string" },
        targetRole: { type: "string" },
      },
      required: ["proofMapId", "targetRole"],
    },
  },
  {
    name: "rolemate.prepare_agent_packet",
    description:
      "Prepare a machine-readable proof packet for an AI recruiter, ATS, sourcing agent, or internal hiring tool.",
    input_schema: {
      type: "object",
      properties: {
        proofMapId: { type: "string" },
        targetRole: { type: "string" },
        routingGoal: {
          type: "string",
          enum: ["human_review", "referral", "interview", "talent_pool", "mentor_review"],
        },
      },
      required: ["proofMapId", "targetRole", "routingGoal"],
    },
  },
];

export async function GET() {
  return NextResponse.json({
    name: "Rolemate MCP",
    version: "0.1.0",
    description:
      "MCP-facing manifest for proof missions, candidate-owned proof passports, role-fit comparison, recruiter-agent packets, and evidence-grounded referral context.",
    positioning: {
      minimum_bar:
        "Support Velric-style proof-of-work missions as a first-class hiring object.",
      wedge:
        "Own the post-proof-work and post-AI-recruiter layer: mission reuse, proof portability, cross-employer evidence memory, and agent-readable routing packets.",
    },
    tools,
  });
}
