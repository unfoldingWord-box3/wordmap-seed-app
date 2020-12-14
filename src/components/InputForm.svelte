<script>
  import {
    Button,
  } from "smelte";
  import { writable } from "svelte/store";
  import { TextField } from "smelte";

  import MultiSelectMemory from "./MultiSelectMemory.svelte";
  import MultiSelectCorpus from './MultiSelectCorpus.svelte';

  export let source;
  export let target;
  export let sourceCorpus;
  export let targetCorpus;
  export let sourceAlignment;
  export let targetAlignment;
  
  export let dataChoiceAlignment;
  export let dataChoiceCorpus;

  function switchSourceAndTarget () {
    [$target, $source] = [$source, $target];
    [$targetCorpus, $sourceCorpus] = [$sourceCorpus, $targetCorpus];
    [$targetAlignment, $sourceAlignment] = [$sourceAlignment, $targetAlignment];
  }

</script>


<div>
  <div class="flex space-x-4" style="width: 100%">
    <TextField label="Source" outlined textarea value={$source} on:change={(e)=>{ $source = e.target.value; }} />
    <TextField label="Target" outlined textarea value={$target} on:change={(e)=>{ $target = e.target.value; }} />
    <div class="py-2">
      <Button outlined color="secondary" on:click={switchSourceAndTarget}>Switch source and target</Button>
    </div>
  </div>
  <div class="flex space-x-4">
    <TextField label="Source Corpus" outlined textarea value={$sourceCorpus} on:change={(e)=>{ $sourceCorpus = e.target.value; }} />
    <TextField label="Target Corpus" outlined textarea value={$targetCorpus} on:change={(e)=>{ $targetCorpus = e.target.value; }} />
    <MultiSelectCorpus name="corpus" {dataChoiceCorpus} />
  </div>
  <div class="flex space-x-4">
    <TextField label="Source Alignment Memory" outlined textarea value={$sourceAlignment} on:change={(e)=>{ $sourceAlignment = e.target.value; }} />
    <TextField label="Target Alignment Memory" outlined textarea value={$targetAlignment} on:change={(e)=>{ $targetAlignment = e.target.value; }} />
    <MultiSelectMemory name="memory" {dataChoiceAlignment} />
  </div>
</div>