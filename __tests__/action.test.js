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

  it.each(['scope', 'database', 'report'])('should throw an error if the %s is not provided', async (input) => {
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

  it('should throw an error if the available report is not valid', async () => {
    getInputMock.mockImplementation(name => {
      if (name === 'report-tool') {
        return 'invalid'
      }

      return ''
    })
    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1,
      'The report-tool is not valid, please use: scorecard-visualizer, deps.dev'
    )
  })

  it.todo("should't throw an error if the available report is valid")

  it.each(['auto-push', 'generate-issue', 'auto-commit', 'discovery-enabled'])('should throw an error if the github token is not provided when %s is enabled', async (input) => {
    getInputMock.mockImplementation(name => {
      if (name === input) {
        return 'true'
      }

      return ''
    })
    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenNthCalledWith(1,
      'Github token is required for push, commit, create an issue and discovery operations!'
    )
  })
})
