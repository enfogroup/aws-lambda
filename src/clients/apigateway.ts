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
  private defaultServerError: string | object

  constructor (params: APIGatewayHelperParams) {
    this.accessControlAllowOrigin = params.accessControlAllowOrigin || '*'
    this.defaultHeaders = {
      ...params.defaultHeaders
    }
    this.logger = params.logger
    this.defaultServerError = 'Something went wrong'
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

  private _parseJSON<T> (body?: string): T {
    if (!body) {
      throw new HandlerError({ message: 'No input supplied for JSON parsing', statusCode: STATUS.BAD_REQUEST })
    }
    try {
      return JSON.parse(body) as T
    } catch (err) {
      throw new HandlerError({ message: 'Input could be not be parsed as JSON', statusCode: STATUS.BAD_REQUEST })
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

  public getDefaultServerError () {
    return this.defaultServerError
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
    return this.serverError(this.getDefaultServerError())
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
