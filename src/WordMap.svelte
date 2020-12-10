<script>
  import WordMAP from 'wordmap';
  import InputForm from './components/InputForm.svelte';
  import Suggestions from './components/Suggestions.svelte';
  import { writable } from 'svelte/store';

  export let corpus = [["Guten Tag", "Good day"]];
  export let alignmentMemory = [["Tag", "day"]];
  export let source = writable("Guten Tag");
  export let target = writable("Good day");

  let sourceCorpus = writable(corpus.map(([_source, _target]) => _source).join('\n'));
  let targetCorpus = writable(corpus.map(([_source, _target]) => _target).join('\n'));
  let sourceAlignment = writable(alignmentMemory.map(([_source, _]) => _source).join('\n'));
  let targetAlignment = writable(alignmentMemory.map(([_, _target]) => _target).join('\n'));
  
  let map;
  let suggestions;

  $: if (true) {
    map = new WordMAP();

    $sourceAlignment?.split('\n').forEach((_source, i) => {
      const _target = $targetAlignment?.split('\n')[i];
      if (_source && _target) map.appendAlignmentMemoryString(_source, _target);
    });
  
    map.appendCorpus(
      $sourceCorpus?.split('\n').map((_source, i) => (
        [_source, $targetCorpus.split('\n')[i]]
      ))
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