<script>
  export let source;
  export let target;
  export let sourceCorpus;
  export let targetCorpus;
  export let sourceAlignment;
  export let targetAlignment;
</script>

<table>
  <tr>
    <td class="label">Source: </td>
    <td><input bind:value={$source} /></td>

    <td class="label">Target:</td>
    <td><input bind:value={$target} /></td>
  </tr>
  <tr>
    <td class="label">Source Corpus:</td>
    <td><textarea bind:value={$sourceCorpus} /></td>

    <td class="label">Target Corpus:</td>
    <td><textarea bind:value={$targetCorpus} /></td>
  </tr>
  <tr>
    <td class="label">Source Alignment Memory:</td>
    <td><textarea bind:value={$sourceAlignment} /></td>

    <td class="label">Target Alignment Memory:</td>
    <td><textarea bind:value={$targetAlignment} /></td>
  </tr>
</table>