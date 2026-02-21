export type EntityKind =
  | 'post'
  | 'asset'
  | 'campaign'
  | 'connection'
  | 'report'
  | 'company'
  | 'studio_job';

export type Role = 'admin' | 'editor' | 'viewer' | 'client';

export interface AppContext {
  workspaceId: string;
  userId: string;
  role: Role;
  activeCompanyId: string | null;
  companyGateSeenInSession: boolean;
}

export interface InspectorEntityPayload {
  kind: EntityKind;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  summary?: string;
  versionHistory: string[];
  approvals: string[];
  auditLog: string[];
  meta?: Record<string, string | number | boolean | null>;
}

export interface GlobalSearchResult {
  id: string;
  kind: EntityKind;
  title: string;
  subtitle?: string;
  href: string;
}

export interface CompanySectionState {
  identity: {
    legalName: string;
    tagline: string;
    mission: string;
    mascot?: string;
    primaryColors: string[];
  };
  voice: {
    tone: string;
    dos: string[];
    donts: string[];
    ctaStyle: string;
    examples: string[];
  };
  visual: {
    styleKeywords: string[];
    typography: string;
    layoutDirection: string;
    moodReferences: string[];
  };
  audience: {
    primaryPersona: string;
    geographies: string[];
    keyObjections: string[];
    desiredPerception: string;
  };
  content: {
    pillars: string[];
    formats: string[];
    cadence: string;
    goals: string[];
    prohibitedTopics: string[];
  };
}

export interface CompanyAssetRef {
  id: string;
  type: 'logo' | 'mascot' | 'banner' | 'reference';
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  uploadedBy: string;
  createdAt: string;
}

export interface CompanyVersionSnapshot {
  id: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface IntakeSubmission {
  id: string;
  companyId: string;
  submittedBy: string;
  step: number;
  progress: number;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  status: 'draft' | 'active';
  completionScore: number;
  coverAssetUrl?: string;
  branding: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  memberCount: number;
  sections: CompanySectionState;
  promptPacks: Record<string, string[]>;
  aiContextCompiled?: string;
  assets: CompanyAssetRef[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMember {
  id: string;
  workspaceId?: string;
  companyId: string;
  email: string;
  uid?: string;
  name?: string;
  avatarUrl?: string;
  role: Role;
  status: 'pending' | 'active' | 'revoked';
  invitedBy: string;
  invitedAt: string;
  joinedAt?: string;
  inviteToken?: string;
}

export interface CompanyInvite {
  id: string;
  companyId: string;
  email: string;
  role: Role;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  acceptedByUid?: string;
}

export interface CompanyAnalyticsSnapshot {
  companyId: string;
  period: string;
  impressions: number;
  engagements: number;
  clicks: number;
  postsScheduled: number;
  postsPublished: number;
  updatedAt: string;
}

export interface CompanyThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  glowSoft: string;
  border: string;
  panelTint: string;
}

export interface CompiledContextPayload {
  companyId: string;
  versionId?: string;
  compiledPrompt: string;
  negativePrompt: string;
  contextWeights: {
    identity: number;
    voice: number;
    visual: number;
    audience: number;
    content: number;
  };
}

export interface GenerationJob {
  id: string;
  workspaceId: string;
  companyId: string;
  requestedBy: string;
  model: 'nano-banana-pro' | 'kling-3';
  mode: 'image' | 'video';
  promptRaw: string;
  promptCompiled: string;
  negativePrompt?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked';
  progress: number;
  outputRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SafetyEvaluation {
  id: string;
  jobId: string;
  stage: 'pre' | 'post';
  result: 'allow' | 'warn' | 'block';
  reasons: string[];
  createdAt: string;
}

export interface UsageLedgerEvent {
  id: string;
  workspaceId: string;
  jobId: string;
  unit: 'image_generation' | 'video_generation';
  amount: number;
  createdAt: string;
}

