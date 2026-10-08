import { translateMessage } from '../i18n/message.js'

export function describeJsonError(error, text, label = 'JSON', descriptor = false) {
  const message = typeof error === 'string' ? error : error?.message || ''
  const match = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  let line = match ? Number(match[1]) : null
  let column = match ? Number(match[2]) : null

  if (line === null) {
    const position = message.match(/position\s+(\d+)/i)
    if (position) {
      const beforeError = text.slice(0, Number(position[1]))
      const lines = beforeError.split('\n')
      line = lines.length
      column = lines.at(-1).length + 1
    } else {
      const unexpectedToken = message.match(/Unexpected token '([^']+)'/i)?.[1]
      if (unexpectedToken?.length === 1) {
        const index = text.indexOf(unexpectedToken)
        if (index >= 0) {
          const lines = text.slice(0, index).split('\n')
          line = lines.length
          column = lines.at(-1).length + 1
        }
      }
    }
  }

  const location = line === null ? '' : { key: 'common:errorLocation', values: { line, column } }
  const guidance = {
    key: /unexpected end|unterminated|end of data/i.test(message)
      ? 'common:unclosedGuidance'
      : 'common:syntaxGuidance',
  }
  const result = { key: 'common:jsonError', values: { label, location, guidance } }
  return descriptor ? result : translateMessage(result)
}
