<script>
  import { writable } from "svelte/store";

  import MultiSelectMemory from "./MultiSelectMemory.svelte";
  import MultiSelectCorpus from './MultiSelectCorpus.svelte'

  export let source;
  export let target;
  export let sourceCorpus;
  export let targetCorpus;
  export let sourceAlignment;
  export let targetAlignment;
  
  export let dataChoiceAlignment;
  // $: console.log($dataChoiceMemory);

  let dataChoiceCorpus = writable([]);
  // $: console.log($dataChoiceCorpus);

  function switchSourceAndTarget () {
    [$target, $source] = [$source, $target];
    [$targetCorpus, $sourceCorpus] = [$sourceCorpus, $targetCorpus];
    [$targetAlignment, $sourceAlignment] = [$sourceAlignment, $targetAlignment];
  }

</script>


<table>
  <tr>
    <td class="label">Source: </td>
    <td><textarea value={$source} on:change={(e)=>{ $source = e.target.value; }} /></td>

    <td class="label">Target:</td>
    <td><textarea value={$target} on:change={(e)=>{ $target = e.target.value; }} /></td>

    <td><button on:click={switchSourceAndTarget} style="float:right">Switch source and target</button>
    </td>
  </tr>
  <tr>
    <td class="label">Source Corpus:</td>
    <td><textarea value={$sourceCorpus} on:change={(e)=>{ $sourceCorpus = e.target.value; }} /></td>

    <td class="label">Target Corpus:</td>
    <td><textarea value={$targetCorpus} on:change={(e)=>{ $targetCorpus = e.target.value; }} /></td>
    <td style="width: 30%;">
        <MultiSelectCorpus name="corpus" {dataChoiceCorpus}/>
    </td>
  </tr>
  <tr>
    <td class="label">Source Alignment Memory:</td>
    <td><textarea value={$sourceAlignment} on:change={(e)=>{ $sourceAlignment = e.target.value; }} /></td>

    <td class="label">Target Alignment Memory:</td>
    <td><textarea value={$targetAlignment} on:change={(e)=>{ $targetAlignment = e.target.value; }} /></td>
    <td style="width: 30%;">
      <MultiSelectMemory name="memory" {dataChoiceAlignment} />
    </td>
  </tr>
</table>

<style>
  .label {
    text-align: right;
    font-weight: 600;
  }
</style>