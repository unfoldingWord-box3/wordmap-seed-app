<script>
  import WordMAP from "wordmap";
  import InputForm from "./components/InputForm.svelte";
  import Suggestions from "./components/Suggestions.svelte";
  import { writable } from "svelte/store";
  import { getData } from "./core/data";
  import { spreadsheetData, sourceCorpusSheet, targetCorpusSheet } from "./stores";
  import fetchSheet from './core/fetchSpreadsheet';

  // import fetchSheet from './components/Spreadsheet.svelte'

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

  $: {
    // use a tmp variable to avoid updating the store all the time
    // this avoids an infinite loop
    let _sourceCorpus = [];
    let _targetCorpus = [];
    
    if($dataChoiceCorpus.map(a => a.value).indexOf('line') !== -1) {
      console.log('Line selected');
      _sourceCorpus.push($source);
      _targetCorpus.push($target);
    };
    // console.log('_sourceCorpus');

    if($dataChoiceCorpus.map(a => a.value).indexOf('book') !== -1) {
      console.log('Book selected');
      // _sourceCorpus = [..._sourceCorpus, $sourceCorpusSheet?.feed.entry.map( row => row.gsx$text?.$t )];
      // _targetCorpus = [..._targetCorpus, $targetCorpusSheet?.feed.entry.map( row => row.gsx$text?.$t )];

      const sourceBookCorpus = $sourceCorpusSheet?.feed.entry.map( row => row.gsx$text?.$t );
      const targetBookCorpus = $targetCorpusSheet?.feed.entry.map( row => row.gsx$text?.$t );
      
      if (sourceBookCorpus && targetBookCorpus) {
        _sourceCorpus = [..._sourceCorpus, ...sourceBookCorpus ];
        _targetCorpus = [..._targetCorpus, ...targetBookCorpus ];
      };
    };
    
    const sourceNgrams = $spreadsheetData?.feed.entry
      .filter(row => $dataChoiceCorpus.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
      .map(row => row.gsx$source?.$t );

    if (sourceNgrams) _sourceCorpus = [..._sourceCorpus, ...sourceNgrams];
    
    const targetNgrams = $spreadsheetData?.feed.entry
    .filter(row => $dataChoiceCorpus.map(choice => choice.value).includes(row['gsx$n-grams']?.$t))
    .map(row => row.gsx$target?.$t );
    if (targetNgrams) _targetCorpus = [..._targetCorpus, ...targetNgrams];
    
    $sourceCorpus = _sourceCorpus.join('\n')
    $targetCorpus = _targetCorpus.join('\n')

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
