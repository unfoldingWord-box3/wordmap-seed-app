<script>
  import { TextField } from "smelte";
  import { writable } from "svelte/store";
  // import { onMount } from 'svelte';
  import { spreadsheetData, sourceCorpusSheet, targetCorpusSheet } from "../stores";
  import fetchSheet from '../core/fetchSpreadsheet';



  //  import fetchSpreadsheet from "../core/fetchSpreadsheet";
  //let spreadsheetId = writable("2PACX-1vRHJTJwCSI0Tsp1Kq7zPjKbATnIJ2c-xqVCcTyN-Y147csNQydJQpF_VfBkgztJOj1wSHsgyC6KgK4e");
  let spreadsheetId = writable("1AHngc0GXgt1RuV0TfoWZkEU6EcGuygb3KeH5MmPfnbQ");
  //  let spreadsheetId = writable("1HOeWijWGbIOGDVG760rfvEQGka1bfmtRe4RHw_Wr3mw");
  let spreadsheetPage = writable("1");
  let loadStatus = "No data loaded yet";

  export let languages = ['en', 'fr'];
  let sheets;
  const corpusSheet = { en: 1, fr: 2, hi: 3, ru: 4 };
  sheets = languages.map(language => corpusSheet[language]);

  // onMount(async () => {
  //   fetchSheet({ id: $spreadsheetId, 
  //     sheet: $spreadsheetPage, 
  //     store: spreadsheetData });
  //   });

  // 
  $: {
    fetchSheet({ id: $spreadsheetId, sheet: $spreadsheetPage, store: spreadsheetData });
  };

  fetchSheet({ id: '16GrLOy8e4Gmw_1VR0v5k96QIUujbcO97ZN6e3YuHfbM', sheet: sheets[0], store: sourceCorpusSheet });
  fetchSheet({ id: '16GrLOy8e4Gmw_1VR0v5k96QIUujbcO97ZN6e3YuHfbM', sheet: sheets[1], store: targetCorpusSheet });
</script>

<h2>Spreadsheet</h2>

<TextField
  label="spreadsheet-id"
  value={$spreadsheetId}
  on:change={(e) => {
    $spreadsheetId = e.target.value;
  }} />

<TextField
  label="spreadsheet-page"
  value={$spreadsheetPage}
  on:change={(e) => {
    $spreadsheetPage = e.target.value;
  }} />

<p>Status:</p>
<p>{loadStatus}</p>
