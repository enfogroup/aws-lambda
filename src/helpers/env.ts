import { StageVariable } from '@models/env'

/**
 * Stage specific greeting prefixes
 */
export const GreetingPrefix: StageVariable = {
  test: process.env.TEST_GREETING as string,
  prod: process.env.PROD_GREETING as string
}
