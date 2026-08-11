import { prisma } from "../src/lib/prisma";

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: "novatech-solutions" } });
  console.log("ORG", org?.name);

  const dist = await prisma.aiImpact.groupBy({
    by: ["impactType"],
    where: { organizationId: org!.id, activityId: null, roleId: null },
    _count: true,
  });
  console.log("Skill-level impact distribution:");
  dist.forEach((d) => console.log("  ", d.impactType, d._count));

  const scores = await prisma.futureSkillScore.findMany({
    where: { organizationId: org!.id },
    include: { futureSkill: true },
    orderBy: { finalScore: "desc" },
  });
  console.log("Top future skills:");
  scores.slice(0, 6).forEach((s) => console.log("  ", s.futureSkill.name, s.finalScore));

  const resk = await prisma.aiImpact.groupBy({
    by: ["impactType"],
    where: { organizationId: org!.id, roleId: { not: null }, activityId: null },
    _count: true,
  });
  console.log("Role-level impact distribution:");
  resk.forEach((d) => console.log("  ", d.impactType, d._count));

  const recs = await prisma.recommendation.findMany({ where: { organizationId: org!.id } });
  console.log("Recommendations:", recs.length);
  recs.slice(0, 13).forEach((r) => console.log("  -", r.title, "score:", r.score));

  const processImpacts = await prisma.processAiImpact.findMany({
    where: { organizationId: org!.id },
    include: { process: true },
    orderBy: { transformationScore: "desc" },
  });
  console.log("Process transformation:");
  processImpacts.forEach((p) => console.log("  ", p.process.name, p.transformationScore));

  await prisma.$disconnect();
}

main();
