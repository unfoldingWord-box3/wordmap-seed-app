<script>
  import WordMAP from 'word-map';
  import ReactJson from './ReactJson.svelte';

  const map = new WordMAP();
  map.appendCorpusString("Tag", "day");
  const source = "Guten Tag hello world tag";
  const target = "Good morning hello world morning";
  const suggestions = map.predict(source, target);
</script>

<div>
  {suggestions}
  <!-- <ReactJson json={suggestions} /> -->
</div>