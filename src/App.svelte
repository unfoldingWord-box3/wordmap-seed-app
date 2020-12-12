<script>
	import "smelte/src/tailwind.css";
	import WordMap from './WordMap.svelte';
	import Spreadsheet from './components/Spreadsheet.svelte';
	import LanguageTextSelector from './components/LanguageTextSelector.svelte'
</script>

<main>
	<h1>Hello WordMap!</h1>
	<LanguageTextSelector />
	<WordMap />
	<Spreadsheet />
</main>

<style>
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}

	main {
		padding-left: 1em;
	}
</style>
