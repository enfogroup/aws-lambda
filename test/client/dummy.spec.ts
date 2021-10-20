import { DummyClient } from '@clients/dummy'

describe('clients/dummy', () => {
  const client = new DummyClient('test')

  describe('getGreeting', () => {
    it('should return a greeting', () => {
      const name = 'CoolName'

      const output = client.getGreeting(name)

      expect(output.includes(name)).toEqual(true)
    })
  })
})
