import { HTTP_STATUS_CODE } from '@models/http'

export type Headers = Record<string, string>;

interface BaseResponse {
  /**
   * HTTP status code
   */
  statusCode: HTTP_STATUS_CODE;
  /**
   * Headers
   */
  headers?: Headers;
  /**
   * If set to true the response will be treated as binary
   */
  isBase64Encoded?: boolean;
}

/**
 * Response from a Lambda integrated with API Gateway
 */
export interface HandlerResponse extends BaseResponse {
  /**
   * Body stringified
   */
  body: string;
  /**
   * Headers
   */
  headers: Headers;
}

/**
 * Response complete with status code
 */
export interface ResponseWithStatusCode<T> extends BaseResponse {
  /**
   * Body of any response type. Will be stringified
   */
  body?: T
}

/**
 * Response without status code. It should be supplied by the function to which this is being passed to
 */
export type ResponseWithoutStatusCode<T> = Omit<ResponseWithStatusCode<T>, 'statusCode'>
