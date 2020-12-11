<script>
    export let name;
    export let dataChoicesCorpus = [
        { id: 1, text: 'No data'},
        { id: 2, text: 'Include the line'}, 
        { id: 3, text: 'Entire book'}, 
        { id: 4, text: '1-grams'}, 
        { id: 5, text: '2-grams'}, 
        { id: 6, text: '3-grams'}, 
        { id: 7, text: '4-grams'}, 
        { id: 8, text: '5-grams'}
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