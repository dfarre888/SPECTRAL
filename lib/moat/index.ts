export * from '@/lib/moat/learnerModel.types';
export {
  LearnerModelEngine,
  learnerModelEngine,
  type TurnObservation,
  type ObservedBehaviour,
} from '@/lib/moat/learnerModelEngine';
export {
  CurriculumEngine,
  curriculumEngine,
  CURRICULUM_LIBRARY,
  type CurriculumModule,
  type TrainingPlan,
  type TrainingAssignment,
} from '@/lib/moat/curriculumEngine';
export {
  CurrencyEngine,
  currencyEngine,
  SEED_CURRENCY_UPDATES,
  type CurrencyUpdate,
  type UpdateType,
  type UpdateStatus,
} from '@/lib/moat/currencyEngine';
export {
  ForceDesignEngine,
  forceDesignEngine,
  type ForceDesignQuestion,
  type ForceDesignReport,
  type RunOutcome,
} from '@/lib/moat/forceDesignEngine';
export {
  assertResidency,
  DEFAULT_SOVEREIGN_POLICY,
  SOVEREIGN_PLATFORM_CATALOGUE,
  openBuildPerformanceResolver,
  tag,
  type SovereignPlatform,
  type DataResidencyPolicy,
} from '@/lib/moat/sovereignData';
export {
  makeOpenBuildAdapter,
  InteropRegistry,
  interopRegistry,
  type ExternalSim,
  type IntegrationMode,
  type AdversaryIntent,
} from '@/lib/moat/interopLayer';
