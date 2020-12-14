import { writable } from 'svelte/store';

export const spreadsheetData = writable(null);
export const sourceCorpusSheet = writable([]);
export const targetCorpusSheet = writable([]);
export const language = writable('French');
export const dataFetchStatus = writable('');
export const languageSwap = writable(false);