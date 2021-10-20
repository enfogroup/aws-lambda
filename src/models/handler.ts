import { STATUS } from '@models/http'

export type Headers = Record<string, string>;

export interface HandlerResponse {
  statusCode: STATUS;
  headers: Headers;
  body?: string;
}
