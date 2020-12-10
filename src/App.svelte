<script>
	import WordMap from './WordMap.svelte';
	export let name;
</script>

<main>
	<h1>Hello {name}!</h1>
	<WordMap />
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
