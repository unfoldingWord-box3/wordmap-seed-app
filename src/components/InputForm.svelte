<script>
  import {
    Button,
  } from "smelte";
  import { language, languageSwap } from "../stores";
  import { TextField } from "smelte";

  import MultiSelectMemory from "./MultiSelectMemory.svelte";
  import MultiSelectCorpus from './MultiSelectCorpus.svelte';

  let _source = "Paul, a servant of God and an apostle of Jesus Christ, for the faith of the chosen people of God and the knowledge of the truth that agrees with godliness";

  const targets = {
    French: "Paul, serviteur de Dieu, et apôtre de Jésus-Christ pour la foi des élus de Dieu et la connaissance de la vérité qui est selon la piété,",
    Hindi: "पौलुस की ओर से, जो परमेश्‍वर का दास और यीशु मसीह का प्रेरित है, परमेश्‍वर के चुने हुए लोगों के विश्वास को स्थापित करने और सच्चाई का ज्ञान स्थापित करने के लिए जो भक्ति के साथ सहमत हैं,",
    Russian: "Павел, раб Божий, Апостол же Иисуса Христа, по вере избранных Божиих и познанию истины, относящейся к благочестию,",
  };

  
  export let source;
  export let target;
  export let sourceCorpus;
  export let targetCorpus;
  export let sourceAlignment;
  export let targetAlignment;
  
  export let dataChoiceAlignment;
  export let dataChoiceCorpus;

  $: $target = targets[$language];

  
  function switchSourceAndTarget () {
    $languageSwap = !$languageSwap;
    [$source, $target] = [$target, $source];
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