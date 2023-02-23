import { writable } from 'svelte/store';

import data from './data';

const language = writable('english');
const line = writable(1);
const sourceLine = writable(data.greek.corpus.split(/\n/)[1]);
const targetLine = writable(data.english.corpus.split(/\n/)[1]);
const sourceCorpus = writable('a');
const targetCorpus = writable('a');
const sourceAlignment = writable('a');
const targetAlignment = writable('a');
const languageSwap = writable(false);

export {
  language,
  line,
  sourceLine,
  targetLine,
  sourceCorpus,
  targetCorpus,
  sourceAlignment,
  targetAlignment,
  languageSwap,
  data,
}