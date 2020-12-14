<script>
    import { Select } from "smelte";
    import { language } from '../stores';
    let languages = ['French', 'Hindi', 'Russian'];

    $: console.log('language: ', $language);

</script>

<div class="container">
    <Select label="language" bind:value={$language} outlined items={languages} />
</div>