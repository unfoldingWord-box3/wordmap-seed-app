<script>
    import { Select } from "smelte";
    import { language, line } from '../stores';
    const languages = ['english', 'arabic', 'russian'];
    const lines = [1,2,3,4,5,6,7,8,9,10]

    $: console.log('language: ', $language);

</script>

<div class="container">
    <Select label="language" bind:value={$language} outlined items={languages} />
    <Select label="line" bind:value={$line} outlined items={lines} />
</div>