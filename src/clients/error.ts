import { STATUS } from '@models/http'

/**
 * Custom Error to be throw from within any part of the lambda flow.
 * The error should be caught and handled using HandlerHelper.handleError
 */
export class HandlerError<T> extends Error {
  public readonly statusCode: STATUS;
  public readonly body?: T;
  /**
   * Creates a new HandlerError
   * @param message
   * Message. Main purpose is to be used for unit testing, matching that a flow exited at the correct point
   * @param statusCode
   * STATUS to be returned to the caller
   * @param body
   * Optional body of any type
   */
  constructor (message: string, statusCode: STATUS, body?: T) {
    super(message)
    this.statusCode = statusCode
    if (body) {
      this.body = body
    }
  }
}
