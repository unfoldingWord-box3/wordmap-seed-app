<script>
    import { Select, Checkbox } from "smelte";

    export let items = [
        { value: 'line', text: 'Line'}, 
        { value: 'book', text: 'Entire book' }, 
        { value: '1', text: 'unigrams',}, 
        { value: '2', text: 'bigrams'}, 
        { value: '3', text: 'trigrams'}, 
        { value: '4', text: 'quadgrams'}, 
        { value: '5', text: 'quintgrams'}
    ];
    export let dataChoiceCorpus;
    $: $dataChoiceCorpus = items.filter(item => item.checked);

    $: selectedLabel = items.filter(item => item.checked).map(item => item.text).join(", ");
</script>

<Select
  {selectedLabel}
  label='Corpus Selection'
  outlined
  color="secondary"
  {items}
>
  <div slot="options" class="elevation-3 rounded px-2 py-4 mt-0" on:click|stopPropagation>
      {#each items as item, index}
        <Checkbox
          bind:checked={items[index].checked}
          color="secondary"
          label={item.text}
        />
      {/each}
  </div>
</Select>