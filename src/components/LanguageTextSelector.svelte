<script>
    let languages = ['French', 'Hindi', 'Russian'];
    let language = languages[0];

    let samples = ['Sample 1 (Titus 1:1)', 
                   'Sample 2 (Titus 1:2)', 
                   'Sample 3 (Titus 1:3)', 
                   'Sample 4 (Titus 1:4)', 
                   'Sample 5 (Titus 1:5)', 
                ];
    let sample = samples[0]; 

    function setLanguage() {
        console.log(language)
        console.log('This is where we plug in getting the right data.')
    };

    function setSample() {
        console.log(sample)
        console.log('This is where we plug in getting the right data.')
    };

</script>

<div class="container">
    <form id="language">
        <!-- svelte-ignore a11y-no-onchange -->
        <select id="language" bind:value={language} on:change={setLanguage}>   
            {#each languages as lang}
                <option value={lang} type="button">{lang}</option>
            {/each}
        </select>
    </form>

    <form id="text">
        <!-- svelte-ignore a11y-no-onchange -->
        <select id="language" bind:value={sample} on:change={setSample}>   
            {#each samples as samp}
                <option value={samp} type="button">{samp}</option>
            {/each}
        </select>
    </form>
</div>


<style>
    .container{
        text-align: center;
        padding-bottom: 3em;
    }
</style>