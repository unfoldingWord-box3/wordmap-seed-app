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
  Source: <input bind:value={source} />
  <br/>
  Target: <input bind:value={target} />
  <br/>
  Source Corpus: <textarea bind:value={sourceCorpus} />
  <br/>
  Target Corpus: <textarea bind:value={targetCorpus} />
  <br/>
  Source Alignment Memory: <textarea bind:value={sourceAlignmentMemory} />
  <br/>
  Target Alignment Memory: <textarea bind:value={targetAlignmentMemory} />
  <br/>
  <h2>Suggestions</h2>
  {suggestions}
</div>