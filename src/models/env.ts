/**
 * Available stages
 */
export type Stage = 'test' | 'prod'

/**
 * Object with variables for each stage
 */
export type StageVariable = Record<Stage, string>
