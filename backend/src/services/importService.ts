import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";
import { logger } from "../utils/logger";
import { ValidationError } from "../utils/errors";
import { normalizeName } from "../utils/math";

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    rows.push(cells);
  }
  return rows;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError("Invalid JSON file: could not parse content");
  }
}

export interface ImportRowError {
  row: number;
  field?: string;
  message: string;
}

export interface ValidatedRow {
  index: number;
  data: Record<string, string>;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: ImportRowError[];
  preview: ValidatedRow[];
  columns: string[];
}

const REQUIRED_COLUMNS: Record<string, string[]> = {
  "role-skills": ["role", "skill"],
  skills: ["name"],
  roles: ["name"],
  activities: ["name", "process"],
};

export function validateAndPreview(
  filename: string,
  content: string,
  entityType: string,
): ImportPreview {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  let rows: string[][] = [];
  let columns: string[] = [];

  if (ext === "json") {
    const parsed = parseJson(content);
    if (!Array.isArray(parsed)) {
      throw new ValidationError("JSON import expects an array of objects");
    }
    const objects = parsed as Array<Record<string, unknown>>;
    columns = Array.from(
      new Set(objects.flatMap((o) => Object.keys(o))),
    );
    rows = [
      columns,
      ...objects.map((o) => columns.map((c) => String(o[c] ?? ""))),
    ];
  } else {
    rows = parseCsv(content.replace(/^\uFEFF/, ""));
    if (rows.length === 0) throw new ValidationError("File is empty");
    columns = rows[0];
  }

  const header = rows[0].map((c) => c.trim().toLowerCase());
  const required = REQUIRED_COLUMNS[entityType] ?? [];
  const missingColumns = required.filter((r) => !header.includes(r));
  if (missingColumns.length > 0) {
    throw new ValidationError(
      `Missing required column(s): ${missingColumns.join(", ")}. Expected columns: ${required.join(", ")}`,
    );
  }

  const errors: ImportRowError[] = [];
  const dataRows: ValidatedRow[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const record: Record<string, string> = {};
    for (let c = 0; c < columns.length; c++) {
      record[columns[c]] = (raw[c] ?? "").trim();
    }

    let valid = true;
    for (const col of required) {
      const idx = header.indexOf(col);
      const value = record[columns[idx]] ?? "";
      if (!value) {
        errors.push({ row: i + 1, field: col, message: `Missing "${col}" value` });
        valid = false;
      }
    }

    if (!valid) continue;

    if (entityType === "role-skills") {
      const role = normalizeName(record["role"] ?? "");
      const skill = normalizeName(record["skill"] ?? "");
      const key = `${role}|${skill}`;
      if (seen.has(key)) {
        duplicateCount++;
        errors.push({ row: i + 1, message: "Duplicate role-skill pair" });
        continue;
      }
      seen.add(key);
    }

    dataRows.push({ index: i, data: record });
  }

  return {
    totalRows: rows.length - 1,
    validRows: dataRows.length,
    invalidRows: errors.length - duplicateCount,
    duplicateRows: duplicateCount,
    errors,
    preview: dataRows.slice(0, 10),
    columns,
  };
}

// ---------------------------------------------------------------------------
// Import execution
// ---------------------------------------------------------------------------

export async function importRows(input: {
  organizationId: string;
  industryId: string;
  filename: string;
  entityType: string;
  content: string;
  createdById?: string | null;
}) {
  const preview = validateAndPreview(input.filename, input.content, input.entityType);
  const created = { roles: 0, skills: 0, processes: 0, activities: 0, links: 0 };

  const importRecord = await prisma.dataImport.create({
    data: {
      organizationId: input.organizationId,
      filename: input.filename,
      entityType: input.entityType,
      status: "PROCESSING",
      totalRows: preview.totalRows,
      validRows: preview.validRows,
      invalidRows: preview.invalidRows,
      duplicateRows: preview.duplicateRows,
      errors: preview.errors.slice(0, 50) as unknown as Prisma.InputJsonValue,
      createdById: input.createdById ?? null,
    },
  });

  try {
    if (input.entityType === "role-skills") {
      for (const row of preview.preview) {
        const roleName = row.data["role"] ?? "";
        const skillName = row.data["skill"] ?? "";
        const importance = parseFloat(row.data["importance"] ?? "0.5");
        const proficiency = parseFloat(row.data["proficiency"] ?? "0.5");
        const category = row.data["category"] ?? "Technical";

        const role = await upsertRole(input, roleName);
        const skill = await upsertSkill(input, skillName, category);
        if (role && skill) {
          await prisma.roleSkill.upsert({
            where: {
              roleId_skillId: { roleId: role.id, skillId: skill.id },
            },
            create: {
              roleId: role.id,
              skillId: skill.id,
              importance: isFinite(importance) ? importance : 0.5,
              proficiency: isFinite(proficiency) ? proficiency : 0.5,
            },
            update: {
              importance: isFinite(importance) ? importance : 0.5,
              proficiency: isFinite(proficiency) ? proficiency : 0.5,
            },
          });
          created.links++;
        }
      }
    } else if (input.entityType === "skills") {
      for (const row of preview.preview) {
        const skill = await upsertSkill(input, row.data["name"] ?? "", row.data["category"] ?? "Technical");
        if (skill) created.skills++;
      }
    } else if (input.entityType === "roles") {
      for (const row of preview.preview) {
        const role = await upsertRole(input, row.data["name"] ?? "");
        if (role) created.roles++;
      }
    } else if (input.entityType === "activities") {
      for (const row of preview.preview) {
        const process = await upsertProcess(input, row.data["process"] ?? "");
        if (!process) continue;
        const automation = parseFloat(row.data["automation_potential"] ?? "0.5");
        const augmentation = parseFloat(row.data["augmentation_potential"] ?? "0.5");
        const activity = await prisma.activity.create({
          data: {
            organizationId: input.organizationId,
            processId: process.id,
            name: row.data["name"] ?? "",
            description: row.data["description"] ?? "",
            automationPotential: isFinite(automation) ? automation : 0.5,
            augmentationPotential: isFinite(augmentation) ? augmentation : 0.5,
            humanDependency: parseFloat(row.data["human_dependency"] ?? "0.5"),
          },
        });
        created.activities++;
        if (row.data["skill"]) {
          const skill = await upsertSkill(input, row.data["skill"], "Technical");
          if (skill) {
            await prisma.activitySkill.upsert({
              where: { activityId_skillId: { activityId: activity.id, skillId: skill.id } },
              create: { activityId: activity.id, skillId: skill.id, relevance: 0.5 },
              update: {},
            });
            created.links++;
          }
        }
      }
    }

    await prisma.dataImport.update({
      where: { id: importRecord.id },
      data: { status: "COMPLETED", summary: { created } },
    });
    logger.info("import.completed", {
      organizationId: input.organizationId,
      entityType: input.entityType,
      created,
    });
    return {
      id: importRecord.id,
      status: "COMPLETED",
      summary: { created },
      validRows: preview.validRows,
      invalidRows: preview.invalidRows,
      duplicateRows: preview.duplicateRows,
      errors: preview.errors.slice(0, 20),
    };
  } catch (err) {
    await prisma.dataImport.update({
      where: { id: importRecord.id },
      data: { status: "FAILED", error: err instanceof Error ? err.message : "Import failed" },
    });
    throw err;
  }
}

async function upsertRole(
  input: { organizationId: string; industryId: string },
  name: string,
) {
  const existing = await prisma.role.findFirst({
    where: { organizationId: input.organizationId, name, deletedAt: null },
  });
  if (existing) return existing;
  return prisma.role.create({
    data: { organizationId: input.organizationId, industryId: input.industryId, name },
  });
}

async function upsertSkill(
  input: { organizationId: string; industryId: string },
  name: string,
  category = "Technical",
) {
  const existing = await prisma.skill.findFirst({
    where: { organizationId: input.organizationId, name, deletedAt: null },
  });
  if (existing) return existing;
  return prisma.skill.create({
    data: {
      organizationId: input.organizationId,
      industryId: input.industryId,
      name,
      category,
    },
  });
}

async function upsertProcess(
  input: { organizationId: string; industryId: string },
  name: string,
) {
  const existing = await prisma.process.findFirst({
    where: { organizationId: input.organizationId, name, deletedAt: null },
  });
  if (existing) return existing;
  return prisma.process.create({
    data: { organizationId: input.organizationId, industryId: input.industryId, name },
  });
}

export function listImports(organizationId: string) {
  return prisma.dataImport.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
