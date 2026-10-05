/** Centralized game-feel and physics values; deterministic rules remain in domain/. */
export const estilingueDasLembrancasTuning = {
  // Pull limits (inspired by angry-aliens-phaser)
  maxPullDistance: 210,
  minPullDistance: 15,
  velocityMultiplier: 0.27,
  pullConeAngleRad: 2.8, // wide ~160 degree cone for seamless mobile ergonomics

  // Projectile Physics (Snowball)
  snowballRadius: 24,
  snowballMass: 1.2,
  snowballFrictionAir: 0.003,
  snowballRestitution: 0.25,
  squashStretchFactor: 0.16,
  squashStretchDurationMs: 85,

  // Matter Engine Gravity (matching angry-aliens-phaser 0.9)
  gravityX: 0,
  gravityY: 0.9,
  gravityScale: 0.001,

  // Target Physics & Constraints
  targetPendulumLength: 110,
  targetConstraintStiffness: 0.92,
  targetAngularDamping: 0.04,

  // Collision Thresholds (relative velocity vRel)
  softImpactThreshold: 0.5,
  validHitThreshold: 2.0,
  hardHitThreshold: 6.0,

  // Verlet Band Simulation
  verletBandSegments: 6,
  verletBandDamping: 0.92,
  verletSnapAcceleration: 18.0,
  verletTautLerpFactor: 0.65,

  // Trajectory Simulation
  trajectoryTotalSteps: 45,
  trajectoryFramesPerDot: 1,
  trajectorySimDeltaMs: 16.666,
  trajectoryDotCountMin: 12,
  trajectoryDotCountMax: 45,

  // Accessibility & Touch Sizes
  primaryTargetMinCssPx: 56,
  secondaryTargetMinCssPx: 52,
  idleAssistDelayMs: 6500,
  audioCooldownMs: 90,

  // Visual & Particle Budgets
  normalParticleCount: 35,
  lowParticleCount: 12,
  reloadDelayMs: 350,
  celebrationHeroZoomDurationMs: 2500,
} as const;

export type EstilingueTuning = typeof estilingueDasLembrancasTuning;
