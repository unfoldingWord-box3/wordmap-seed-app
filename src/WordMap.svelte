<script>
  import WordMAP from "wordmap";
  import InputForm from "./components/InputForm.svelte";
  import Suggestions from "./components/Suggestions.svelte";
  import { writable } from "svelte/store";
  import { getData } from "./core/data";
  import { spreadsheetData } from "./stores";

  const data = getData();

  // export let corpus = [["Guten Tag", "Good day"]];
  // export let alignmentMemory = [["Tag", "day"]];
  export let source = writable(data.source);
  export let target = writable(data.target);

  export let sourceCorpus = writable(data.source);
  export let targetCorpus = writable(data.target);

  export let dataChoiceAlignment = writable([]);
  export let sourceAlignment = writable("");
  export let targetAlignment = writable("");

  $: {
    $sourceAlignment = $spreadsheetData?.feed.entry
    .filter(row => $dataChoiceAlignment.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
    .map( row => row.gsx$source?.$t )
    .join( '\n' );

    $targetAlignment = $spreadsheetData?.feed.entry
    .filter(row => $dataChoiceAlignment.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
    .map( row => row.gsx$target?.$t )
    .join( '\n' );
  };

  let map;
  let suggestions;

  $: {
    map = new WordMAP();

    $sourceAlignment?.split("\n").forEach((_source, i) => {
      const _target = $targetAlignment?.split("\n")[i];
      if (_source && _target) map.appendAlignmentMemoryString(_source, _target);
    });

    map.appendCorpus(
      $sourceCorpus
        ?.split("\n")
        .map((_source, i) => {
          const _target = $targetCorpus?.split("\n")[i];
          return [_source, _target];
        })
        .filter(([_source, _target]) => _source && _target)
    );

    suggestions = map.predict($source, $target);
  }
</script>

<div>
  <InputForm
    {source}
    {target}
    {sourceCorpus}
    {targetCorpus}
    {sourceAlignment}
    {targetAlignment}
    {dataChoiceAlignment}
  />
  <Suggestions {suggestions} />
</div>
