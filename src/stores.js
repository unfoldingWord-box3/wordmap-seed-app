import { writable } from 'svelte/store';

export const spreadsheetData = writable(null);
export let sourceCorpusSheet = writable([]);
export let targetCorpusSheet = writable([]);