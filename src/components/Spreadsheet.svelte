<script>
  import { TextField } from "smelte";
  import { writable } from "svelte/store";
  import { spreadsheetData, sourceCorpus, targetCorpus } from "../stores";
  //  import fetchSpreadsheet from "../core/fetchSpreadsheet";
  //let spreadsheetId = writable("2PACX-1vRHJTJwCSI0Tsp1Kq7zPjKbATnIJ2c-xqVCcTyN-Y147csNQydJQpF_VfBkgztJOj1wSHsgyC6KgK4e");
  let spreadsheetId = writable("1AHngc0GXgt1RuV0TfoWZkEU6EcGuygb3KeH5MmPfnbQ");
  //  let spreadsheetId = writable("1HOeWijWGbIOGDVG760rfvEQGka1bfmtRe4RHw_Wr3mw");
  let spreadsheetPage = writable("1");
  let loadStatus = "No data loaded yet";

  function fetchSheet({id, sheet, store}) {
    loadStatus = "Loading data...";
    const url = `https://spreadsheets.google.com/feeds/list/${id}/${sheet}/public/values?alt=json`;
    fetch(url).then((response) => response.json())
    .then((data) => {
      store.set(data);
      console.log(`Sheet: ${sheet} of WorkbookId: ${id}`);
      loadStatus = "Data loaded";
    }).catch((error) => {
      loadStatus = "There was a problem loading data. See the console.";
      console.error(error);
    });
  };

  $: {
    fetchSheet({ id: $spreadsheetId, sheet: $spreadsheetPage, store: spreadsheetData });
  };

  export let languages = ['en', 'fr'];
  const corpusSheet = { en: 1, fr: 2, hi: 3, ru: 4 };
  
  let sourceCorpusSheet = writable();
  let targetCorpusSheet = writable();

  let sheets;
  $: sheets = languages.map(language => corpusSheet[language]);
  $: fetchSheet({ id: '16GrLOy8e4Gmw_1VR0v5k96QIUujbcO97ZN6e3YuHfbM', sheet: sheets[0], store: sourceCorpusSheet });
  $: $sourceCorpus = $sourceCorpusSheet?.feed.entry.map( row => row.gsx$text?.$t ).join('\n') || '';
  $: fetchSheet({ id: '16GrLOy8e4Gmw_1VR0v5k96QIUujbcO97ZN6e3YuHfbM', sheet: sheets[1], store: targetCorpusSheet });
  $: $targetCorpus = $targetCorpusSheet?.feed.entry.map( row => row.gsx$text?.$t ).join('\n') || '';
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
