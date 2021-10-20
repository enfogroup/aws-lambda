import { Headers } from '@models/handler'
import { STATUS } from '@models/http'

/**
 * Params used to instantiate a HandlerError
 */
export interface HandlerErrorParams<T> {
  /**
   * Optional message to include. Only included for unit testing purposes
   */
  message?: string;
  /**
   * Status code to return to the caller
   */
  statusCode: STATUS;
  /**
   * Optional body of any type
   */
  body?: T;
  /**
   * Optional headers to include in the response
   */
  headers?: Headers;
}

/**
 * Custom Error to be throw from within any part of the lambda flow.
 * The error should be caught and handled using HandlerHelper.handleError
 */
export class HandlerError<T> extends Error {
  public readonly statusCode: STATUS;
  public readonly body?: T;
  public readonly headers?: Headers;
  /**
   * Creates a new HandlerError
   * @param params
   * See interface definition
   */
  constructor (params: HandlerErrorParams<T>) {
    const { message, statusCode, body, headers } = params
    super(message)
    this.statusCode = statusCode
    this.body = body
    this.headers = headers
  }
}
