-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "industryId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Organization_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "organizationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Process_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Process_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "processId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "automationPotential" REAL NOT NULL DEFAULT 0,
    "augmentationPotential" REAL NOT NULL DEFAULT 0,
    "humanDependency" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Role_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Technical',
    "automationExposure" REAL NOT NULL DEFAULT 0.5,
    "augmentationExposure" REAL NOT NULL DEFAULT 0.5,
    "humanDependency" REAL NOT NULL DEFAULT 0.5,
    "isFuture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Skill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Skill_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "roleId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "proficiency" REAL NOT NULL DEFAULT 0.5,
    CONSTRAINT "RoleSkill_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "involvement" REAL NOT NULL DEFAULT 0.5,
    CONSTRAINT "ActivityRole_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitySkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "relevance" REAL NOT NULL DEFAULT 0.5,
    CONSTRAINT "ActivitySkill_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiImpact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "activityId" TEXT,
    "roleId" TEXT,
    "skillId" TEXT,
    "impactType" TEXT NOT NULL,
    "impactScore" REAL NOT NULL DEFAULT 0,
    "automationPotential" REAL NOT NULL DEFAULT 0,
    "augmentationPotential" REAL NOT NULL DEFAULT 0,
    "humanDependency" REAL NOT NULL DEFAULT 0.5,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "reason" TEXT,
    "evidence" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiImpact_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiImpact_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiImpact_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FutureSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "industryId" TEXT NOT NULL,
    "skillId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Technical',
    "demandSignal" REAL NOT NULL DEFAULT 0.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "FutureSkill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FutureSkill_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FutureSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleFutureSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "roleId" TEXT NOT NULL,
    "futureSkillId" TEXT NOT NULL,
    "priority" REAL NOT NULL DEFAULT 0.5,
    "currentGap" REAL NOT NULL DEFAULT 1,
    CONSTRAINT "RoleFutureSkill_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleFutureSkill_futureSkillId_fkey" FOREIGN KEY ("futureSkillId") REFERENCES "FutureSkill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FutureSkillScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "futureSkillId" TEXT NOT NULL,
    "aiDemand" REAL NOT NULL DEFAULT 0,
    "processImpact" REAL NOT NULL DEFAULT 0,
    "roleRelevance" REAL NOT NULL DEFAULT 0,
    "skillGap" REAL NOT NULL DEFAULT 0,
    "industryRelevance" REAL NOT NULL DEFAULT 0,
    "transformationImpact" REAL NOT NULL DEFAULT 0,
    "finalScore" REAL NOT NULL DEFAULT 0,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FutureSkillScore_futureSkillId_fkey" FOREIGN KEY ("futureSkillId") REFERENCES "FutureSkill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessAiImpact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "processId" TEXT NOT NULL,
    "automationPotential" REAL NOT NULL DEFAULT 0,
    "augmentationPotential" REAL NOT NULL DEFAULT 0,
    "transformationScore" REAL NOT NULL DEFAULT 0,
    "affectedActivityCount" INTEGER NOT NULL DEFAULT 0,
    "highImpactActivityCount" INTEGER NOT NULL DEFAULT 0,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessAiImpact_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "score" REAL NOT NULL DEFAULT 0,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "reasoningChain" JSONB,
    "roleId" TEXT,
    "futureSkillId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_futureSkillId_fkey" FOREIGN KEY ("futureSkillId") REFERENCES "FutureSkill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT,
    "detail" TEXT,
    "score" REAL,
    "sourceType" TEXT NOT NULL DEFAULT 'intelligence',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationEvidence_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "industryId" TEXT,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'csv',
    "documentType" TEXT NOT NULL DEFAULT 'report',
    "trustLevel" REAL NOT NULL DEFAULT 0.5,
    "version" TEXT NOT NULL DEFAULT '1',
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeSource_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeSource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'report',
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "embedding" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'role-skills',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "summary" JSONB,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "userId" TEXT,
    "question" TEXT NOT NULL,
    "intent" TEXT,
    "structuredContext" JSONB,
    "response" JSONB,
    "provider" TEXT NOT NULL DEFAULT 'template',
    "model" TEXT,
    "tokens" JSONB,
    "latencyMs" INTEGER,
    "sources" JSONB,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiInteraction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interactionId" TEXT NOT NULL,
    "userId" TEXT,
    "rating" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "AiInteraction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "userId" TEXT,
    "knowledgeSourceId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "KnowledgeSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_industryId_idx" ON "Organization"("industryId");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Industry_slug_key" ON "Industry"("slug");

-- CreateIndex
CREATE INDEX "Process_industryId_idx" ON "Process"("industryId");

-- CreateIndex
CREATE INDEX "Process_organizationId_idx" ON "Process"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Process_organizationId_industryId_name_key" ON "Process"("organizationId", "industryId", "name");

-- CreateIndex
CREATE INDEX "Activity_processId_idx" ON "Activity"("processId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Role_industryId_idx" ON "Role"("industryId");

-- CreateIndex
CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_industryId_name_key" ON "Role"("organizationId", "industryId", "name");

-- CreateIndex
CREATE INDEX "Skill_industryId_idx" ON "Skill"("industryId");

-- CreateIndex
CREATE INDEX "Skill_organizationId_idx" ON "Skill"("organizationId");

-- CreateIndex
CREATE INDEX "Skill_isFuture_idx" ON "Skill"("isFuture");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_organizationId_industryId_name_key" ON "Skill"("organizationId", "industryId", "name");

-- CreateIndex
CREATE INDEX "RoleSkill_roleId_idx" ON "RoleSkill"("roleId");

-- CreateIndex
CREATE INDEX "RoleSkill_skillId_idx" ON "RoleSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleSkill_roleId_skillId_key" ON "RoleSkill"("roleId", "skillId");

-- CreateIndex
CREATE INDEX "ActivityRole_activityId_idx" ON "ActivityRole"("activityId");

-- CreateIndex
CREATE INDEX "ActivityRole_roleId_idx" ON "ActivityRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRole_activityId_roleId_key" ON "ActivityRole"("activityId", "roleId");

-- CreateIndex
CREATE INDEX "ActivitySkill_activityId_idx" ON "ActivitySkill"("activityId");

-- CreateIndex
CREATE INDEX "ActivitySkill_skillId_idx" ON "ActivitySkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySkill_activityId_skillId_key" ON "ActivitySkill"("activityId", "skillId");

-- CreateIndex
CREATE INDEX "AiImpact_activityId_idx" ON "AiImpact"("activityId");

-- CreateIndex
CREATE INDEX "AiImpact_roleId_idx" ON "AiImpact"("roleId");

-- CreateIndex
CREATE INDEX "AiImpact_skillId_idx" ON "AiImpact"("skillId");

-- CreateIndex
CREATE INDEX "AiImpact_impactType_idx" ON "AiImpact"("impactType");

-- CreateIndex
CREATE INDEX "AiImpact_organizationId_idx" ON "AiImpact"("organizationId");

-- CreateIndex
CREATE INDEX "FutureSkill_industryId_idx" ON "FutureSkill"("industryId");

-- CreateIndex
CREATE INDEX "FutureSkill_organizationId_idx" ON "FutureSkill"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FutureSkill_organizationId_industryId_name_key" ON "FutureSkill"("organizationId", "industryId", "name");

-- CreateIndex
CREATE INDEX "RoleFutureSkill_roleId_idx" ON "RoleFutureSkill"("roleId");

-- CreateIndex
CREATE INDEX "RoleFutureSkill_futureSkillId_idx" ON "RoleFutureSkill"("futureSkillId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleFutureSkill_roleId_futureSkillId_key" ON "RoleFutureSkill"("roleId", "futureSkillId");

-- CreateIndex
CREATE INDEX "FutureSkillScore_futureSkillId_idx" ON "FutureSkillScore"("futureSkillId");

-- CreateIndex
CREATE INDEX "FutureSkillScore_organizationId_idx" ON "FutureSkillScore"("organizationId");

-- CreateIndex
CREATE INDEX "ProcessAiImpact_processId_idx" ON "ProcessAiImpact"("processId");

-- CreateIndex
CREATE INDEX "ProcessAiImpact_organizationId_idx" ON "ProcessAiImpact"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessAiImpact_processId_key" ON "ProcessAiImpact"("processId");

-- CreateIndex
CREATE INDEX "Recommendation_organizationId_idx" ON "Recommendation"("organizationId");

-- CreateIndex
CREATE INDEX "Recommendation_roleId_idx" ON "Recommendation"("roleId");

-- CreateIndex
CREATE INDEX "Recommendation_type_idx" ON "Recommendation"("type");

-- CreateIndex
CREATE INDEX "RecommendationEvidence_recommendationId_idx" ON "RecommendationEvidence"("recommendationId");

-- CreateIndex
CREATE INDEX "RecommendationEvidence_entityType_idx" ON "RecommendationEvidence"("entityType");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_idx" ON "KnowledgeSource"("organizationId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_industryId_idx" ON "KnowledgeSource"("industryId");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_sourceId_idx" ON "KnowledgeDocument"("sourceId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- CreateIndex
CREATE INDEX "DataImport_organizationId_idx" ON "DataImport"("organizationId");

-- CreateIndex
CREATE INDEX "AiInteraction_organizationId_idx" ON "AiInteraction"("organizationId");

-- CreateIndex
CREATE INDEX "AiInteraction_userId_idx" ON "AiInteraction"("userId");

-- CreateIndex
CREATE INDEX "Feedback_interactionId_idx" ON "Feedback"("interactionId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
