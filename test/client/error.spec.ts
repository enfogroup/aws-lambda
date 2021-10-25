// to be tested
import { HandlerError } from '@clients/error'

// models
import { HTTP_STATUS_CODE } from '@models/http'

describe('HandlerError', () => {
  it('should set all parameters if passed', () => {
    interface Data {
      a: number;
      b: string;
    }
    const input: Data = {
      a: 42,
      b: 'answer'
    }

    const output = new HandlerError<Data>({
      body: input,
      statusCode: HTTP_STATUS_CODE.NOT_FOUND,
      message: 'This is a test!',
      headers: {
        key: 'value'
      }
    })

    expect(output.body).toEqual(input)
    expect(output.statusCode).toEqual(HTTP_STATUS_CODE.NOT_FOUND)
    expect(output.message).toEqual('This is a test!')
    expect(output.headers).toEqual({ key: 'value' })
  })
})
