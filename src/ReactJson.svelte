<script>
	import * as React from 'react';
	import * as ReactDOM from 'react-dom';
  import { afterUpdate, onDestroy } from 'svelte';
  import ReactJson from 'react-json-view';

  let container;
  export let json;

	afterUpdate(() => {
		/*const { this: component, children, ...props } = $$props;*/
		ReactDOM.render(
      React.createElement(ReactJson, {src: json}),
			container
		);
	});
	onDestroy(() => {
		ReactDOM.unmountComponentAtNode(container);
	});
</script>

<div bind:this={container} />
