<script>
  import WordMAP from 'wordmap';
  
  export let corpus = [["Guten Tag", "Good day"]];
  export let alignmentMemory = [["Tag", "day"]];
  export let source = "Guten Tag";
  export let target = "Good day";
  let sourceCorpus = corpus.map(([_source, _target]) => _source).join('\n');
  let targetCorpus = corpus.map(([_source, _target]) => _target).join('\n');
  let sourceAlignmentMemory = alignmentMemory.map(([_source, _]) => _source).join('\n');
  let targetAlignmentMemory = alignmentMemory.map(([_, _target]) => _target).join('\n');
  
  let map;
  let suggestions;
  
  $: if (true) {
    map = new WordMAP();

    sourceAlignmentMemory.split('\n').forEach((_source, i) => {
      map.appendAlignmentMemoryString(_source, targetAlignmentMemory.split('\n')[i]);
    });
  
    map.appendCorpus(
      sourceCorpus.split('\n').map((_source, i) => (
        [_source, targetCorpus.split('\n')[i]]
      ))
    );

    suggestions = map.predict(source, target);
  };

</script>

<div>
  <table>
    <tr>
      <td class="label">Source: </td>
      <td><input bind:value={source} /></td>

      <td class="label">Target:</td>
      <td><input bind:value={target} /></td>
    </tr>
    <tr>
      <td class="label">Source Corpus:</td>
      <td><textarea bind:value={sourceCorpus} /></td>

      <td class="label">Target Corpus:</td>
      <td><textarea bind:value={targetCorpus} /></td>
    </tr>
    <tr>
      <td class="label">Source Alignment Memory:</td>
      <td><textarea bind:value={sourceAlignmentMemory} /></td>

      <td class="label">Target Alignment Memory:</td>
      <td><textarea bind:value={targetAlignmentMemory} /></td>
    </tr>
  </table>

  <h2>Suggestions</h2>
  {suggestions}
</div>

<style>
  .label {
    text-align: right;
    font-weight: 600;
    /* TODO vertical alignment */
    vertical-align: middle;  
  }
</style>