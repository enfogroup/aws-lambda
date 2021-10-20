import { GreetingPrefix } from '@helpers/env'
import { Stage } from '@models/env'

/**
 * Dummy client
 */
export class DummyClient {
  private greetingPrefix: string
  /**
   * Creates a new dummy client
   * @param stage
   */
  constructor (stage: Stage) {
    this.greetingPrefix = GreetingPrefix[stage]
  }

  /**
   * Returns a greeting
   * @param name
   */
  public getGreeting = (name: string): string => {
    return `${this.greetingPrefix}. Hello there ${name}!`
  }
}
