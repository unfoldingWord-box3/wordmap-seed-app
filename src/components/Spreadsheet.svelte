<script>
  import { TextField } from "smelte";
  import { writable } from "svelte/store";
  // import { onMount } from 'svelte';
  import {
    spreadsheetData,
    sourceCorpusSheet,
    targetCorpusSheet,
    language,
    dataFetchStatus,
  } from "../stores";
  import fetchSheet from '../core/fetchSpreadsheet';

  $dataFetchStatus = "No data loaded yet";
  function onStatus(status) { $dataFetchStatus = status; };

  //  import fetchSpreadsheet from "../core/fetchSpreadsheet";
  //let spreadsheetId = writable("2PACX-1vRHJTJwCSI0Tsp1Kq7zPjKbATnIJ2c-xqVCcTyN-Y147csNQydJQpF_VfBkgztJOj1wSHsgyC6KgK4e");
  let spreadsheetId = writable("1AHngc0GXgt1RuV0TfoWZkEU6EcGuygb3KeH5MmPfnbQ");
  //  let spreadsheetId = writable("1HOeWijWGbIOGDVG760rfvEQGka1bfmtRe4RHw_Wr3mw");

  let languages = [];
  $: languages = ['English', $language];

  let corpusSheets;
  const corpusSheetMap = { English: 1, French: 2, Hindi: 3, Russian: 4 };
  $: corpusSheets = languages.map(language => corpusSheetMap[language]);
  $: fetchSheet({ id: '16GrLOy8e4Gmw_1VR0v5k96QIUujbcO97ZN6e3YuHfbM', sheet: corpusSheets[0], store: sourceCorpusSheet, onStatus });
  $: fetchSheet({ id: '16GrLOy8e4Gmw_1VR0v5k96QIUujbcO97ZN6e3YuHfbM', sheet: corpusSheets[1], store: targetCorpusSheet, onStatus });

  let aligmentSheet;
  const aligmentSheetMap = { French: 1, Hindi: 3, Russian: 5 };
  $: aligmentSheet = aligmentSheetMap[$language];
  $: fetchSheet({ id: $spreadsheetId, sheet: aligmentSheet, store: spreadsheetData, onStatus });

</script>

<p>Data Fetching Status:</p>
<p>{$dataFetchStatus}</p>
