<script>
  import WordMap from "wordmap";
  import InputForm from "./components/InputForm.svelte";
  import Suggestions from "./components/Suggestions.svelte";
  import { writable } from "svelte/store";

  import {
    sourceLine,
    targetLine,
    sourceAlignment,
    targetAlignment,
    sourceCorpus,
    targetCorpus,
    languageSwap,
  } from "./stores";

  // export let corpus = [["Guten Tag", "Good day"]];
  // export let alignmentMemory = [["Tag", "day"]];

  let map;
  let suggestions;

  $: {
    map = new WordMap();

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

    suggestions = map.predict($sourceLine, $targetLine);
  }
</script>

<div>
  <InputForm
    {sourceLine}
    {targetLine}
    {sourceCorpus}
    {targetCorpus}
    {sourceAlignment}
    {targetAlignment}
  />
  <Suggestions {suggestions} />
</div>
