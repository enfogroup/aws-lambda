import { HandlerError } from './error'

import { RecursivePartial } from '@models/common'
import { HandlerResponse, Headers } from '@models/handler'
import { STATUS } from '@models/http'
import { Logger } from '@models/logger'

/**
 * Parameters used when creating a new APIGatewayHelper
 */
export interface APIGatewayHelperParams {
  /**
   * Access-Control-Allow-Origin header. Defaults to '*'
   */
  accessControlAllowOrigin?: string;
  /**
   * Default headers to apply to all responses
   */
  defaultHeaders?: Headers;
  /**
   * Logger used to log warnings and errors. If no logger is supplied then nothing will be logged
   */
  logger?: Logger;
}

/**
 * Parameters used when invoking wrapLogic
 */
export interface WrapLogicParameters {
  /**
   * Your business logic. It should not contain any try/catch but instead let wrapLogic handle it
   */
  logic: () => Promise<HandlerResponse>;
  /**
   * Error message to be logged. Defaults to 'Something went wrong'
   */
  errorMessage?: string;
}

/**
 * Class used to simplify response flow in an AWS Lambda integrated with API Gateway. See README for examples
 */
export class APIGatewayHelper {
  private accessControlAllowOrigin: string
  private defaultHeaders: Headers
  private logger: Logger | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private defaultJSONParseFailError: HandlerError<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private defaultJSONParseNoBodyError: HandlerError<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fallbackError: HandlerError<any>

  /**
   * Creates a new APIGatewayHelper
   * @param params
   * See interface definition
   */
  constructor (params: APIGatewayHelperParams) {
    this.accessControlAllowOrigin = params.accessControlAllowOrigin || '*'
    this.defaultHeaders = {
      ...params.defaultHeaders
    }
    this.logger = params.logger
    this.defaultJSONParseFailError = new HandlerError({
      message: 'Input could not be parsed as JSON',
      statusCode: STATUS.BAD_REQUEST,
      body: 'Input could not be parsed as JSON'
    })
    this.defaultJSONParseNoBodyError = new HandlerError({
      message: 'No input supplied for JSON parsing',
      statusCode: STATUS.BAD_REQUEST,
      body: 'No input supplied for JSON parsing'
    })
    this.fallbackError = new HandlerError({
      message: 'Something went wrong',
      statusCode: STATUS.INTERNAL_SERVER_ERROR,
      body: 'Something went wrong'
    })
  }

  /**
   * Returns the current value for header accessControlAllowOrigin
   */
  public getAccessControlAllowOriginHeader (): string {
    return this.accessControlAllowOrigin
  }

  /**
   * Returns the current default headers, including accessControlAllowOrigin
   */
  public getDefaultHeaders (): Headers {
    return {
      ...this.defaultHeaders,
      accessControlAllowOrigin: this.accessControlAllowOrigin
    }
  }

  /**
   * Sets the fallback HandlerError used to construct a response
   * @param err
   * A HandlerError
   */
  public setFallbackError<T> (err: HandlerError<T>): void {
    this.fallbackError = err
  }

  /**
   * Sets the HandlerError thrown JSON fails to parse
   * @param err
   * A HandlerError
   */
  public setJSONParseFailError<T> (err: HandlerError<T>): void {
    this.defaultJSONParseFailError = err
  }

  /**
   * Sets the HandlerError when input to JSON parse is empty
   * @param err
   * A HandlerError
   */
  public setJSONNoBodyError<T> (err: HandlerError<T>): void {
    this.defaultJSONParseNoBodyError = err
  }

  private _parseJSON<T> (body?: string): T {
    if (!body) {
      throw this.defaultJSONParseNoBodyError
    }
    try {
      return JSON.parse(body) as T
    } catch (err) {
      throw this.defaultJSONParseFailError
    }
  }

  /**
   * Parses a string as JSON casting it to T
   * @param body
   * Body as string or undefined
   */
  public parseJSON<T> (body?: string): T {
    return this._parseJSON<T>(body)
  }

  /**
   * Parses a string as JSON casting it to RecursivePartial<T>. RecursivePartial will set every key of T to optional
   * @param body
   * Body as string or undefined
   */
  public parseJSONAsPartial<T> (body?: string): RecursivePartial<T> {
    return this._parseJSON<RecursivePartial<T>>(body)
  }

  /**
   * Builds a custom HandlerResponse
   * @param statusCode
   * STATUS value
   * @param body
   * Optional body to include. Can be of object or string type
   * @param headers
   * Optional headers to pass in the response
   */
  public buildCustomResponse<T> (statusCode: STATUS, body?: T, headers?: Headers): HandlerResponse {
    return {
      statusCode,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {
        ...this.getDefaultHeaders(),
        ...headers
      }
    }
  }

  /**
   * Builds an HTTP 200 response
   * @param body
   * Optional body to include. Can be of object or string type
   * @param headers
   * Optional headers to pass in the response
   */
  public ok<T> (body?: T, headers?: Headers) {
    return this.buildCustomResponse(STATUS.OK, body, headers)
  }

  /**
   * Builds an HTTP 400 response
   * @param body
   * Optional body to include. Can be of object or string type
   * @param headers
   * Optional headers to pass in the response
   */
  public clientError<T> (body?: T, headers?: Headers) {
    return this.buildCustomResponse(STATUS.BAD_REQUEST, body, headers)
  }

  /**
   * Builds an HTTP 500 response
   * @param body
   * Optional body to include. Can be of object or string type
   * @param headers
   * Optional headers to pass in the response
   */
  public serverError<T> (body?: T, headers?: Headers) {
    return this.buildCustomResponse(STATUS.INTERNAL_SERVER_ERROR, body, headers)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logWarning (err: any): void {
    if (!this.logger) {
      return
    }
    this.logger.warn(err)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logError (err: any): void {
    if (!this.logger) {
      return
    }
    this.logger.error(err)
  }

  /**
   * This function should be used after catching an error. It will process the error and return an appropriate response
   * @param err
   * HandlerError or Error
   * @param errorMessage
   * Error message that will be logged in case of a regular Error having been thrown
   */
  public handleError<T> (err: HandlerError<T> | Error, errorMessage: string): HandlerResponse {
    this.logWarning(err)
    if ('statusCode' in err) {
      return this.buildCustomResponse(err.statusCode, err.body, err.headers)
    }
    this.logError(errorMessage)
    const { statusCode, body, headers } = this.fallbackError
    return this.buildCustomResponse(statusCode, body, headers)
  }

  /**
   * Wraps business logic, handling any errors that are thrown. See README for examples
   * @param params
   * See interface definition
   */
  public async wrapLogic (params: WrapLogicParameters): Promise<HandlerResponse> {
    // istanbul ignore next
    const { logic, errorMessage = 'Something went wrong' } = params
    try {
      return await logic()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return this.handleError(err, errorMessage)
    }
  }
}
