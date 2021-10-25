import { ResponseWithStatusCode } from '@models/handler'

/**
 * Params used to instantiate a HandlerError
 */
export interface HandlerErrorParams<T> extends ResponseWithStatusCode<T> {
  /**
   * Optional message to include. Only included for unit testing purposes
   */
  message?: string;
}

/**
 * Custom Error to be throw from within any part of the lambda flow.
 * The error should be caught and handled using APIGatewayHelper.handleError
 */
export class HandlerError<T> extends Error {
  public readonly response: ResponseWithStatusCode<T>
  /**
   * Creates a new HandlerError
   * @param params
   * See interface definition
   */
  constructor (params: HandlerErrorParams<T>) {
    const { message, ...rest } = params
    super(message)
    this.response = rest
  }
}
