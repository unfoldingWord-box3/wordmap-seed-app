<script>
	import * as React from 'react';
	import * as ReactDOM from 'react-dom';
    import { afterUpdate, onDestroy } from 'svelte';

	let container;

	afterUpdate(() => {
		/*const { this: component, children, ...props } = $$props;*/
		ReactDOM.render(
            React.createElement('div', {}, 'Rendering this from react!'),
			container
		);
	});
	onDestroy(() => {
		ReactDOM.unmountComponentAtNode(container);
	});
</script>

<div bind:this={container} />
