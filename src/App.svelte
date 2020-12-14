<script>
  import "smelte/src/tailwind.css";
  import WordMap from "./WordMap.svelte";
  import Spreadsheet from "./components/Spreadsheet.svelte";
  import LanguageTextSelector from "./components/LanguageTextSelector.svelte";
</script>

<style>
  hr {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }

  main {
    padding-left: 1em;
  }
</style>

<main>
  <h4>WordMAP Lab</h4>
  <p>An interactive tool for evaluating wordMAP output.</p>
  <p>Powered by Coffee™, backed by Google Sheets.</p>
  <hr />
  <LanguageTextSelector />
  <WordMap />
  <Spreadsheet />
</main>
