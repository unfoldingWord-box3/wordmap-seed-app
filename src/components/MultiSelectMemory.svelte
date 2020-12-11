<script>
    export let name;
    export let dataChoicesMemory = [
        { id: 1, text: 'No data'},
        { id: 2, text: '1-grams'}, 
        { id: 3, text: '2-grams'}, 
        { id: 4, text: '3-grams'}, 
    ];
    export let dataIdsMemory = [2];
    export let dataChoiceMemory;
    $: $dataChoiceMemory = dataChoicesMemory.filter(choice => dataIdsMemory.includes(choice.id));
</script>

<div style="float: right">
    <select multiple bind:value="{dataIdsMemory}" id="{name}">
        {#each dataChoicesMemory as choice }
            <option value="{choice.id}">{choice.text}</option>
        {/each}
    </select>
</div>