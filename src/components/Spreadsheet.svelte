<script>
  import { writable } from "svelte/store";
  import { spreadsheetData } from "../stores";
  import fetchSpreadsheet from "../core/fetchSpreadsheet";

  let spreadsheetId = writable("1HOeWijWGbIOGDVG760rfvEQGka1bfmtRe4RHw_Wr3mw");
  let spreadsheetPage = writable("1");
  let loadStatus = "No data loaded yet";

  $: {
    loadStatus = "Loading data...";
    const url = `https://spreadsheets.google.com/feeds/list/${$spreadsheetId}/${$spreadsheetPage}/public/values?alt=json`;
    console.log("Fetching: ", url);
    fetch(url)
      .then((response) => {
        console.log(response);
        return response.json();
      })
      .then((data) => {
        spreadsheetData.set(data);
        loadStatus = "Data loaded";
      })
      .catch((error) => {
        loadStatus = "There was a problem loading data. See the console.";
        console.error(error);
      });
  }
</script>

<label for="spreadsheet-id">Spreadsheet ID</label>
<input
  name="spreadsheet-id"
  value={$spreadsheetId}
  on:change={(e) => {
    $spreadsheetId = e.target.value;
  }} />

<label for="spreadsheet-page">Spreadsheet Page</label>
<input
  name="spreadsheet-page"
  value={$spreadsheetPage}
  on:change={(e) => {
    $spreadsheetPage = e.target.value;
  }} />

<p>Status:</p>
<p>{loadStatus}</p>
