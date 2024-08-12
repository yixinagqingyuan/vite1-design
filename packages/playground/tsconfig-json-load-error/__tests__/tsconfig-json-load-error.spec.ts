import { editFile, isBuild, readFile, untilUpdated } from '../../testUtils'

if (isBuild) {
  test('should throw an error on build', () => {
    const buildError = beforeAllError
    expect(buildError).toBeTruthy()
    expect(buildError.message).toMatch(
      /^parsing .* failed: SyntaxError: Unexpected token } in JSON at position \d+$/
    )
    beforeAllError = null // got expected error, null it here so testsuite does not fail from rethrow in afterAll
  })

  test('should not output files to dist', () => {
    let err
    try {
      readFile('dist/index.html')
    } catch (e) {
      err = e
    }
    expect(err).toBeTruthy()
    expect(err.code).toBe('ENOENT')
  })
} else {
  test('should log 500 error in browser for malformed tsconfig', () => {
    // don't test for actual complete message as this might be locale dependant. chrome does log 500 consistently though
    expect(browserLogs.find((x) => x.includes('500'))).toBeTruthy()
    expect(browserLogs).not.toContain('tsconfig error fixed, file loaded')
  })

  test('should show error overlay for tsconfig error', async () => {
    const errorOverlay = await page.waitForSelector('vite-error-overlay')
    expect(errorOverlay).toBeTruthy()
    const message = await errorOverlay.$$eval('.message-body', (m) => {
      return m[0].innerHTML
    })
    // use regex with variable filename and position values because they are different on win
    expect(message).toMatch(
      /^parsing .* failed: SyntaxError: Unexpected token } in JSON at position \d+$/
    )
  })

  test('should reload when tsconfig is changed', async () => {
    await editFile('has-error/tsconfig.json', (content) => {
      return content.replace('"compilerOptions":', '"compilerOptions":{}')
    })
    await untilUpdated(() => {
      return browserLogs.find((x) => x === 'tsconfig error fixed, file loaded')
    }, 'tsconfig error fixed, file loaded')
  })
}
