// to be tested
import { APIGatewayHelper } from '@clients/apigateway'

// models
import { Logger } from '@models/logger'
import { STATUS } from '@models/http'
import { HandlerError } from '@clients/error'
import { checkAllMocksCalled } from '@test/tools'

describe('APIGatewayHelper', () => {
  const logger: Logger = {
    warn: () => { },
    error: () => { }
  }

  interface Data {
    a: number
  }

  describe('disableLogging', () => {
    it('should disable logging', () => {
      const instance = new APIGatewayHelper({ logger })

      instance.disableLogging()

      expect(instance.getLoggingStatus()).toEqual(false)
    })
  })

  describe('enableLogging', () => {
    it('should enable logging', () => {
      const instance = new APIGatewayHelper({ logger })

      instance.enableLogging()

      expect(instance.getLoggingStatus()).toEqual(true)
    })
  })

  describe('getAccessControlAllowOriginHeader', () => {
    it('should use "*" as default', () => {
      const instance = new APIGatewayHelper({ logger })

      const output = instance.getAccessControlAllowOriginHeader()

      expect(output).toEqual('*')
    })

    it('should use the value specified in the constructor', () => {
      const instance = new APIGatewayHelper({ logger, accessControlAllowOrigin: 'banana' })

      const output = instance.getAccessControlAllowOriginHeader()

      expect(output).toEqual('banana')
    })
  })

  describe('getDefaultHeaders', () => {
    it('should return only accessControlAllowOrigin if not specified in the constructor', () => {
      const instance = new APIGatewayHelper({ logger })

      const output = instance.getDefaultHeaders()

      expect(output).toEqual({
        accessControlAllowOrigin: '*'
      })
    })

    it('should return accessControlAllowOrigin and all headers specified in constructor', () => {
      const instance = new APIGatewayHelper({ logger, defaultHeaders: { a: '42', b: 'answer' } })

      const output = instance.getDefaultHeaders()

      expect(output).toEqual({
        accessControlAllowOrigin: '*',
        a: '42',
        b: 'answer'
      })
    })
  })

  describe('parseJSON', () => {
    const instance = new APIGatewayHelper({ logger })
    it('should parse string to JSON', () => {
      const input: Data = { a: 42 }

      const output = instance.parseJSON<Data>(JSON.stringify(input))

      expect(output).toEqual(input)
    })

    it('should throw if no input was supplied', () => {
      expect(() => instance.parseJSON<Data>()).toThrow('No input supplied for JSON parsing')
    })

    it('should throw if the input could not be parsed', () => {
      expect(() => instance.parseJSON<Data>('banana:{}')).toThrow('Input could be not be parsed as JSON')
    })
  })

  describe('parseJSONAsPartial', () => {
    const instance = new APIGatewayHelper({ logger })
    it('should parse string to JSON', () => {
      const input: Data = { a: 42 }

      const output = instance.parseJSONAsPartial<Data>(JSON.stringify(input))

      expect(output).toEqual(input)
    })

    it('should throw if no input was supplied', () => {
      expect(() => instance.parseJSONAsPartial<Data>()).toThrow('No input supplied for JSON parsing')
    })

    it('should throw if the input could not be parsed', () => {
      expect(() => instance.parseJSONAsPartial<Data>('banana:{}')).toThrow('Input could be not be parsed as JSON')
    })
  })

  describe('buildCustomResponse', () => {
    const instance = new APIGatewayHelper({ logger })
    it('should return a custom response', () => {
      const input: Data = {
        a: 4711
      }

      const output = instance.buildCustomResponse<Data>(STATUS.ACCEPTED, input)

      expect(output).toMatchObject({
        statusCode: STATUS.ACCEPTED,
        body: JSON.stringify(input)
      })
    })

    it('should handle string body', () => {
      const output = instance.buildCustomResponse<string>(STATUS.OK, 'banana')

      expect(output).toMatchObject({
        statusCode: STATUS.OK,
        body: 'banana'
      })
    })

    it('should handle no body being provided', () => {
      const output = instance.buildCustomResponse(STATUS.NO_CONTENT)

      expect(output).toMatchObject({
        statusCode: STATUS.NO_CONTENT,
        body: undefined
      })
    })

    it('should include custom headers', () => {
      const input: Data = {
        a: 4711
      }

      const output = instance.buildCustomResponse<Data>(STATUS.ACCEPTED, input, { key: 'value' })

      expect(output).toMatchObject({
        statusCode: STATUS.ACCEPTED,
        body: JSON.stringify(input),
        headers: {
          key: 'value'
        }
      })
    })
  })

  describe('ok', () => {
    it('should return status 200', () => {
      const instance = new APIGatewayHelper({ logger })

      const output = instance.ok()

      expect(output).toMatchObject({
        statusCode: STATUS.OK
      })
    })
  })

  describe('clientError', () => {
    it('should return status 400', () => {
      const instance = new APIGatewayHelper({ logger })

      const output = instance.clientError()

      expect(output).toMatchObject({
        statusCode: STATUS.BAD_REQUEST
      })
    })
  })

  describe('serverError', () => {
    it('should return status 500', () => {
      const instance = new APIGatewayHelper({ logger })

      const output = instance.serverError()

      expect(output).toMatchObject({
        statusCode: STATUS.INTERNAL_SERVER_ERROR
      })
    })
  })

  describe('handleError', () => {
    const instance = new APIGatewayHelper({ logger })
    it('should return a response with data from the HandlerError', () => {
      const err = new HandlerError({ statusCode: STATUS.IM_A_TEAPOT, body: 'banana', headers: { a: 'b' } })

      const output = instance.handleError(err, 'Log me')

      expect(output).toMatchObject({
        statusCode: STATUS.IM_A_TEAPOT,
        body: 'banana',
        headers: {
          a: 'b'
        }
      })
    })

    it('should return the default error response', () => {
      const output = instance.handleError(new Error(), 'Log me')

      expect(output).toMatchObject({
        statusCode: STATUS.INTERNAL_SERVER_ERROR,
        body: instance.getDefaultServerError()
      })
    })

    it('should log warning when processing a HandlerError', () => {
      const warnMock = jest.fn()
      const errorMock = jest.fn()
      const logger: Logger = {
        warn: warnMock,
        error: errorMock
      }
      const instance = new APIGatewayHelper({ logger })
      const err = new HandlerError({ statusCode: STATUS.IM_A_TEAPOT })

      const output = instance.handleError(err, 'Log me')

      expect(output).toMatchObject({
        statusCode: STATUS.IM_A_TEAPOT
      })
      checkAllMocksCalled([warnMock], 1)
      checkAllMocksCalled([errorMock], 0)
    })

    it('should log warning and Error when processing an unknown Error', () => {
      const warnMock = jest.fn()
      const errorMock = jest.fn()
      const logger: Logger = {
        warn: warnMock,
        error: errorMock
      }
      const instance = new APIGatewayHelper({ logger })

      const output = instance.handleError(new Error(), 'Log me')

      expect(output).toMatchObject({
        statusCode: STATUS.INTERNAL_SERVER_ERROR
      })
      checkAllMocksCalled([warnMock, errorMock], 1)
    })

    it('should log nothing when logging is disabled', () => {
      const warnMock = jest.fn()
      const errorMock = jest.fn()
      const logger: Logger = {
        warn: warnMock,
        error: errorMock
      }
      const instance = new APIGatewayHelper({ logger })
      instance.disableLogging()

      const output = instance.handleError(new Error(), 'Log me')

      expect(output).toMatchObject({
        statusCode: STATUS.INTERNAL_SERVER_ERROR
      })
      checkAllMocksCalled([warnMock, errorMock], 0)
    })
  })
})
