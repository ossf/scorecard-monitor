const core = require('@actions/core')
const main = require('../src/action')

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug').mockImplementation()
const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
const setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(["scope", "database", "report"])('should throw an error if the %s is not provided', async (input) => {
    getInputMock.mockImplementation(name => {
      if (name === input) {
        throw new Error(`Input required and not supplied: ${input}`)
      }

      return ''
    })
    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      `Input required and not supplied: ${input}`
    )
  })
})
