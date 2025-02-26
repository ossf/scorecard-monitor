const { run } = require('../src/action')

// Mock the action's entrypoint
jest.mock('../src/action', () => ({
  run: jest.fn()
}))

describe('index', () => {
  it('calls run when imported', async () => {
    require('../src/bin')

    expect(run).toHaveBeenCalled()
  })
})
