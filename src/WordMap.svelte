<script>
  import WordMAP from "wordmap";
  import InputForm from "./components/InputForm.svelte";
  import Suggestions from "./components/Suggestions.svelte";
  import { writable } from "svelte/store";
  import { getData } from "./core/data";
  import {
    spreadsheetData,
    sourceCorpusSheet,
    targetCorpusSheet,
    languageSwap,
  } from "./stores";

  const data = getData();

  // export let corpus = [["Guten Tag", "Good day"]];
  // export let alignmentMemory = [["Tag", "day"]];
  export let source = writable(data.source);
  export let target = writable(data.target);

  export let dataChoiceCorpus = writable([]);
  export let sourceCorpus = writable(" ");
  export let targetCorpus = writable(" ");

  export let dataChoiceAlignment = writable([]);
  export let sourceAlignment = writable("");
  export let targetAlignment = writable("");

  $: {
    $sourceAlignment = $spreadsheetData?.feed.entry
    .filter(row => $dataChoiceAlignment.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
    .map(row => row.gsx$source?.$t )
    .join('\n');

    $targetAlignment = $spreadsheetData?.feed.entry
    .filter(row => $dataChoiceAlignment.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
    .map(row => row.gsx$target?.$t )
    .join('\n');
  };

  let sourceBookCorpus, targetBookCorpus;
  $: sourceBookCorpus = $sourceCorpusSheet?.feed?.entry.map( row => row.gsx$text?.$t );
  $: targetBookCorpus = $targetCorpusSheet?.feed?.entry.map( row => row.gsx$text?.$t );

  $: {
    // use a tmp variable to avoid updating the store all the time
    // this avoids an infinite loop
    let _sourceCorpus = [];
    let _targetCorpus = [];
    
    if($dataChoiceCorpus.map(a => a.value).indexOf('line') !== -1) {
      _sourceCorpus = [..._sourceCorpus, $source];
      _targetCorpus = [..._targetCorpus, $target];
    };

    if($dataChoiceCorpus.map(a => a.value).indexOf('book') !== -1) {
      if (sourceBookCorpus && targetBookCorpus) {
        _sourceCorpus = [..._sourceCorpus, ...($languageSwap ? targetBookCorpus : sourceBookCorpus) ];
        _targetCorpus = [..._targetCorpus, ...($languageSwap ? sourceBookCorpus : targetBookCorpus) ];
      };
    };
    
    const sourceNgrams = $spreadsheetData?.feed.entry
      .filter(row => $dataChoiceCorpus.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
      .map(row => $languageSwap ? row.gsx$target?.$t : row.gsx$source?.$t );

    if (sourceNgrams) _sourceCorpus = [..._sourceCorpus, ...sourceNgrams];
    
    const targetNgrams = $spreadsheetData?.feed.entry
    .filter(row => $dataChoiceCorpus.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
    .map(row => $languageSwap ? row.gsx$source?.$t : row.gsx$target?.$t );
    if (targetNgrams) _targetCorpus = [..._targetCorpus, ...targetNgrams];
    
    $sourceCorpus = _sourceCorpus.join('\n');
    $targetCorpus = _targetCorpus.join('\n');

    // uncomment this basic fallback in case the Google API abandons us
    // if (!$sourceCorpus) { $sourceCorpus = $source; };
    // if (!$targetCorpus) { $targetCorpus = $target; };
  };

  let map;
  let suggestions;

  $: {
    map = new WordMAP();

    $sourceAlignment?.split("\n").forEach((_source, i) => {
      const _target = $targetAlignment?.split("\n")[i];
      if (_source && _target) map.appendAlignmentMemoryString(_source, _target);
    });

    // only add a corpus if you actually have one
    if ($sourceCorpus) {
      map.appendCorpus(
        $sourceCorpus
          ?.split("\n")
          .map((_source, i) => {
            const _target = $targetCorpus?.split("\n")[i];
            return [_source, _target];
          })
          .filter(([_source, _target]) => _source && _target)
      );
    };

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
    {dataChoiceCorpus}
  />
  <Suggestions {suggestions} />
</div>
