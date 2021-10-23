// to be tested
import { APIGatewayHelper } from '@clients/apigateway'

// models
import { Logger } from '@models/logger'

describe('APIGatewayHelper', () => {
  const logger: Logger = {
    warn: () => { },
    error: () => { }
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
})
