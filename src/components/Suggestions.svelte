<script>
  export let suggestions = '';
  let predictions;

  $: predictions = suggestions?.map(suggestion => {
    return suggestion?.predictions?.map(prediction => {
      const {scores, predictedAlignment} = prediction;
      return {
        confidence: scores?.confidence,
        alignment: predictedAlignment?.cachedKey.replace(/n:/g,''),
      }
    })
  });

  $: console.log(predictions);
</script>

<div>
  <h2>Suggestions</h2>
  <ul>
    {#each predictions[0] as prediction, index (index)}
      <li>{prediction.confidence} =&gt; {prediction.alignment}</li>
    {/each}
  </ul>
</div>