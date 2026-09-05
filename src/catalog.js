import { defineTool } from '@deepseek-ai/dsh-tools'

export const catalog = [
  { id: 'hello', name: 'Hello', description: 'A friendly greeting.', icon: 'wave', color: 'blue', tool: 'hub_greet', input: 'Ada', inputLabel: 'Name', version: '0.1.0', dependencies: ['tools'],
    run: input => `Hello, ${input}! Nice to meet you.` },
  { id: 'text', name: 'Text Studio', description: 'Count characters, words and lines.', icon: 'text', color: 'violet', tool: 'hub_text_stats', input: 'Everything is a plugin.', inputLabel: 'Text', version: '0.1.0', dependencies: ['tools'],
    run: input => JSON.stringify({ characters: [...input].length, words: input.trim().split(/\s+/u).filter(Boolean).length, lines: input.split('\n').length }, null, 2) },
  { id: 'clock', name: 'World Clock', description: 'The current time in any time zone.', icon: 'clock', color: 'amber', tool: 'hub_world_clock', input: 'Asia/Singapore', inputLabel: 'Time zone', version: '0.1.0', dependencies: ['tools'],
    run: input => new Intl.DateTimeFormat('en-US', { timeZone: input, dateStyle: 'full', timeStyle: 'long' }).format(new Date()) },
]

export function toolPlugin(item) {
  return {
    name: `hub-${item.id}`, inject: ['tools'],
    apply(ctx) {
      ctx.tools.register(defineTool({
        name: item.tool, description: item.description,
        parameters: { input: { type: 'string', required: true, description: item.inputLabel } },
        output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
        async execute({ input }) {
          if (!input.trim() || input.length > 4000) throw new Error('Enter between 1 and 4,000 characters.')
          return item.run(input)
        },
      }))
    },
  }
}
