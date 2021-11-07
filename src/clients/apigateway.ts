import { APIGatewayHandlerError } from './error'

import { RecursivePartial } from '@models/common'
import { HandlerResponse, Headers, ResponseWithoutStatusCode, ResponseWithStatusCode } from '@models/handler'
import { HTTP_STATUS_CODE } from '@models/http'
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
  private defaultJSONParseFailError: APIGatewayHandlerError<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private defaultJSONParseNoBodyError: APIGatewayHandlerError<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fallbackError: APIGatewayHandlerError<any>

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
    this.defaultJSONParseFailError = new APIGatewayHandlerError({
      message: 'Input could not be parsed as JSON',
      statusCode: HTTP_STATUS_CODE.BAD_REQUEST,
      body: 'Input could not be parsed as JSON'
    })
    this.defaultJSONParseNoBodyError = new APIGatewayHandlerError({
      message: 'No input supplied for JSON parsing',
      statusCode: HTTP_STATUS_CODE.BAD_REQUEST,
      body: 'No input supplied for JSON parsing'
    })
    this.fallbackError = new APIGatewayHandlerError({
      message: 'Something went wrong',
      statusCode: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
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
   * Sets the fallback APIGatewayHandlerError used to construct a response
   * @param err
   * A APIGatewayHandlerError
   */
  public setFallbackError<T> (err: APIGatewayHandlerError<T>): void {
    this.fallbackError = err
  }

  /**
   * Sets the APIGatewayHandlerError thrown JSON fails to parse
   * @param err
   * A APIGatewayHandlerError
   */
  public setJSONParseFailError<T> (err: APIGatewayHandlerError<T>): void {
    this.defaultJSONParseFailError = err
  }

  /**
   * Sets the APIGatewayHandlerError when input to JSON parse is empty
   * @param err
   * A APIGatewayHandlerError
   */
  public setJSONNoBodyError<T> (err: APIGatewayHandlerError<T>): void {
    this.defaultJSONParseNoBodyError = err
  }

  private _parseJSON<T> (body?: string | null): T {
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
  public parseJSON<T> (body?: string | null): T {
    return this._parseJSON<T>(body)
  }

  /**
   * Parses a string as JSON casting it to RecursivePartial<T>. RecursivePartial will set every key of T to optional
   * @param body
   * Body as string or undefined
   */
  public parseJSONAsPartial<T> (body?: string | null): RecursivePartial<T> {
    return this._parseJSON<RecursivePartial<T>>(body)
  }

  /**
   * Builds a custom HandlerResponse
   * @param params
   * See interface definition
   */
  public buildCustomResponse<T> (params: ResponseWithStatusCode<T>): HandlerResponse {
    const { statusCode, body, headers, isBase64Encoded = false } = params
    return {
      statusCode,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {
        ...this.getDefaultHeaders(),
        ...headers
      },
      isBase64Encoded
    }
  }

  /**
   * Builds an HTTP 200 response
   * @param params
   * See interface definition
   */
  public ok<T> (params: ResponseWithoutStatusCode<T> = {}) {
    return this.buildCustomResponse({
      ...params,
      statusCode: HTTP_STATUS_CODE.OK
    })
  }

  /**
   * Builds an HTTP 400 response
   * @param params
   * See interface definition
   */
  public clientError<T> (params: ResponseWithoutStatusCode<T> = {}) {
    return this.buildCustomResponse({
      ...params,
      statusCode: HTTP_STATUS_CODE.BAD_REQUEST
    })
  }

  /**
   * Builds an HTTP 500 response
   * @param params
   * See interface definition
   */
  public serverError<T> (params: ResponseWithoutStatusCode<T> = {}) {
    return this.buildCustomResponse({
      ...params,
      statusCode: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
    })
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
   * APIGatewayHandlerError or Error
   * @param errorMessage
   * Error message that will be logged in case of a regular Error having been thrown
   */
  public handleError<T> (err: APIGatewayHandlerError<T> | Error, errorMessage: string): HandlerResponse {
    this.logWarning(err)
    if (err.constructor === APIGatewayHandlerError) {
      return this.buildCustomResponse(err.response)
    }
    this.logError(errorMessage)
    return this.buildCustomResponse(this.fallbackError.response)
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
