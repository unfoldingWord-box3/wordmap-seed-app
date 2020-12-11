<script>
	import WordMap from './WordMap.svelte';
	import Spreadsheet from './components/Spreadsheet.svelte';
	import SpreadsheetDataTester from './components/SpreadsheetDataTester.svelte';
</script>

<main>
	<h1>Hello WordMap!</h1>
	<Spreadsheet />
    <WordMap />
    <SpreadsheetDataTester />
</main>


<style>
	main {
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
