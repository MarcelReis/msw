import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { captureConsole } from '../support/captureConsole'
import { warn } from 'console'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'query-params-warning.mocks.ts'),
  )
})

afterAll(() => runtime.cleanup())

function findQueryParametersWarning(logs: string[]) {
  return logs.find((message) => {
    return message.startsWith(
      '[MSW] Found a redundant usage of query parameters in the request handler URL',
    )
  })
}

function findQueryParametersSuggestions(logs: string[], params: string[]) {
  return logs.find((message) => {
    return params.every((paramName) =>
      message.includes(`const ${paramName} = query.get("${paramName}")`),
    )
  })
}

test('warns when a request handler URL contains a single query parameter', async () => {
  const warnings: string[] = []
  captureConsole(runtime.page, warnings, (message) => {
    return message.type() === 'warning'
  })

  await runtime.reload()
  expect(findQueryParametersWarning(warnings)).toBeUndefined()

  const res = await runtime.request({
    url: `${runtime.origin}/user?id=123`,
  })
  expect(res.status()).toBe(200)

  // Should produce a friendly warning.
  expect(findQueryParametersWarning(warnings)).not.toBeUndefined()

  // Should suggest how to reference query parameters in the response resolver.
  expect(findQueryParametersSuggestions(warnings, ['name'])).not.toBeUndefined()
})

test('warns when a request handler URL contains multiple query parameters', async () => {
  const warnings: string[] = []
  captureConsole(runtime.page, warnings, (message) => {
    return message.type() === 'warning'
  })

  await runtime.reload()
  expect(findQueryParametersWarning(warnings)).toBeUndefined()

  const res = await runtime.request({
    url: `${runtime.origin}/login?id=123`,
    fetchOptions: {
      method: 'POST',
    },
  })
  expect(res.status()).toBe(200)

  // Should produce a friendly warning.
  expect(findQueryParametersWarning(warnings)).not.toBeUndefined()

  // Should suggest how to reference query parameters in the response resolver.
  expect(
    findQueryParametersSuggestions(warnings, ['id', 'type']),
  ).not.toBeUndefined()
})
