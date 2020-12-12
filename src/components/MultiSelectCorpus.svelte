<script>
    export let name;
    export let dataChoicesCorpus = [
        { id: 1, value: 'line', text: 'Line'}, 
        { id: 2, value: 'book', text: 'Entire book'}, 
        { id: 3, value: '1', text: 'unigrams'}, 
        { id: 4, value: '2', text: 'bigrams'}, 
        { id: 5, value: '3', text: 'trigrams'}, 
        { id: 6, value: '4', text: 'quadgrams'}, 
        { id: 7, value: '5', text: 'quintgrams'}
        // { id: 9, text: 'ULT phrases'}
    ];
    export let dataIdsCorpus = [2];
    export let dataChoiceCorpus;
    $: $dataChoiceCorpus = dataChoicesCorpus.filter(choice => dataIdsCorpus.includes(choice.id));
</script>

<div style="float: right">
    <select multiple bind:value="{dataIdsCorpus}" id="{name}">
        {#each dataChoicesCorpus as choice }
            <option value="{choice.id}">{choice.text}</option>
        {/each}
    </select>
</div>