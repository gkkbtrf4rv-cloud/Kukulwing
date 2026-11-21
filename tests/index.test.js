import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Script } from 'node:vm';

test('the inline scripts in the public menu parse', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const [index, [, source]] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) {
    new Script(source, { filename: `index.html inline script ${index + 1}` });
  }
});
