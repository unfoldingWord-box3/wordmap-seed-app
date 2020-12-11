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
  <h2>Suggestion</h2>
  <div>
    {#each predictions[0] as prediction, index (index)}
      <div
        title="{prediction.confidence.toFixed(2)}"
        style="display: inline-block; border: solid; background-color: rgba(0,{(prediction.confidence >= 1) ? 255 : 0},{(prediction.confidence < 1) ? 255 : 0},{prediction.confidence}); padding: 0.2em;"
      >
        <div>{prediction.alignment.split('->')[0].replace(/:/g, ' ')}</div>
        <div>{prediction.alignment.split('->')[1].replace(/:/g, ' ')}</div>
      </div>
    {/each}
    </div>
</div>