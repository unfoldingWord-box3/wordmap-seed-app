<script>
    export let name;
    export let dataChoicesAlignment = [
        { id: 1, text: 'unigrams', value: '1' }, 
        { id: 2, text: 'bigrams', value: '2' }, 
        { id: 3, text: 'trigrams', value: '3' }, 
    ];
    export let dataIdsAlignment = [1];
    export let dataChoiceAlignment;
    $: $dataChoiceAlignment = dataChoicesAlignment.filter(choice => dataIdsAlignment.includes(choice.id));
</script>

<div style="float: right">
    <select label="asdf" outlined multiple bind:value="{dataIdsAlignment}" id="{name}">
        {#each dataChoicesAlignment as choice }
            <option value="{choice.id}">{choice.text}</option>
        {/each}
    </select>
</div>