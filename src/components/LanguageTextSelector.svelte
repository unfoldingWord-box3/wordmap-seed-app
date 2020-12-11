<script>
    import { Select } from "smelte";
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
    <Select label="language" bind:value={language} outlined items={languages} />
    <Select label="sample" bind:value={sample} outlined items={samples} />
</div>