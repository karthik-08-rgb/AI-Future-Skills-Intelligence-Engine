/**
 * Seed script — creates the demo organization "NovaTech Solutions" in the
 * "IT & Software Services" industry with realistic process/activity/role/skill
 * data, then runs the deterministic intelligence engine to compute AI impacts,
 * future skill scores, reskilling needs and recommendations.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "../src/config";
import { recomputeOrganizationIntelligence } from "../src/services/intelligenceService";
import { ingestText } from "../src/services/knowledgeService";

const prisma = new PrismaClient();

const INDUSTRY = "IT & Software Services";

async function main() {
  console.log("Seeding demo data...");

  const industry = await prisma.industry.upsert({
    where: { slug: "it-software-services" },
    update: {},
    create: {
      name: INDUSTRY,
      slug: "it-software-services",
      description:
        "Organizations that design, develop, test, deploy, operate and support software products and services.",
      settings: { futureSkillRelevance: 78 },
    },
  });

  const demoOrg = await prisma.organization.upsert({
    where: { slug: "novatech-solutions" },
    update: { industryId: industry.id },
    create: {
      name: "NovaTech Solutions",
      slug: "novatech-solutions",
      description: "Demo organization: a mid-size software services company.",
      industryId: industry.id,
      isDemo: true,
      settings: {
        aiPolicies: { allowKnowledgeRetrieval: true, provider: config.aiProvider },
      },
    },
  });

  const passwordHash = await bcrypt.hash(config.demoSeedPassword, 10);
  await prisma.user.upsert({
    where: { email: "admin@novatech.demo" },
    update: { organizationId: demoOrg.id, role: "ORG_ADMIN" },
    create: {
      email: "admin@novatech.demo",
      name: "Aarav Kumar",
      passwordHash,
      role: "ORG_ADMIN",
      organizationId: demoOrg.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "viewer@novatech.demo" },
    update: { organizationId: demoOrg.id, role: "VIEWER" },
    create: {
      email: "viewer@novatech.demo",
      name: "Priya Nair",
      passwordHash,
      role: "VIEWER",
      organizationId: demoOrg.id,
    },
  });

  // Clean org-scoped domain data before reseeding
  await prisma.recommendation.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.aiImpact.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.futureSkillScore.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.processAiImpact.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.activitySkill.deleteMany();
  await prisma.activityRole.deleteMany();
  await prisma.roleFutureSkill.deleteMany();
  await prisma.roleSkill.deleteMany();
  await prisma.futureSkill.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.activity.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.process.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.role.deleteMany({ where: { organizationId: demoOrg.id } });
  await prisma.skill.deleteMany({ where: { organizationId: demoOrg.id } });

  // -------------------------------------------------------------------------
  // Current skills
  // -------------------------------------------------------------------------
  const skillDefs: Record<
    string,
    { category: string; autoExp: number; augExp: number; humanDep: number }
  > = {
    // Technical
    Java: { category: "Technical", autoExp: 0.6, augExp: 0.75, humanDep: 0.5 },
    Python: { category: "Technical", autoExp: 0.6, augExp: 0.8, humanDep: 0.5 },
    SQL: { category: "Technical", autoExp: 0.55, augExp: 0.7, humanDep: 0.45 },
    Git: { category: "Technical", autoExp: 0.4, augExp: 0.5, humanDep: 0.5 },
    Debugging: { category: "Technical", autoExp: 0.5, augExp: 0.8, humanDep: 0.75 },
    "Software Design": { category: "Technical", autoExp: 0.3, augExp: 0.7, humanDep: 0.9 },
    Testing: { category: "Technical", autoExp: 0.7, augExp: 0.7, humanDep: 0.4 },
    Documentation: { category: "Technical", autoExp: 0.55, augExp: 0.8, humanDep: 0.5 },
    "Manual Testing": { category: "Technical", autoExp: 0.9, augExp: 0.35, humanDep: 0.3 },
    "Test Case Design": { category: "Technical", autoExp: 0.65, augExp: 0.7, humanDep: 0.5 },
    "Regression Testing": { category: "Technical", autoExp: 0.85, augExp: 0.5, humanDep: 0.35 },
    "Bug Reporting": { category: "Technical", autoExp: 0.6, augExp: 0.6, humanDep: 0.5 },
    "Automation Testing": { category: "Technical", autoExp: 0.75, augExp: 0.65, humanDep: 0.4 },
    Excel: { category: "Technical", autoExp: 0.65, augExp: 0.6, humanDep: 0.4 },
    "Data Visualization": { category: "Technical", autoExp: 0.55, augExp: 0.75, humanDep: 0.5 },
    Statistics: { category: "Technical", autoExp: 0.5, augExp: 0.75, humanDep: 0.7 },
    Reporting: { category: "Technical", autoExp: 0.7, augExp: 0.6, humanDep: 0.4 },
    Linux: { category: "Technical", autoExp: 0.55, augExp: 0.6, humanDep: 0.5 },
    "Cloud Computing": { category: "Technical", autoExp: 0.55, augExp: 0.8, humanDep: 0.5 },
    "CI/CD": { category: "Technical", autoExp: 0.7, augExp: 0.6, humanDep: 0.35 },
    Docker: { category: "Technical", autoExp: 0.55, augExp: 0.6, humanDep: 0.45 },
    Monitoring: { category: "Technical", autoExp: 0.8, augExp: 0.6, humanDep: 0.35 },
    "Infrastructure Management": { category: "Technical", autoExp: 0.5, augExp: 0.75, humanDep: 0.6 },
    Troubleshooting: { category: "Technical", autoExp: 0.35, augExp: 0.7, humanDep: 0.8 },
    "Customer Communication": { category: "Human Capability", autoExp: 0.2, augExp: 0.6, humanDep: 0.9 },
    "Ticket Management": { category: "Technical", autoExp: 0.7, augExp: 0.6, humanDep: 0.4 },
    "Product Knowledge": { category: "Domain", autoExp: 0.3, augExp: 0.6, humanDep: 0.7 },
    // Human capabilities
    "Critical Thinking": { category: "Human Capability", autoExp: 0.15, augExp: 0.55, humanDep: 0.95 },
    "Problem Solving": { category: "Human Capability", autoExp: 0.2, augExp: 0.6, humanDep: 0.9 },
    Communication: { category: "Human Capability", autoExp: 0.2, augExp: 0.6, humanDep: 0.95 },
    Collaboration: { category: "Human Capability", autoExp: 0.15, augExp: 0.5, humanDep: 0.95 },
    "Attention to Detail": { category: "Human Capability", autoExp: 0.3, augExp: 0.5, humanDep: 0.85 },
    "Analytical Thinking": { category: "Human Capability", autoExp: 0.2, augExp: 0.6, humanDep: 0.9 },
  };

  const skills = new Map<string, string>();
  for (const [name, def] of Object.entries(skillDefs)) {
    const skill = await prisma.skill.create({
      data: {
        organizationId: demoOrg.id,
        industryId: industry.id,
        name,
        category: def.category,
        automationExposure: def.autoExp,
        augmentationExposure: def.augExp,
        humanDependency: def.humanDep,
      },
    });
    skills.set(name, skill.id);
  }

  // -------------------------------------------------------------------------
  // Roles + current skills
  // -------------------------------------------------------------------------
  const roleDefs: Array<{
    name: string;
    description: string;
    department: string;
    skills: Array<[string, number, number]>; // [skillName, importance, proficiency]
  }> = [
    {
      name: "Software Engineer",
      description: "Designs, builds and maintains software products.",
      department: "Engineering",
      skills: [
        ["Java", 0.9, 0.85],
        ["Python", 0.7, 0.6],
        ["SQL", 0.6, 0.55],
        ["Git", 0.9, 0.8],
        ["Debugging", 0.8, 0.75],
        ["Software Design", 0.85, 0.7],
        ["Testing", 0.5, 0.5],
        ["Documentation", 0.5, 0.5],
        ["Critical Thinking", 0.6, 0.7],
      ],
    },
    {
      name: "QA Engineer",
      description: "Ensures product quality through test design, execution and automation.",
      department: "Quality",
      skills: [
        ["Manual Testing", 0.9, 0.85],
        ["Test Case Design", 0.8, 0.75],
        ["Regression Testing", 0.85, 0.8],
        ["Bug Reporting", 0.7, 0.75],
        ["Automation Testing", 0.6, 0.5],
        ["Attention to Detail", 0.8, 0.8],
      ],
    },
    {
      name: "Data Analyst",
      description: "Turns data into insight and reports for business decisions.",
      department: "Data & Analytics",
      skills: [
        ["SQL", 0.85, 0.75],
        ["Excel", 0.8, 0.7],
        ["Data Visualization", 0.7, 0.6],
        ["Statistics", 0.7, 0.55],
        ["Python", 0.6, 0.45],
        ["Reporting", 0.75, 0.7],
        ["Analytical Thinking", 0.85, 0.75],
      ],
    },
    {
      name: "DevOps Engineer",
      description: "Owns deployment pipelines, infrastructure and operational reliability.",
      department: "Platform",
      skills: [
        ["Linux", 0.9, 0.8],
        ["Cloud Computing", 0.8, 0.7],
        ["CI/CD", 0.85, 0.8],
        ["Docker", 0.8, 0.7],
        ["Monitoring", 0.7, 0.6],
        ["Infrastructure Management", 0.75, 0.65],
      ],
    },
    {
      name: "Technical Support Engineer",
      description: "Resolves customer issues and maintains product knowledge.",
      department: "Support",
      skills: [
        ["Troubleshooting", 0.85, 0.8],
        ["Customer Communication", 0.8, 0.75],
        ["Documentation", 0.6, 0.55],
        ["Ticket Management", 0.7, 0.7],
        ["Product Knowledge", 0.75, 0.65],
        ["Communication", 0.7, 0.7],
      ],
    },
  ];

  const roles = new Map<string, string>();
  for (const def of roleDefs) {
    const role = await prisma.role.create({
      data: {
        organizationId: demoOrg.id,
        industryId: industry.id,
        name: def.name,
        description: def.description,
        department: def.department,
      },
    });
    roles.set(def.name, role.id);
    for (const [skillName, importance, proficiency] of def.skills) {
      await prisma.roleSkill.create({
        data: {
          roleId: role.id,
          skillId: skills.get(skillName)!,
          importance,
          proficiency,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Processes + activities
  // -------------------------------------------------------------------------
  const processDefs: Array<{
    name: string;
    description: string;
    activities: Array<{
      name: string;
      description: string;
      auto: number;
      aug: number;
      human: number;
      roles: Array<[string, number]>;
      skills: Array<[string, number]>;
    }>;
  }> = [
    {
      name: "Software Development",
      description: "End-to-end development of software products and features.",
      activities: [
        {
          name: "Requirements Analysis",
          description: "Clarifying and translating business needs into technical requirements.",
          auto: 0.45, aug: 0.75, human: 0.8,
          roles: [["Software Engineer", 0.7], ["Data Analyst", 0.2]],
          skills: [["Communication", 0.8], ["Critical Thinking", 0.8], ["Documentation", 0.6]],
        },
        {
          name: "Code Development",
          description: "Writing and integrating production code.",
          auto: 0.6, aug: 0.9, human: 0.5,
          roles: [["Software Engineer", 1.0]],
          skills: [["Java", 0.9], ["Python", 0.6], ["Software Design", 0.8], ["Debugging", 0.5], ["Testing", 0.3]],
        },
        {
          name: "Code Review",
          description: "Reviewing code for quality, security and maintainability.",
          auto: 0.35, aug: 0.8, human: 0.7,
          roles: [["Software Engineer", 0.9], ["QA Engineer", 0.3]],
          skills: [["Software Design", 0.8], ["Java", 0.6], ["Python", 0.5], ["Critical Thinking", 0.6]],
        },
        {
          name: "Debugging",
          description: "Identifying and fixing defects in software.",
          auto: 0.45, aug: 0.85, human: 0.7,
          roles: [["Software Engineer", 0.9], ["QA Engineer", 0.2]],
          skills: [["Debugging", 1.0], ["Java", 0.5], ["Python", 0.5], ["Problem Solving", 0.8]],
        },
        {
          name: "Documentation",
          description: "Writing technical and user documentation.",
          auto: 0.55, aug: 0.8, human: 0.5,
          roles: [["Software Engineer", 0.5], ["Technical Support Engineer", 0.3], ["Data Analyst", 0.2]],
          skills: [["Documentation", 0.9], ["Communication", 0.6]],
        },
        {
          name: "Deployment",
          description: "Releasing software to production environments.",
          auto: 0.85, aug: 0.5, human: 0.3,
          roles: [["DevOps Engineer", 0.9], ["Software Engineer", 0.3]],
          skills: [["CI/CD", 0.8], ["Docker", 0.6], ["Git", 0.7]],
        },
        {
          name: "Maintenance",
          description: "Ongoing fixes and improvements to shipped software.",
          auto: 0.5, aug: 0.7, human: 0.6,
          roles: [["Software Engineer", 0.8], ["DevOps Engineer", 0.3]],
          skills: [["Java", 0.7], ["Debugging", 0.7], ["Problem Solving", 0.6]],
        },
      ],
    },
    {
      name: "Software Testing",
      description: "Planning, executing and automating tests to assure quality.",
      activities: [
        {
          name: "Test Planning",
          description: "Defining test scope, strategy and effort.",
          auto: 0.3, aug: 0.7, human: 0.8,
          roles: [["QA Engineer", 0.9], ["Software Engineer", 0.2]],
          skills: [["Test Case Design", 0.8], ["Critical Thinking", 0.7]],
        },
        {
          name: "Test Case Creation",
          description: "Authoring test cases and data.",
          auto: 0.7, aug: 0.7, human: 0.5,
          roles: [["QA Engineer", 1.0]],
          skills: [["Test Case Design", 1.0], ["Attention to Detail", 0.7]],
        },
        {
          name: "Manual Test Execution",
          description: "Running tests by hand and recording results.",
          auto: 0.9, aug: 0.35, human: 0.25,
          roles: [["QA Engineer", 1.0]],
          skills: [["Manual Testing", 1.0], ["Attention to Detail", 0.7]],
        },
        {
          name: "Automated Testing",
          description: "Writing and maintaining automated test suites.",
          auto: 0.85, aug: 0.6, human: 0.35,
          roles: [["QA Engineer", 0.9], ["Software Engineer", 0.3]],
          skills: [["Automation Testing", 1.0], ["Testing", 0.6], ["Python", 0.5]],
        },
        {
          name: "Defect Reporting",
          description: "Documenting and triaging defects.",
          auto: 0.6, aug: 0.6, human: 0.5,
          roles: [["QA Engineer", 0.9], ["Software Engineer", 0.3]],
          skills: [["Bug Reporting", 1.0], ["Documentation", 0.5], ["Communication", 0.4]],
        },
        {
          name: "Regression Testing",
          description: "Re-running tests to catch regressions.",
          auto: 0.85, aug: 0.5, human: 0.3,
          roles: [["QA Engineer", 1.0]],
          skills: [["Regression Testing", 1.0], ["Automation Testing", 0.5]],
        },
      ],
    },
    {
      name: "Customer Support",
      description: "Helping customers resolve issues with products and services.",
      activities: [
        {
          name: "Ticket Classification",
          description: "Categorizing and routing incoming support tickets.",
          auto: 0.9, aug: 0.4, human: 0.2,
          roles: [["Technical Support Engineer", 1.0]],
          skills: [["Ticket Management", 0.9], ["Product Knowledge", 0.5]],
        },
        {
          name: "Customer Communication",
          description: "Communicating with customers across channels.",
          auto: 0.25, aug: 0.6, human: 0.9,
          roles: [["Technical Support Engineer", 1.0]],
          skills: [["Customer Communication", 1.0], ["Communication", 0.8], ["Troubleshooting", 0.4]],
        },
        {
          name: "Knowledge Retrieval",
          description: "Searching and applying internal knowledge to issues.",
          auto: 0.7, aug: 0.6, human: 0.4,
          roles: [["Technical Support Engineer", 0.9]],
          skills: [["Product Knowledge", 0.8], ["Ticket Management", 0.6]],
        },
        {
          name: "Issue Resolution",
          description: "Diagnosing and resolving customer-reported issues.",
          auto: 0.4, aug: 0.75, human: 0.8,
          roles: [["Technical Support Engineer", 0.9]],
          skills: [["Troubleshooting", 0.9], ["Product Knowledge", 0.7], ["Problem Solving", 0.8]],
        },
        {
          name: "Escalation",
          description: "Escalating issues that exceed first-line capability.",
          auto: 0.5, aug: 0.5, human: 0.7,
          roles: [["Technical Support Engineer", 0.8], ["DevOps Engineer", 0.2]],
          skills: [["Communication", 0.6], ["Product Knowledge", 0.5]],
        },
        {
          name: "Support Documentation",
          description: "Creating and maintaining support knowledge base articles.",
          auto: 0.55, aug: 0.75, human: 0.5,
          roles: [["Technical Support Engineer", 0.7]],
          skills: [["Documentation", 0.8], ["Product Knowledge", 0.5]],
        },
      ],
    },
    {
      name: "Data Analysis",
      description: "Collecting, cleaning and analyzing data to generate insight.",
      activities: [
        {
          name: "Data Collection",
          description: "Acquiring data from internal and external sources.",
          auto: 0.7, aug: 0.5, human: 0.4,
          roles: [["Data Analyst", 0.9]],
          skills: [["SQL", 0.8], ["Python", 0.5]],
        },
        {
          name: "Data Cleaning",
          description: "Preparing data for analysis.",
          auto: 0.85, aug: 0.4, human: 0.3,
          roles: [["Data Analyst", 0.9]],
          skills: [["SQL", 0.8], ["Python", 0.7], ["Excel", 0.5]],
        },
        {
          name: "Data Exploration",
          description: "Exploring data to understand patterns and quality.",
          auto: 0.45, aug: 0.8, human: 0.7,
          roles: [["Data Analyst", 1.0]],
          skills: [["SQL", 0.7], ["Statistics", 0.8], ["Data Visualization", 0.6]],
        },
        {
          name: "Report Generation",
          description: "Producing routine and ad-hoc reports.",
          auto: 0.8, aug: 0.6, human: 0.4,
          roles: [["Data Analyst", 0.9]],
          skills: [["Reporting", 0.9], ["Data Visualization", 0.6], ["Documentation", 0.5]],
        },
        {
          name: "Insight Generation",
          description: "Synthesizing findings and recommendations.",
          auto: 0.35, aug: 0.85, human: 0.85,
          roles: [["Data Analyst", 1.0]],
          skills: [["Statistics", 0.8], ["Analytical Thinking", 0.9], ["Data Visualization", 0.6]],
        },
        {
          name: "Data Visualization",
          description: "Building charts and dashboards.",
          auto: 0.6, aug: 0.75, human: 0.5,
          roles: [["Data Analyst", 0.9]],
          skills: [["Data Visualization", 1.0], ["Excel", 0.6]],
        },
      ],
    },
    {
      name: "IT Operations",
      description: "Operating and maintaining production systems and infrastructure.",
      activities: [
        {
          name: "Monitoring",
          description: "Observing system health, performance and capacity.",
          auto: 0.8, aug: 0.5, human: 0.35,
          roles: [["DevOps Engineer", 0.9]],
          skills: [["Monitoring", 1.0], ["Linux", 0.6], ["Cloud Computing", 0.6]],
        },
        {
          name: "Incident Detection",
          description: "Identifying anomalies and outages.",
          auto: 0.85, aug: 0.4, human: 0.3,
          roles: [["DevOps Engineer", 0.9]],
          skills: [["Monitoring", 0.9], ["Linux", 0.5], ["Attention to Detail", 0.6]],
        },
        {
          name: "Incident Resolution",
          description: "Restoring service after incidents.",
          auto: 0.4, aug: 0.75, human: 0.8,
          roles: [["DevOps Engineer", 0.8], ["Technical Support Engineer", 0.4]],
          skills: [["Troubleshooting", 0.8], ["Linux", 0.7], ["Infrastructure Management", 0.7], ["Problem Solving", 0.7]],
        },
        {
          name: "Deployment",
          description: "Releasing and rolling back software in production.",
          auto: 0.85, aug: 0.5, human: 0.3,
          roles: [["DevOps Engineer", 1.0], ["Software Engineer", 0.2]],
          skills: [["CI/CD", 0.9], ["Docker", 0.8], ["Cloud Computing", 0.6]],
        },
        {
          name: "Infrastructure Management",
          description: "Provisioning and configuring infrastructure as code.",
          auto: 0.5, aug: 0.7, human: 0.6,
          roles: [["DevOps Engineer", 0.9]],
          skills: [["Infrastructure Management", 0.9], ["Linux", 0.8], ["Cloud Computing", 0.7]],
        },
        {
          name: "Ops Documentation",
          description: "Maintaining runbooks and operational documentation.",
          auto: 0.55, aug: 0.75, human: 0.5,
          roles: [["DevOps Engineer", 0.5], ["Technical Support Engineer", 0.3]],
          skills: [["Documentation", 0.8], ["Linux", 0.4]],
        },
      ],
    },
  ];

  const processes = new Map<string, string>();
  for (const def of processDefs) {
    const process = await prisma.process.create({
      data: {
        organizationId: demoOrg.id,
        industryId: industry.id,
        name: def.name,
        description: def.description,
        category: "Core",
      },
    });
    processes.set(def.name, process.id);

    for (const a of def.activities) {
      const activity = await prisma.activity.create({
        data: {
          organizationId: demoOrg.id,
          processId: process.id,
          name: a.name,
          description: a.description,
          automationPotential: a.auto,
          augmentationPotential: a.aug,
          humanDependency: a.human,
        },
      });
      for (const [roleName, involvement] of a.roles) {
        await prisma.activityRole.create({
          data: { activityId: activity.id, roleId: roles.get(roleName)!, involvement },
        });
      }
      for (const [skillName, relevance] of a.skills) {
        await prisma.activitySkill.create({
          data: { activityId: activity.id, skillId: skills.get(skillName)!, relevance },
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Future skills
  // -------------------------------------------------------------------------
  const futureSkillDefs: Array<{ name: string; demand: number; category: string; description: string; roles: Array<[string, number, number]> }> = [
    {
      name: "Generative AI",
      demand: 0.95, category: "AI & ML",
      description: "Building and applying generative AI capabilities in products and workflows.",
      roles: [
        ["Software Engineer", 0.9, 0.95],
        ["QA Engineer", 0.8, 0.85],
        ["Data Analyst", 0.8, 0.85],
        ["Technical Support Engineer", 0.8, 0.8],
      ],
    },
    {
      name: "RAG",
      demand: 0.9, category: "AI & ML",
      description: "Retrieval-augmented generation: grounding AI answers in source knowledge.",
      roles: [
        ["Software Engineer", 0.85, 0.9],
        ["Data Analyst", 0.8, 0.85],
        ["Technical Support Engineer", 0.75, 0.8],
      ],
    },
    {
      name: "AI Agent Development",
      demand: 0.9, category: "AI & ML",
      description: "Designing and orchestrating autonomous AI agents.",
      roles: [
        ["Software Engineer", 0.85, 0.9],
        ["QA Engineer", 0.7, 0.8],
      ],
    },
    {
      name: "AI-Assisted Software Development",
      demand: 0.9, category: "AI & ML",
      description: "Using AI assistants across coding, review and debugging workflows.",
      roles: [["Software Engineer", 0.9, 0.95]],
    },
    {
      name: "AI Testing",
      demand: 0.85, category: "AI & ML",
      description: "Generating, executing and maintaining tests with AI.",
      roles: [["QA Engineer", 0.9, 0.9]],
    },
    {
      name: "MLOps",
      demand: 0.85, category: "AI & ML",
      description: "Operationalizing machine learning models in production.",
      roles: [
        ["DevOps Engineer", 0.9, 0.9],
        ["Data Analyst", 0.7, 0.75],
      ],
    },
    {
      name: "AI Governance",
      demand: 0.8, category: "AI & ML",
      description: "Policies, ethics, compliance and oversight for AI systems.",
      roles: [
        ["DevOps Engineer", 0.7, 0.75],
        ["Technical Support Engineer", 0.6, 0.7],
      ],
    },
    {
      name: "Cloud AI",
      demand: 0.8, category: "Cloud & Infrastructure",
      description: "Deploying and managing AI workloads on cloud platforms.",
      roles: [["DevOps Engineer", 0.85, 0.85]],
    },
    {
      name: "Data Engineering",
      demand: 0.85, category: "Data",
      description: "Building and maintaining data pipelines and warehouses.",
      roles: [["Data Analyst", 0.85, 0.85]],
    },
    {
      name: "Prompt Engineering",
      demand: 0.8, category: "AI & ML",
      description: "Designing effective instructions for AI models.",
      roles: [
        ["Software Engineer", 0.75, 0.8],
        ["Data Analyst", 0.8, 0.8],
        ["QA Engineer", 0.7, 0.75],
      ],
    },
    {
      name: "AI Security",
      demand: 0.85, category: "Security",
      description: "Securing AI systems and defending against AI-specific threats.",
      roles: [
        ["Software Engineer", 0.7, 0.8],
        ["DevOps Engineer", 0.8, 0.8],
      ],
    },
    {
      name: "Human-AI Collaboration",
      demand: 0.8, category: "Human Capability",
      description: "Working effectively alongside AI systems and agents.",
      roles: [
        ["Technical Support Engineer", 0.85, 0.85],
      ],
    },
    {
      name: "AI Product Management",
      demand: 0.75, category: "AI & ML",
      description: "Defining and delivering AI-powered products.",
      roles: [["Software Engineer", 0.6, 0.7]],
    },
    {
      name: "Responsible AI",
      demand: 0.75, category: "AI & ML",
      description: "Building AI that is fair, transparent and accountable.",
      roles: [["Data Analyst", 0.6, 0.7]],
    },
  ];

  const futureSkills = new Map<string, string>();
  for (const def of futureSkillDefs) {
    const futureSkill = await prisma.futureSkill.create({
      data: {
        organizationId: demoOrg.id,
        industryId: industry.id,
        name: def.name,
        description: def.description,
        category: def.category,
        demandSignal: def.demand,
      },
    });
    futureSkills.set(def.name, futureSkill.id);
    for (const [roleName, priority, gap] of def.roles) {
      await prisma.roleFutureSkill.create({
        data: {
          roleId: roles.get(roleName)!,
          futureSkillId: futureSkill.id,
          priority,
          currentGap: gap,
        },
      });
    }
    // Mirror into Skill catalog with isFuture for consistent classification
    await prisma.skill.create({
      data: {
        organizationId: demoOrg.id,
        industryId: industry.id,
        name: def.name,
        description: def.description,
        category: def.category,
        isFuture: true,
        automationExposure: 0.4,
        augmentationExposure: 0.9,
        humanDependency: 0.6,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Demo knowledge base
  // -------------------------------------------------------------------------
  await prisma.knowledgeSource.deleteMany({ where: { organizationId: demoOrg.id } });
  await ingestText({
    organizationId: demoOrg.id,
    industryId: industry.id,
    title: "AI in Software Engineering — 2025 Industry Brief",
    source: "curated-demo-brief.md",
    sourceType: "markdown",
    documentType: "report",
    trustLevel: 0.8,
    text: `# AI in Software Engineering

Generative AI assistants now generate a significant share of routine code, tests and documentation. Development teams report that pair-programming assistants increase throughput on repetitive tasks while engineers focus on architecture, review and edge cases.

## Key trends
- Code generation: AI copilots handle boilerplate and routine patterns; human engineers own design decisions and correctness.
- Test generation: AI writes unit and integration test scaffolding, shifting testers from execution toward test strategy and quality signals.
- Documentation: AI drafts technical documentation from code and conversations; humans verify accuracy.

## Skill implications
- Declining: manual test execution, routine reporting, ticket classification.
- Rising: prompt engineering, RAG, AI agent orchestration, AI testing, human-AI collaboration.
- Enduring: critical thinking, problem solving, communication, judgment.

## Recommended actions
1. Invest in AI-assisted development training for software engineers.
2. Reskill QA engineers toward AI testing and quality strategy.
3. Ground support teams with RAG-based knowledge assistants while keeping human escalation for complex issues.`,
  });

  await ingestText({
    organizationId: demoOrg.id,
    industryId: industry.id,
    title: "Customer Support Automation Playbook",
    source: "curated-demo-playbook.md",
    sourceType: "markdown",
    documentType: "playbook",
    trustLevel: 0.7,
    text: `# Customer Support Automation

AI triage and retrieval assistants can classify tickets and surface knowledge base answers automatically. Human agents remain responsible for nuanced conversations, complex troubleshooting and relationship management.

## Guidance
- Automate ticket classification and routing with high confidence thresholds.
- Use retrieval-augmented generation (RAG) over the organization's knowledge base to draft first-line answers.
- Keep humans in the loop for escalations and for customers who need personal service.
- Track deflection rates and customer satisfaction to tune automation coverage.

## Impact on roles
- Technical Support Engineer: shifts from ticket sorting toward complex issue resolution, escalation and knowledge management.
- Emerging skills: RAG, human-AI collaboration, AI governance.`,
  });

  // -------------------------------------------------------------------------
  // Run the deterministic intelligence engine
  // -------------------------------------------------------------------------
  console.log("Computing intelligence...");
  const result = await recomputeOrganizationIntelligence(demoOrg.id);

  console.log(`Seeding complete.
  Organization: NovaTech Solutions
  Industry:     ${INDUSTRY}
  Processes:    ${processDefs.length}
  Activities:   ${processDefs.reduce((n, p) => n + p.activities.length, 0)}
  Roles:        ${roleDefs.length}
  Skills:       ${Object.keys(skillDefs).length} (+${futureSkillDefs.length} future)
  Future skills:${futureSkillDefs.length}
  AI impacts:   ${result.impacts}
  Recommendations: ${result.recommendations}
  Demo users:
    admin@novatech.demo / ${config.demoSeedPassword} (Org Admin)
    viewer@novatech.demo / ${config.demoSeedPassword} (Viewer)`);
}

main()
  .catch((err) => {
    console.error("Seeding failed", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
