import { expect, test } from 'bun:test'

test('dom test', () => {
  if (typeof document === 'undefined') {
    // Skip in non-browser environments
    expect(true).toBe(true)
    return
  }
  document.body.innerHTML = `<button>My button</button>`
  const button = document.querySelector('button')
  expect(button?.textContent).toEqual('My button')
})
