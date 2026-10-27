import { samples } from './samples.js';

const $ = (id) => document.getElementById(id);
const code = $('code');
let connected = false;
let currentResult = null;
let pending = false;

function announce(message) { $('announcement').textContent = message; }
function counts() {
  $('character-count').textContent = `${code.value.length.toLocaleString()} / 12,000 characters`;
  $('line-numbers').textContent = Array.from({ length: code.value.split('\n').length }, (_, i) => i + 1).join('\n');
}
function resetResult() {
  currentResult = null;
  $('result').hidden = true;
  $('empty-state').hidden = false;
  $('result-badge').textContent = 'READY WHEN YOU ARE';
  $('error').hidden = true;
}
function selectSample(id) {
  if (pending) return;
  const sample = samples[id];
  code.value = sample.code;
  $('language').value = sample.language;
  $('level').value = 'Beginner';
  $('mode').value = 'sample';
  $('sample-picker').value = id;
  document.querySelectorAll('[data-sample]').forEach(button => button.classList.toggle('selected', button.dataset.sample === id));
  code.scrollTop = 0;
  $('line-numbers').scrollTop = 0;
  counts(); resetResult(); updateMode();
}
function updateMode() {
  const sampleMode = $('mode').value === 'sample';
  $('mode-note').textContent = sampleMode ? 'Prewritten lesson for the selected example.' : 'Your snippet is sent to Claude. API charges may apply.';
  $('level').disabled = pending || sampleMode;
  $('explain-button').childNodes[0].textContent = sampleMode ? 'Explain this example ' : 'Explain with Claude ';
}
function showError(message) { $('error').textContent = message; $('error').hidden = false; announce(message); }
function fillList(id, items) {
  $(id).replaceChildren(...items.map(item => { const li = document.createElement('li'); li.textContent = item; return li; }));
}
function render(explanation, context) {
  currentResult = { explanation, ...context };
  $('summary').textContent = explanation.summary;
  $('steps').replaceChildren(...explanation.steps.map(step => {
    const row = document.createElement('div'); row.className = 'explanation-step';
    const badge = document.createElement('span'); badge.className = 'line-tag'; badge.textContent = `L${step.lines}`;
    const paragraph = document.createElement('p'); paragraph.textContent = step.explanation;
    row.append(badge, paragraph); return row;
  }));
  fillList('concepts', explanation.concepts); fillList('cautions', explanation.cautions);
  $('cautions-section').hidden = explanation.cautions.length === 0;
  $('quiz-question').textContent = explanation.quiz.question;
  $('quiz-answer').textContent = explanation.quiz.answer;
  $('quiz-details').open = false;
  $('result-context').textContent = `${context.language} · ${context.level}`;
  $('result-badge').textContent = context.source === 'sample' ? 'PREWRITTEN SAMPLE' : 'EXPLAINED BY CLAUDE';
  $('empty-state').hidden = true; $('result').hidden = false;
  announce('Your explanation is ready.');
}
function setPending(value) {
  pending = value;
  ['explain-button', 'clear', 'language', 'mode', 'sample-picker'].forEach(id => { $(id).disabled = value; });
  code.readOnly = value;
  document.querySelectorAll('[data-sample]').forEach(button => { button.disabled = value; });
  $('loading-state').hidden = !value;
  document.querySelector('.lesson-panel').setAttribute('aria-busy', String(value));
  updateMode();
}
function markdown() {
  const { explanation: e, language, level, source, snippet } = currentResult;
  // Use a fence longer than any backtick sequence in the input.
  const fence = '`'.repeat(Math.max(3, ...Array.from(snippet.matchAll(/`+/g), m => m[0].length + 1)));
  return `# CodeLens Learn\n\n${language} · ${level} · ${source === 'sample' ? 'Prewritten sample' : 'Claude explanation'}\n\n## Code\n\n${fence}\n${snippet}\n${fence}\n\n## The big picture\n\n${e.summary}\n\n## Step by step\n\n${e.steps.map(s => `- Lines ${s.lines}: ${s.explanation}`).join('\n')}\n\n## Key concepts\n\n${e.concepts.map(s => `- ${s}`).join('\n')}\n\n## Keep in mind\n\n${e.cautions.map(s => `- ${s}`).join('\n')}\n\n## Practice\n\n${e.quiz.question}\n\n${e.quiz.answer}\n\n---\nExplanations may contain mistakes. Code was not executed.\n`;
}

document.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => selectSample(button.dataset.sample)));
$('sample-picker').addEventListener('change', () => { if ($('sample-picker').value) selectSample($('sample-picker').value); });
code.addEventListener('input', () => { counts(); resetResult(); $('sample-picker').value = ''; document.querySelectorAll('[data-sample]').forEach(b => b.classList.remove('selected')); });
code.addEventListener('scroll', () => { $('line-numbers').scrollTop = code.scrollTop; });
['language', 'level'].forEach(id => $(id).addEventListener('change', resetResult));
$('mode').addEventListener('change', () => { resetResult(); updateMode(); });
$('clear').addEventListener('click', () => { code.value = ''; $('sample-picker').value = ''; document.querySelectorAll('[data-sample]').forEach(b => b.classList.remove('selected')); counts(); resetResult(); code.focus(); });
$('setup-toggle').addEventListener('click', () => {
  const expanded = $('setup').hidden;
  $('setup').hidden = !expanded;
  $('setup-toggle').setAttribute('aria-expanded', String(expanded));
  if (expanded) $('setup').scrollIntoView({ block: 'nearest' });
});
$('explain-form').addEventListener('submit', async event => {
  event.preventDefault(); if (pending) return;
  $('error').hidden = true;
  const snippet = code.value;
  if (!snippet.trim()) return showError('Paste a snippet or choose an example to get started.');
  if (snippet.length > 12000) return showError('Keep your snippet under 12,000 characters.');
  const context = { snippet, language: $('language').value, level: $('level').value, source: $('mode').value };
  if (context.source === 'sample') {
    const sample = Object.values(samples).find(item => item.code.trim() === snippet.trim() && item.language === context.language);
    if (!sample) return showError('Free sample mode explains the two included examples. Choose an example, or connect Claude to explain your own code.');
    render(sample.explanation, { ...context, level: 'Beginner' }); return;
  }
  if (!connected) return showError('Connect Claude using the setup guide below.');
  resetResult(); $('empty-state').hidden = true; setPending(true); announce('Asking Claude for an explanation.');
  try {
    const response = await fetch('./api/explain', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: snippet, language: context.language, level: context.level }), signal: AbortSignal.timeout(50000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not explain the snippet. Please try again.');
    render(data.explanation, context);
  } catch (error) {
    $('empty-state').hidden = false;
    showError(error.name === 'TimeoutError' ? 'The request timed out. Please try a shorter snippet.' : error instanceof TypeError || error instanceof SyntaxError ? 'Cannot reach the local server. Start it with npm start and try again.' : error.message);
  } finally { setPending(false); }
});
$('copy').addEventListener('click', async () => {
  if (!currentResult) return;
  try { await navigator.clipboard.writeText(markdown()); announce('Explanation copied.'); $('copy').textContent = 'Copied!'; setTimeout(() => { $('copy').textContent = 'Copy'; }, 1800); }
  catch { showError('Clipboard access is unavailable. Use Save .md to download the explanation.'); }
});
$('download').addEventListener('click', () => {
  if (!currentResult) return;
  const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'codelens-explanation.md'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Explanation saved.');
});

selectSample('javascript');
try {
  const response = await fetch('./api/status', { signal: AbortSignal.timeout(4000) });
  if (response.ok) {
    const data = await response.json(); connected = data.connected === true;
    if (connected) {
      $('connection-status').textContent = 'Claude configured';
      const option = $('mode').querySelector('[value="claude"]'); option.disabled = false; option.textContent = 'Claude API';
      $('setup-toggle').textContent = 'Claude setup →';
    }
  }
} catch { /* Static previews retain the free sample lessons. */ }
