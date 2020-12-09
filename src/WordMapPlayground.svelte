<script>
	import * as React from 'react';
	import * as ReactDOM from 'react-dom';
  import { afterUpdate, onDestroy } from 'svelte';
  import WordmapPlayground from 'wordmap-react-toolkit';

  let container;
  export let sourceText = "περὶ δὲ τῶν νεκρῶν, ὅτι ἐγείρονται, οὐκ ἀνέγνωτε ἐν τῇ βίβλῳ Μωϋσέως ἐπὶ τοῦ βάτου, πῶς εἶπεν αὐτῷ ὁ Θεὸς λέγων, ἐγὼ ὁ Θεὸς Ἀβραὰμ, καὶ ὁ Θεὸς Ἰσαὰκ, καὶ ὁ Θεὸς Ἰακώβ?";
  export let targetText = "But concerning the dead that are raised, have you not read in the book of Moses, in the account about the bush, how God spoke to him, saying, ‘I am the God of Abraham and the God of Isaac and the God of Jacob’?";
  export let memory = [ ['Θεὸς', 'God'] ];

	afterUpdate(() => {
		/*const { this: component, children, ...props } = $$props;*/
		ReactDOM.render(
      React.createElement(WordmapPlayground, {sourceText, targetText, memory}),
			container
		);
	});
	onDestroy(() => {
		ReactDOM.unmountComponentAtNode(container);
	});
</script>

<div bind:this={container} />
