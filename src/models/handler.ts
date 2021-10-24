import { STATUS } from '@models/http'

export type Headers = Record<string, string>;

/**
 * Response from a Lambda integrated with API Gateway
 */
export interface HandlerResponse {
  /**
   * HTTP status code
   */
  statusCode: STATUS;
  /**
   * Headers
   */
  headers: Headers;
  /**
   * Optional body, stringified
   */
  body?: string;
}
