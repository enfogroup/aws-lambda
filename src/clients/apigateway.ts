import { HandlerError } from './error'

import { RecursivePartial } from '@models/common'
import { HandlerResponse, Headers } from '@models/handler'
import { STATUS } from '@models/http'
import { Logger } from '@models/logger'

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

export interface WrapLogicParameters {
  logic: () => Promise<HandlerResponse>;
  errorMessage: string;
}

export class APIGatewayHelper {
  private accessControlAllowOrigin: string
  private defaultHeaders: Headers
  private logger: Logger | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private defaultJSONParseFailResponse: HandlerError<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private defaultJSONParseNoBodyResponse: HandlerError<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fallbackResponse: HandlerError<any>

  constructor (params: APIGatewayHelperParams) {
    this.accessControlAllowOrigin = params.accessControlAllowOrigin || '*'
    this.defaultHeaders = {
      ...params.defaultHeaders
    }
    this.logger = params.logger
    this.defaultJSONParseFailResponse = new HandlerError({
      message: 'Input could not be parsed as JSON',
      statusCode: STATUS.BAD_REQUEST,
      body: 'Input could not be parsed as JSON'
    })
    this.defaultJSONParseNoBodyResponse = new HandlerError({
      message: 'No input supplied for JSON parsing',
      statusCode: STATUS.BAD_REQUEST,
      body: 'No input supplied for JSON parsing'
    })
    this.fallbackResponse = new HandlerError({
      message: 'Something went wrong',
      statusCode: STATUS.INTERNAL_SERVER_ERROR,
      body: 'Something went wrong'
    })
  }

  public getAccessControlAllowOriginHeader (): string {
    return this.accessControlAllowOrigin
  }

  public getDefaultHeaders (): Headers {
    return {
      ...this.defaultHeaders,
      accessControlAllowOrigin: this.accessControlAllowOrigin
    }
  }

  public setFallbackResponse<T> (err: HandlerError<T>): void {
    this.fallbackResponse = err
  }

  public setJSONParseFailResponse<T> (err: HandlerError<T>): void {
    this.defaultJSONParseFailResponse = err
  }

  public setJSONNoBodyResponse<T> (err: HandlerError<T>): void {
    this.defaultJSONParseNoBodyResponse = err
  }

  private _parseJSON<T> (body?: string): T {
    if (!body) {
      throw this.defaultJSONParseNoBodyResponse
    }
    try {
      return JSON.parse(body) as T
    } catch (err) {
      throw this.defaultJSONParseFailResponse
    }
  }

  public parseJSON<T> (body?: string): T {
    return this._parseJSON<T>(body)
  }

  public parseJSONAsPartial<T> (body?: string): RecursivePartial<T> {
    return this._parseJSON<RecursivePartial<T>>(body)
  }

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

  public ok<T> (body?: T, headers?: Headers) {
    return this.buildCustomResponse(STATUS.OK, body, headers)
  }

  public clientError<T> (body?: T, headers?: Headers) {
    return this.buildCustomResponse(STATUS.BAD_REQUEST, body, headers)
  }

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

  public handleError<T> (err: HandlerError<T> | Error, errorMessage: string): HandlerResponse {
    this.logWarning(err)
    if ('statusCode' in err) {
      return this.buildCustomResponse(err.statusCode, err.body, err.headers)
    }
    this.logError(errorMessage)
    const { statusCode, body, headers } = this.fallbackResponse
    return this.buildCustomResponse(statusCode, body, headers)
  }

  public async wrapLogic (params: WrapLogicParameters): Promise<HandlerResponse> {
    const { logic, errorMessage } = params
    try {
      return await logic()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return this.handleError(err, errorMessage)
    }
  }
}
