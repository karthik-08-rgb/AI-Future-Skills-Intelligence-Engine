export type RoleName = "ORG_ADMIN" | "ANALYST" | "MEMBER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  organizationId: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
  organization?: { id: string; name: string } | null;
}

export interface Industry {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface FutureSkillComponent {
  aiDemand: number;
  processImpact: number;
  roleRelevance: number;
  skillGap: number;
  industryRelevance: number;
  transformationImpact: number;
}

export interface FutureSkill {
  futureSkillId: string;
  name: string;
  description: string;
  category: string;
  finalScore: number;
  confidence: number;
  components: FutureSkillComponent;
  roles: string[];
  computedAt?: string;
}

export interface DecliningSkill {
  skillId: string;
  skillName: string;
  category: string;
  impactType: string;
  impactScore: number;
  automationPotential: number;
  augmentationPotential: number;
  humanDependency: number;
  confidence: number;
  reason: string;
  roles: Array<{ id: string; name: string }>;
  transitionTo?: string;
  transitionReason?: string;
}

export interface ReskillingEntry {
  role: { id: string; name: string; department?: string };
  score: number;
  components: {
    score: number;
    affectedRatio: number;
    automationPressure: number;
    skillGap: number;
    futureSkillLoad: number;
    transformationImpact: number;
  };
  affectedActivityCount: number;
  activityCount: number;
  affectedActivities: Array<{ id: string; name: string; processId: string; processName: string }>;
  requiredFutureSkills: string[];
  missingFutureSkills: string[];
  skillGap: number;
}

export interface ReasoningStep {
  level: string;
  id?: string;
  label: string;
  detail?: string;
  score?: number;
}

export interface Recommendation {
  id: string;
  type: "RESKILLING" | "UPSKILLING" | "NEW_SKILL" | string;
  title: string;
  description: string;
  score: number;
  confidence: number;
  reasoningChain: ReasoningStep[];
  status: string;
  createdAt: string;
  roleId?: string | null;
  futureSkillId?: string | null;
  role?: { id: string; name: string } | null;
  futureSkill?: FutureSkill | null;
  _count?: { evidence: number };
}

export interface RecommendationEvidence {
  id: string;
  entityType: string;
  entityId: string;
  label: string;
  detail?: string;
  score?: number | null;
  sourceType: string;
  createdAt: string;
}

export interface RecommendationDetail extends Recommendation {
  evidence: RecommendationEvidence[];
}

export interface Dashboard {
  totals: {
    roles: number;
    skills: number;
    processes: number;
    recommendations: number;
  };
  affectedRoles: number;
  highReskillingRoles: number;
  emergingSkills: number;
  decliningSkills: number;
  augmentedSkills: number;
  impactDistribution: Record<string, number>;
  topFutureSkills: FutureSkill[];
  decliningSkillsList: DecliningSkill[];
  reskillingByRole: Array<{ roleId: string; roleName: string; score: number }>;
  processTransformation: Array<{
    processId: string;
    processName: string;
    transformationScore: number;
    automationPotential: number;
    augmentationPotential: number;
    affectedActivityCount: number;
  }>;
  topRecommendations: Recommendation[];
}

export interface SkillImpact {
  skillId: string;
  skillName: string;
  impactType: string;
  impactScore: number;
  reason?: string;
}

export interface RoleIntelligence {
  role: { id: string; name: string; description?: string; department?: string };
  currentSkills: Array<{
    id: string;
    name: string;
    category: string;
    importance: number;
    proficiency: number;
  }>;
  requiredFutureSkills: Array<{
    id: string;
    name: string;
    category: string;
    description?: string;
    priority: number;
    currentGap: number;
  }>;
  skillGaps: Array<{
    futureSkillName: string;
    futureSkillId: string;
    gap: number;
    missing: boolean;
    matchedCurrentSkill?: string;
  }>;
  missingFutureSkills: string[];
  skillImpacts: SkillImpact[];
  affectedActivities: Array<{
    id: string;
    name: string;
    processId: string;
    processName: string;
    automationPotential: number;
    augmentationPotential: number;
    affected: boolean;
  }>;
  reskilling: ReskillingEntry;
}

export interface ProcessActivityIntelligence {
  id: string;
  name: string;
  description?: string;
  automationPotential: number;
  augmentationPotential: number;
  humanDependency: number;
  skills: Array<{ id: string; name: string; relevance: number }>;
  roles: Array<{ id: string; name: string; involvement: number }>;
}

export interface ProcessIntelligence {
  process: { id: string; name: string; description?: string; category?: string };
  activities: ProcessActivityIntelligence[];
  impact: {
    automationPotential?: number;
    augmentationPotential?: number;
    transformationScore?: number;
  };
  affectedRoles: Array<{ id: string; name: string }>;
  affectedSkills: Array<{ id: string; name: string; impactType?: string }>;
}

export interface CatalogRole {
  id: string;
  name: string;
  description?: string;
  department?: string;
  _count?: { skills: number; futureSkills: number; activities: number };
}

export interface CatalogProcess {
  id: string;
  name: string;
  description?: string;
  category?: string;
  _count?: { activities: number };
}

export interface CatalogSkill {
  id: string;
  name: string;
  category?: string;
  description?: string;
  isFuture?: boolean;
}

export interface AssistantResponse {
  answer: string;
  model?: string | null;
  provider: string;
  evidence?: Array<{ title: string; content?: string; score?: number }>;
  degraded?: boolean;
  suggestions?: Array<{ label: string; detail?: string }>;
  sources?: Array<{ title: string; score: number }>;
}

export interface AssistantInteraction {
  id: string;
  question: string;
  intent: string;
  response: AssistantResponse;
  provider: string;
  model?: string | null;
  latencyMs?: number | null;
  sources: Array<{ title: string; score: number }>;
  status: string;
  createdAt: string;
  feedback: Array<{ rating: number }>;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  source: string;
  sourceType: string;
  documentType: string;
  trustLevel: number;
  version?: string;
  status: string;
  error?: string | null;
  chunkCount: number;
  createdAt: string;
  _count?: { documents: number };
}

export interface ImportRecord {
  id: string;
  filename: string;
  entityType: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{ row: number; field?: string; message: string }>;
  error?: string | null;
  summary?: {
    created?: Record<string, number>;
  } | null;
  createdAt: string;
}

export interface ImportPreview {
  filename: string;
  entityType: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{ row: number; field?: string; message: string }>;
  preview: Array<{ index: number; data: Record<string, string> }>;
  columns: string[];
}

export interface ProcessAiImpact {
  processId?: string;
  activityId?: string;
  automationPotential?: number;
  augmentationPotential?: number;
  humanDependency?: number;
}

export interface ExplorerProcess {
  id: string;
  name: string;
  description?: string;
  category?: string;
  processAiImpacts: ProcessAiImpact[];
  activities: Array<{
    id: string;
    name: string;
    description?: string;
    roles: Array<{ role: { id: string; name: string } }>;
    skills: Array<{
      skill: {
        id: string;
        name: string;
        aiImpacts: Array<{ impactType?: string }>;
      };
    }>;
  }>;
}

export interface Organization {
  id: string;
  name: string;
  industry?: Industry | null;
  industryId?: string | null;
}
