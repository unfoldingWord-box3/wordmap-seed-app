<script>
  import {
    Button,
  } from "smelte";

  import {
    language,
    line,
    languageSwap,
    sourceLine,
    targetLine,
    sourceAlignment,
    targetAlignment,
    sourceCorpus,
    targetCorpus,
    data,
  } from "../stores";
  import { TextField } from "smelte";

  $: {
    $sourceLine = data.greek.corpus.split(/\n/)[$line];
    $targetLine = data[$language].corpus.split(/\n/)[$line];
    $sourceCorpus = data.greek.corpus;
    $targetCorpus = data[$language].corpus;
    $sourceAlignment = data.greek.alignment;
    $targetAlignment = data[$language].alignment;
  };

  
  function switchSourceAndTarget () {
    $languageSwap = !$languageSwap;
    [$sourceLine, $targetLine] = [$targetLine, $sourceLine];
    [$sourceCorpus, $targetCorpus] = [$targetCorpus, $sourceCorpus]
    [$sourceAlignment, $targetAlignment] = [$targetAlignment, $sourceAlignment];
  }
</script>

<div>
  <div class="flex space-x-4" style="width: 100%">
    <TextField label="Source" outlined textarea value={$sourceLine} on:change={(e)=>{ $sourceLine = e.target.value; }} />
    <TextField label="Target" outlined textarea value={$targetLine} on:change={(e)=>{ $targetLine = e.target.value; }} />
    <div class="py-2">
      <Button outlined color="secondary" on:click={switchSourceAndTarget}>Switch source and target</Button>
    </div>
  </div>
  <div class="flex space-x-4">
    <TextField label="Source Corpus" outlined textarea value={$sourceCorpus} on:change={(e)=>{ $sourceCorpus = e.target.value; }} />
    <TextField label="Target Corpus" outlined textarea value={$targetCorpus} on:change={(e)=>{ $targetCorpus = e.target.value; }} />
  </div>
  <div class="flex space-x-4">
    <TextField label="Source Alignment Memory" outlined textarea value={$sourceAlignment} on:change={(e)=>{ $sourceAlignment = e.target.value; }} />
    <TextField label="Target Alignment Memory" outlined textarea value={$targetAlignment} on:change={(e)=>{ $targetAlignment = e.target.value; }} />
  </div>
</div>