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
   * Logger used to log warnings and errors
   */
  logger: Logger;
}

export interface WrapLogicParameters {
  logic: () => Promise<HandlerResponse>;
  fallbackMessage: string;
}

export class APIGatewayHelper {
  private accessControlAllowOrigin: string
  private defaultHeaders: Headers
  private logger: Logger
  private loggingEnabled: boolean = true

  constructor (params: APIGatewayHelperParams) {
    this.accessControlAllowOrigin = params.accessControlAllowOrigin || '*'
    this.defaultHeaders = {
      ...params.defaultHeaders
    }
    this.logger = params.logger
  }

  public disableLogging (): void {
    this.loggingEnabled = false
  }

  public enableLogging (): void {
    this.loggingEnabled = true
  }

  public getLoggingStatus (): boolean {
    return this.loggingEnabled
  }

  public getAccessControlAllowOriginHeader (): string {
    return this.accessControlAllowOrigin
  }

  public getDefaultHeaders (): Headers {
    return this.defaultHeaders
  }

  public parseJSONBody<T> (body: string): T {
    try {
      return JSON.parse(body) as T
    } catch (err) {
      throw new HandlerError({ statusCode: STATUS.BAD_REQUEST })
    }
  }

  public parseJSONBodyAsPartial<T> (body: string): RecursivePartial<T> {
    try {
      return JSON.parse(body) as RecursivePartial<T>
    } catch (err) {
      throw new HandlerError({ statusCode: STATUS.BAD_REQUEST })
    }
  }

  private buildCustomHandlerResponse<T> (statusCode: STATUS, body?: T, headers?: Headers): HandlerResponse {
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
    return this.buildCustomHandlerResponse(STATUS.OK, body, headers)
  }

  public clientError<T> (body?: T, headers?: Headers) {
    return this.buildCustomHandlerResponse(STATUS.BAD_REQUEST, body, headers)
  }

  public serverError<T> (body?: T, headers?: Headers) {
    return this.buildCustomHandlerResponse(STATUS.INTERNAL_SERVER_ERROR, body, headers)
  }

  public handleError<T> (err: HandlerError<T> | Error, fallbackMessage: string): HandlerResponse {
    if (this.getLoggingStatus()) {
      this.logger.warn(err)
    }
    if ('statusCode' in err) {
      return this.buildCustomHandlerResponse(err.statusCode, err.body, err.headers)
    }
    if (this.getLoggingStatus()) {
      this.logger.error(fallbackMessage)
    }
    return this.serverError('Something went wrong')
  }

  public async wrapLogic (params: WrapLogicParameters): Promise<HandlerResponse> {
    const { logic, fallbackMessage } = params
    try {
      return await logic()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return this.handleError(err, fallbackMessage)
    }
  }
}
