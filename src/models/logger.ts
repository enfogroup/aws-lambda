// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoggerFunction = (input: any) => any

/**
 * Logger used to log warnings and errors
 */
export interface Logger {
  warn: LoggerFunction;
  error: LoggerFunction;
}
