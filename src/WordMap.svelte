<script>
  import WordMAP from 'wordmap';
  import InputForm from './components/InputForm.svelte';
  import Suggestions from './components/Suggestions.svelte';
  import { writable } from 'svelte/store';
  import { getData } from './core/data';
	const data = getData();

  // export let corpus = [["Guten Tag", "Good day"]];
  // export let alignmentMemory = [["Tag", "day"]];
  export let source = writable(data.source);
  export let target = writable(data.target);

  export let sourceCorpus = writable(data.sourceWords);
  export let targetCorpus = writable(data.targetWords);
  export let sourceAlignment = writable(data.sourceWords);
  export let targetAlignment = writable(data.targetWords);
  
  let map;
  let suggestions;

  $: {
    map = new WordMAP();

    $sourceAlignment?.split('\n').forEach((_source, i) => {
      const _target = $targetAlignment?.split('\n')[i];
      if (_source && _target) map.appendAlignmentMemoryString(_source, _target);
    });
  
    map.appendCorpus(
      $sourceCorpus?.split('\n').map((_source, i) => {
        const _target = $targetCorpus?.split('\n')[i];
        return [_source, _target];
      }).filter(([_source, _target]) => ( _source && _target ))
    );

    suggestions = map.predict($source, $target);
  };

</script>

<div>
  <InputForm {source} {target} {sourceCorpus} {targetCorpus} {sourceAlignment} {targetAlignment} />
  <Suggestions suggestions={suggestions} />
</div>

<style>
  .label {
    text-align: right;
    font-weight: 600;
    /* TODO vertical alignment */
    vertical-align: middle;  
  }
</style>