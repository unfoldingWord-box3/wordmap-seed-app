<script>
  import { spreadsheetData } from "../stores";

  let spreadsheetDataValue;

  const unsubscribe = spreadsheetData.subscribe((value) => {
    console.log("spreadsheet data update");
    spreadsheetDataValue = value;
  });
</script>

<h2>Spreadsheet Data display tester</h2>
{#if spreadsheetDataValue}
  <p>Spreadsheet Author: {spreadsheetDataValue.feed.author[0].name.$t}</p>
  <p>Values:</p>
  <ul>
      {#each spreadsheetDataValue.feed.entry as entry}
          <li>{JSON.stringify(entry.title)}, {JSON.stringify(entry.content)}</li>
      {/each}
  </ul>
{/if}
