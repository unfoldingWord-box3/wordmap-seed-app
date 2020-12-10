
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    		path: basedir,
    		exports: {},
    		require: function (path, base) {
    			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    		}
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    /*
    object-assign
    (c) Sindre Sorhus
    @license MIT
    */
    /* eslint-disable no-unused-vars */
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;

    function toObject(val) {
    	if (val === null || val === undefined) {
    		throw new TypeError('Object.assign cannot be called with null or undefined');
    	}

    	return Object(val);
    }

    function shouldUseNative() {
    	try {
    		if (!Object.assign) {
    			return false;
    		}

    		// Detect buggy property enumeration order in older V8 versions.

    		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
    		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
    		test1[5] = 'de';
    		if (Object.getOwnPropertyNames(test1)[0] === '5') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test2 = {};
    		for (var i = 0; i < 10; i++) {
    			test2['_' + String.fromCharCode(i)] = i;
    		}
    		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
    			return test2[n];
    		});
    		if (order2.join('') !== '0123456789') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test3 = {};
    		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
    			test3[letter] = letter;
    		});
    		if (Object.keys(Object.assign({}, test3)).join('') !==
    				'abcdefghijklmnopqrst') {
    			return false;
    		}

    		return true;
    	} catch (err) {
    		// We don't expect any of the above to throw, but better to be safe.
    		return false;
    	}
    }

    var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
    	var from;
    	var to = toObject(target);
    	var symbols;

    	for (var s = 1; s < arguments.length; s++) {
    		from = Object(arguments[s]);

    		for (var key in from) {
    			if (hasOwnProperty.call(from, key)) {
    				to[key] = from[key];
    			}
    		}

    		if (getOwnPropertySymbols) {
    			symbols = getOwnPropertySymbols(from);
    			for (var i = 0; i < symbols.length; i++) {
    				if (propIsEnumerable.call(from, symbols[i])) {
    					to[symbols[i]] = from[symbols[i]];
    				}
    			}
    		}
    	}

    	return to;
    };

    var react_production_min = createCommonjsModule(function (module, exports) {
    var n=60103,p=60106;exports.Fragment=60107;exports.StrictMode=60108;exports.Profiler=60114;var q=60109,r=60110,t=60112;exports.Suspense=60113;var u=60115,v=60116;
    if("function"===typeof Symbol&&Symbol.for){var w=Symbol.for;n=w("react.element");p=w("react.portal");exports.Fragment=w("react.fragment");exports.StrictMode=w("react.strict_mode");exports.Profiler=w("react.profiler");q=w("react.provider");r=w("react.context");t=w("react.forward_ref");exports.Suspense=w("react.suspense");u=w("react.memo");v=w("react.lazy");}var x="function"===typeof Symbol&&Symbol.iterator;
    function y(a){if(null===a||"object"!==typeof a)return null;a=x&&a[x]||a["@@iterator"];return "function"===typeof a?a:null}function z(a){for(var b="https://reactjs.org/docs/error-decoder.html?invariant="+a,c=1;c<arguments.length;c++)b+="&args[]="+encodeURIComponent(arguments[c]);return "Minified React error #"+a+"; visit "+b+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}
    var A={isMounted:function(){return !1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},B={};function C(a,b,c){this.props=a;this.context=b;this.refs=B;this.updater=c||A;}C.prototype.isReactComponent={};C.prototype.setState=function(a,b){if("object"!==typeof a&&"function"!==typeof a&&null!=a)throw Error(z(85));this.updater.enqueueSetState(this,a,b,"setState");};C.prototype.forceUpdate=function(a){this.updater.enqueueForceUpdate(this,a,"forceUpdate");};
    function D(){}D.prototype=C.prototype;function E(a,b,c){this.props=a;this.context=b;this.refs=B;this.updater=c||A;}var F=E.prototype=new D;F.constructor=E;objectAssign(F,C.prototype);F.isPureReactComponent=!0;var G={current:null},H=Object.prototype.hasOwnProperty,I={key:!0,ref:!0,__self:!0,__source:!0};
    function J(a,b,c){var e,d={},k=null,h=null;if(null!=b)for(e in void 0!==b.ref&&(h=b.ref),void 0!==b.key&&(k=""+b.key),b)H.call(b,e)&&!I.hasOwnProperty(e)&&(d[e]=b[e]);var g=arguments.length-2;if(1===g)d.children=c;else if(1<g){for(var f=Array(g),m=0;m<g;m++)f[m]=arguments[m+2];d.children=f;}if(a&&a.defaultProps)for(e in g=a.defaultProps,g)void 0===d[e]&&(d[e]=g[e]);return {$$typeof:n,type:a,key:k,ref:h,props:d,_owner:G.current}}
    function K(a,b){return {$$typeof:n,type:a.type,key:b,ref:a.ref,props:a.props,_owner:a._owner}}function L(a){return "object"===typeof a&&null!==a&&a.$$typeof===n}function escape(a){var b={"=":"=0",":":"=2"};return "$"+a.replace(/[=:]/g,function(a){return b[a]})}var M=/\/+/g;function N(a,b){return "object"===typeof a&&null!==a&&null!=a.key?escape(""+a.key):b.toString(36)}
    function O(a,b,c,e,d){var k=typeof a;if("undefined"===k||"boolean"===k)a=null;var h=!1;if(null===a)h=!0;else switch(k){case "string":case "number":h=!0;break;case "object":switch(a.$$typeof){case n:case p:h=!0;}}if(h)return h=a,d=d(h),a=""===e?"."+N(h,0):e,Array.isArray(d)?(c="",null!=a&&(c=a.replace(M,"$&/")+"/"),O(d,b,c,"",function(a){return a})):null!=d&&(L(d)&&(d=K(d,c+(!d.key||h&&h.key===d.key?"":(""+d.key).replace(M,"$&/")+"/")+a)),b.push(d)),1;h=0;e=""===e?".":e+":";if(Array.isArray(a))for(var g=
    0;g<a.length;g++){k=a[g];var f=e+N(k,g);h+=O(k,b,c,f,d);}else if(f=y(a),"function"===typeof f)for(a=f.call(a),g=0;!(k=a.next()).done;)k=k.value,f=e+N(k,g++),h+=O(k,b,c,f,d);else if("object"===k)throw b=""+a,Error(z(31,"[object Object]"===b?"object with keys {"+Object.keys(a).join(", ")+"}":b));return h}function P(a,b,c){if(null==a)return a;var e=[],d=0;O(a,e,"","",function(a){return b.call(c,a,d++)});return e}
    function Q(a){if(-1===a._status){var b=a._result;b=b();a._status=0;a._result=b;b.then(function(b){0===a._status&&(b=b.default,a._status=1,a._result=b);},function(b){0===a._status&&(a._status=2,a._result=b);});}if(1===a._status)return a._result;throw a._result;}var R={current:null};function S(){var a=R.current;if(null===a)throw Error(z(321));return a}var T={ReactCurrentDispatcher:R,ReactCurrentBatchConfig:{transition:0},ReactCurrentOwner:G,IsSomeRendererActing:{current:!1},assign:objectAssign};
    exports.Children={map:P,forEach:function(a,b,c){P(a,function(){b.apply(this,arguments);},c);},count:function(a){var b=0;P(a,function(){b++;});return b},toArray:function(a){return P(a,function(a){return a})||[]},only:function(a){if(!L(a))throw Error(z(143));return a}};exports.Component=C;exports.PureComponent=E;exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=T;
    exports.cloneElement=function(a,b,c){if(null===a||void 0===a)throw Error(z(267,a));var e=objectAssign({},a.props),d=a.key,k=a.ref,h=a._owner;if(null!=b){void 0!==b.ref&&(k=b.ref,h=G.current);void 0!==b.key&&(d=""+b.key);if(a.type&&a.type.defaultProps)var g=a.type.defaultProps;for(f in b)H.call(b,f)&&!I.hasOwnProperty(f)&&(e[f]=void 0===b[f]&&void 0!==g?g[f]:b[f]);}var f=arguments.length-2;if(1===f)e.children=c;else if(1<f){g=Array(f);for(var m=0;m<f;m++)g[m]=arguments[m+2];e.children=g;}return {$$typeof:n,type:a.type,
    key:d,ref:k,props:e,_owner:h}};exports.createContext=function(a,b){void 0===b&&(b=null);a={$$typeof:r,_calculateChangedBits:b,_currentValue:a,_currentValue2:a,_threadCount:0,Provider:null,Consumer:null};a.Provider={$$typeof:q,_context:a};return a.Consumer=a};exports.createElement=J;exports.createFactory=function(a){var b=J.bind(null,a);b.type=a;return b};exports.createRef=function(){return {current:null}};exports.forwardRef=function(a){return {$$typeof:t,render:a}};exports.isValidElement=L;
    exports.lazy=function(a){return {$$typeof:v,_payload:{_status:-1,_result:a},_init:Q}};exports.memo=function(a,b){return {$$typeof:u,type:a,compare:void 0===b?null:b}};exports.useCallback=function(a,b){return S().useCallback(a,b)};exports.useContext=function(a,b){return S().useContext(a,b)};exports.useDebugValue=function(){};exports.useEffect=function(a,b){return S().useEffect(a,b)};exports.useImperativeHandle=function(a,b,c){return S().useImperativeHandle(a,b,c)};
    exports.useLayoutEffect=function(a,b){return S().useLayoutEffect(a,b)};exports.useMemo=function(a,b){return S().useMemo(a,b)};exports.useReducer=function(a,b,c){return S().useReducer(a,b,c)};exports.useRef=function(a){return S().useRef(a)};exports.useState=function(a){return S().useState(a)};exports.version="17.0.1";
    });

    var react_development = createCommonjsModule(function (module, exports) {
    });

    var react = createCommonjsModule(function (module) {

    {
      module.exports = react_production_min;
    }
    });

    var React = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.assign(/*#__PURE__*/Object.create(null), react, {
        'default': react
    }));

    var scheduler_production_min = createCommonjsModule(function (module, exports) {
    var f,g,h,k;if("object"===typeof performance&&"function"===typeof performance.now){var l=performance;exports.unstable_now=function(){return l.now()};}else {var p=Date,q=p.now();exports.unstable_now=function(){return p.now()-q};}
    if("undefined"===typeof window||"function"!==typeof MessageChannel){var t=null,u=null,w=function(){if(null!==t)try{var a=exports.unstable_now();t(!0,a);t=null;}catch(b){throw setTimeout(w,0),b;}};f=function(a){null!==t?setTimeout(f,0,a):(t=a,setTimeout(w,0));};g=function(a,b){u=setTimeout(a,b);};h=function(){clearTimeout(u);};exports.unstable_shouldYield=function(){return !1};k=exports.unstable_forceFrameRate=function(){};}else {var x=window.setTimeout,y=window.clearTimeout;if("undefined"!==typeof console){var z=
    window.cancelAnimationFrame;"function"!==typeof window.requestAnimationFrame&&console.error("This browser doesn't support requestAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills");"function"!==typeof z&&console.error("This browser doesn't support cancelAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills");}var A=!1,B=null,C=-1,D=5,E=0;exports.unstable_shouldYield=function(){return exports.unstable_now()>=
    E};k=function(){};exports.unstable_forceFrameRate=function(a){0>a||125<a?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):D=0<a?Math.floor(1E3/a):5;};var F=new MessageChannel,G=F.port2;F.port1.onmessage=function(){if(null!==B){var a=exports.unstable_now();E=a+D;try{B(!0,a)?G.postMessage(null):(A=!1,B=null);}catch(b){throw G.postMessage(null),b;}}else A=!1;};f=function(a){B=a;A||(A=!0,G.postMessage(null));};g=function(a,b){C=
    x(function(){a(exports.unstable_now());},b);};h=function(){y(C);C=-1;};}function H(a,b){var c=a.length;a.push(b);a:for(;;){var d=c-1>>>1,e=a[d];if(void 0!==e&&0<I(e,b))a[d]=b,a[c]=e,c=d;else break a}}function J(a){a=a[0];return void 0===a?null:a}
    function K(a){var b=a[0];if(void 0!==b){var c=a.pop();if(c!==b){a[0]=c;a:for(var d=0,e=a.length;d<e;){var m=2*(d+1)-1,n=a[m],v=m+1,r=a[v];if(void 0!==n&&0>I(n,c))void 0!==r&&0>I(r,n)?(a[d]=r,a[v]=c,d=v):(a[d]=n,a[m]=c,d=m);else if(void 0!==r&&0>I(r,c))a[d]=r,a[v]=c,d=v;else break a}}return b}return null}function I(a,b){var c=a.sortIndex-b.sortIndex;return 0!==c?c:a.id-b.id}var L=[],M=[],N=1,O=null,P=3,Q=!1,R=!1,S=!1;
    function T(a){for(var b=J(M);null!==b;){if(null===b.callback)K(M);else if(b.startTime<=a)K(M),b.sortIndex=b.expirationTime,H(L,b);else break;b=J(M);}}function U(a){S=!1;T(a);if(!R)if(null!==J(L))R=!0,f(V);else {var b=J(M);null!==b&&g(U,b.startTime-a);}}
    function V(a,b){R=!1;S&&(S=!1,h());Q=!0;var c=P;try{T(b);for(O=J(L);null!==O&&(!(O.expirationTime>b)||a&&!exports.unstable_shouldYield());){var d=O.callback;if("function"===typeof d){O.callback=null;P=O.priorityLevel;var e=d(O.expirationTime<=b);b=exports.unstable_now();"function"===typeof e?O.callback=e:O===J(L)&&K(L);T(b);}else K(L);O=J(L);}if(null!==O)var m=!0;else {var n=J(M);null!==n&&g(U,n.startTime-b);m=!1;}return m}finally{O=null,P=c,Q=!1;}}var W=k;exports.unstable_IdlePriority=5;
    exports.unstable_ImmediatePriority=1;exports.unstable_LowPriority=4;exports.unstable_NormalPriority=3;exports.unstable_Profiling=null;exports.unstable_UserBlockingPriority=2;exports.unstable_cancelCallback=function(a){a.callback=null;};exports.unstable_continueExecution=function(){R||Q||(R=!0,f(V));};exports.unstable_getCurrentPriorityLevel=function(){return P};exports.unstable_getFirstCallbackNode=function(){return J(L)};
    exports.unstable_next=function(a){switch(P){case 1:case 2:case 3:var b=3;break;default:b=P;}var c=P;P=b;try{return a()}finally{P=c;}};exports.unstable_pauseExecution=function(){};exports.unstable_requestPaint=W;exports.unstable_runWithPriority=function(a,b){switch(a){case 1:case 2:case 3:case 4:case 5:break;default:a=3;}var c=P;P=a;try{return b()}finally{P=c;}};
    exports.unstable_scheduleCallback=function(a,b,c){var d=exports.unstable_now();"object"===typeof c&&null!==c?(c=c.delay,c="number"===typeof c&&0<c?d+c:d):c=d;switch(a){case 1:var e=-1;break;case 2:e=250;break;case 5:e=1073741823;break;case 4:e=1E4;break;default:e=5E3;}e=c+e;a={id:N++,callback:b,priorityLevel:a,startTime:c,expirationTime:e,sortIndex:-1};c>d?(a.sortIndex=c,H(M,a),null===J(L)&&a===J(M)&&(S?h():S=!0,g(U,c-d))):(a.sortIndex=e,H(L,a),R||Q||(R=!0,f(V)));return a};
    exports.unstable_wrapCallback=function(a){var b=P;return function(){var c=P;P=b;try{return a.apply(this,arguments)}finally{P=c;}}};
    });

    var scheduler_development = createCommonjsModule(function (module, exports) {
    });

    var scheduler = createCommonjsModule(function (module) {

    {
      module.exports = scheduler_production_min;
    }
    });

    function y(a){for(var b="https://reactjs.org/docs/error-decoder.html?invariant="+a,c=1;c<arguments.length;c++)b+="&args[]="+encodeURIComponent(arguments[c]);return "Minified React error #"+a+"; visit "+b+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}if(!react)throw Error(y(227));var ba=new Set,ca={};function da(a,b){ea(a,b);ea(a+"Capture",b);}
    function ea(a,b){ca[a]=b;for(a=0;a<b.length;a++)ba.add(b[a]);}
    var fa=!("undefined"===typeof window||"undefined"===typeof window.document||"undefined"===typeof window.document.createElement),ha=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,ia=Object.prototype.hasOwnProperty,
    ja={},ka={};function la(a){if(ia.call(ka,a))return !0;if(ia.call(ja,a))return !1;if(ha.test(a))return ka[a]=!0;ja[a]=!0;return !1}function ma(a,b,c,d){if(null!==c&&0===c.type)return !1;switch(typeof b){case "function":case "symbol":return !0;case "boolean":if(d)return !1;if(null!==c)return !c.acceptsBooleans;a=a.toLowerCase().slice(0,5);return "data-"!==a&&"aria-"!==a;default:return !1}}
    function na(a,b,c,d){if(null===b||"undefined"===typeof b||ma(a,b,c,d))return !0;if(d)return !1;if(null!==c)switch(c.type){case 3:return !b;case 4:return !1===b;case 5:return isNaN(b);case 6:return isNaN(b)||1>b}return !1}function B(a,b,c,d,e,f,g){this.acceptsBooleans=2===b||3===b||4===b;this.attributeName=d;this.attributeNamespace=e;this.mustUseProperty=c;this.propertyName=a;this.type=b;this.sanitizeURL=f;this.removeEmptyString=g;}var D={};
    "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a){D[a]=new B(a,0,!1,a,null,!1,!1);});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(a){var b=a[0];D[b]=new B(b,1,!1,a[1],null,!1,!1);});["contentEditable","draggable","spellCheck","value"].forEach(function(a){D[a]=new B(a,2,!1,a.toLowerCase(),null,!1,!1);});
    ["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(a){D[a]=new B(a,2,!1,a,null,!1,!1);});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a){D[a]=new B(a,3,!1,a.toLowerCase(),null,!1,!1);});
    ["checked","multiple","muted","selected"].forEach(function(a){D[a]=new B(a,3,!0,a,null,!1,!1);});["capture","download"].forEach(function(a){D[a]=new B(a,4,!1,a,null,!1,!1);});["cols","rows","size","span"].forEach(function(a){D[a]=new B(a,6,!1,a,null,!1,!1);});["rowSpan","start"].forEach(function(a){D[a]=new B(a,5,!1,a.toLowerCase(),null,!1,!1);});var oa=/[\-:]([a-z])/g;function pa(a){return a[1].toUpperCase()}
    "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a){var b=a.replace(oa,
    pa);D[b]=new B(b,1,!1,a,null,!1,!1);});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a){var b=a.replace(oa,pa);D[b]=new B(b,1,!1,a,"http://www.w3.org/1999/xlink",!1,!1);});["xml:base","xml:lang","xml:space"].forEach(function(a){var b=a.replace(oa,pa);D[b]=new B(b,1,!1,a,"http://www.w3.org/XML/1998/namespace",!1,!1);});["tabIndex","crossOrigin"].forEach(function(a){D[a]=new B(a,1,!1,a.toLowerCase(),null,!1,!1);});
    D.xlinkHref=new B("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(a){D[a]=new B(a,1,!1,a.toLowerCase(),null,!0,!0);});
    function qa(a,b,c,d){var e=D.hasOwnProperty(b)?D[b]:null;var f=null!==e?0===e.type:d?!1:!(2<b.length)||"o"!==b[0]&&"O"!==b[0]||"n"!==b[1]&&"N"!==b[1]?!1:!0;f||(na(b,c,e,d)&&(c=null),d||null===e?la(b)&&(null===c?a.removeAttribute(b):a.setAttribute(b,""+c)):e.mustUseProperty?a[e.propertyName]=null===c?3===e.type?!1:"":c:(b=e.attributeName,d=e.attributeNamespace,null===c?a.removeAttribute(b):(e=e.type,c=3===e||4===e&&!0===c?"":""+c,d?a.setAttributeNS(d,b,c):a.setAttribute(b,c))));}
    var ra=react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,sa=60103,ta=60106,ua=60107,wa=60108,xa=60114,ya=60109,za=60110,Aa=60112,Ba=60113,Ca=60120,Da=60115,Ea=60116,Fa=60121,Ga=60128,Ha=60129,Ia=60130,Ja=60131;
    if("function"===typeof Symbol&&Symbol.for){var E=Symbol.for;sa=E("react.element");ta=E("react.portal");ua=E("react.fragment");wa=E("react.strict_mode");xa=E("react.profiler");ya=E("react.provider");za=E("react.context");Aa=E("react.forward_ref");Ba=E("react.suspense");Ca=E("react.suspense_list");Da=E("react.memo");Ea=E("react.lazy");Fa=E("react.block");E("react.scope");Ga=E("react.opaque.id");Ha=E("react.debug_trace_mode");Ia=E("react.offscreen");Ja=E("react.legacy_hidden");}
    var Ka="function"===typeof Symbol&&Symbol.iterator;function La(a){if(null===a||"object"!==typeof a)return null;a=Ka&&a[Ka]||a["@@iterator"];return "function"===typeof a?a:null}var Ma;function Na(a){if(void 0===Ma)try{throw Error();}catch(c){var b=c.stack.trim().match(/\n( *(at )?)/);Ma=b&&b[1]||"";}return "\n"+Ma+a}var Oa=!1;
    function Pa(a,b){if(!a||Oa)return "";Oa=!0;var c=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(b)if(b=function(){throw Error();},Object.defineProperty(b.prototype,"props",{set:function(){throw Error();}}),"object"===typeof Reflect&&Reflect.construct){try{Reflect.construct(b,[]);}catch(k){var d=k;}Reflect.construct(a,[],b);}else {try{b.call();}catch(k){d=k;}a.call(b.prototype);}else {try{throw Error();}catch(k){d=k;}a();}}catch(k){if(k&&d&&"string"===typeof k.stack){for(var e=k.stack.split("\n"),
    f=d.stack.split("\n"),g=e.length-1,h=f.length-1;1<=g&&0<=h&&e[g]!==f[h];)h--;for(;1<=g&&0<=h;g--,h--)if(e[g]!==f[h]){if(1!==g||1!==h){do if(g--,h--,0>h||e[g]!==f[h])return "\n"+e[g].replace(" at new "," at ");while(1<=g&&0<=h)}break}}}finally{Oa=!1,Error.prepareStackTrace=c;}return (a=a?a.displayName||a.name:"")?Na(a):""}
    function Qa(a){switch(a.tag){case 5:return Na(a.type);case 16:return Na("Lazy");case 13:return Na("Suspense");case 19:return Na("SuspenseList");case 0:case 2:case 15:return a=Pa(a.type,!1),a;case 11:return a=Pa(a.type.render,!1),a;case 22:return a=Pa(a.type._render,!1),a;case 1:return a=Pa(a.type,!0),a;default:return ""}}
    function Ra(a){if(null==a)return null;if("function"===typeof a)return a.displayName||a.name||null;if("string"===typeof a)return a;switch(a){case ua:return "Fragment";case ta:return "Portal";case xa:return "Profiler";case wa:return "StrictMode";case Ba:return "Suspense";case Ca:return "SuspenseList"}if("object"===typeof a)switch(a.$$typeof){case za:return (a.displayName||"Context")+".Consumer";case ya:return (a._context.displayName||"Context")+".Provider";case Aa:var b=a.render;b=b.displayName||b.name||"";
    return a.displayName||(""!==b?"ForwardRef("+b+")":"ForwardRef");case Da:return Ra(a.type);case Fa:return Ra(a._render);case Ea:b=a._payload;a=a._init;try{return Ra(a(b))}catch(c){}}return null}function Sa(a){switch(typeof a){case "boolean":case "number":case "object":case "string":case "undefined":return a;default:return ""}}function Ta(a){var b=a.type;return (a=a.nodeName)&&"input"===a.toLowerCase()&&("checkbox"===b||"radio"===b)}
    function Ua(a){var b=Ta(a)?"checked":"value",c=Object.getOwnPropertyDescriptor(a.constructor.prototype,b),d=""+a[b];if(!a.hasOwnProperty(b)&&"undefined"!==typeof c&&"function"===typeof c.get&&"function"===typeof c.set){var e=c.get,f=c.set;Object.defineProperty(a,b,{configurable:!0,get:function(){return e.call(this)},set:function(a){d=""+a;f.call(this,a);}});Object.defineProperty(a,b,{enumerable:c.enumerable});return {getValue:function(){return d},setValue:function(a){d=""+a;},stopTracking:function(){a._valueTracker=
    null;delete a[b];}}}}function Va(a){a._valueTracker||(a._valueTracker=Ua(a));}function Wa(a){if(!a)return !1;var b=a._valueTracker;if(!b)return !0;var c=b.getValue();var d="";a&&(d=Ta(a)?a.checked?"true":"false":a.value);a=d;return a!==c?(b.setValue(a),!0):!1}function Xa(a){a=a||("undefined"!==typeof document?document:void 0);if("undefined"===typeof a)return null;try{return a.activeElement||a.body}catch(b){return a.body}}
    function Ya(a,b){var c=b.checked;return objectAssign({},b,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:null!=c?c:a._wrapperState.initialChecked})}function Za(a,b){var c=null==b.defaultValue?"":b.defaultValue,d=null!=b.checked?b.checked:b.defaultChecked;c=Sa(null!=b.value?b.value:c);a._wrapperState={initialChecked:d,initialValue:c,controlled:"checkbox"===b.type||"radio"===b.type?null!=b.checked:null!=b.value};}function $a(a,b){b=b.checked;null!=b&&qa(a,"checked",b,!1);}
    function ab(a,b){$a(a,b);var c=Sa(b.value),d=b.type;if(null!=c)if("number"===d){if(0===c&&""===a.value||a.value!=c)a.value=""+c;}else a.value!==""+c&&(a.value=""+c);else if("submit"===d||"reset"===d){a.removeAttribute("value");return}b.hasOwnProperty("value")?bb(a,b.type,c):b.hasOwnProperty("defaultValue")&&bb(a,b.type,Sa(b.defaultValue));null==b.checked&&null!=b.defaultChecked&&(a.defaultChecked=!!b.defaultChecked);}
    function cb(a,b,c){if(b.hasOwnProperty("value")||b.hasOwnProperty("defaultValue")){var d=b.type;if(!("submit"!==d&&"reset"!==d||void 0!==b.value&&null!==b.value))return;b=""+a._wrapperState.initialValue;c||b===a.value||(a.value=b);a.defaultValue=b;}c=a.name;""!==c&&(a.name="");a.defaultChecked=!!a._wrapperState.initialChecked;""!==c&&(a.name=c);}
    function bb(a,b,c){if("number"!==b||Xa(a.ownerDocument)!==a)null==c?a.defaultValue=""+a._wrapperState.initialValue:a.defaultValue!==""+c&&(a.defaultValue=""+c);}function db(a){var b="";react.Children.forEach(a,function(a){null!=a&&(b+=a);});return b}function eb(a,b){a=objectAssign({children:void 0},b);if(b=db(b.children))a.children=b;return a}
    function fb(a,b,c,d){a=a.options;if(b){b={};for(var e=0;e<c.length;e++)b["$"+c[e]]=!0;for(c=0;c<a.length;c++)e=b.hasOwnProperty("$"+a[c].value),a[c].selected!==e&&(a[c].selected=e),e&&d&&(a[c].defaultSelected=!0);}else {c=""+Sa(c);b=null;for(e=0;e<a.length;e++){if(a[e].value===c){a[e].selected=!0;d&&(a[e].defaultSelected=!0);return}null!==b||a[e].disabled||(b=a[e]);}null!==b&&(b.selected=!0);}}
    function gb(a,b){if(null!=b.dangerouslySetInnerHTML)throw Error(y(91));return objectAssign({},b,{value:void 0,defaultValue:void 0,children:""+a._wrapperState.initialValue})}function hb(a,b){var c=b.value;if(null==c){c=b.children;b=b.defaultValue;if(null!=c){if(null!=b)throw Error(y(92));if(Array.isArray(c)){if(!(1>=c.length))throw Error(y(93));c=c[0];}b=c;}null==b&&(b="");c=b;}a._wrapperState={initialValue:Sa(c)};}
    function ib(a,b){var c=Sa(b.value),d=Sa(b.defaultValue);null!=c&&(c=""+c,c!==a.value&&(a.value=c),null==b.defaultValue&&a.defaultValue!==c&&(a.defaultValue=c));null!=d&&(a.defaultValue=""+d);}function jb(a){var b=a.textContent;b===a._wrapperState.initialValue&&""!==b&&null!==b&&(a.value=b);}var kb={html:"http://www.w3.org/1999/xhtml",mathml:"http://www.w3.org/1998/Math/MathML",svg:"http://www.w3.org/2000/svg"};
    function lb(a){switch(a){case "svg":return "http://www.w3.org/2000/svg";case "math":return "http://www.w3.org/1998/Math/MathML";default:return "http://www.w3.org/1999/xhtml"}}function mb(a,b){return null==a||"http://www.w3.org/1999/xhtml"===a?lb(b):"http://www.w3.org/2000/svg"===a&&"foreignObject"===b?"http://www.w3.org/1999/xhtml":a}
    var nb,ob=function(a){return "undefined"!==typeof MSApp&&MSApp.execUnsafeLocalFunction?function(b,c,d,e){MSApp.execUnsafeLocalFunction(function(){return a(b,c,d,e)});}:a}(function(a,b){if(a.namespaceURI!==kb.svg||"innerHTML"in a)a.innerHTML=b;else {nb=nb||document.createElement("div");nb.innerHTML="<svg>"+b.valueOf().toString()+"</svg>";for(b=nb.firstChild;a.firstChild;)a.removeChild(a.firstChild);for(;b.firstChild;)a.appendChild(b.firstChild);}});
    function pb(a,b){if(b){var c=a.firstChild;if(c&&c===a.lastChild&&3===c.nodeType){c.nodeValue=b;return}}a.textContent=b;}
    var qb={animationIterationCount:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,
    floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},rb=["Webkit","ms","Moz","O"];Object.keys(qb).forEach(function(a){rb.forEach(function(b){b=b+a.charAt(0).toUpperCase()+a.substring(1);qb[b]=qb[a];});});function sb(a,b,c){return null==b||"boolean"===typeof b||""===b?"":c||"number"!==typeof b||0===b||qb.hasOwnProperty(a)&&qb[a]?(""+b).trim():b+"px"}
    function tb(a,b){a=a.style;for(var c in b)if(b.hasOwnProperty(c)){var d=0===c.indexOf("--"),e=sb(c,b[c],d);"float"===c&&(c="cssFloat");d?a.setProperty(c,e):a[c]=e;}}var ub=objectAssign({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});
    function vb(a,b){if(b){if(ub[a]&&(null!=b.children||null!=b.dangerouslySetInnerHTML))throw Error(y(137,a));if(null!=b.dangerouslySetInnerHTML){if(null!=b.children)throw Error(y(60));if(!("object"===typeof b.dangerouslySetInnerHTML&&"__html"in b.dangerouslySetInnerHTML))throw Error(y(61));}if(null!=b.style&&"object"!==typeof b.style)throw Error(y(62));}}
    function wb(a,b){if(-1===a.indexOf("-"))return "string"===typeof b.is;switch(a){case "annotation-xml":case "color-profile":case "font-face":case "font-face-src":case "font-face-uri":case "font-face-format":case "font-face-name":case "missing-glyph":return !1;default:return !0}}function xb(a){a=a.target||a.srcElement||window;a.correspondingUseElement&&(a=a.correspondingUseElement);return 3===a.nodeType?a.parentNode:a}var yb=null,zb=null,Ab=null;
    function Bb(a){if(a=Cb(a)){if("function"!==typeof yb)throw Error(y(280));var b=a.stateNode;b&&(b=Db(b),yb(a.stateNode,a.type,b));}}function Eb(a){zb?Ab?Ab.push(a):Ab=[a]:zb=a;}function Fb(){if(zb){var a=zb,b=Ab;Ab=zb=null;Bb(a);if(b)for(a=0;a<b.length;a++)Bb(b[a]);}}function Gb(a,b){return a(b)}function Hb(a,b,c,d,e){return a(b,c,d,e)}function Ib(){}var Jb=Gb,Kb=!1,Lb=!1;function Mb(){if(null!==zb||null!==Ab)Ib(),Fb();}
    function Nb(a,b,c){if(Lb)return a(b,c);Lb=!0;try{return Jb(a,b,c)}finally{Lb=!1,Mb();}}
    function Ob(a,b){var c=a.stateNode;if(null===c)return null;var d=Db(c);if(null===d)return null;c=d[b];a:switch(b){case "onClick":case "onClickCapture":case "onDoubleClick":case "onDoubleClickCapture":case "onMouseDown":case "onMouseDownCapture":case "onMouseMove":case "onMouseMoveCapture":case "onMouseUp":case "onMouseUpCapture":case "onMouseEnter":(d=!d.disabled)||(a=a.type,d=!("button"===a||"input"===a||"select"===a||"textarea"===a));a=!d;break a;default:a=!1;}if(a)return null;if(c&&"function"!==
    typeof c)throw Error(y(231,b,typeof c));return c}var Pb=!1;if(fa)try{var Qb={};Object.defineProperty(Qb,"passive",{get:function(){Pb=!0;}});window.addEventListener("test",Qb,Qb);window.removeEventListener("test",Qb,Qb);}catch(a){Pb=!1;}function Rb(a,b,c,d,e,f,g,h,k){var l=Array.prototype.slice.call(arguments,3);try{b.apply(c,l);}catch(n){this.onError(n);}}var Sb=!1,Tb=null,Ub=!1,Vb=null,Wb={onError:function(a){Sb=!0;Tb=a;}};function Xb(a,b,c,d,e,f,g,h,k){Sb=!1;Tb=null;Rb.apply(Wb,arguments);}
    function Yb(a,b,c,d,e,f,g,h,k){Xb.apply(this,arguments);if(Sb){if(Sb){var l=Tb;Sb=!1;Tb=null;}else throw Error(y(198));Ub||(Ub=!0,Vb=l);}}function Zb(a){var b=a,c=a;if(a.alternate)for(;b.return;)b=b.return;else {a=b;do b=a,0!==(b.flags&1026)&&(c=b.return),a=b.return;while(a)}return 3===b.tag?c:null}function $b(a){if(13===a.tag){var b=a.memoizedState;null===b&&(a=a.alternate,null!==a&&(b=a.memoizedState));if(null!==b)return b.dehydrated}return null}function ac(a){if(Zb(a)!==a)throw Error(y(188));}
    function bc(a){var b=a.alternate;if(!b){b=Zb(a);if(null===b)throw Error(y(188));return b!==a?null:a}for(var c=a,d=b;;){var e=c.return;if(null===e)break;var f=e.alternate;if(null===f){d=e.return;if(null!==d){c=d;continue}break}if(e.child===f.child){for(f=e.child;f;){if(f===c)return ac(e),a;if(f===d)return ac(e),b;f=f.sibling;}throw Error(y(188));}if(c.return!==d.return)c=e,d=f;else {for(var g=!1,h=e.child;h;){if(h===c){g=!0;c=e;d=f;break}if(h===d){g=!0;d=e;c=f;break}h=h.sibling;}if(!g){for(h=f.child;h;){if(h===
    c){g=!0;c=f;d=e;break}if(h===d){g=!0;d=f;c=e;break}h=h.sibling;}if(!g)throw Error(y(189));}}if(c.alternate!==d)throw Error(y(190));}if(3!==c.tag)throw Error(y(188));return c.stateNode.current===c?a:b}function cc(a){a=bc(a);if(!a)return null;for(var b=a;;){if(5===b.tag||6===b.tag)return b;if(b.child)b.child.return=b,b=b.child;else {if(b===a)break;for(;!b.sibling;){if(!b.return||b.return===a)return null;b=b.return;}b.sibling.return=b.return;b=b.sibling;}}return null}
    function dc(a,b){for(var c=a.alternate;null!==b;){if(b===a||b===c)return !0;b=b.return;}return !1}var ec,fc,gc,hc,ic=!1,jc=[],kc=null,lc=null,mc=null,nc=new Map,oc=new Map,pc=[],qc="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
    function rc(a,b,c,d,e){return {blockedOn:a,domEventName:b,eventSystemFlags:c|16,nativeEvent:e,targetContainers:[d]}}function sc(a,b){switch(a){case "focusin":case "focusout":kc=null;break;case "dragenter":case "dragleave":lc=null;break;case "mouseover":case "mouseout":mc=null;break;case "pointerover":case "pointerout":nc.delete(b.pointerId);break;case "gotpointercapture":case "lostpointercapture":oc.delete(b.pointerId);}}
    function tc(a,b,c,d,e,f){if(null===a||a.nativeEvent!==f)return a=rc(b,c,d,e,f),null!==b&&(b=Cb(b),null!==b&&fc(b)),a;a.eventSystemFlags|=d;b=a.targetContainers;null!==e&&-1===b.indexOf(e)&&b.push(e);return a}
    function uc(a,b,c,d,e){switch(b){case "focusin":return kc=tc(kc,a,b,c,d,e),!0;case "dragenter":return lc=tc(lc,a,b,c,d,e),!0;case "mouseover":return mc=tc(mc,a,b,c,d,e),!0;case "pointerover":var f=e.pointerId;nc.set(f,tc(nc.get(f)||null,a,b,c,d,e));return !0;case "gotpointercapture":return f=e.pointerId,oc.set(f,tc(oc.get(f)||null,a,b,c,d,e)),!0}return !1}
    function vc(a){var b=wc(a.target);if(null!==b){var c=Zb(b);if(null!==c)if(b=c.tag,13===b){if(b=$b(c),null!==b){a.blockedOn=b;hc(a.lanePriority,function(){scheduler.unstable_runWithPriority(a.priority,function(){gc(c);});});return}}else if(3===b&&c.stateNode.hydrate){a.blockedOn=3===c.tag?c.stateNode.containerInfo:null;return}}a.blockedOn=null;}
    function xc(a){if(null!==a.blockedOn)return !1;for(var b=a.targetContainers;0<b.length;){var c=yc(a.domEventName,a.eventSystemFlags,b[0],a.nativeEvent);if(null!==c)return b=Cb(c),null!==b&&fc(b),a.blockedOn=c,!1;b.shift();}return !0}function zc(a,b,c){xc(a)&&c.delete(b);}
    function Ac(){for(ic=!1;0<jc.length;){var a=jc[0];if(null!==a.blockedOn){a=Cb(a.blockedOn);null!==a&&ec(a);break}for(var b=a.targetContainers;0<b.length;){var c=yc(a.domEventName,a.eventSystemFlags,b[0],a.nativeEvent);if(null!==c){a.blockedOn=c;break}b.shift();}null===a.blockedOn&&jc.shift();}null!==kc&&xc(kc)&&(kc=null);null!==lc&&xc(lc)&&(lc=null);null!==mc&&xc(mc)&&(mc=null);nc.forEach(zc);oc.forEach(zc);}
    function Bc(a,b){a.blockedOn===b&&(a.blockedOn=null,ic||(ic=!0,scheduler.unstable_scheduleCallback(scheduler.unstable_NormalPriority,Ac)));}
    function Cc(a){function b(b){return Bc(b,a)}if(0<jc.length){Bc(jc[0],a);for(var c=1;c<jc.length;c++){var d=jc[c];d.blockedOn===a&&(d.blockedOn=null);}}null!==kc&&Bc(kc,a);null!==lc&&Bc(lc,a);null!==mc&&Bc(mc,a);nc.forEach(b);oc.forEach(b);for(c=0;c<pc.length;c++)d=pc[c],d.blockedOn===a&&(d.blockedOn=null);for(;0<pc.length&&(c=pc[0],null===c.blockedOn);)vc(c),null===c.blockedOn&&pc.shift();}
    function Dc(a,b){var c={};c[a.toLowerCase()]=b.toLowerCase();c["Webkit"+a]="webkit"+b;c["Moz"+a]="moz"+b;return c}var Ec={animationend:Dc("Animation","AnimationEnd"),animationiteration:Dc("Animation","AnimationIteration"),animationstart:Dc("Animation","AnimationStart"),transitionend:Dc("Transition","TransitionEnd")},Fc={},Gc={};
    fa&&(Gc=document.createElement("div").style,"AnimationEvent"in window||(delete Ec.animationend.animation,delete Ec.animationiteration.animation,delete Ec.animationstart.animation),"TransitionEvent"in window||delete Ec.transitionend.transition);function Hc(a){if(Fc[a])return Fc[a];if(!Ec[a])return a;var b=Ec[a],c;for(c in b)if(b.hasOwnProperty(c)&&c in Gc)return Fc[a]=b[c];return a}
    var Ic=Hc("animationend"),Jc=Hc("animationiteration"),Kc=Hc("animationstart"),Lc=Hc("transitionend"),Mc=new Map,Nc=new Map,Oc=["abort","abort",Ic,"animationEnd",Jc,"animationIteration",Kc,"animationStart","canplay","canPlay","canplaythrough","canPlayThrough","durationchange","durationChange","emptied","emptied","encrypted","encrypted","ended","ended","error","error","gotpointercapture","gotPointerCapture","load","load","loadeddata","loadedData","loadedmetadata","loadedMetadata","loadstart","loadStart",
    "lostpointercapture","lostPointerCapture","playing","playing","progress","progress","seeking","seeking","stalled","stalled","suspend","suspend","timeupdate","timeUpdate",Lc,"transitionEnd","waiting","waiting"];function Pc(a,b){for(var c=0;c<a.length;c+=2){var d=a[c],e=a[c+1];e="on"+(e[0].toUpperCase()+e.slice(1));Nc.set(d,b);Mc.set(d,e);da(e,[d]);}}var Qc=scheduler.unstable_now;Qc();var F=8;
    function Rc(a){if(0!==(1&a))return F=15,1;if(0!==(2&a))return F=14,2;if(0!==(4&a))return F=13,4;var b=24&a;if(0!==b)return F=12,b;if(0!==(a&32))return F=11,32;b=192&a;if(0!==b)return F=10,b;if(0!==(a&256))return F=9,256;b=3584&a;if(0!==b)return F=8,b;if(0!==(a&4096))return F=7,4096;b=4186112&a;if(0!==b)return F=6,b;b=62914560&a;if(0!==b)return F=5,b;if(a&67108864)return F=4,67108864;if(0!==(a&134217728))return F=3,134217728;b=805306368&a;if(0!==b)return F=2,b;if(0!==(1073741824&a))return F=1,1073741824;
    F=8;return a}function Sc(a){switch(a){case 99:return 15;case 98:return 10;case 97:case 96:return 8;case 95:return 2;default:return 0}}function Tc(a){switch(a){case 15:case 14:return 99;case 13:case 12:case 11:case 10:return 98;case 9:case 8:case 7:case 6:case 4:case 5:return 97;case 3:case 2:case 1:return 95;case 0:return 90;default:throw Error(y(358,a));}}
    function Uc(a,b){var c=a.pendingLanes;if(0===c)return F=0;var d=0,e=0,f=a.expiredLanes,g=a.suspendedLanes,h=a.pingedLanes;if(0!==f)d=f,e=F=15;else if(f=c&134217727,0!==f){var k=f&~g;0!==k?(d=Rc(k),e=F):(h&=f,0!==h&&(d=Rc(h),e=F));}else f=c&~g,0!==f?(d=Rc(f),e=F):0!==h&&(d=Rc(h),e=F);if(0===d)return 0;d=31-Vc(d);d=c&((0>d?0:1<<d)<<1)-1;if(0!==b&&b!==d&&0===(b&g)){Rc(b);if(e<=F)return b;F=e;}b=a.entangledLanes;if(0!==b)for(a=a.entanglements,b&=d;0<b;)c=31-Vc(b),e=1<<c,d|=a[c],b&=~e;return d}
    function Wc(a){a=a.pendingLanes&-1073741825;return 0!==a?a:a&1073741824?1073741824:0}function Xc(a,b){switch(a){case 15:return 1;case 14:return 2;case 12:return a=Yc(24&~b),0===a?Xc(10,b):a;case 10:return a=Yc(192&~b),0===a?Xc(8,b):a;case 8:return a=Yc(3584&~b),0===a&&(a=Yc(4186112&~b),0===a&&(a=512)),a;case 2:return b=Yc(805306368&~b),0===b&&(b=268435456),b}throw Error(y(358,a));}function Yc(a){return a&-a}function Zc(a){for(var b=[],c=0;31>c;c++)b.push(a);return b}
    function $c(a,b,c){a.pendingLanes|=b;var d=b-1;a.suspendedLanes&=d;a.pingedLanes&=d;a=a.eventTimes;b=31-Vc(b);a[b]=c;}var Vc=Math.clz32?Math.clz32:ad,bd=Math.log,cd=Math.LN2;function ad(a){return 0===a?32:31-(bd(a)/cd|0)|0}var dd=scheduler.unstable_UserBlockingPriority,ed=scheduler.unstable_runWithPriority,fd=!0;function gd(a,b,c,d){Kb||Ib();var e=hd,f=Kb;Kb=!0;try{Hb(e,a,b,c,d);}finally{(Kb=f)||Mb();}}function id(a,b,c,d){ed(dd,hd.bind(null,a,b,c,d));}
    function hd(a,b,c,d){if(fd){var e;if((e=0===(b&4))&&0<jc.length&&-1<qc.indexOf(a))a=rc(null,a,b,c,d),jc.push(a);else {var f=yc(a,b,c,d);if(null===f)e&&sc(a,d);else {if(e){if(-1<qc.indexOf(a)){a=rc(f,a,b,c,d);jc.push(a);return}if(uc(f,a,b,c,d))return;sc(a,d);}jd(a,b,d,null,c);}}}}
    function yc(a,b,c,d){var e=xb(d);e=wc(e);if(null!==e){var f=Zb(e);if(null===f)e=null;else {var g=f.tag;if(13===g){e=$b(f);if(null!==e)return e;e=null;}else if(3===g){if(f.stateNode.hydrate)return 3===f.tag?f.stateNode.containerInfo:null;e=null;}else f!==e&&(e=null);}}jd(a,b,d,e,c);return null}var kd=null,ld=null,md=null;
    function nd(){if(md)return md;var a,b=ld,c=b.length,d,e="value"in kd?kd.value:kd.textContent,f=e.length;for(a=0;a<c&&b[a]===e[a];a++);var g=c-a;for(d=1;d<=g&&b[c-d]===e[f-d];d++);return md=e.slice(a,1<d?1-d:void 0)}function od(a){var b=a.keyCode;"charCode"in a?(a=a.charCode,0===a&&13===b&&(a=13)):a=b;10===a&&(a=13);return 32<=a||13===a?a:0}function pd(){return !0}function qd(){return !1}
    function rd(a){function b(b,d,e,f,g){this._reactName=b;this._targetInst=e;this.type=d;this.nativeEvent=f;this.target=g;this.currentTarget=null;for(var c in a)a.hasOwnProperty(c)&&(b=a[c],this[c]=b?b(f):f[c]);this.isDefaultPrevented=(null!=f.defaultPrevented?f.defaultPrevented:!1===f.returnValue)?pd:qd;this.isPropagationStopped=qd;return this}objectAssign(b.prototype,{preventDefault:function(){this.defaultPrevented=!0;var a=this.nativeEvent;a&&(a.preventDefault?a.preventDefault():"unknown"!==typeof a.returnValue&&
    (a.returnValue=!1),this.isDefaultPrevented=pd);},stopPropagation:function(){var a=this.nativeEvent;a&&(a.stopPropagation?a.stopPropagation():"unknown"!==typeof a.cancelBubble&&(a.cancelBubble=!0),this.isPropagationStopped=pd);},persist:function(){},isPersistent:pd});return b}
    var sd={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(a){return a.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},td=rd(sd),ud=objectAssign({},sd,{view:0,detail:0}),vd=rd(ud),wd,xd,yd,Ad=objectAssign({},ud,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:zd,button:0,buttons:0,relatedTarget:function(a){return void 0===a.relatedTarget?a.fromElement===a.srcElement?a.toElement:a.fromElement:a.relatedTarget},movementX:function(a){if("movementX"in
    a)return a.movementX;a!==yd&&(yd&&"mousemove"===a.type?(wd=a.screenX-yd.screenX,xd=a.screenY-yd.screenY):xd=wd=0,yd=a);return wd},movementY:function(a){return "movementY"in a?a.movementY:xd}}),Bd=rd(Ad),Cd=objectAssign({},Ad,{dataTransfer:0}),Dd=rd(Cd),Ed=objectAssign({},ud,{relatedTarget:0}),Fd=rd(Ed),Gd=objectAssign({},sd,{animationName:0,elapsedTime:0,pseudoElement:0}),Hd=rd(Gd),Id=objectAssign({},sd,{clipboardData:function(a){return "clipboardData"in a?a.clipboardData:window.clipboardData}}),Jd=rd(Id),Kd=objectAssign({},sd,{data:0}),Ld=rd(Kd),Md={Esc:"Escape",
    Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Nd={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",
    119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Od={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Pd(a){var b=this.nativeEvent;return b.getModifierState?b.getModifierState(a):(a=Od[a])?!!b[a]:!1}function zd(){return Pd}
    var Qd=objectAssign({},ud,{key:function(a){if(a.key){var b=Md[a.key]||a.key;if("Unidentified"!==b)return b}return "keypress"===a.type?(a=od(a),13===a?"Enter":String.fromCharCode(a)):"keydown"===a.type||"keyup"===a.type?Nd[a.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:zd,charCode:function(a){return "keypress"===a.type?od(a):0},keyCode:function(a){return "keydown"===a.type||"keyup"===a.type?a.keyCode:0},which:function(a){return "keypress"===
    a.type?od(a):"keydown"===a.type||"keyup"===a.type?a.keyCode:0}}),Rd=rd(Qd),Sd=objectAssign({},Ad,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Td=rd(Sd),Ud=objectAssign({},ud,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:zd}),Vd=rd(Ud),Wd=objectAssign({},sd,{propertyName:0,elapsedTime:0,pseudoElement:0}),Xd=rd(Wd),Yd=objectAssign({},Ad,{deltaX:function(a){return "deltaX"in a?a.deltaX:"wheelDeltaX"in a?-a.wheelDeltaX:0},
    deltaY:function(a){return "deltaY"in a?a.deltaY:"wheelDeltaY"in a?-a.wheelDeltaY:"wheelDelta"in a?-a.wheelDelta:0},deltaZ:0,deltaMode:0}),Zd=rd(Yd),$d=[9,13,27,32],ae=fa&&"CompositionEvent"in window,be=null;fa&&"documentMode"in document&&(be=document.documentMode);var ce=fa&&"TextEvent"in window&&!be,de=fa&&(!ae||be&&8<be&&11>=be),ee=String.fromCharCode(32),fe=!1;
    function ge(a,b){switch(a){case "keyup":return -1!==$d.indexOf(b.keyCode);case "keydown":return 229!==b.keyCode;case "keypress":case "mousedown":case "focusout":return !0;default:return !1}}function he(a){a=a.detail;return "object"===typeof a&&"data"in a?a.data:null}var ie=!1;function je(a,b){switch(a){case "compositionend":return he(b);case "keypress":if(32!==b.which)return null;fe=!0;return ee;case "textInput":return a=b.data,a===ee&&fe?null:a;default:return null}}
    function ke(a,b){if(ie)return "compositionend"===a||!ae&&ge(a,b)?(a=nd(),md=ld=kd=null,ie=!1,a):null;switch(a){case "paste":return null;case "keypress":if(!(b.ctrlKey||b.altKey||b.metaKey)||b.ctrlKey&&b.altKey){if(b.char&&1<b.char.length)return b.char;if(b.which)return String.fromCharCode(b.which)}return null;case "compositionend":return de&&"ko"!==b.locale?null:b.data;default:return null}}
    var le={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function me(a){var b=a&&a.nodeName&&a.nodeName.toLowerCase();return "input"===b?!!le[a.type]:"textarea"===b?!0:!1}function ne(a,b,c,d){Eb(d);b=oe(b,"onChange");0<b.length&&(c=new td("onChange","change",null,c,d),a.push({event:c,listeners:b}));}var pe=null,qe=null;function re(a){se(a,0);}function te(a){var b=ue(a);if(Wa(b))return a}
    function ve(a,b){if("change"===a)return b}var we=!1;if(fa){var xe;if(fa){var ye="oninput"in document;if(!ye){var ze=document.createElement("div");ze.setAttribute("oninput","return;");ye="function"===typeof ze.oninput;}xe=ye;}else xe=!1;we=xe&&(!document.documentMode||9<document.documentMode);}function Ae(){pe&&(pe.detachEvent("onpropertychange",Be),qe=pe=null);}function Be(a){if("value"===a.propertyName&&te(qe)){var b=[];ne(b,qe,a,xb(a));a=re;if(Kb)a(b);else {Kb=!0;try{Gb(a,b);}finally{Kb=!1,Mb();}}}}
    function Ce(a,b,c){"focusin"===a?(Ae(),pe=b,qe=c,pe.attachEvent("onpropertychange",Be)):"focusout"===a&&Ae();}function De(a){if("selectionchange"===a||"keyup"===a||"keydown"===a)return te(qe)}function Ee(a,b){if("click"===a)return te(b)}function Fe(a,b){if("input"===a||"change"===a)return te(b)}function Ge(a,b){return a===b&&(0!==a||1/a===1/b)||a!==a&&b!==b}var He="function"===typeof Object.is?Object.is:Ge,Ie=Object.prototype.hasOwnProperty;
    function Je(a,b){if(He(a,b))return !0;if("object"!==typeof a||null===a||"object"!==typeof b||null===b)return !1;var c=Object.keys(a),d=Object.keys(b);if(c.length!==d.length)return !1;for(d=0;d<c.length;d++)if(!Ie.call(b,c[d])||!He(a[c[d]],b[c[d]]))return !1;return !0}function Ke(a){for(;a&&a.firstChild;)a=a.firstChild;return a}
    function Le(a,b){var c=Ke(a);a=0;for(var d;c;){if(3===c.nodeType){d=a+c.textContent.length;if(a<=b&&d>=b)return {node:c,offset:b-a};a=d;}a:{for(;c;){if(c.nextSibling){c=c.nextSibling;break a}c=c.parentNode;}c=void 0;}c=Ke(c);}}function Me(a,b){return a&&b?a===b?!0:a&&3===a.nodeType?!1:b&&3===b.nodeType?Me(a,b.parentNode):"contains"in a?a.contains(b):a.compareDocumentPosition?!!(a.compareDocumentPosition(b)&16):!1:!1}
    function Ne(){for(var a=window,b=Xa();b instanceof a.HTMLIFrameElement;){try{var c="string"===typeof b.contentWindow.location.href;}catch(d){c=!1;}if(c)a=b.contentWindow;else break;b=Xa(a.document);}return b}function Oe(a){var b=a&&a.nodeName&&a.nodeName.toLowerCase();return b&&("input"===b&&("text"===a.type||"search"===a.type||"tel"===a.type||"url"===a.type||"password"===a.type)||"textarea"===b||"true"===a.contentEditable)}
    var Pe=fa&&"documentMode"in document&&11>=document.documentMode,Qe=null,Re=null,Se=null,Te=!1;
    function Ue(a,b,c){var d=c.window===c?c.document:9===c.nodeType?c:c.ownerDocument;Te||null==Qe||Qe!==Xa(d)||(d=Qe,"selectionStart"in d&&Oe(d)?d={start:d.selectionStart,end:d.selectionEnd}:(d=(d.ownerDocument&&d.ownerDocument.defaultView||window).getSelection(),d={anchorNode:d.anchorNode,anchorOffset:d.anchorOffset,focusNode:d.focusNode,focusOffset:d.focusOffset}),Se&&Je(Se,d)||(Se=d,d=oe(Re,"onSelect"),0<d.length&&(b=new td("onSelect","select",null,b,c),a.push({event:b,listeners:d}),b.target=Qe)));}
    Pc("cancel cancel click click close close contextmenu contextMenu copy copy cut cut auxclick auxClick dblclick doubleClick dragend dragEnd dragstart dragStart drop drop focusin focus focusout blur input input invalid invalid keydown keyDown keypress keyPress keyup keyUp mousedown mouseDown mouseup mouseUp paste paste pause pause play play pointercancel pointerCancel pointerdown pointerDown pointerup pointerUp ratechange rateChange reset reset seeked seeked submit submit touchcancel touchCancel touchend touchEnd touchstart touchStart volumechange volumeChange".split(" "),
    0);Pc("drag drag dragenter dragEnter dragexit dragExit dragleave dragLeave dragover dragOver mousemove mouseMove mouseout mouseOut mouseover mouseOver pointermove pointerMove pointerout pointerOut pointerover pointerOver scroll scroll toggle toggle touchmove touchMove wheel wheel".split(" "),1);Pc(Oc,2);for(var Ve="change selectionchange textInput compositionstart compositionend compositionupdate".split(" "),We=0;We<Ve.length;We++)Nc.set(Ve[We],0);ea("onMouseEnter",["mouseout","mouseover"]);
    ea("onMouseLeave",["mouseout","mouseover"]);ea("onPointerEnter",["pointerout","pointerover"]);ea("onPointerLeave",["pointerout","pointerover"]);da("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));da("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));da("onBeforeInput",["compositionend","keypress","textInput","paste"]);da("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));
    da("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));da("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Xe="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Ye=new Set("cancel close invalid load scroll toggle".split(" ").concat(Xe));
    function Ze(a,b,c){var d=a.type||"unknown-event";a.currentTarget=c;Yb(d,b,void 0,a);a.currentTarget=null;}
    function se(a,b){b=0!==(b&4);for(var c=0;c<a.length;c++){var d=a[c],e=d.event;d=d.listeners;a:{var f=void 0;if(b)for(var g=d.length-1;0<=g;g--){var h=d[g],k=h.instance,l=h.currentTarget;h=h.listener;if(k!==f&&e.isPropagationStopped())break a;Ze(e,h,l);f=k;}else for(g=0;g<d.length;g++){h=d[g];k=h.instance;l=h.currentTarget;h=h.listener;if(k!==f&&e.isPropagationStopped())break a;Ze(e,h,l);f=k;}}}if(Ub)throw a=Vb,Ub=!1,Vb=null,a;}
    function G(a,b){var c=$e(b),d=a+"__bubble";c.has(d)||(af(b,a,2,!1),c.add(d));}var bf="_reactListening"+Math.random().toString(36).slice(2);function cf(a){a[bf]||(a[bf]=!0,ba.forEach(function(b){Ye.has(b)||df(b,!1,a,null);df(b,!0,a,null);}));}
    function df(a,b,c,d){var e=4<arguments.length&&void 0!==arguments[4]?arguments[4]:0,f=c;"selectionchange"===a&&9!==c.nodeType&&(f=c.ownerDocument);if(null!==d&&!b&&Ye.has(a)){if("scroll"!==a)return;e|=2;f=d;}var g=$e(f),h=a+"__"+(b?"capture":"bubble");g.has(h)||(b&&(e|=4),af(f,a,e,b),g.add(h));}
    function af(a,b,c,d){var e=Nc.get(b);switch(void 0===e?2:e){case 0:e=gd;break;case 1:e=id;break;default:e=hd;}c=e.bind(null,b,c,a);e=void 0;!Pb||"touchstart"!==b&&"touchmove"!==b&&"wheel"!==b||(e=!0);d?void 0!==e?a.addEventListener(b,c,{capture:!0,passive:e}):a.addEventListener(b,c,!0):void 0!==e?a.addEventListener(b,c,{passive:e}):a.addEventListener(b,c,!1);}
    function jd(a,b,c,d,e){var f=d;if(0===(b&1)&&0===(b&2)&&null!==d)a:for(;;){if(null===d)return;var g=d.tag;if(3===g||4===g){var h=d.stateNode.containerInfo;if(h===e||8===h.nodeType&&h.parentNode===e)break;if(4===g)for(g=d.return;null!==g;){var k=g.tag;if(3===k||4===k)if(k=g.stateNode.containerInfo,k===e||8===k.nodeType&&k.parentNode===e)return;g=g.return;}for(;null!==h;){g=wc(h);if(null===g)return;k=g.tag;if(5===k||6===k){d=f=g;continue a}h=h.parentNode;}}d=d.return;}Nb(function(){var d=f,e=xb(c),g=[];
    a:{var h=Mc.get(a);if(void 0!==h){var k=td,x=a;switch(a){case "keypress":if(0===od(c))break a;case "keydown":case "keyup":k=Rd;break;case "focusin":x="focus";k=Fd;break;case "focusout":x="blur";k=Fd;break;case "beforeblur":case "afterblur":k=Fd;break;case "click":if(2===c.button)break a;case "auxclick":case "dblclick":case "mousedown":case "mousemove":case "mouseup":case "mouseout":case "mouseover":case "contextmenu":k=Bd;break;case "drag":case "dragend":case "dragenter":case "dragexit":case "dragleave":case "dragover":case "dragstart":case "drop":k=
    Dd;break;case "touchcancel":case "touchend":case "touchmove":case "touchstart":k=Vd;break;case Ic:case Jc:case Kc:k=Hd;break;case Lc:k=Xd;break;case "scroll":k=vd;break;case "wheel":k=Zd;break;case "copy":case "cut":case "paste":k=Jd;break;case "gotpointercapture":case "lostpointercapture":case "pointercancel":case "pointerdown":case "pointermove":case "pointerout":case "pointerover":case "pointerup":k=Td;}var w=0!==(b&4),z=!w&&"scroll"===a,u=w?null!==h?h+"Capture":null:h;w=[];for(var t=d,q;null!==
    t;){q=t;var v=q.stateNode;5===q.tag&&null!==v&&(q=v,null!==u&&(v=Ob(t,u),null!=v&&w.push(ef(t,v,q))));if(z)break;t=t.return;}0<w.length&&(h=new k(h,x,null,c,e),g.push({event:h,listeners:w}));}}if(0===(b&7)){a:{h="mouseover"===a||"pointerover"===a;k="mouseout"===a||"pointerout"===a;if(h&&0===(b&16)&&(x=c.relatedTarget||c.fromElement)&&(wc(x)||x[ff]))break a;if(k||h){h=e.window===e?e:(h=e.ownerDocument)?h.defaultView||h.parentWindow:window;if(k){if(x=c.relatedTarget||c.toElement,k=d,x=x?wc(x):null,null!==
    x&&(z=Zb(x),x!==z||5!==x.tag&&6!==x.tag))x=null;}else k=null,x=d;if(k!==x){w=Bd;v="onMouseLeave";u="onMouseEnter";t="mouse";if("pointerout"===a||"pointerover"===a)w=Td,v="onPointerLeave",u="onPointerEnter",t="pointer";z=null==k?h:ue(k);q=null==x?h:ue(x);h=new w(v,t+"leave",k,c,e);h.target=z;h.relatedTarget=q;v=null;wc(e)===d&&(w=new w(u,t+"enter",x,c,e),w.target=q,w.relatedTarget=z,v=w);z=v;if(k&&x)b:{w=k;u=x;t=0;for(q=w;q;q=gf(q))t++;q=0;for(v=u;v;v=gf(v))q++;for(;0<t-q;)w=gf(w),t--;for(;0<q-t;)u=
    gf(u),q--;for(;t--;){if(w===u||null!==u&&w===u.alternate)break b;w=gf(w);u=gf(u);}w=null;}else w=null;null!==k&&hf(g,h,k,w,!1);null!==x&&null!==z&&hf(g,z,x,w,!0);}}}a:{h=d?ue(d):window;k=h.nodeName&&h.nodeName.toLowerCase();if("select"===k||"input"===k&&"file"===h.type)var J=ve;else if(me(h))if(we)J=Fe;else {J=De;var K=Ce;}else (k=h.nodeName)&&"input"===k.toLowerCase()&&("checkbox"===h.type||"radio"===h.type)&&(J=Ee);if(J&&(J=J(a,d))){ne(g,J,c,e);break a}K&&K(a,h,d);"focusout"===a&&(K=h._wrapperState)&&
    K.controlled&&"number"===h.type&&bb(h,"number",h.value);}K=d?ue(d):window;switch(a){case "focusin":if(me(K)||"true"===K.contentEditable)Qe=K,Re=d,Se=null;break;case "focusout":Se=Re=Qe=null;break;case "mousedown":Te=!0;break;case "contextmenu":case "mouseup":case "dragend":Te=!1;Ue(g,c,e);break;case "selectionchange":if(Pe)break;case "keydown":case "keyup":Ue(g,c,e);}var Q;if(ae)b:{switch(a){case "compositionstart":var L="onCompositionStart";break b;case "compositionend":L="onCompositionEnd";break b;
    case "compositionupdate":L="onCompositionUpdate";break b}L=void 0;}else ie?ge(a,c)&&(L="onCompositionEnd"):"keydown"===a&&229===c.keyCode&&(L="onCompositionStart");L&&(de&&"ko"!==c.locale&&(ie||"onCompositionStart"!==L?"onCompositionEnd"===L&&ie&&(Q=nd()):(kd=e,ld="value"in kd?kd.value:kd.textContent,ie=!0)),K=oe(d,L),0<K.length&&(L=new Ld(L,a,null,c,e),g.push({event:L,listeners:K}),Q?L.data=Q:(Q=he(c),null!==Q&&(L.data=Q))));if(Q=ce?je(a,c):ke(a,c))d=oe(d,"onBeforeInput"),0<d.length&&(e=new Ld("onBeforeInput",
    "beforeinput",null,c,e),g.push({event:e,listeners:d}),e.data=Q);}se(g,b);});}function ef(a,b,c){return {instance:a,listener:b,currentTarget:c}}function oe(a,b){for(var c=b+"Capture",d=[];null!==a;){var e=a,f=e.stateNode;5===e.tag&&null!==f&&(e=f,f=Ob(a,c),null!=f&&d.unshift(ef(a,f,e)),f=Ob(a,b),null!=f&&d.push(ef(a,f,e)));a=a.return;}return d}function gf(a){if(null===a)return null;do a=a.return;while(a&&5!==a.tag);return a?a:null}
    function hf(a,b,c,d,e){for(var f=b._reactName,g=[];null!==c&&c!==d;){var h=c,k=h.alternate,l=h.stateNode;if(null!==k&&k===d)break;5===h.tag&&null!==l&&(h=l,e?(k=Ob(c,f),null!=k&&g.unshift(ef(c,k,h))):e||(k=Ob(c,f),null!=k&&g.push(ef(c,k,h))));c=c.return;}0!==g.length&&a.push({event:b,listeners:g});}function jf(){}var kf=null,lf=null;function mf(a,b){switch(a){case "button":case "input":case "select":case "textarea":return !!b.autoFocus}return !1}
    function nf(a,b){return "textarea"===a||"option"===a||"noscript"===a||"string"===typeof b.children||"number"===typeof b.children||"object"===typeof b.dangerouslySetInnerHTML&&null!==b.dangerouslySetInnerHTML&&null!=b.dangerouslySetInnerHTML.__html}var of="function"===typeof setTimeout?setTimeout:void 0,pf="function"===typeof clearTimeout?clearTimeout:void 0;function qf(a){1===a.nodeType?a.textContent="":9===a.nodeType&&(a=a.body,null!=a&&(a.textContent=""));}
    function rf(a){for(;null!=a;a=a.nextSibling){var b=a.nodeType;if(1===b||3===b)break}return a}function sf(a){a=a.previousSibling;for(var b=0;a;){if(8===a.nodeType){var c=a.data;if("$"===c||"$!"===c||"$?"===c){if(0===b)return a;b--;}else "/$"===c&&b++;}a=a.previousSibling;}return null}var tf=0;function uf(a){return {$$typeof:Ga,toString:a,valueOf:a}}var vf=Math.random().toString(36).slice(2),wf="__reactFiber$"+vf,xf="__reactProps$"+vf,ff="__reactContainer$"+vf,yf="__reactEvents$"+vf;
    function wc(a){var b=a[wf];if(b)return b;for(var c=a.parentNode;c;){if(b=c[ff]||c[wf]){c=b.alternate;if(null!==b.child||null!==c&&null!==c.child)for(a=sf(a);null!==a;){if(c=a[wf])return c;a=sf(a);}return b}a=c;c=a.parentNode;}return null}function Cb(a){a=a[wf]||a[ff];return !a||5!==a.tag&&6!==a.tag&&13!==a.tag&&3!==a.tag?null:a}function ue(a){if(5===a.tag||6===a.tag)return a.stateNode;throw Error(y(33));}function Db(a){return a[xf]||null}
    function $e(a){var b=a[yf];void 0===b&&(b=a[yf]=new Set);return b}var zf=[],Af=-1;function Bf(a){return {current:a}}function H(a){0>Af||(a.current=zf[Af],zf[Af]=null,Af--);}function I(a,b){Af++;zf[Af]=a.current;a.current=b;}var Cf={},M=Bf(Cf),N=Bf(!1),Df=Cf;
    function Ef(a,b){var c=a.type.contextTypes;if(!c)return Cf;var d=a.stateNode;if(d&&d.__reactInternalMemoizedUnmaskedChildContext===b)return d.__reactInternalMemoizedMaskedChildContext;var e={},f;for(f in c)e[f]=b[f];d&&(a=a.stateNode,a.__reactInternalMemoizedUnmaskedChildContext=b,a.__reactInternalMemoizedMaskedChildContext=e);return e}function Ff(a){a=a.childContextTypes;return null!==a&&void 0!==a}function Gf(){H(N);H(M);}function Hf(a,b,c){if(M.current!==Cf)throw Error(y(168));I(M,b);I(N,c);}
    function If(a,b,c){var d=a.stateNode;a=b.childContextTypes;if("function"!==typeof d.getChildContext)return c;d=d.getChildContext();for(var e in d)if(!(e in a))throw Error(y(108,Ra(b)||"Unknown",e));return objectAssign({},c,d)}function Jf(a){a=(a=a.stateNode)&&a.__reactInternalMemoizedMergedChildContext||Cf;Df=M.current;I(M,a);I(N,N.current);return !0}function Kf(a,b,c){var d=a.stateNode;if(!d)throw Error(y(169));c?(a=If(a,b,Df),d.__reactInternalMemoizedMergedChildContext=a,H(N),H(M),I(M,a)):H(N);I(N,c);}
    var Lf=null,Mf=null,Nf=scheduler.unstable_runWithPriority,Of=scheduler.unstable_scheduleCallback,Pf=scheduler.unstable_cancelCallback,Qf=scheduler.unstable_shouldYield,Rf=scheduler.unstable_requestPaint,Sf=scheduler.unstable_now,Tf=scheduler.unstable_getCurrentPriorityLevel,Uf=scheduler.unstable_ImmediatePriority,Vf=scheduler.unstable_UserBlockingPriority,Wf=scheduler.unstable_NormalPriority,Xf=scheduler.unstable_LowPriority,Yf=scheduler.unstable_IdlePriority,Zf={},$f=void 0!==Rf?Rf:function(){},ag=null,bg=null,cg=!1,dg=Sf(),O=1E4>dg?Sf:function(){return Sf()-dg};
    function eg(){switch(Tf()){case Uf:return 99;case Vf:return 98;case Wf:return 97;case Xf:return 96;case Yf:return 95;default:throw Error(y(332));}}function fg(a){switch(a){case 99:return Uf;case 98:return Vf;case 97:return Wf;case 96:return Xf;case 95:return Yf;default:throw Error(y(332));}}function gg(a,b){a=fg(a);return Nf(a,b)}function hg(a,b,c){a=fg(a);return Of(a,b,c)}function ig(){if(null!==bg){var a=bg;bg=null;Pf(a);}jg();}
    function jg(){if(!cg&&null!==ag){cg=!0;var a=0;try{var b=ag;gg(99,function(){for(;a<b.length;a++){var c=b[a];do c=c(!0);while(null!==c)}});ag=null;}catch(c){throw null!==ag&&(ag=ag.slice(a+1)),Of(Uf,ig),c;}finally{cg=!1;}}}var kg=ra.ReactCurrentBatchConfig;function lg(a,b){if(a&&a.defaultProps){b=objectAssign({},b);a=a.defaultProps;for(var c in a)void 0===b[c]&&(b[c]=a[c]);return b}return b}var mg=Bf(null),ng=null,og=null,pg=null;function qg(){pg=og=ng=null;}
    function rg(a){var b=mg.current;H(mg);a.type._context._currentValue=b;}function sg(a,b){for(;null!==a;){var c=a.alternate;if((a.childLanes&b)===b)if(null===c||(c.childLanes&b)===b)break;else c.childLanes|=b;else a.childLanes|=b,null!==c&&(c.childLanes|=b);a=a.return;}}function tg(a,b){ng=a;pg=og=null;a=a.dependencies;null!==a&&null!==a.firstContext&&(0!==(a.lanes&b)&&(ug=!0),a.firstContext=null);}
    function vg(a,b){if(pg!==a&&!1!==b&&0!==b){if("number"!==typeof b||1073741823===b)pg=a,b=1073741823;b={context:a,observedBits:b,next:null};if(null===og){if(null===ng)throw Error(y(308));og=b;ng.dependencies={lanes:0,firstContext:b,responders:null};}else og=og.next=b;}return a._currentValue}var wg=!1;function xg(a){a.updateQueue={baseState:a.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null},effects:null};}
    function yg(a,b){a=a.updateQueue;b.updateQueue===a&&(b.updateQueue={baseState:a.baseState,firstBaseUpdate:a.firstBaseUpdate,lastBaseUpdate:a.lastBaseUpdate,shared:a.shared,effects:a.effects});}function zg(a,b){return {eventTime:a,lane:b,tag:0,payload:null,callback:null,next:null}}function Ag(a,b){a=a.updateQueue;if(null!==a){a=a.shared;var c=a.pending;null===c?b.next=b:(b.next=c.next,c.next=b);a.pending=b;}}
    function Bg(a,b){var c=a.updateQueue,d=a.alternate;if(null!==d&&(d=d.updateQueue,c===d)){var e=null,f=null;c=c.firstBaseUpdate;if(null!==c){do{var g={eventTime:c.eventTime,lane:c.lane,tag:c.tag,payload:c.payload,callback:c.callback,next:null};null===f?e=f=g:f=f.next=g;c=c.next;}while(null!==c);null===f?e=f=b:f=f.next=b;}else e=f=b;c={baseState:d.baseState,firstBaseUpdate:e,lastBaseUpdate:f,shared:d.shared,effects:d.effects};a.updateQueue=c;return}a=c.lastBaseUpdate;null===a?c.firstBaseUpdate=b:a.next=
    b;c.lastBaseUpdate=b;}
    function Cg(a,b,c,d){var e=a.updateQueue;wg=!1;var f=e.firstBaseUpdate,g=e.lastBaseUpdate,h=e.shared.pending;if(null!==h){e.shared.pending=null;var k=h,l=k.next;k.next=null;null===g?f=l:g.next=l;g=k;var n=a.alternate;if(null!==n){n=n.updateQueue;var A=n.lastBaseUpdate;A!==g&&(null===A?n.firstBaseUpdate=l:A.next=l,n.lastBaseUpdate=k);}}if(null!==f){A=e.baseState;g=0;n=l=k=null;do{h=f.lane;var p=f.eventTime;if((d&h)===h){null!==n&&(n=n.next={eventTime:p,lane:0,tag:f.tag,payload:f.payload,callback:f.callback,
    next:null});a:{var C=a,x=f;h=b;p=c;switch(x.tag){case 1:C=x.payload;if("function"===typeof C){A=C.call(p,A,h);break a}A=C;break a;case 3:C.flags=C.flags&-4097|64;case 0:C=x.payload;h="function"===typeof C?C.call(p,A,h):C;if(null===h||void 0===h)break a;A=objectAssign({},A,h);break a;case 2:wg=!0;}}null!==f.callback&&(a.flags|=32,h=e.effects,null===h?e.effects=[f]:h.push(f));}else p={eventTime:p,lane:h,tag:f.tag,payload:f.payload,callback:f.callback,next:null},null===n?(l=n=p,k=A):n=n.next=p,g|=h;f=f.next;if(null===
    f)if(h=e.shared.pending,null===h)break;else f=h.next,h.next=null,e.lastBaseUpdate=h,e.shared.pending=null;}while(1);null===n&&(k=A);e.baseState=k;e.firstBaseUpdate=l;e.lastBaseUpdate=n;Dg|=g;a.lanes=g;a.memoizedState=A;}}function Eg(a,b,c){a=b.effects;b.effects=null;if(null!==a)for(b=0;b<a.length;b++){var d=a[b],e=d.callback;if(null!==e){d.callback=null;d=c;if("function"!==typeof e)throw Error(y(191,e));e.call(d);}}}var Fg=(new react.Component).refs;
    function Gg(a,b,c,d){b=a.memoizedState;c=c(d,b);c=null===c||void 0===c?b:objectAssign({},b,c);a.memoizedState=c;0===a.lanes&&(a.updateQueue.baseState=c);}
    var Kg={isMounted:function(a){return (a=a._reactInternals)?Zb(a)===a:!1},enqueueSetState:function(a,b,c){a=a._reactInternals;var d=Hg(),e=Ig(a),f=zg(d,e);f.payload=b;void 0!==c&&null!==c&&(f.callback=c);Ag(a,f);Jg(a,e,d);},enqueueReplaceState:function(a,b,c){a=a._reactInternals;var d=Hg(),e=Ig(a),f=zg(d,e);f.tag=1;f.payload=b;void 0!==c&&null!==c&&(f.callback=c);Ag(a,f);Jg(a,e,d);},enqueueForceUpdate:function(a,b){a=a._reactInternals;var c=Hg(),d=Ig(a),e=zg(c,d);e.tag=2;void 0!==b&&null!==b&&(e.callback=
    b);Ag(a,e);Jg(a,d,c);}};function Lg(a,b,c,d,e,f,g){a=a.stateNode;return "function"===typeof a.shouldComponentUpdate?a.shouldComponentUpdate(d,f,g):b.prototype&&b.prototype.isPureReactComponent?!Je(c,d)||!Je(e,f):!0}
    function Mg(a,b,c){var d=!1,e=Cf;var f=b.contextType;"object"===typeof f&&null!==f?f=vg(f):(e=Ff(b)?Df:M.current,d=b.contextTypes,f=(d=null!==d&&void 0!==d)?Ef(a,e):Cf);b=new b(c,f);a.memoizedState=null!==b.state&&void 0!==b.state?b.state:null;b.updater=Kg;a.stateNode=b;b._reactInternals=a;d&&(a=a.stateNode,a.__reactInternalMemoizedUnmaskedChildContext=e,a.__reactInternalMemoizedMaskedChildContext=f);return b}
    function Ng(a,b,c,d){a=b.state;"function"===typeof b.componentWillReceiveProps&&b.componentWillReceiveProps(c,d);"function"===typeof b.UNSAFE_componentWillReceiveProps&&b.UNSAFE_componentWillReceiveProps(c,d);b.state!==a&&Kg.enqueueReplaceState(b,b.state,null);}
    function Og(a,b,c,d){var e=a.stateNode;e.props=c;e.state=a.memoizedState;e.refs=Fg;xg(a);var f=b.contextType;"object"===typeof f&&null!==f?e.context=vg(f):(f=Ff(b)?Df:M.current,e.context=Ef(a,f));Cg(a,c,e,d);e.state=a.memoizedState;f=b.getDerivedStateFromProps;"function"===typeof f&&(Gg(a,b,f,c),e.state=a.memoizedState);"function"===typeof b.getDerivedStateFromProps||"function"===typeof e.getSnapshotBeforeUpdate||"function"!==typeof e.UNSAFE_componentWillMount&&"function"!==typeof e.componentWillMount||
    (b=e.state,"function"===typeof e.componentWillMount&&e.componentWillMount(),"function"===typeof e.UNSAFE_componentWillMount&&e.UNSAFE_componentWillMount(),b!==e.state&&Kg.enqueueReplaceState(e,e.state,null),Cg(a,c,e,d),e.state=a.memoizedState);"function"===typeof e.componentDidMount&&(a.flags|=4);}var Pg=Array.isArray;
    function Qg(a,b,c){a=c.ref;if(null!==a&&"function"!==typeof a&&"object"!==typeof a){if(c._owner){c=c._owner;if(c){if(1!==c.tag)throw Error(y(309));var d=c.stateNode;}if(!d)throw Error(y(147,a));var e=""+a;if(null!==b&&null!==b.ref&&"function"===typeof b.ref&&b.ref._stringRef===e)return b.ref;b=function(a){var b=d.refs;b===Fg&&(b=d.refs={});null===a?delete b[e]:b[e]=a;};b._stringRef=e;return b}if("string"!==typeof a)throw Error(y(284));if(!c._owner)throw Error(y(290,a));}return a}
    function Rg(a,b){if("textarea"!==a.type)throw Error(y(31,"[object Object]"===Object.prototype.toString.call(b)?"object with keys {"+Object.keys(b).join(", ")+"}":b));}
    function Sg(a){function b(b,c){if(a){var d=b.lastEffect;null!==d?(d.nextEffect=c,b.lastEffect=c):b.firstEffect=b.lastEffect=c;c.nextEffect=null;c.flags=8;}}function c(c,d){if(!a)return null;for(;null!==d;)b(c,d),d=d.sibling;return null}function d(a,b){for(a=new Map;null!==b;)null!==b.key?a.set(b.key,b):a.set(b.index,b),b=b.sibling;return a}function e(a,b){a=Tg(a,b);a.index=0;a.sibling=null;return a}function f(b,c,d){b.index=d;if(!a)return c;d=b.alternate;if(null!==d)return d=d.index,d<c?(b.flags=2,
    c):d;b.flags=2;return c}function g(b){a&&null===b.alternate&&(b.flags=2);return b}function h(a,b,c,d){if(null===b||6!==b.tag)return b=Ug(c,a.mode,d),b.return=a,b;b=e(b,c);b.return=a;return b}function k(a,b,c,d){if(null!==b&&b.elementType===c.type)return d=e(b,c.props),d.ref=Qg(a,b,c),d.return=a,d;d=Vg(c.type,c.key,c.props,null,a.mode,d);d.ref=Qg(a,b,c);d.return=a;return d}function l(a,b,c,d){if(null===b||4!==b.tag||b.stateNode.containerInfo!==c.containerInfo||b.stateNode.implementation!==c.implementation)return b=
    Wg(c,a.mode,d),b.return=a,b;b=e(b,c.children||[]);b.return=a;return b}function n(a,b,c,d,f){if(null===b||7!==b.tag)return b=Xg(c,a.mode,d,f),b.return=a,b;b=e(b,c);b.return=a;return b}function A(a,b,c){if("string"===typeof b||"number"===typeof b)return b=Ug(""+b,a.mode,c),b.return=a,b;if("object"===typeof b&&null!==b){switch(b.$$typeof){case sa:return c=Vg(b.type,b.key,b.props,null,a.mode,c),c.ref=Qg(a,null,b),c.return=a,c;case ta:return b=Wg(b,a.mode,c),b.return=a,b}if(Pg(b)||La(b))return b=Xg(b,
    a.mode,c,null),b.return=a,b;Rg(a,b);}return null}function p(a,b,c,d){var e=null!==b?b.key:null;if("string"===typeof c||"number"===typeof c)return null!==e?null:h(a,b,""+c,d);if("object"===typeof c&&null!==c){switch(c.$$typeof){case sa:return c.key===e?c.type===ua?n(a,b,c.props.children,d,e):k(a,b,c,d):null;case ta:return c.key===e?l(a,b,c,d):null}if(Pg(c)||La(c))return null!==e?null:n(a,b,c,d,null);Rg(a,c);}return null}function C(a,b,c,d,e){if("string"===typeof d||"number"===typeof d)return a=a.get(c)||
    null,h(b,a,""+d,e);if("object"===typeof d&&null!==d){switch(d.$$typeof){case sa:return a=a.get(null===d.key?c:d.key)||null,d.type===ua?n(b,a,d.props.children,e,d.key):k(b,a,d,e);case ta:return a=a.get(null===d.key?c:d.key)||null,l(b,a,d,e)}if(Pg(d)||La(d))return a=a.get(c)||null,n(b,a,d,e,null);Rg(b,d);}return null}function x(e,g,h,k){for(var l=null,t=null,u=g,z=g=0,q=null;null!==u&&z<h.length;z++){u.index>z?(q=u,u=null):q=u.sibling;var n=p(e,u,h[z],k);if(null===n){null===u&&(u=q);break}a&&u&&null===
    n.alternate&&b(e,u);g=f(n,g,z);null===t?l=n:t.sibling=n;t=n;u=q;}if(z===h.length)return c(e,u),l;if(null===u){for(;z<h.length;z++)u=A(e,h[z],k),null!==u&&(g=f(u,g,z),null===t?l=u:t.sibling=u,t=u);return l}for(u=d(e,u);z<h.length;z++)q=C(u,e,z,h[z],k),null!==q&&(a&&null!==q.alternate&&u.delete(null===q.key?z:q.key),g=f(q,g,z),null===t?l=q:t.sibling=q,t=q);a&&u.forEach(function(a){return b(e,a)});return l}function w(e,g,h,k){var l=La(h);if("function"!==typeof l)throw Error(y(150));h=l.call(h);if(null==
    h)throw Error(y(151));for(var t=l=null,u=g,z=g=0,q=null,n=h.next();null!==u&&!n.done;z++,n=h.next()){u.index>z?(q=u,u=null):q=u.sibling;var w=p(e,u,n.value,k);if(null===w){null===u&&(u=q);break}a&&u&&null===w.alternate&&b(e,u);g=f(w,g,z);null===t?l=w:t.sibling=w;t=w;u=q;}if(n.done)return c(e,u),l;if(null===u){for(;!n.done;z++,n=h.next())n=A(e,n.value,k),null!==n&&(g=f(n,g,z),null===t?l=n:t.sibling=n,t=n);return l}for(u=d(e,u);!n.done;z++,n=h.next())n=C(u,e,z,n.value,k),null!==n&&(a&&null!==n.alternate&&
    u.delete(null===n.key?z:n.key),g=f(n,g,z),null===t?l=n:t.sibling=n,t=n);a&&u.forEach(function(a){return b(e,a)});return l}return function(a,d,f,h){var k="object"===typeof f&&null!==f&&f.type===ua&&null===f.key;k&&(f=f.props.children);var l="object"===typeof f&&null!==f;if(l)switch(f.$$typeof){case sa:a:{l=f.key;for(k=d;null!==k;){if(k.key===l){switch(k.tag){case 7:if(f.type===ua){c(a,k.sibling);d=e(k,f.props.children);d.return=a;a=d;break a}break;default:if(k.elementType===f.type){c(a,k.sibling);
    d=e(k,f.props);d.ref=Qg(a,k,f);d.return=a;a=d;break a}}c(a,k);break}else b(a,k);k=k.sibling;}f.type===ua?(d=Xg(f.props.children,a.mode,h,f.key),d.return=a,a=d):(h=Vg(f.type,f.key,f.props,null,a.mode,h),h.ref=Qg(a,d,f),h.return=a,a=h);}return g(a);case ta:a:{for(k=f.key;null!==d;){if(d.key===k)if(4===d.tag&&d.stateNode.containerInfo===f.containerInfo&&d.stateNode.implementation===f.implementation){c(a,d.sibling);d=e(d,f.children||[]);d.return=a;a=d;break a}else {c(a,d);break}else b(a,d);d=d.sibling;}d=
    Wg(f,a.mode,h);d.return=a;a=d;}return g(a)}if("string"===typeof f||"number"===typeof f)return f=""+f,null!==d&&6===d.tag?(c(a,d.sibling),d=e(d,f),d.return=a,a=d):(c(a,d),d=Ug(f,a.mode,h),d.return=a,a=d),g(a);if(Pg(f))return x(a,d,f,h);if(La(f))return w(a,d,f,h);l&&Rg(a,f);if("undefined"===typeof f&&!k)switch(a.tag){case 1:case 22:case 0:case 11:case 15:throw Error(y(152,Ra(a.type)||"Component"));}return c(a,d)}}var Yg=Sg(!0),Zg=Sg(!1),$g={},ah=Bf($g),bh=Bf($g),ch=Bf($g);
    function dh(a){if(a===$g)throw Error(y(174));return a}function eh(a,b){I(ch,b);I(bh,a);I(ah,$g);a=b.nodeType;switch(a){case 9:case 11:b=(b=b.documentElement)?b.namespaceURI:mb(null,"");break;default:a=8===a?b.parentNode:b,b=a.namespaceURI||null,a=a.tagName,b=mb(b,a);}H(ah);I(ah,b);}function fh(){H(ah);H(bh);H(ch);}function gh(a){dh(ch.current);var b=dh(ah.current);var c=mb(b,a.type);b!==c&&(I(bh,a),I(ah,c));}function hh(a){bh.current===a&&(H(ah),H(bh));}var P=Bf(0);
    function ih(a){for(var b=a;null!==b;){if(13===b.tag){var c=b.memoizedState;if(null!==c&&(c=c.dehydrated,null===c||"$?"===c.data||"$!"===c.data))return b}else if(19===b.tag&&void 0!==b.memoizedProps.revealOrder){if(0!==(b.flags&64))return b}else if(null!==b.child){b.child.return=b;b=b.child;continue}if(b===a)break;for(;null===b.sibling;){if(null===b.return||b.return===a)return null;b=b.return;}b.sibling.return=b.return;b=b.sibling;}return null}var jh=null,kh=null,lh=!1;
    function mh(a,b){var c=nh(5,null,null,0);c.elementType="DELETED";c.type="DELETED";c.stateNode=b;c.return=a;c.flags=8;null!==a.lastEffect?(a.lastEffect.nextEffect=c,a.lastEffect=c):a.firstEffect=a.lastEffect=c;}function oh(a,b){switch(a.tag){case 5:var c=a.type;b=1!==b.nodeType||c.toLowerCase()!==b.nodeName.toLowerCase()?null:b;return null!==b?(a.stateNode=b,!0):!1;case 6:return b=""===a.pendingProps||3!==b.nodeType?null:b,null!==b?(a.stateNode=b,!0):!1;case 13:return !1;default:return !1}}
    function ph(a){if(lh){var b=kh;if(b){var c=b;if(!oh(a,b)){b=rf(c.nextSibling);if(!b||!oh(a,b)){a.flags=a.flags&-1025|2;lh=!1;jh=a;return}mh(jh,c);}jh=a;kh=rf(b.firstChild);}else a.flags=a.flags&-1025|2,lh=!1,jh=a;}}function qh(a){for(a=a.return;null!==a&&5!==a.tag&&3!==a.tag&&13!==a.tag;)a=a.return;jh=a;}
    function rh(a){if(a!==jh)return !1;if(!lh)return qh(a),lh=!0,!1;var b=a.type;if(5!==a.tag||"head"!==b&&"body"!==b&&!nf(b,a.memoizedProps))for(b=kh;b;)mh(a,b),b=rf(b.nextSibling);qh(a);if(13===a.tag){a=a.memoizedState;a=null!==a?a.dehydrated:null;if(!a)throw Error(y(317));a:{a=a.nextSibling;for(b=0;a;){if(8===a.nodeType){var c=a.data;if("/$"===c){if(0===b){kh=rf(a.nextSibling);break a}b--;}else "$"!==c&&"$!"!==c&&"$?"!==c||b++;}a=a.nextSibling;}kh=null;}}else kh=jh?rf(a.stateNode.nextSibling):null;return !0}
    function sh(){kh=jh=null;lh=!1;}var th=[];function uh(){for(var a=0;a<th.length;a++)th[a]._workInProgressVersionPrimary=null;th.length=0;}var vh=ra.ReactCurrentDispatcher,wh=ra.ReactCurrentBatchConfig,xh=0,R=null,S=null,T=null,yh=!1,zh=!1;function Ah(){throw Error(y(321));}function Bh(a,b){if(null===b)return !1;for(var c=0;c<b.length&&c<a.length;c++)if(!He(a[c],b[c]))return !1;return !0}
    function Ch(a,b,c,d,e,f){xh=f;R=b;b.memoizedState=null;b.updateQueue=null;b.lanes=0;vh.current=null===a||null===a.memoizedState?Dh:Eh;a=c(d,e);if(zh){f=0;do{zh=!1;if(!(25>f))throw Error(y(301));f+=1;T=S=null;b.updateQueue=null;vh.current=Fh;a=c(d,e);}while(zh)}vh.current=Gh;b=null!==S&&null!==S.next;xh=0;T=S=R=null;yh=!1;if(b)throw Error(y(300));return a}function Hh(){var a={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};null===T?R.memoizedState=T=a:T=T.next=a;return T}
    function Ih(){if(null===S){var a=R.alternate;a=null!==a?a.memoizedState:null;}else a=S.next;var b=null===T?R.memoizedState:T.next;if(null!==b)T=b,S=a;else {if(null===a)throw Error(y(310));S=a;a={memoizedState:S.memoizedState,baseState:S.baseState,baseQueue:S.baseQueue,queue:S.queue,next:null};null===T?R.memoizedState=T=a:T=T.next=a;}return T}function Jh(a,b){return "function"===typeof b?b(a):b}
    function Kh(a){var b=Ih(),c=b.queue;if(null===c)throw Error(y(311));c.lastRenderedReducer=a;var d=S,e=d.baseQueue,f=c.pending;if(null!==f){if(null!==e){var g=e.next;e.next=f.next;f.next=g;}d.baseQueue=e=f;c.pending=null;}if(null!==e){e=e.next;d=d.baseState;var h=g=f=null,k=e;do{var l=k.lane;if((xh&l)===l)null!==h&&(h=h.next={lane:0,action:k.action,eagerReducer:k.eagerReducer,eagerState:k.eagerState,next:null}),d=k.eagerReducer===a?k.eagerState:a(d,k.action);else {var n={lane:l,action:k.action,eagerReducer:k.eagerReducer,
    eagerState:k.eagerState,next:null};null===h?(g=h=n,f=d):h=h.next=n;R.lanes|=l;Dg|=l;}k=k.next;}while(null!==k&&k!==e);null===h?f=d:h.next=g;He(d,b.memoizedState)||(ug=!0);b.memoizedState=d;b.baseState=f;b.baseQueue=h;c.lastRenderedState=d;}return [b.memoizedState,c.dispatch]}
    function Lh(a){var b=Ih(),c=b.queue;if(null===c)throw Error(y(311));c.lastRenderedReducer=a;var d=c.dispatch,e=c.pending,f=b.memoizedState;if(null!==e){c.pending=null;var g=e=e.next;do f=a(f,g.action),g=g.next;while(g!==e);He(f,b.memoizedState)||(ug=!0);b.memoizedState=f;null===b.baseQueue&&(b.baseState=f);c.lastRenderedState=f;}return [f,d]}
    function Mh(a,b,c){var d=b._getVersion;d=d(b._source);var e=b._workInProgressVersionPrimary;if(null!==e)a=e===d;else if(a=a.mutableReadLanes,a=(xh&a)===a)b._workInProgressVersionPrimary=d,th.push(b);if(a)return c(b._source);th.push(b);throw Error(y(350));}
    function Nh(a,b,c,d){var e=U;if(null===e)throw Error(y(349));var f=b._getVersion,g=f(b._source),h=vh.current,k=h.useState(function(){return Mh(e,b,c)}),l=k[1],n=k[0];k=T;var A=a.memoizedState,p=A.refs,C=p.getSnapshot,x=A.source;A=A.subscribe;var w=R;a.memoizedState={refs:p,source:b,subscribe:d};h.useEffect(function(){p.getSnapshot=c;p.setSnapshot=l;var a=f(b._source);if(!He(g,a)){a=c(b._source);He(n,a)||(l(a),a=Ig(w),e.mutableReadLanes|=a&e.pendingLanes);a=e.mutableReadLanes;e.entangledLanes|=a;for(var d=
    e.entanglements,h=a;0<h;){var k=31-Vc(h),v=1<<k;d[k]|=a;h&=~v;}}},[c,b,d]);h.useEffect(function(){return d(b._source,function(){var a=p.getSnapshot,c=p.setSnapshot;try{c(a(b._source));var d=Ig(w);e.mutableReadLanes|=d&e.pendingLanes;}catch(q){c(function(){throw q;});}})},[b,d]);He(C,c)&&He(x,b)&&He(A,d)||(a={pending:null,dispatch:null,lastRenderedReducer:Jh,lastRenderedState:n},a.dispatch=l=Oh.bind(null,R,a),k.queue=a,k.baseQueue=null,n=Mh(e,b,c),k.memoizedState=k.baseState=n);return n}
    function Ph(a,b,c){var d=Ih();return Nh(d,a,b,c)}function Qh(a){var b=Hh();"function"===typeof a&&(a=a());b.memoizedState=b.baseState=a;a=b.queue={pending:null,dispatch:null,lastRenderedReducer:Jh,lastRenderedState:a};a=a.dispatch=Oh.bind(null,R,a);return [b.memoizedState,a]}
    function Rh(a,b,c,d){a={tag:a,create:b,destroy:c,deps:d,next:null};b=R.updateQueue;null===b?(b={lastEffect:null},R.updateQueue=b,b.lastEffect=a.next=a):(c=b.lastEffect,null===c?b.lastEffect=a.next=a:(d=c.next,c.next=a,a.next=d,b.lastEffect=a));return a}function Sh(a){var b=Hh();a={current:a};return b.memoizedState=a}function Th(){return Ih().memoizedState}function Uh(a,b,c,d){var e=Hh();R.flags|=a;e.memoizedState=Rh(1|b,c,void 0,void 0===d?null:d);}
    function Vh(a,b,c,d){var e=Ih();d=void 0===d?null:d;var f=void 0;if(null!==S){var g=S.memoizedState;f=g.destroy;if(null!==d&&Bh(d,g.deps)){Rh(b,c,f,d);return}}R.flags|=a;e.memoizedState=Rh(1|b,c,f,d);}function Wh(a,b){return Uh(516,4,a,b)}function Xh(a,b){return Vh(516,4,a,b)}function Yh(a,b){return Vh(4,2,a,b)}function Zh(a,b){if("function"===typeof b)return a=a(),b(a),function(){b(null);};if(null!==b&&void 0!==b)return a=a(),b.current=a,function(){b.current=null;}}
    function $h(a,b,c){c=null!==c&&void 0!==c?c.concat([a]):null;return Vh(4,2,Zh.bind(null,b,a),c)}function ai(){}function bi(a,b){var c=Ih();b=void 0===b?null:b;var d=c.memoizedState;if(null!==d&&null!==b&&Bh(b,d[1]))return d[0];c.memoizedState=[a,b];return a}function ci(a,b){var c=Ih();b=void 0===b?null:b;var d=c.memoizedState;if(null!==d&&null!==b&&Bh(b,d[1]))return d[0];a=a();c.memoizedState=[a,b];return a}
    function di(a,b){var c=eg();gg(98>c?98:c,function(){a(!0);});gg(97<c?97:c,function(){var c=wh.transition;wh.transition=1;try{a(!1),b();}finally{wh.transition=c;}});}
    function Oh(a,b,c){var d=Hg(),e=Ig(a),f={lane:e,action:c,eagerReducer:null,eagerState:null,next:null},g=b.pending;null===g?f.next=f:(f.next=g.next,g.next=f);b.pending=f;g=a.alternate;if(a===R||null!==g&&g===R)zh=yh=!0;else {if(0===a.lanes&&(null===g||0===g.lanes)&&(g=b.lastRenderedReducer,null!==g))try{var h=b.lastRenderedState,k=g(h,c);f.eagerReducer=g;f.eagerState=k;if(He(k,h))return}catch(l){}finally{}Jg(a,e,d);}}
    var Gh={readContext:vg,useCallback:Ah,useContext:Ah,useEffect:Ah,useImperativeHandle:Ah,useLayoutEffect:Ah,useMemo:Ah,useReducer:Ah,useRef:Ah,useState:Ah,useDebugValue:Ah,useDeferredValue:Ah,useTransition:Ah,useMutableSource:Ah,useOpaqueIdentifier:Ah,unstable_isNewReconciler:!1},Dh={readContext:vg,useCallback:function(a,b){Hh().memoizedState=[a,void 0===b?null:b];return a},useContext:vg,useEffect:Wh,useImperativeHandle:function(a,b,c){c=null!==c&&void 0!==c?c.concat([a]):null;return Uh(4,2,Zh.bind(null,
    b,a),c)},useLayoutEffect:function(a,b){return Uh(4,2,a,b)},useMemo:function(a,b){var c=Hh();b=void 0===b?null:b;a=a();c.memoizedState=[a,b];return a},useReducer:function(a,b,c){var d=Hh();b=void 0!==c?c(b):b;d.memoizedState=d.baseState=b;a=d.queue={pending:null,dispatch:null,lastRenderedReducer:a,lastRenderedState:b};a=a.dispatch=Oh.bind(null,R,a);return [d.memoizedState,a]},useRef:Sh,useState:Qh,useDebugValue:ai,useDeferredValue:function(a){var b=Qh(a),c=b[0],d=b[1];Wh(function(){var b=wh.transition;
    wh.transition=1;try{d(a);}finally{wh.transition=b;}},[a]);return c},useTransition:function(){var a=Qh(!1),b=a[0];a=di.bind(null,a[1]);Sh(a);return [a,b]},useMutableSource:function(a,b,c){var d=Hh();d.memoizedState={refs:{getSnapshot:b,setSnapshot:null},source:a,subscribe:c};return Nh(d,a,b,c)},useOpaqueIdentifier:function(){if(lh){var a=!1,b=uf(function(){a||(a=!0,c("r:"+(tf++).toString(36)));throw Error(y(355));}),c=Qh(b)[1];0===(R.mode&2)&&(R.flags|=516,Rh(5,function(){c("r:"+(tf++).toString(36));},
    void 0,null));return b}b="r:"+(tf++).toString(36);Qh(b);return b},unstable_isNewReconciler:!1},Eh={readContext:vg,useCallback:bi,useContext:vg,useEffect:Xh,useImperativeHandle:$h,useLayoutEffect:Yh,useMemo:ci,useReducer:Kh,useRef:Th,useState:function(){return Kh(Jh)},useDebugValue:ai,useDeferredValue:function(a){var b=Kh(Jh),c=b[0],d=b[1];Xh(function(){var b=wh.transition;wh.transition=1;try{d(a);}finally{wh.transition=b;}},[a]);return c},useTransition:function(){var a=Kh(Jh)[0];return [Th().current,
    a]},useMutableSource:Ph,useOpaqueIdentifier:function(){return Kh(Jh)[0]},unstable_isNewReconciler:!1},Fh={readContext:vg,useCallback:bi,useContext:vg,useEffect:Xh,useImperativeHandle:$h,useLayoutEffect:Yh,useMemo:ci,useReducer:Lh,useRef:Th,useState:function(){return Lh(Jh)},useDebugValue:ai,useDeferredValue:function(a){var b=Lh(Jh),c=b[0],d=b[1];Xh(function(){var b=wh.transition;wh.transition=1;try{d(a);}finally{wh.transition=b;}},[a]);return c},useTransition:function(){var a=Lh(Jh)[0];return [Th().current,
    a]},useMutableSource:Ph,useOpaqueIdentifier:function(){return Lh(Jh)[0]},unstable_isNewReconciler:!1},ei=ra.ReactCurrentOwner,ug=!1;function fi(a,b,c,d){b.child=null===a?Zg(b,null,c,d):Yg(b,a.child,c,d);}function gi(a,b,c,d,e){c=c.render;var f=b.ref;tg(b,e);d=Ch(a,b,c,d,f,e);if(null!==a&&!ug)return b.updateQueue=a.updateQueue,b.flags&=-517,a.lanes&=~e,hi(a,b,e);b.flags|=1;fi(a,b,d,e);return b.child}
    function ii(a,b,c,d,e,f){if(null===a){var g=c.type;if("function"===typeof g&&!ji(g)&&void 0===g.defaultProps&&null===c.compare&&void 0===c.defaultProps)return b.tag=15,b.type=g,ki(a,b,g,d,e,f);a=Vg(c.type,null,d,b,b.mode,f);a.ref=b.ref;a.return=b;return b.child=a}g=a.child;if(0===(e&f)&&(e=g.memoizedProps,c=c.compare,c=null!==c?c:Je,c(e,d)&&a.ref===b.ref))return hi(a,b,f);b.flags|=1;a=Tg(g,d);a.ref=b.ref;a.return=b;return b.child=a}
    function ki(a,b,c,d,e,f){if(null!==a&&Je(a.memoizedProps,d)&&a.ref===b.ref)if(ug=!1,0!==(f&e))0!==(a.flags&16384)&&(ug=!0);else return b.lanes=a.lanes,hi(a,b,f);return li(a,b,c,d,f)}
    function mi(a,b,c){var d=b.pendingProps,e=d.children,f=null!==a?a.memoizedState:null;if("hidden"===d.mode||"unstable-defer-without-hiding"===d.mode)if(0===(b.mode&4))b.memoizedState={baseLanes:0},ni(b,c);else if(0!==(c&1073741824))b.memoizedState={baseLanes:0},ni(b,null!==f?f.baseLanes:c);else return a=null!==f?f.baseLanes|c:c,b.lanes=b.childLanes=1073741824,b.memoizedState={baseLanes:a},ni(b,a),null;else null!==f?(d=f.baseLanes|c,b.memoizedState=null):d=c,ni(b,d);fi(a,b,e,c);return b.child}
    function oi(a,b){var c=b.ref;if(null===a&&null!==c||null!==a&&a.ref!==c)b.flags|=128;}function li(a,b,c,d,e){var f=Ff(c)?Df:M.current;f=Ef(b,f);tg(b,e);c=Ch(a,b,c,d,f,e);if(null!==a&&!ug)return b.updateQueue=a.updateQueue,b.flags&=-517,a.lanes&=~e,hi(a,b,e);b.flags|=1;fi(a,b,c,e);return b.child}
    function pi(a,b,c,d,e){if(Ff(c)){var f=!0;Jf(b);}else f=!1;tg(b,e);if(null===b.stateNode)null!==a&&(a.alternate=null,b.alternate=null,b.flags|=2),Mg(b,c,d),Og(b,c,d,e),d=!0;else if(null===a){var g=b.stateNode,h=b.memoizedProps;g.props=h;var k=g.context,l=c.contextType;"object"===typeof l&&null!==l?l=vg(l):(l=Ff(c)?Df:M.current,l=Ef(b,l));var n=c.getDerivedStateFromProps,A="function"===typeof n||"function"===typeof g.getSnapshotBeforeUpdate;A||"function"!==typeof g.UNSAFE_componentWillReceiveProps&&
    "function"!==typeof g.componentWillReceiveProps||(h!==d||k!==l)&&Ng(b,g,d,l);wg=!1;var p=b.memoizedState;g.state=p;Cg(b,d,g,e);k=b.memoizedState;h!==d||p!==k||N.current||wg?("function"===typeof n&&(Gg(b,c,n,d),k=b.memoizedState),(h=wg||Lg(b,c,h,d,p,k,l))?(A||"function"!==typeof g.UNSAFE_componentWillMount&&"function"!==typeof g.componentWillMount||("function"===typeof g.componentWillMount&&g.componentWillMount(),"function"===typeof g.UNSAFE_componentWillMount&&g.UNSAFE_componentWillMount()),"function"===
    typeof g.componentDidMount&&(b.flags|=4)):("function"===typeof g.componentDidMount&&(b.flags|=4),b.memoizedProps=d,b.memoizedState=k),g.props=d,g.state=k,g.context=l,d=h):("function"===typeof g.componentDidMount&&(b.flags|=4),d=!1);}else {g=b.stateNode;yg(a,b);h=b.memoizedProps;l=b.type===b.elementType?h:lg(b.type,h);g.props=l;A=b.pendingProps;p=g.context;k=c.contextType;"object"===typeof k&&null!==k?k=vg(k):(k=Ff(c)?Df:M.current,k=Ef(b,k));var C=c.getDerivedStateFromProps;(n="function"===typeof C||
    "function"===typeof g.getSnapshotBeforeUpdate)||"function"!==typeof g.UNSAFE_componentWillReceiveProps&&"function"!==typeof g.componentWillReceiveProps||(h!==A||p!==k)&&Ng(b,g,d,k);wg=!1;p=b.memoizedState;g.state=p;Cg(b,d,g,e);var x=b.memoizedState;h!==A||p!==x||N.current||wg?("function"===typeof C&&(Gg(b,c,C,d),x=b.memoizedState),(l=wg||Lg(b,c,l,d,p,x,k))?(n||"function"!==typeof g.UNSAFE_componentWillUpdate&&"function"!==typeof g.componentWillUpdate||("function"===typeof g.componentWillUpdate&&g.componentWillUpdate(d,
    x,k),"function"===typeof g.UNSAFE_componentWillUpdate&&g.UNSAFE_componentWillUpdate(d,x,k)),"function"===typeof g.componentDidUpdate&&(b.flags|=4),"function"===typeof g.getSnapshotBeforeUpdate&&(b.flags|=256)):("function"!==typeof g.componentDidUpdate||h===a.memoizedProps&&p===a.memoizedState||(b.flags|=4),"function"!==typeof g.getSnapshotBeforeUpdate||h===a.memoizedProps&&p===a.memoizedState||(b.flags|=256),b.memoizedProps=d,b.memoizedState=x),g.props=d,g.state=x,g.context=k,d=l):("function"!==typeof g.componentDidUpdate||
    h===a.memoizedProps&&p===a.memoizedState||(b.flags|=4),"function"!==typeof g.getSnapshotBeforeUpdate||h===a.memoizedProps&&p===a.memoizedState||(b.flags|=256),d=!1);}return qi(a,b,c,d,f,e)}
    function qi(a,b,c,d,e,f){oi(a,b);var g=0!==(b.flags&64);if(!d&&!g)return e&&Kf(b,c,!1),hi(a,b,f);d=b.stateNode;ei.current=b;var h=g&&"function"!==typeof c.getDerivedStateFromError?null:d.render();b.flags|=1;null!==a&&g?(b.child=Yg(b,a.child,null,f),b.child=Yg(b,null,h,f)):fi(a,b,h,f);b.memoizedState=d.state;e&&Kf(b,c,!0);return b.child}function ri(a){var b=a.stateNode;b.pendingContext?Hf(a,b.pendingContext,b.pendingContext!==b.context):b.context&&Hf(a,b.context,!1);eh(a,b.containerInfo);}
    var si={dehydrated:null,retryLane:0};
    function ti(a,b,c){var d=b.pendingProps,e=P.current,f=!1,g;(g=0!==(b.flags&64))||(g=null!==a&&null===a.memoizedState?!1:0!==(e&2));g?(f=!0,b.flags&=-65):null!==a&&null===a.memoizedState||void 0===d.fallback||!0===d.unstable_avoidThisFallback||(e|=1);I(P,e&1);if(null===a){void 0!==d.fallback&&ph(b);a=d.children;e=d.fallback;if(f)return a=ui(b,a,e,c),b.child.memoizedState={baseLanes:c},b.memoizedState=si,a;if("number"===typeof d.unstable_expectedLoadTime)return a=ui(b,a,e,c),b.child.memoizedState={baseLanes:c},
    b.memoizedState=si,b.lanes=33554432,a;c=vi({mode:"visible",children:a},b.mode,c,null);c.return=b;return b.child=c}if(null!==a.memoizedState){if(f)return d=wi(a,b,d.children,d.fallback,c),f=b.child,e=a.child.memoizedState,f.memoizedState=null===e?{baseLanes:c}:{baseLanes:e.baseLanes|c},f.childLanes=a.childLanes&~c,b.memoizedState=si,d;c=xi(a,b,d.children,c);b.memoizedState=null;return c}if(f)return d=wi(a,b,d.children,d.fallback,c),f=b.child,e=a.child.memoizedState,f.memoizedState=null===e?{baseLanes:c}:
    {baseLanes:e.baseLanes|c},f.childLanes=a.childLanes&~c,b.memoizedState=si,d;c=xi(a,b,d.children,c);b.memoizedState=null;return c}function ui(a,b,c,d){var e=a.mode,f=a.child;b={mode:"hidden",children:b};0===(e&2)&&null!==f?(f.childLanes=0,f.pendingProps=b):f=vi(b,e,0,null);c=Xg(c,e,d,null);f.return=a;c.return=a;f.sibling=c;a.child=f;return c}
    function xi(a,b,c,d){var e=a.child;a=e.sibling;c=Tg(e,{mode:"visible",children:c});0===(b.mode&2)&&(c.lanes=d);c.return=b;c.sibling=null;null!==a&&(a.nextEffect=null,a.flags=8,b.firstEffect=b.lastEffect=a);return b.child=c}
    function wi(a,b,c,d,e){var f=b.mode,g=a.child;a=g.sibling;var h={mode:"hidden",children:c};0===(f&2)&&b.child!==g?(c=b.child,c.childLanes=0,c.pendingProps=h,g=c.lastEffect,null!==g?(b.firstEffect=c.firstEffect,b.lastEffect=g,g.nextEffect=null):b.firstEffect=b.lastEffect=null):c=Tg(g,h);null!==a?d=Tg(a,d):(d=Xg(d,f,e,null),d.flags|=2);d.return=b;c.return=b;c.sibling=d;b.child=c;return d}function yi(a,b){a.lanes|=b;var c=a.alternate;null!==c&&(c.lanes|=b);sg(a.return,b);}
    function zi(a,b,c,d,e,f){var g=a.memoizedState;null===g?a.memoizedState={isBackwards:b,rendering:null,renderingStartTime:0,last:d,tail:c,tailMode:e,lastEffect:f}:(g.isBackwards=b,g.rendering=null,g.renderingStartTime=0,g.last=d,g.tail=c,g.tailMode=e,g.lastEffect=f);}
    function Ai(a,b,c){var d=b.pendingProps,e=d.revealOrder,f=d.tail;fi(a,b,d.children,c);d=P.current;if(0!==(d&2))d=d&1|2,b.flags|=64;else {if(null!==a&&0!==(a.flags&64))a:for(a=b.child;null!==a;){if(13===a.tag)null!==a.memoizedState&&yi(a,c);else if(19===a.tag)yi(a,c);else if(null!==a.child){a.child.return=a;a=a.child;continue}if(a===b)break a;for(;null===a.sibling;){if(null===a.return||a.return===b)break a;a=a.return;}a.sibling.return=a.return;a=a.sibling;}d&=1;}I(P,d);if(0===(b.mode&2))b.memoizedState=
    null;else switch(e){case "forwards":c=b.child;for(e=null;null!==c;)a=c.alternate,null!==a&&null===ih(a)&&(e=c),c=c.sibling;c=e;null===c?(e=b.child,b.child=null):(e=c.sibling,c.sibling=null);zi(b,!1,e,c,f,b.lastEffect);break;case "backwards":c=null;e=b.child;for(b.child=null;null!==e;){a=e.alternate;if(null!==a&&null===ih(a)){b.child=e;break}a=e.sibling;e.sibling=c;c=e;e=a;}zi(b,!0,c,null,f,b.lastEffect);break;case "together":zi(b,!1,null,null,void 0,b.lastEffect);break;default:b.memoizedState=null;}return b.child}
    function hi(a,b,c){null!==a&&(b.dependencies=a.dependencies);Dg|=b.lanes;if(0!==(c&b.childLanes)){if(null!==a&&b.child!==a.child)throw Error(y(153));if(null!==b.child){a=b.child;c=Tg(a,a.pendingProps);b.child=c;for(c.return=b;null!==a.sibling;)a=a.sibling,c=c.sibling=Tg(a,a.pendingProps),c.return=b;c.sibling=null;}return b.child}return null}var Bi,Ci,Di,Ei;
    Bi=function(a,b){for(var c=b.child;null!==c;){if(5===c.tag||6===c.tag)a.appendChild(c.stateNode);else if(4!==c.tag&&null!==c.child){c.child.return=c;c=c.child;continue}if(c===b)break;for(;null===c.sibling;){if(null===c.return||c.return===b)return;c=c.return;}c.sibling.return=c.return;c=c.sibling;}};Ci=function(){};
    Di=function(a,b,c,d){var e=a.memoizedProps;if(e!==d){a=b.stateNode;dh(ah.current);var f=null;switch(c){case "input":e=Ya(a,e);d=Ya(a,d);f=[];break;case "option":e=eb(a,e);d=eb(a,d);f=[];break;case "select":e=objectAssign({},e,{value:void 0});d=objectAssign({},d,{value:void 0});f=[];break;case "textarea":e=gb(a,e);d=gb(a,d);f=[];break;default:"function"!==typeof e.onClick&&"function"===typeof d.onClick&&(a.onclick=jf);}vb(c,d);var g;c=null;for(l in e)if(!d.hasOwnProperty(l)&&e.hasOwnProperty(l)&&null!=e[l])if("style"===
    l){var h=e[l];for(g in h)h.hasOwnProperty(g)&&(c||(c={}),c[g]="");}else "dangerouslySetInnerHTML"!==l&&"children"!==l&&"suppressContentEditableWarning"!==l&&"suppressHydrationWarning"!==l&&"autoFocus"!==l&&(ca.hasOwnProperty(l)?f||(f=[]):(f=f||[]).push(l,null));for(l in d){var k=d[l];h=null!=e?e[l]:void 0;if(d.hasOwnProperty(l)&&k!==h&&(null!=k||null!=h))if("style"===l)if(h){for(g in h)!h.hasOwnProperty(g)||k&&k.hasOwnProperty(g)||(c||(c={}),c[g]="");for(g in k)k.hasOwnProperty(g)&&h[g]!==k[g]&&(c||
    (c={}),c[g]=k[g]);}else c||(f||(f=[]),f.push(l,c)),c=k;else "dangerouslySetInnerHTML"===l?(k=k?k.__html:void 0,h=h?h.__html:void 0,null!=k&&h!==k&&(f=f||[]).push(l,k)):"children"===l?"string"!==typeof k&&"number"!==typeof k||(f=f||[]).push(l,""+k):"suppressContentEditableWarning"!==l&&"suppressHydrationWarning"!==l&&(ca.hasOwnProperty(l)?(null!=k&&"onScroll"===l&&G("scroll",a),f||h===k||(f=[])):"object"===typeof k&&null!==k&&k.$$typeof===Ga?k.toString():(f=f||[]).push(l,k));}c&&(f=f||[]).push("style",
    c);var l=f;if(b.updateQueue=l)b.flags|=4;}};Ei=function(a,b,c,d){c!==d&&(b.flags|=4);};function Fi(a,b){if(!lh)switch(a.tailMode){case "hidden":b=a.tail;for(var c=null;null!==b;)null!==b.alternate&&(c=b),b=b.sibling;null===c?a.tail=null:c.sibling=null;break;case "collapsed":c=a.tail;for(var d=null;null!==c;)null!==c.alternate&&(d=c),c=c.sibling;null===d?b||null===a.tail?a.tail=null:a.tail.sibling=null:d.sibling=null;}}
    function Gi(a,b,c){var d=b.pendingProps;switch(b.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return null;case 1:return Ff(b.type)&&Gf(),null;case 3:fh();H(N);H(M);uh();d=b.stateNode;d.pendingContext&&(d.context=d.pendingContext,d.pendingContext=null);if(null===a||null===a.child)rh(b)?b.flags|=4:d.hydrate||(b.flags|=256);Ci(b);return null;case 5:hh(b);var e=dh(ch.current);c=b.type;if(null!==a&&null!=b.stateNode)Di(a,b,c,d,e),a.ref!==b.ref&&(b.flags|=128);else {if(!d){if(null===
    b.stateNode)throw Error(y(166));return null}a=dh(ah.current);if(rh(b)){d=b.stateNode;c=b.type;var f=b.memoizedProps;d[wf]=b;d[xf]=f;switch(c){case "dialog":G("cancel",d);G("close",d);break;case "iframe":case "object":case "embed":G("load",d);break;case "video":case "audio":for(a=0;a<Xe.length;a++)G(Xe[a],d);break;case "source":G("error",d);break;case "img":case "image":case "link":G("error",d);G("load",d);break;case "details":G("toggle",d);break;case "input":Za(d,f);G("invalid",d);break;case "select":d._wrapperState=
    {wasMultiple:!!f.multiple};G("invalid",d);break;case "textarea":hb(d,f),G("invalid",d);}vb(c,f);a=null;for(var g in f)f.hasOwnProperty(g)&&(e=f[g],"children"===g?"string"===typeof e?d.textContent!==e&&(a=["children",e]):"number"===typeof e&&d.textContent!==""+e&&(a=["children",""+e]):ca.hasOwnProperty(g)&&null!=e&&"onScroll"===g&&G("scroll",d));switch(c){case "input":Va(d);cb(d,f,!0);break;case "textarea":Va(d);jb(d);break;case "select":case "option":break;default:"function"===typeof f.onClick&&(d.onclick=
    jf);}d=a;b.updateQueue=d;null!==d&&(b.flags|=4);}else {g=9===e.nodeType?e:e.ownerDocument;a===kb.html&&(a=lb(c));a===kb.html?"script"===c?(a=g.createElement("div"),a.innerHTML="<script>\x3c/script>",a=a.removeChild(a.firstChild)):"string"===typeof d.is?a=g.createElement(c,{is:d.is}):(a=g.createElement(c),"select"===c&&(g=a,d.multiple?g.multiple=!0:d.size&&(g.size=d.size))):a=g.createElementNS(a,c);a[wf]=b;a[xf]=d;Bi(a,b,!1,!1);b.stateNode=a;g=wb(c,d);switch(c){case "dialog":G("cancel",a);G("close",a);
    e=d;break;case "iframe":case "object":case "embed":G("load",a);e=d;break;case "video":case "audio":for(e=0;e<Xe.length;e++)G(Xe[e],a);e=d;break;case "source":G("error",a);e=d;break;case "img":case "image":case "link":G("error",a);G("load",a);e=d;break;case "details":G("toggle",a);e=d;break;case "input":Za(a,d);e=Ya(a,d);G("invalid",a);break;case "option":e=eb(a,d);break;case "select":a._wrapperState={wasMultiple:!!d.multiple};e=objectAssign({},d,{value:void 0});G("invalid",a);break;case "textarea":hb(a,d);e=
    gb(a,d);G("invalid",a);break;default:e=d;}vb(c,e);var h=e;for(f in h)if(h.hasOwnProperty(f)){var k=h[f];"style"===f?tb(a,k):"dangerouslySetInnerHTML"===f?(k=k?k.__html:void 0,null!=k&&ob(a,k)):"children"===f?"string"===typeof k?("textarea"!==c||""!==k)&&pb(a,k):"number"===typeof k&&pb(a,""+k):"suppressContentEditableWarning"!==f&&"suppressHydrationWarning"!==f&&"autoFocus"!==f&&(ca.hasOwnProperty(f)?null!=k&&"onScroll"===f&&G("scroll",a):null!=k&&qa(a,f,k,g));}switch(c){case "input":Va(a);cb(a,d,!1);
    break;case "textarea":Va(a);jb(a);break;case "option":null!=d.value&&a.setAttribute("value",""+Sa(d.value));break;case "select":a.multiple=!!d.multiple;f=d.value;null!=f?fb(a,!!d.multiple,f,!1):null!=d.defaultValue&&fb(a,!!d.multiple,d.defaultValue,!0);break;default:"function"===typeof e.onClick&&(a.onclick=jf);}mf(c,d)&&(b.flags|=4);}null!==b.ref&&(b.flags|=128);}return null;case 6:if(a&&null!=b.stateNode)Ei(a,b,a.memoizedProps,d);else {if("string"!==typeof d&&null===b.stateNode)throw Error(y(166));
    c=dh(ch.current);dh(ah.current);rh(b)?(d=b.stateNode,c=b.memoizedProps,d[wf]=b,d.nodeValue!==c&&(b.flags|=4)):(d=(9===c.nodeType?c:c.ownerDocument).createTextNode(d),d[wf]=b,b.stateNode=d);}return null;case 13:H(P);d=b.memoizedState;if(0!==(b.flags&64))return b.lanes=c,b;d=null!==d;c=!1;null===a?void 0!==b.memoizedProps.fallback&&rh(b):c=null!==a.memoizedState;if(d&&!c&&0!==(b.mode&2))if(null===a&&!0!==b.memoizedProps.unstable_avoidThisFallback||0!==(P.current&1))0===V&&(V=3);else {if(0===V||3===V)V=
    4;null===U||0===(Dg&134217727)&&0===(Hi&134217727)||Ii(U,W);}if(d||c)b.flags|=4;return null;case 4:return fh(),Ci(b),null===a&&cf(b.stateNode.containerInfo),null;case 10:return rg(b),null;case 17:return Ff(b.type)&&Gf(),null;case 19:H(P);d=b.memoizedState;if(null===d)return null;f=0!==(b.flags&64);g=d.rendering;if(null===g)if(f)Fi(d,!1);else {if(0!==V||null!==a&&0!==(a.flags&64))for(a=b.child;null!==a;){g=ih(a);if(null!==g){b.flags|=64;Fi(d,!1);f=g.updateQueue;null!==f&&(b.updateQueue=f,b.flags|=4);
    null===d.lastEffect&&(b.firstEffect=null);b.lastEffect=d.lastEffect;d=c;for(c=b.child;null!==c;)f=c,a=d,f.flags&=2,f.nextEffect=null,f.firstEffect=null,f.lastEffect=null,g=f.alternate,null===g?(f.childLanes=0,f.lanes=a,f.child=null,f.memoizedProps=null,f.memoizedState=null,f.updateQueue=null,f.dependencies=null,f.stateNode=null):(f.childLanes=g.childLanes,f.lanes=g.lanes,f.child=g.child,f.memoizedProps=g.memoizedProps,f.memoizedState=g.memoizedState,f.updateQueue=g.updateQueue,f.type=g.type,a=g.dependencies,
    f.dependencies=null===a?null:{lanes:a.lanes,firstContext:a.firstContext}),c=c.sibling;I(P,P.current&1|2);return b.child}a=a.sibling;}null!==d.tail&&O()>Ji&&(b.flags|=64,f=!0,Fi(d,!1),b.lanes=33554432);}else {if(!f)if(a=ih(g),null!==a){if(b.flags|=64,f=!0,c=a.updateQueue,null!==c&&(b.updateQueue=c,b.flags|=4),Fi(d,!0),null===d.tail&&"hidden"===d.tailMode&&!g.alternate&&!lh)return b=b.lastEffect=d.lastEffect,null!==b&&(b.nextEffect=null),null}else 2*O()-d.renderingStartTime>Ji&&1073741824!==c&&(b.flags|=
    64,f=!0,Fi(d,!1),b.lanes=33554432);d.isBackwards?(g.sibling=b.child,b.child=g):(c=d.last,null!==c?c.sibling=g:b.child=g,d.last=g);}return null!==d.tail?(c=d.tail,d.rendering=c,d.tail=c.sibling,d.lastEffect=b.lastEffect,d.renderingStartTime=O(),c.sibling=null,b=P.current,I(P,f?b&1|2:b&1),c):null;case 23:case 24:return Ki(),null!==a&&null!==a.memoizedState!==(null!==b.memoizedState)&&"unstable-defer-without-hiding"!==d.mode&&(b.flags|=4),null}throw Error(y(156,b.tag));}
    function Li(a){switch(a.tag){case 1:Ff(a.type)&&Gf();var b=a.flags;return b&4096?(a.flags=b&-4097|64,a):null;case 3:fh();H(N);H(M);uh();b=a.flags;if(0!==(b&64))throw Error(y(285));a.flags=b&-4097|64;return a;case 5:return hh(a),null;case 13:return H(P),b=a.flags,b&4096?(a.flags=b&-4097|64,a):null;case 19:return H(P),null;case 4:return fh(),null;case 10:return rg(a),null;case 23:case 24:return Ki(),null;default:return null}}
    function Mi(a,b){try{var c="",d=b;do c+=Qa(d),d=d.return;while(d);var e=c;}catch(f){e="\nError generating stack: "+f.message+"\n"+f.stack;}return {value:a,source:b,stack:e}}function Ni(a,b){try{console.error(b.value);}catch(c){setTimeout(function(){throw c;});}}var Oi="function"===typeof WeakMap?WeakMap:Map;function Pi(a,b,c){c=zg(-1,c);c.tag=3;c.payload={element:null};var d=b.value;c.callback=function(){Qi||(Qi=!0,Ri=d);Ni(a,b);};return c}
    function Si(a,b,c){c=zg(-1,c);c.tag=3;var d=a.type.getDerivedStateFromError;if("function"===typeof d){var e=b.value;c.payload=function(){Ni(a,b);return d(e)};}var f=a.stateNode;null!==f&&"function"===typeof f.componentDidCatch&&(c.callback=function(){"function"!==typeof d&&(null===Ti?Ti=new Set([this]):Ti.add(this),Ni(a,b));var c=b.stack;this.componentDidCatch(b.value,{componentStack:null!==c?c:""});});return c}var Ui="function"===typeof WeakSet?WeakSet:Set;
    function Vi(a){var b=a.ref;if(null!==b)if("function"===typeof b)try{b(null);}catch(c){Wi(a,c);}else b.current=null;}function Xi(a,b){switch(b.tag){case 0:case 11:case 15:case 22:return;case 1:if(b.flags&256&&null!==a){var c=a.memoizedProps,d=a.memoizedState;a=b.stateNode;b=a.getSnapshotBeforeUpdate(b.elementType===b.type?c:lg(b.type,c),d);a.__reactInternalSnapshotBeforeUpdate=b;}return;case 3:b.flags&256&&qf(b.stateNode.containerInfo);return;case 5:case 6:case 4:case 17:return}throw Error(y(163));}
    function Yi(a,b,c){switch(c.tag){case 0:case 11:case 15:case 22:b=c.updateQueue;b=null!==b?b.lastEffect:null;if(null!==b){a=b=b.next;do{if(3===(a.tag&3)){var d=a.create;a.destroy=d();}a=a.next;}while(a!==b)}b=c.updateQueue;b=null!==b?b.lastEffect:null;if(null!==b){a=b=b.next;do{var e=a;d=e.next;e=e.tag;0!==(e&4)&&0!==(e&1)&&(Zi(c,a),$i(c,a));a=d;}while(a!==b)}return;case 1:a=c.stateNode;c.flags&4&&(null===b?a.componentDidMount():(d=c.elementType===c.type?b.memoizedProps:lg(c.type,b.memoizedProps),a.componentDidUpdate(d,
    b.memoizedState,a.__reactInternalSnapshotBeforeUpdate)));b=c.updateQueue;null!==b&&Eg(c,b,a);return;case 3:b=c.updateQueue;if(null!==b){a=null;if(null!==c.child)switch(c.child.tag){case 5:a=c.child.stateNode;break;case 1:a=c.child.stateNode;}Eg(c,b,a);}return;case 5:a=c.stateNode;null===b&&c.flags&4&&mf(c.type,c.memoizedProps)&&a.focus();return;case 6:return;case 4:return;case 12:return;case 13:null===c.memoizedState&&(c=c.alternate,null!==c&&(c=c.memoizedState,null!==c&&(c=c.dehydrated,null!==c&&Cc(c))));
    return;case 19:case 17:case 20:case 21:case 23:case 24:return}throw Error(y(163));}
    function aj(a,b){for(var c=a;;){if(5===c.tag){var d=c.stateNode;if(b)d=d.style,"function"===typeof d.setProperty?d.setProperty("display","none","important"):d.display="none";else {d=c.stateNode;var e=c.memoizedProps.style;e=void 0!==e&&null!==e&&e.hasOwnProperty("display")?e.display:null;d.style.display=sb("display",e);}}else if(6===c.tag)c.stateNode.nodeValue=b?"":c.memoizedProps;else if((23!==c.tag&&24!==c.tag||null===c.memoizedState||c===a)&&null!==c.child){c.child.return=c;c=c.child;continue}if(c===
    a)break;for(;null===c.sibling;){if(null===c.return||c.return===a)return;c=c.return;}c.sibling.return=c.return;c=c.sibling;}}
    function bj(a,b){if(Mf&&"function"===typeof Mf.onCommitFiberUnmount)try{Mf.onCommitFiberUnmount(Lf,b);}catch(f){}switch(b.tag){case 0:case 11:case 14:case 15:case 22:a=b.updateQueue;if(null!==a&&(a=a.lastEffect,null!==a)){var c=a=a.next;do{var d=c,e=d.destroy;d=d.tag;if(void 0!==e)if(0!==(d&4))Zi(b,c);else {d=b;try{e();}catch(f){Wi(d,f);}}c=c.next;}while(c!==a)}break;case 1:Vi(b);a=b.stateNode;if("function"===typeof a.componentWillUnmount)try{a.props=b.memoizedProps,a.state=b.memoizedState,a.componentWillUnmount();}catch(f){Wi(b,
    f);}break;case 5:Vi(b);break;case 4:cj(a,b);}}function dj(a){a.alternate=null;a.child=null;a.dependencies=null;a.firstEffect=null;a.lastEffect=null;a.memoizedProps=null;a.memoizedState=null;a.pendingProps=null;a.return=null;a.updateQueue=null;}function ej(a){return 5===a.tag||3===a.tag||4===a.tag}
    function fj(a){a:{for(var b=a.return;null!==b;){if(ej(b))break a;b=b.return;}throw Error(y(160));}var c=b;b=c.stateNode;switch(c.tag){case 5:var d=!1;break;case 3:b=b.containerInfo;d=!0;break;case 4:b=b.containerInfo;d=!0;break;default:throw Error(y(161));}c.flags&16&&(pb(b,""),c.flags&=-17);a:b:for(c=a;;){for(;null===c.sibling;){if(null===c.return||ej(c.return)){c=null;break a}c=c.return;}c.sibling.return=c.return;for(c=c.sibling;5!==c.tag&&6!==c.tag&&18!==c.tag;){if(c.flags&2)continue b;if(null===
    c.child||4===c.tag)continue b;else c.child.return=c,c=c.child;}if(!(c.flags&2)){c=c.stateNode;break a}}d?gj(a,c,b):hj(a,c,b);}
    function gj(a,b,c){var d=a.tag,e=5===d||6===d;if(e)a=e?a.stateNode:a.stateNode.instance,b?8===c.nodeType?c.parentNode.insertBefore(a,b):c.insertBefore(a,b):(8===c.nodeType?(b=c.parentNode,b.insertBefore(a,c)):(b=c,b.appendChild(a)),c=c._reactRootContainer,null!==c&&void 0!==c||null!==b.onclick||(b.onclick=jf));else if(4!==d&&(a=a.child,null!==a))for(gj(a,b,c),a=a.sibling;null!==a;)gj(a,b,c),a=a.sibling;}
    function hj(a,b,c){var d=a.tag,e=5===d||6===d;if(e)a=e?a.stateNode:a.stateNode.instance,b?c.insertBefore(a,b):c.appendChild(a);else if(4!==d&&(a=a.child,null!==a))for(hj(a,b,c),a=a.sibling;null!==a;)hj(a,b,c),a=a.sibling;}
    function cj(a,b){for(var c=b,d=!1,e,f;;){if(!d){d=c.return;a:for(;;){if(null===d)throw Error(y(160));e=d.stateNode;switch(d.tag){case 5:f=!1;break a;case 3:e=e.containerInfo;f=!0;break a;case 4:e=e.containerInfo;f=!0;break a}d=d.return;}d=!0;}if(5===c.tag||6===c.tag){a:for(var g=a,h=c,k=h;;)if(bj(g,k),null!==k.child&&4!==k.tag)k.child.return=k,k=k.child;else {if(k===h)break a;for(;null===k.sibling;){if(null===k.return||k.return===h)break a;k=k.return;}k.sibling.return=k.return;k=k.sibling;}f?(g=e,h=c.stateNode,
    8===g.nodeType?g.parentNode.removeChild(h):g.removeChild(h)):e.removeChild(c.stateNode);}else if(4===c.tag){if(null!==c.child){e=c.stateNode.containerInfo;f=!0;c.child.return=c;c=c.child;continue}}else if(bj(a,c),null!==c.child){c.child.return=c;c=c.child;continue}if(c===b)break;for(;null===c.sibling;){if(null===c.return||c.return===b)return;c=c.return;4===c.tag&&(d=!1);}c.sibling.return=c.return;c=c.sibling;}}
    function ij(a,b){switch(b.tag){case 0:case 11:case 14:case 15:case 22:var c=b.updateQueue;c=null!==c?c.lastEffect:null;if(null!==c){var d=c=c.next;do 3===(d.tag&3)&&(a=d.destroy,d.destroy=void 0,void 0!==a&&a()),d=d.next;while(d!==c)}return;case 1:return;case 5:c=b.stateNode;if(null!=c){d=b.memoizedProps;var e=null!==a?a.memoizedProps:d;a=b.type;var f=b.updateQueue;b.updateQueue=null;if(null!==f){c[xf]=d;"input"===a&&"radio"===d.type&&null!=d.name&&$a(c,d);wb(a,e);b=wb(a,d);for(e=0;e<f.length;e+=
    2){var g=f[e],h=f[e+1];"style"===g?tb(c,h):"dangerouslySetInnerHTML"===g?ob(c,h):"children"===g?pb(c,h):qa(c,g,h,b);}switch(a){case "input":ab(c,d);break;case "textarea":ib(c,d);break;case "select":a=c._wrapperState.wasMultiple,c._wrapperState.wasMultiple=!!d.multiple,f=d.value,null!=f?fb(c,!!d.multiple,f,!1):a!==!!d.multiple&&(null!=d.defaultValue?fb(c,!!d.multiple,d.defaultValue,!0):fb(c,!!d.multiple,d.multiple?[]:"",!1));}}}return;case 6:if(null===b.stateNode)throw Error(y(162));b.stateNode.nodeValue=
    b.memoizedProps;return;case 3:c=b.stateNode;c.hydrate&&(c.hydrate=!1,Cc(c.containerInfo));return;case 12:return;case 13:null!==b.memoizedState&&(jj=O(),aj(b.child,!0));kj(b);return;case 19:kj(b);return;case 17:return;case 23:case 24:aj(b,null!==b.memoizedState);return}throw Error(y(163));}function kj(a){var b=a.updateQueue;if(null!==b){a.updateQueue=null;var c=a.stateNode;null===c&&(c=a.stateNode=new Ui);b.forEach(function(b){var d=lj.bind(null,a,b);c.has(b)||(c.add(b),b.then(d,d));});}}
    function mj(a,b){return null!==a&&(a=a.memoizedState,null===a||null!==a.dehydrated)?(b=b.memoizedState,null!==b&&null===b.dehydrated):!1}var nj=Math.ceil,oj=ra.ReactCurrentDispatcher,pj=ra.ReactCurrentOwner,X=0,U=null,Y=null,W=0,qj=0,rj=Bf(0),V=0,sj=null,tj=0,Dg=0,Hi=0,uj=0,vj=null,jj=0,Ji=Infinity;function wj(){Ji=O()+500;}var Z=null,Qi=!1,Ri=null,Ti=null,xj=!1,yj=null,zj=90,Aj=[],Bj=[],Cj=null,Dj=0,Ej=null,Fj=-1,Gj=0,Hj=0,Ij=null,Jj=!1;function Hg(){return 0!==(X&48)?O():-1!==Fj?Fj:Fj=O()}
    function Ig(a){a=a.mode;if(0===(a&2))return 1;if(0===(a&4))return 99===eg()?1:2;0===Gj&&(Gj=tj);if(0!==kg.transition){0!==Hj&&(Hj=null!==vj?vj.pendingLanes:0);a=Gj;var b=4186112&~Hj;b&=-b;0===b&&(a=4186112&~a,b=a&-a,0===b&&(b=8192));return b}a=eg();0!==(X&4)&&98===a?a=Xc(12,Gj):(a=Sc(a),a=Xc(a,Gj));return a}
    function Jg(a,b,c){if(50<Dj)throw Dj=0,Ej=null,Error(y(185));a=Kj(a,b);if(null===a)return null;$c(a,b,c);a===U&&(Hi|=b,4===V&&Ii(a,W));var d=eg();1===b?0!==(X&8)&&0===(X&48)?Lj(a):(Mj(a,c),0===X&&(wj(),ig())):(0===(X&4)||98!==d&&99!==d||(null===Cj?Cj=new Set([a]):Cj.add(a)),Mj(a,c));vj=a;}function Kj(a,b){a.lanes|=b;var c=a.alternate;null!==c&&(c.lanes|=b);c=a;for(a=a.return;null!==a;)a.childLanes|=b,c=a.alternate,null!==c&&(c.childLanes|=b),c=a,a=a.return;return 3===c.tag?c.stateNode:null}
    function Mj(a,b){for(var c=a.callbackNode,d=a.suspendedLanes,e=a.pingedLanes,f=a.expirationTimes,g=a.pendingLanes;0<g;){var h=31-Vc(g),k=1<<h,l=f[h];if(-1===l){if(0===(k&d)||0!==(k&e)){l=b;Rc(k);var n=F;f[h]=10<=n?l+250:6<=n?l+5E3:-1;}}else l<=b&&(a.expiredLanes|=k);g&=~k;}d=Uc(a,a===U?W:0);b=F;if(0===d)null!==c&&(c!==Zf&&Pf(c),a.callbackNode=null,a.callbackPriority=0);else {if(null!==c){if(a.callbackPriority===b)return;c!==Zf&&Pf(c);}15===b?(c=Lj.bind(null,a),null===ag?(ag=[c],bg=Of(Uf,jg)):ag.push(c),
    c=Zf):14===b?c=hg(99,Lj.bind(null,a)):(c=Tc(b),c=hg(c,Nj.bind(null,a)));a.callbackPriority=b;a.callbackNode=c;}}
    function Nj(a){Fj=-1;Hj=Gj=0;if(0!==(X&48))throw Error(y(327));var b=a.callbackNode;if(Oj()&&a.callbackNode!==b)return null;var c=Uc(a,a===U?W:0);if(0===c)return null;var d=c;var e=X;X|=16;var f=Pj();if(U!==a||W!==d)wj(),Qj(a,d);do try{Rj();break}catch(h){Sj(a,h);}while(1);qg();oj.current=f;X=e;null!==Y?d=0:(U=null,W=0,d=V);if(0!==(tj&Hi))Qj(a,0);else if(0!==d){2===d&&(X|=64,a.hydrate&&(a.hydrate=!1,qf(a.containerInfo)),c=Wc(a),0!==c&&(d=Tj(a,c)));if(1===d)throw b=sj,Qj(a,0),Ii(a,c),Mj(a,O()),b;a.finishedWork=
    a.current.alternate;a.finishedLanes=c;switch(d){case 0:case 1:throw Error(y(345));case 2:Uj(a);break;case 3:Ii(a,c);if((c&62914560)===c&&(d=jj+500-O(),10<d)){if(0!==Uc(a,0))break;e=a.suspendedLanes;if((e&c)!==c){Hg();a.pingedLanes|=a.suspendedLanes&e;break}a.timeoutHandle=of(Uj.bind(null,a),d);break}Uj(a);break;case 4:Ii(a,c);if((c&4186112)===c)break;d=a.eventTimes;for(e=-1;0<c;){var g=31-Vc(c);f=1<<g;g=d[g];g>e&&(e=g);c&=~f;}c=e;c=O()-c;c=(120>c?120:480>c?480:1080>c?1080:1920>c?1920:3E3>c?3E3:4320>
    c?4320:1960*nj(c/1960))-c;if(10<c){a.timeoutHandle=of(Uj.bind(null,a),c);break}Uj(a);break;case 5:Uj(a);break;default:throw Error(y(329));}}Mj(a,O());return a.callbackNode===b?Nj.bind(null,a):null}function Ii(a,b){b&=~uj;b&=~Hi;a.suspendedLanes|=b;a.pingedLanes&=~b;for(a=a.expirationTimes;0<b;){var c=31-Vc(b),d=1<<c;a[c]=-1;b&=~d;}}
    function Lj(a){if(0!==(X&48))throw Error(y(327));Oj();if(a===U&&0!==(a.expiredLanes&W)){var b=W;var c=Tj(a,b);0!==(tj&Hi)&&(b=Uc(a,b),c=Tj(a,b));}else b=Uc(a,0),c=Tj(a,b);0!==a.tag&&2===c&&(X|=64,a.hydrate&&(a.hydrate=!1,qf(a.containerInfo)),b=Wc(a),0!==b&&(c=Tj(a,b)));if(1===c)throw c=sj,Qj(a,0),Ii(a,b),Mj(a,O()),c;a.finishedWork=a.current.alternate;a.finishedLanes=b;Uj(a);Mj(a,O());return null}
    function Vj(){if(null!==Cj){var a=Cj;Cj=null;a.forEach(function(a){a.expiredLanes|=24&a.pendingLanes;Mj(a,O());});}ig();}function Wj(a,b){var c=X;X|=1;try{return a(b)}finally{X=c,0===X&&(wj(),ig());}}function Xj(a,b){var c=X;X&=-2;X|=8;try{return a(b)}finally{X=c,0===X&&(wj(),ig());}}function ni(a,b){I(rj,qj);qj|=b;tj|=b;}function Ki(){qj=rj.current;H(rj);}
    function Qj(a,b){a.finishedWork=null;a.finishedLanes=0;var c=a.timeoutHandle;-1!==c&&(a.timeoutHandle=-1,pf(c));if(null!==Y)for(c=Y.return;null!==c;){var d=c;switch(d.tag){case 1:d=d.type.childContextTypes;null!==d&&void 0!==d&&Gf();break;case 3:fh();H(N);H(M);uh();break;case 5:hh(d);break;case 4:fh();break;case 13:H(P);break;case 19:H(P);break;case 10:rg(d);break;case 23:case 24:Ki();}c=c.return;}U=a;Y=Tg(a.current,null);W=qj=tj=b;V=0;sj=null;uj=Hi=Dg=0;}
    function Sj(a,b){do{var c=Y;try{qg();vh.current=Gh;if(yh){for(var d=R.memoizedState;null!==d;){var e=d.queue;null!==e&&(e.pending=null);d=d.next;}yh=!1;}xh=0;T=S=R=null;zh=!1;pj.current=null;if(null===c||null===c.return){V=1;sj=b;Y=null;break}a:{var f=a,g=c.return,h=c,k=b;b=W;h.flags|=2048;h.firstEffect=h.lastEffect=null;if(null!==k&&"object"===typeof k&&"function"===typeof k.then){var l=k;if(0===(h.mode&2)){var n=h.alternate;n?(h.updateQueue=n.updateQueue,h.memoizedState=n.memoizedState,h.lanes=n.lanes):
    (h.updateQueue=null,h.memoizedState=null);}var A=0!==(P.current&1),p=g;do{var C;if(C=13===p.tag){var x=p.memoizedState;if(null!==x)C=null!==x.dehydrated?!0:!1;else {var w=p.memoizedProps;C=void 0===w.fallback?!1:!0!==w.unstable_avoidThisFallback?!0:A?!1:!0;}}if(C){var z=p.updateQueue;if(null===z){var u=new Set;u.add(l);p.updateQueue=u;}else z.add(l);if(0===(p.mode&2)){p.flags|=64;h.flags|=16384;h.flags&=-2981;if(1===h.tag)if(null===h.alternate)h.tag=17;else {var t=zg(-1,1);t.tag=2;Ag(h,t);}h.lanes|=1;break a}k=
    void 0;h=b;var q=f.pingCache;null===q?(q=f.pingCache=new Oi,k=new Set,q.set(l,k)):(k=q.get(l),void 0===k&&(k=new Set,q.set(l,k)));if(!k.has(h)){k.add(h);var v=Yj.bind(null,f,l,h);l.then(v,v);}p.flags|=4096;p.lanes=b;break a}p=p.return;}while(null!==p);k=Error((Ra(h.type)||"A React component")+" suspended while rendering, but no fallback UI was specified.\n\nAdd a <Suspense fallback=...> component higher in the tree to provide a loading indicator or placeholder to display.");}5!==V&&(V=2);k=Mi(k,h);p=
    g;do{switch(p.tag){case 3:f=k;p.flags|=4096;b&=-b;p.lanes|=b;var J=Pi(p,f,b);Bg(p,J);break a;case 1:f=k;var K=p.type,Q=p.stateNode;if(0===(p.flags&64)&&("function"===typeof K.getDerivedStateFromError||null!==Q&&"function"===typeof Q.componentDidCatch&&(null===Ti||!Ti.has(Q)))){p.flags|=4096;b&=-b;p.lanes|=b;var L=Si(p,f,b);Bg(p,L);break a}}p=p.return;}while(null!==p)}Zj(c);}catch(va){b=va;Y===c&&null!==c&&(Y=c=c.return);continue}break}while(1)}
    function Pj(){var a=oj.current;oj.current=Gh;return null===a?Gh:a}function Tj(a,b){var c=X;X|=16;var d=Pj();U===a&&W===b||Qj(a,b);do try{ak();break}catch(e){Sj(a,e);}while(1);qg();X=c;oj.current=d;if(null!==Y)throw Error(y(261));U=null;W=0;return V}function ak(){for(;null!==Y;)bk(Y);}function Rj(){for(;null!==Y&&!Qf();)bk(Y);}function bk(a){var b=ck(a.alternate,a,qj);a.memoizedProps=a.pendingProps;null===b?Zj(a):Y=b;pj.current=null;}
    function Zj(a){var b=a;do{var c=b.alternate;a=b.return;if(0===(b.flags&2048)){c=Gi(c,b,qj);if(null!==c){Y=c;return}c=b;if(24!==c.tag&&23!==c.tag||null===c.memoizedState||0!==(qj&1073741824)||0===(c.mode&4)){for(var d=0,e=c.child;null!==e;)d|=e.lanes|e.childLanes,e=e.sibling;c.childLanes=d;}null!==a&&0===(a.flags&2048)&&(null===a.firstEffect&&(a.firstEffect=b.firstEffect),null!==b.lastEffect&&(null!==a.lastEffect&&(a.lastEffect.nextEffect=b.firstEffect),a.lastEffect=b.lastEffect),1<b.flags&&(null!==
    a.lastEffect?a.lastEffect.nextEffect=b:a.firstEffect=b,a.lastEffect=b));}else {c=Li(b);if(null!==c){c.flags&=2047;Y=c;return}null!==a&&(a.firstEffect=a.lastEffect=null,a.flags|=2048);}b=b.sibling;if(null!==b){Y=b;return}Y=b=a;}while(null!==b);0===V&&(V=5);}function Uj(a){var b=eg();gg(99,dk.bind(null,a,b));return null}
    function dk(a,b){do Oj();while(null!==yj);if(0!==(X&48))throw Error(y(327));var c=a.finishedWork;if(null===c)return null;a.finishedWork=null;a.finishedLanes=0;if(c===a.current)throw Error(y(177));a.callbackNode=null;var d=c.lanes|c.childLanes,e=d,f=a.pendingLanes&~e;a.pendingLanes=e;a.suspendedLanes=0;a.pingedLanes=0;a.expiredLanes&=e;a.mutableReadLanes&=e;a.entangledLanes&=e;e=a.entanglements;for(var g=a.eventTimes,h=a.expirationTimes;0<f;){var k=31-Vc(f),l=1<<k;e[k]=0;g[k]=-1;h[k]=-1;f&=~l;}null!==
    Cj&&0===(d&24)&&Cj.has(a)&&Cj.delete(a);a===U&&(Y=U=null,W=0);1<c.flags?null!==c.lastEffect?(c.lastEffect.nextEffect=c,d=c.firstEffect):d=c:d=c.firstEffect;if(null!==d){e=X;X|=32;pj.current=null;kf=fd;g=Ne();if(Oe(g)){if("selectionStart"in g)h={start:g.selectionStart,end:g.selectionEnd};else a:if(h=(h=g.ownerDocument)&&h.defaultView||window,(l=h.getSelection&&h.getSelection())&&0!==l.rangeCount){h=l.anchorNode;f=l.anchorOffset;k=l.focusNode;l=l.focusOffset;try{h.nodeType,k.nodeType;}catch(va){h=null;
    break a}var n=0,A=-1,p=-1,C=0,x=0,w=g,z=null;b:for(;;){for(var u;;){w!==h||0!==f&&3!==w.nodeType||(A=n+f);w!==k||0!==l&&3!==w.nodeType||(p=n+l);3===w.nodeType&&(n+=w.nodeValue.length);if(null===(u=w.firstChild))break;z=w;w=u;}for(;;){if(w===g)break b;z===h&&++C===f&&(A=n);z===k&&++x===l&&(p=n);if(null!==(u=w.nextSibling))break;w=z;z=w.parentNode;}w=u;}h=-1===A||-1===p?null:{start:A,end:p};}else h=null;h=h||{start:0,end:0};}else h=null;lf={focusedElem:g,selectionRange:h};fd=!1;Ij=null;Jj=!1;Z=d;do try{ek();}catch(va){if(null===
    Z)throw Error(y(330));Wi(Z,va);Z=Z.nextEffect;}while(null!==Z);Ij=null;Z=d;do try{for(g=a;null!==Z;){var t=Z.flags;t&16&&pb(Z.stateNode,"");if(t&128){var q=Z.alternate;if(null!==q){var v=q.ref;null!==v&&("function"===typeof v?v(null):v.current=null);}}switch(t&1038){case 2:fj(Z);Z.flags&=-3;break;case 6:fj(Z);Z.flags&=-3;ij(Z.alternate,Z);break;case 1024:Z.flags&=-1025;break;case 1028:Z.flags&=-1025;ij(Z.alternate,Z);break;case 4:ij(Z.alternate,Z);break;case 8:h=Z;cj(g,h);var J=h.alternate;dj(h);null!==
    J&&dj(J);}Z=Z.nextEffect;}}catch(va){if(null===Z)throw Error(y(330));Wi(Z,va);Z=Z.nextEffect;}while(null!==Z);v=lf;q=Ne();t=v.focusedElem;g=v.selectionRange;if(q!==t&&t&&t.ownerDocument&&Me(t.ownerDocument.documentElement,t)){null!==g&&Oe(t)&&(q=g.start,v=g.end,void 0===v&&(v=q),"selectionStart"in t?(t.selectionStart=q,t.selectionEnd=Math.min(v,t.value.length)):(v=(q=t.ownerDocument||document)&&q.defaultView||window,v.getSelection&&(v=v.getSelection(),h=t.textContent.length,J=Math.min(g.start,h),g=void 0===
    g.end?J:Math.min(g.end,h),!v.extend&&J>g&&(h=g,g=J,J=h),h=Le(t,J),f=Le(t,g),h&&f&&(1!==v.rangeCount||v.anchorNode!==h.node||v.anchorOffset!==h.offset||v.focusNode!==f.node||v.focusOffset!==f.offset)&&(q=q.createRange(),q.setStart(h.node,h.offset),v.removeAllRanges(),J>g?(v.addRange(q),v.extend(f.node,f.offset)):(q.setEnd(f.node,f.offset),v.addRange(q))))));q=[];for(v=t;v=v.parentNode;)1===v.nodeType&&q.push({element:v,left:v.scrollLeft,top:v.scrollTop});"function"===typeof t.focus&&t.focus();for(t=
    0;t<q.length;t++)v=q[t],v.element.scrollLeft=v.left,v.element.scrollTop=v.top;}fd=!!kf;lf=kf=null;a.current=c;Z=d;do try{for(t=a;null!==Z;){var K=Z.flags;K&36&&Yi(t,Z.alternate,Z);if(K&128){q=void 0;var Q=Z.ref;if(null!==Q){var L=Z.stateNode;switch(Z.tag){case 5:q=L;break;default:q=L;}"function"===typeof Q?Q(q):Q.current=q;}}Z=Z.nextEffect;}}catch(va){if(null===Z)throw Error(y(330));Wi(Z,va);Z=Z.nextEffect;}while(null!==Z);Z=null;$f();X=e;}else a.current=c;if(xj)xj=!1,yj=a,zj=b;else for(Z=d;null!==Z;)b=
    Z.nextEffect,Z.nextEffect=null,Z.flags&8&&(K=Z,K.sibling=null,K.stateNode=null),Z=b;d=a.pendingLanes;0===d&&(Ti=null);1===d?a===Ej?Dj++:(Dj=0,Ej=a):Dj=0;c=c.stateNode;if(Mf&&"function"===typeof Mf.onCommitFiberRoot)try{Mf.onCommitFiberRoot(Lf,c,void 0,64===(c.current.flags&64));}catch(va){}Mj(a,O());if(Qi)throw Qi=!1,a=Ri,Ri=null,a;if(0!==(X&8))return null;ig();return null}
    function ek(){for(;null!==Z;){var a=Z.alternate;Jj||null===Ij||(0!==(Z.flags&8)?dc(Z,Ij)&&(Jj=!0):13===Z.tag&&mj(a,Z)&&dc(Z,Ij)&&(Jj=!0));var b=Z.flags;0!==(b&256)&&Xi(a,Z);0===(b&512)||xj||(xj=!0,hg(97,function(){Oj();return null}));Z=Z.nextEffect;}}function Oj(){if(90!==zj){var a=97<zj?97:zj;zj=90;return gg(a,fk)}return !1}function $i(a,b){Aj.push(b,a);xj||(xj=!0,hg(97,function(){Oj();return null}));}function Zi(a,b){Bj.push(b,a);xj||(xj=!0,hg(97,function(){Oj();return null}));}
    function fk(){if(null===yj)return !1;var a=yj;yj=null;if(0!==(X&48))throw Error(y(331));var b=X;X|=32;var c=Bj;Bj=[];for(var d=0;d<c.length;d+=2){var e=c[d],f=c[d+1],g=e.destroy;e.destroy=void 0;if("function"===typeof g)try{g();}catch(k){if(null===f)throw Error(y(330));Wi(f,k);}}c=Aj;Aj=[];for(d=0;d<c.length;d+=2){e=c[d];f=c[d+1];try{var h=e.create;e.destroy=h();}catch(k){if(null===f)throw Error(y(330));Wi(f,k);}}for(h=a.current.firstEffect;null!==h;)a=h.nextEffect,h.nextEffect=null,h.flags&8&&(h.sibling=
    null,h.stateNode=null),h=a;X=b;ig();return !0}function gk(a,b,c){b=Mi(c,b);b=Pi(a,b,1);Ag(a,b);b=Hg();a=Kj(a,1);null!==a&&($c(a,1,b),Mj(a,b));}
    function Wi(a,b){if(3===a.tag)gk(a,a,b);else for(var c=a.return;null!==c;){if(3===c.tag){gk(c,a,b);break}else if(1===c.tag){var d=c.stateNode;if("function"===typeof c.type.getDerivedStateFromError||"function"===typeof d.componentDidCatch&&(null===Ti||!Ti.has(d))){a=Mi(b,a);var e=Si(c,a,1);Ag(c,e);e=Hg();c=Kj(c,1);if(null!==c)$c(c,1,e),Mj(c,e);else if("function"===typeof d.componentDidCatch&&(null===Ti||!Ti.has(d)))try{d.componentDidCatch(b,a);}catch(f){}break}}c=c.return;}}
    function Yj(a,b,c){var d=a.pingCache;null!==d&&d.delete(b);b=Hg();a.pingedLanes|=a.suspendedLanes&c;U===a&&(W&c)===c&&(4===V||3===V&&(W&62914560)===W&&500>O()-jj?Qj(a,0):uj|=c);Mj(a,b);}function lj(a,b){var c=a.stateNode;null!==c&&c.delete(b);b=0;0===b&&(b=a.mode,0===(b&2)?b=1:0===(b&4)?b=99===eg()?1:2:(0===Gj&&(Gj=tj),b=Yc(62914560&~Gj),0===b&&(b=4194304)));c=Hg();a=Kj(a,b);null!==a&&($c(a,b,c),Mj(a,c));}var ck;
    ck=function(a,b,c){var d=b.lanes;if(null!==a)if(a.memoizedProps!==b.pendingProps||N.current)ug=!0;else if(0!==(c&d))ug=0!==(a.flags&16384)?!0:!1;else {ug=!1;switch(b.tag){case 3:ri(b);sh();break;case 5:gh(b);break;case 1:Ff(b.type)&&Jf(b);break;case 4:eh(b,b.stateNode.containerInfo);break;case 10:d=b.memoizedProps.value;var e=b.type._context;I(mg,e._currentValue);e._currentValue=d;break;case 13:if(null!==b.memoizedState){if(0!==(c&b.child.childLanes))return ti(a,b,c);I(P,P.current&1);b=hi(a,b,c);return null!==
    b?b.sibling:null}I(P,P.current&1);break;case 19:d=0!==(c&b.childLanes);if(0!==(a.flags&64)){if(d)return Ai(a,b,c);b.flags|=64;}e=b.memoizedState;null!==e&&(e.rendering=null,e.tail=null,e.lastEffect=null);I(P,P.current);if(d)break;else return null;case 23:case 24:return b.lanes=0,mi(a,b,c)}return hi(a,b,c)}else ug=!1;b.lanes=0;switch(b.tag){case 2:d=b.type;null!==a&&(a.alternate=null,b.alternate=null,b.flags|=2);a=b.pendingProps;e=Ef(b,M.current);tg(b,c);e=Ch(null,b,d,a,e,c);b.flags|=1;if("object"===
    typeof e&&null!==e&&"function"===typeof e.render&&void 0===e.$$typeof){b.tag=1;b.memoizedState=null;b.updateQueue=null;if(Ff(d)){var f=!0;Jf(b);}else f=!1;b.memoizedState=null!==e.state&&void 0!==e.state?e.state:null;xg(b);var g=d.getDerivedStateFromProps;"function"===typeof g&&Gg(b,d,g,a);e.updater=Kg;b.stateNode=e;e._reactInternals=b;Og(b,d,a,c);b=qi(null,b,d,!0,f,c);}else b.tag=0,fi(null,b,e,c),b=b.child;return b;case 16:e=b.elementType;a:{null!==a&&(a.alternate=null,b.alternate=null,b.flags|=2);
    a=b.pendingProps;f=e._init;e=f(e._payload);b.type=e;f=b.tag=hk(e);a=lg(e,a);switch(f){case 0:b=li(null,b,e,a,c);break a;case 1:b=pi(null,b,e,a,c);break a;case 11:b=gi(null,b,e,a,c);break a;case 14:b=ii(null,b,e,lg(e.type,a),d,c);break a}throw Error(y(306,e,""));}return b;case 0:return d=b.type,e=b.pendingProps,e=b.elementType===d?e:lg(d,e),li(a,b,d,e,c);case 1:return d=b.type,e=b.pendingProps,e=b.elementType===d?e:lg(d,e),pi(a,b,d,e,c);case 3:ri(b);d=b.updateQueue;if(null===a||null===d)throw Error(y(282));
    d=b.pendingProps;e=b.memoizedState;e=null!==e?e.element:null;yg(a,b);Cg(b,d,null,c);d=b.memoizedState.element;if(d===e)sh(),b=hi(a,b,c);else {e=b.stateNode;if(f=e.hydrate)kh=rf(b.stateNode.containerInfo.firstChild),jh=b,f=lh=!0;if(f){a=e.mutableSourceEagerHydrationData;if(null!=a)for(e=0;e<a.length;e+=2)f=a[e],f._workInProgressVersionPrimary=a[e+1],th.push(f);c=Zg(b,null,d,c);for(b.child=c;c;)c.flags=c.flags&-3|1024,c=c.sibling;}else fi(a,b,d,c),sh();b=b.child;}return b;case 5:return gh(b),null===a&&
    ph(b),d=b.type,e=b.pendingProps,f=null!==a?a.memoizedProps:null,g=e.children,nf(d,e)?g=null:null!==f&&nf(d,f)&&(b.flags|=16),oi(a,b),fi(a,b,g,c),b.child;case 6:return null===a&&ph(b),null;case 13:return ti(a,b,c);case 4:return eh(b,b.stateNode.containerInfo),d=b.pendingProps,null===a?b.child=Yg(b,null,d,c):fi(a,b,d,c),b.child;case 11:return d=b.type,e=b.pendingProps,e=b.elementType===d?e:lg(d,e),gi(a,b,d,e,c);case 7:return fi(a,b,b.pendingProps,c),b.child;case 8:return fi(a,b,b.pendingProps.children,
    c),b.child;case 12:return fi(a,b,b.pendingProps.children,c),b.child;case 10:a:{d=b.type._context;e=b.pendingProps;g=b.memoizedProps;f=e.value;var h=b.type._context;I(mg,h._currentValue);h._currentValue=f;if(null!==g)if(h=g.value,f=He(h,f)?0:("function"===typeof d._calculateChangedBits?d._calculateChangedBits(h,f):1073741823)|0,0===f){if(g.children===e.children&&!N.current){b=hi(a,b,c);break a}}else for(h=b.child,null!==h&&(h.return=b);null!==h;){var k=h.dependencies;if(null!==k){g=h.child;for(var l=
    k.firstContext;null!==l;){if(l.context===d&&0!==(l.observedBits&f)){1===h.tag&&(l=zg(-1,c&-c),l.tag=2,Ag(h,l));h.lanes|=c;l=h.alternate;null!==l&&(l.lanes|=c);sg(h.return,c);k.lanes|=c;break}l=l.next;}}else g=10===h.tag?h.type===b.type?null:h.child:h.child;if(null!==g)g.return=h;else for(g=h;null!==g;){if(g===b){g=null;break}h=g.sibling;if(null!==h){h.return=g.return;g=h;break}g=g.return;}h=g;}fi(a,b,e.children,c);b=b.child;}return b;case 9:return e=b.type,f=b.pendingProps,d=f.children,tg(b,c),e=vg(e,
    f.unstable_observedBits),d=d(e),b.flags|=1,fi(a,b,d,c),b.child;case 14:return e=b.type,f=lg(e,b.pendingProps),f=lg(e.type,f),ii(a,b,e,f,d,c);case 15:return ki(a,b,b.type,b.pendingProps,d,c);case 17:return d=b.type,e=b.pendingProps,e=b.elementType===d?e:lg(d,e),null!==a&&(a.alternate=null,b.alternate=null,b.flags|=2),b.tag=1,Ff(d)?(a=!0,Jf(b)):a=!1,tg(b,c),Mg(b,d,e),Og(b,d,e,c),qi(null,b,d,!0,a,c);case 19:return Ai(a,b,c);case 23:return mi(a,b,c);case 24:return mi(a,b,c)}throw Error(y(156,b.tag));
    };function ik(a,b,c,d){this.tag=a;this.key=c;this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null;this.index=0;this.ref=null;this.pendingProps=b;this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null;this.mode=d;this.flags=0;this.lastEffect=this.firstEffect=this.nextEffect=null;this.childLanes=this.lanes=0;this.alternate=null;}function nh(a,b,c,d){return new ik(a,b,c,d)}function ji(a){a=a.prototype;return !(!a||!a.isReactComponent)}
    function hk(a){if("function"===typeof a)return ji(a)?1:0;if(void 0!==a&&null!==a){a=a.$$typeof;if(a===Aa)return 11;if(a===Da)return 14}return 2}
    function Tg(a,b){var c=a.alternate;null===c?(c=nh(a.tag,b,a.key,a.mode),c.elementType=a.elementType,c.type=a.type,c.stateNode=a.stateNode,c.alternate=a,a.alternate=c):(c.pendingProps=b,c.type=a.type,c.flags=0,c.nextEffect=null,c.firstEffect=null,c.lastEffect=null);c.childLanes=a.childLanes;c.lanes=a.lanes;c.child=a.child;c.memoizedProps=a.memoizedProps;c.memoizedState=a.memoizedState;c.updateQueue=a.updateQueue;b=a.dependencies;c.dependencies=null===b?null:{lanes:b.lanes,firstContext:b.firstContext};
    c.sibling=a.sibling;c.index=a.index;c.ref=a.ref;return c}
    function Vg(a,b,c,d,e,f){var g=2;d=a;if("function"===typeof a)ji(a)&&(g=1);else if("string"===typeof a)g=5;else a:switch(a){case ua:return Xg(c.children,e,f,b);case Ha:g=8;e|=16;break;case wa:g=8;e|=1;break;case xa:return a=nh(12,c,b,e|8),a.elementType=xa,a.type=xa,a.lanes=f,a;case Ba:return a=nh(13,c,b,e),a.type=Ba,a.elementType=Ba,a.lanes=f,a;case Ca:return a=nh(19,c,b,e),a.elementType=Ca,a.lanes=f,a;case Ia:return vi(c,e,f,b);case Ja:return a=nh(24,c,b,e),a.elementType=Ja,a.lanes=f,a;default:if("object"===
    typeof a&&null!==a)switch(a.$$typeof){case ya:g=10;break a;case za:g=9;break a;case Aa:g=11;break a;case Da:g=14;break a;case Ea:g=16;d=null;break a;case Fa:g=22;break a}throw Error(y(130,null==a?a:typeof a,""));}b=nh(g,c,b,e);b.elementType=a;b.type=d;b.lanes=f;return b}function Xg(a,b,c,d){a=nh(7,a,d,b);a.lanes=c;return a}function vi(a,b,c,d){a=nh(23,a,d,b);a.elementType=Ia;a.lanes=c;return a}function Ug(a,b,c){a=nh(6,a,null,b);a.lanes=c;return a}
    function Wg(a,b,c){b=nh(4,null!==a.children?a.children:[],a.key,b);b.lanes=c;b.stateNode={containerInfo:a.containerInfo,pendingChildren:null,implementation:a.implementation};return b}
    function jk(a,b,c){this.tag=b;this.containerInfo=a;this.finishedWork=this.pingCache=this.current=this.pendingChildren=null;this.timeoutHandle=-1;this.pendingContext=this.context=null;this.hydrate=c;this.callbackNode=null;this.callbackPriority=0;this.eventTimes=Zc(0);this.expirationTimes=Zc(-1);this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0;this.entanglements=Zc(0);this.mutableSourceEagerHydrationData=null;}
    function kk(a,b,c){var d=3<arguments.length&&void 0!==arguments[3]?arguments[3]:null;return {$$typeof:ta,key:null==d?null:""+d,children:a,containerInfo:b,implementation:c}}
    function lk(a,b,c,d){var e=b.current,f=Hg(),g=Ig(e);a:if(c){c=c._reactInternals;b:{if(Zb(c)!==c||1!==c.tag)throw Error(y(170));var h=c;do{switch(h.tag){case 3:h=h.stateNode.context;break b;case 1:if(Ff(h.type)){h=h.stateNode.__reactInternalMemoizedMergedChildContext;break b}}h=h.return;}while(null!==h);throw Error(y(171));}if(1===c.tag){var k=c.type;if(Ff(k)){c=If(c,k,h);break a}}c=h;}else c=Cf;null===b.context?b.context=c:b.pendingContext=c;b=zg(f,g);b.payload={element:a};d=void 0===d?null:d;null!==
    d&&(b.callback=d);Ag(e,b);Jg(e,g,f);return g}function mk(a){a=a.current;if(!a.child)return null;switch(a.child.tag){case 5:return a.child.stateNode;default:return a.child.stateNode}}function nk(a,b){a=a.memoizedState;if(null!==a&&null!==a.dehydrated){var c=a.retryLane;a.retryLane=0!==c&&c<b?c:b;}}function ok(a,b){nk(a,b);(a=a.alternate)&&nk(a,b);}function pk(){return null}
    function qk(a,b,c){var d=null!=c&&null!=c.hydrationOptions&&c.hydrationOptions.mutableSources||null;c=new jk(a,b,null!=c&&!0===c.hydrate);b=nh(3,null,null,2===b?7:1===b?3:0);c.current=b;b.stateNode=c;xg(b);a[ff]=c.current;cf(8===a.nodeType?a.parentNode:a);if(d)for(a=0;a<d.length;a++){b=d[a];var e=b._getVersion;e=e(b._source);null==c.mutableSourceEagerHydrationData?c.mutableSourceEagerHydrationData=[b,e]:c.mutableSourceEagerHydrationData.push(b,e);}this._internalRoot=c;}
    qk.prototype.render=function(a){lk(a,this._internalRoot,null,null);};qk.prototype.unmount=function(){var a=this._internalRoot,b=a.containerInfo;lk(null,a,null,function(){b[ff]=null;});};function rk(a){return !(!a||1!==a.nodeType&&9!==a.nodeType&&11!==a.nodeType&&(8!==a.nodeType||" react-mount-point-unstable "!==a.nodeValue))}
    function sk(a,b){b||(b=a?9===a.nodeType?a.documentElement:a.firstChild:null,b=!(!b||1!==b.nodeType||!b.hasAttribute("data-reactroot")));if(!b)for(var c;c=a.lastChild;)a.removeChild(c);return new qk(a,0,b?{hydrate:!0}:void 0)}
    function tk(a,b,c,d,e){var f=c._reactRootContainer;if(f){var g=f._internalRoot;if("function"===typeof e){var h=e;e=function(){var a=mk(g);h.call(a);};}lk(b,g,a,e);}else {f=c._reactRootContainer=sk(c,d);g=f._internalRoot;if("function"===typeof e){var k=e;e=function(){var a=mk(g);k.call(a);};}Xj(function(){lk(b,g,a,e);});}return mk(g)}ec=function(a){if(13===a.tag){var b=Hg();Jg(a,4,b);ok(a,4);}};fc=function(a){if(13===a.tag){var b=Hg();Jg(a,67108864,b);ok(a,67108864);}};
    gc=function(a){if(13===a.tag){var b=Hg(),c=Ig(a);Jg(a,c,b);ok(a,c);}};hc=function(a,b){return b()};
    yb=function(a,b,c){switch(b){case "input":ab(a,c);b=c.name;if("radio"===c.type&&null!=b){for(c=a;c.parentNode;)c=c.parentNode;c=c.querySelectorAll("input[name="+JSON.stringify(""+b)+'][type="radio"]');for(b=0;b<c.length;b++){var d=c[b];if(d!==a&&d.form===a.form){var e=Db(d);if(!e)throw Error(y(90));Wa(d);ab(d,e);}}}break;case "textarea":ib(a,c);break;case "select":b=c.value,null!=b&&fb(a,!!c.multiple,b,!1);}};Gb=Wj;
    Hb=function(a,b,c,d,e){var f=X;X|=4;try{return gg(98,a.bind(null,b,c,d,e))}finally{X=f,0===X&&(wj(),ig());}};Ib=function(){0===(X&49)&&(Vj(),Oj());};Jb=function(a,b){var c=X;X|=2;try{return a(b)}finally{X=c,0===X&&(wj(),ig());}};function uk(a,b){var c=2<arguments.length&&void 0!==arguments[2]?arguments[2]:null;if(!rk(b))throw Error(y(200));return kk(a,b,null,c)}var vk={Events:[Cb,ue,Db,Eb,Fb,Oj,{current:!1}]},wk={findFiberByHostInstance:wc,bundleType:0,version:"17.0.1",rendererPackageName:"react-dom"};
    var xk={bundleType:wk.bundleType,version:wk.version,rendererPackageName:wk.rendererPackageName,rendererConfig:wk.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:ra.ReactCurrentDispatcher,findHostInstanceByFiber:function(a){a=cc(a);return null===a?null:a.stateNode},findFiberByHostInstance:wk.findFiberByHostInstance||
    pk,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null};if("undefined"!==typeof __REACT_DEVTOOLS_GLOBAL_HOOK__){var yk=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!yk.isDisabled&&yk.supportsFiber)try{Lf=yk.inject(xk),Mf=yk;}catch(a){}}var __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=vk;var createPortal=uk;
    var findDOMNode=function(a){if(null==a)return null;if(1===a.nodeType)return a;var b=a._reactInternals;if(void 0===b){if("function"===typeof a.render)throw Error(y(188));throw Error(y(268,Object.keys(a)));}a=cc(b);a=null===a?null:a.stateNode;return a};var flushSync=function(a,b){var c=X;if(0!==(c&48))return a(b);X|=1;try{if(a)return gg(99,a.bind(null,b))}finally{X=c,ig();}};var hydrate=function(a,b,c){if(!rk(b))throw Error(y(200));return tk(null,a,b,!0,c)};
    var render=function(a,b,c){if(!rk(b))throw Error(y(200));return tk(null,a,b,!1,c)};var unmountComponentAtNode=function(a){if(!rk(a))throw Error(y(40));return a._reactRootContainer?(Xj(function(){tk(null,null,a,!1,function(){a._reactRootContainer=null;a[ff]=null;});}),!0):!1};var unstable_batchedUpdates=Wj;var unstable_createPortal=function(a,b){return uk(a,b,2<arguments.length&&void 0!==arguments[2]?arguments[2]:null)};
    var unstable_renderSubtreeIntoContainer=function(a,b,c,d){if(!rk(c))throw Error(y(200));if(null==a||void 0===a._reactInternals)throw Error(y(38));return tk(a,b,c,!1,d)};var version="17.0.1";

    var reactDom_production_min = {
    	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    	createPortal: createPortal,
    	findDOMNode: findDOMNode,
    	flushSync: flushSync,
    	hydrate: hydrate,
    	render: render,
    	unmountComponentAtNode: unmountComponentAtNode,
    	unstable_batchedUpdates: unstable_batchedUpdates,
    	unstable_createPortal: unstable_createPortal,
    	unstable_renderSubtreeIntoContainer: unstable_renderSubtreeIntoContainer,
    	version: version
    };

    /** @license React v0.20.1
     * scheduler-tracing.production.min.js
     *
     * Copyright (c) Facebook, Inc. and its affiliates.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */
    var b=0;var __interactionsRef=null;var __subscriberRef=null;var unstable_clear=function(a){return a()};var unstable_getCurrent=function(){return null};var unstable_getThreadID=function(){return ++b};var unstable_subscribe=function(){};var unstable_trace=function(a,d,c){return c()};var unstable_unsubscribe=function(){};var unstable_wrap=function(a){return a};

    var schedulerTracing_production_min = {
    	__interactionsRef: __interactionsRef,
    	__subscriberRef: __subscriberRef,
    	unstable_clear: unstable_clear,
    	unstable_getCurrent: unstable_getCurrent,
    	unstable_getThreadID: unstable_getThreadID,
    	unstable_subscribe: unstable_subscribe,
    	unstable_trace: unstable_trace,
    	unstable_unsubscribe: unstable_unsubscribe,
    	unstable_wrap: unstable_wrap
    };

    var schedulerTracing_development = createCommonjsModule(function (module, exports) {
    });

    var tracing = createCommonjsModule(function (module) {

    {
      module.exports = schedulerTracing_production_min;
    }
    });

    var reactDom_development = createCommonjsModule(function (module, exports) {
    });

    var reactDom = createCommonjsModule(function (module) {

    function checkDCE() {
      /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
      if (
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function'
      ) {
        return;
      }
      try {
        // Verify that the code above has been dead code eliminated (DCE'd).
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
      } catch (err) {
        // DevTools shouldn't crash React, no matter what.
        // We should still report in case we break this code.
        console.error(err);
      }
    }

    {
      // DCE check should happen before ReactDOM bundle executes so that
      // DevTools can report bad minification during injection.
      checkDCE();
      module.exports = reactDom_production_min;
    }
    });

    var ReactDOM = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.assign(/*#__PURE__*/Object.create(null), reactDom, {
        'default': reactDom
    }));

    /* src/AlignmentEditorWrapper.svelte generated by Svelte v3.31.0 */
    const file = "src/AlignmentEditorWrapper.svelte";

    function create_fragment(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			add_location(div, file, 19, 0, 434);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[1](div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[1](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AlignmentEditorWrapper", slots, []);
    	let container;

    	afterUpdate(() => {
    		/*const { this: component, children, ...props } = $$props;*/
    		reactDom.render(react.createElement("div", {}, "Rendering this from react!"), container);
    	});

    	onDestroy(() => {
    		reactDom.unmountComponentAtNode(container);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AlignmentEditorWrapper> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$capture_state = () => ({
    		React,
    		ReactDOM,
    		afterUpdate,
    		onDestroy,
    		container
    	});

    	$$self.$inject_state = $$props => {
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [container, div_binding];
    }

    class AlignmentEditorWrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AlignmentEditorWrapper",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var interopRequireDefault = createCommonjsModule(function (module) {
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : {
        "default": obj
      };
    }

    module.exports = _interopRequireDefault;
    });

    var check = function (it) {
      return it && it.Math == Math && it;
    };

    // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
    var global_1 =
      // eslint-disable-next-line no-undef
      check(typeof globalThis == 'object' && globalThis) ||
      check(typeof window == 'object' && window) ||
      check(typeof self == 'object' && self) ||
      check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
      // eslint-disable-next-line no-new-func
      (function () { return this; })() || Function('return this')();

    var fails = function (exec) {
      try {
        return !!exec();
      } catch (error) {
        return true;
      }
    };

    // Thank's IE8 for his funny defineProperty
    var descriptors = !fails(function () {
      return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] != 7;
    });

    var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    // Nashorn ~ JDK8 bug
    var NASHORN_BUG = getOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

    // `Object.prototype.propertyIsEnumerable` method implementation
    // https://tc39.github.io/ecma262/#sec-object.prototype.propertyisenumerable
    var f = NASHORN_BUG ? function propertyIsEnumerable(V) {
      var descriptor = getOwnPropertyDescriptor(this, V);
      return !!descriptor && descriptor.enumerable;
    } : nativePropertyIsEnumerable;

    var objectPropertyIsEnumerable = {
    	f: f
    };

    var createPropertyDescriptor = function (bitmap, value) {
      return {
        enumerable: !(bitmap & 1),
        configurable: !(bitmap & 2),
        writable: !(bitmap & 4),
        value: value
      };
    };

    var toString = {}.toString;

    var classofRaw = function (it) {
      return toString.call(it).slice(8, -1);
    };

    var split = ''.split;

    // fallback for non-array-like ES3 and non-enumerable old V8 strings
    var indexedObject = fails(function () {
      // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
      // eslint-disable-next-line no-prototype-builtins
      return !Object('z').propertyIsEnumerable(0);
    }) ? function (it) {
      return classofRaw(it) == 'String' ? split.call(it, '') : Object(it);
    } : Object;

    // `RequireObjectCoercible` abstract operation
    // https://tc39.github.io/ecma262/#sec-requireobjectcoercible
    var requireObjectCoercible = function (it) {
      if (it == undefined) throw TypeError("Can't call method on " + it);
      return it;
    };

    // toObject with fallback for non-array-like ES3 strings



    var toIndexedObject = function (it) {
      return indexedObject(requireObjectCoercible(it));
    };

    var isObject = function (it) {
      return typeof it === 'object' ? it !== null : typeof it === 'function';
    };

    // `ToPrimitive` abstract operation
    // https://tc39.github.io/ecma262/#sec-toprimitive
    // instead of the ES6 spec version, we didn't implement @@toPrimitive case
    // and the second argument - flag - preferred type is a string
    var toPrimitive = function (input, PREFERRED_STRING) {
      if (!isObject(input)) return input;
      var fn, val;
      if (PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
      if (typeof (fn = input.valueOf) == 'function' && !isObject(val = fn.call(input))) return val;
      if (!PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
      throw TypeError("Can't convert object to primitive value");
    };

    var hasOwnProperty$1 = {}.hasOwnProperty;

    var has = function (it, key) {
      return hasOwnProperty$1.call(it, key);
    };

    var document$1 = global_1.document;
    // typeof document.createElement is 'object' in old IE
    var EXISTS = isObject(document$1) && isObject(document$1.createElement);

    var documentCreateElement = function (it) {
      return EXISTS ? document$1.createElement(it) : {};
    };

    // Thank's IE8 for his funny defineProperty
    var ie8DomDefine = !descriptors && !fails(function () {
      return Object.defineProperty(documentCreateElement('div'), 'a', {
        get: function () { return 7; }
      }).a != 7;
    });

    var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    // `Object.getOwnPropertyDescriptor` method
    // https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptor
    var f$1 = descriptors ? nativeGetOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
      O = toIndexedObject(O);
      P = toPrimitive(P, true);
      if (ie8DomDefine) try {
        return nativeGetOwnPropertyDescriptor(O, P);
      } catch (error) { /* empty */ }
      if (has(O, P)) return createPropertyDescriptor(!objectPropertyIsEnumerable.f.call(O, P), O[P]);
    };

    var objectGetOwnPropertyDescriptor = {
    	f: f$1
    };

    var replacement = /#|\.prototype\./;

    var isForced = function (feature, detection) {
      var value = data[normalize(feature)];
      return value == POLYFILL ? true
        : value == NATIVE ? false
        : typeof detection == 'function' ? fails(detection)
        : !!detection;
    };

    var normalize = isForced.normalize = function (string) {
      return String(string).replace(replacement, '.').toLowerCase();
    };

    var data = isForced.data = {};
    var NATIVE = isForced.NATIVE = 'N';
    var POLYFILL = isForced.POLYFILL = 'P';

    var isForced_1 = isForced;

    var path = {};

    var aFunction = function (it) {
      if (typeof it != 'function') {
        throw TypeError(String(it) + ' is not a function');
      } return it;
    };

    // optional / simple context binding
    var functionBindContext = function (fn, that, length) {
      aFunction(fn);
      if (that === undefined) return fn;
      switch (length) {
        case 0: return function () {
          return fn.call(that);
        };
        case 1: return function (a) {
          return fn.call(that, a);
        };
        case 2: return function (a, b) {
          return fn.call(that, a, b);
        };
        case 3: return function (a, b, c) {
          return fn.call(that, a, b, c);
        };
      }
      return function (/* ...args */) {
        return fn.apply(that, arguments);
      };
    };

    var anObject = function (it) {
      if (!isObject(it)) {
        throw TypeError(String(it) + ' is not an object');
      } return it;
    };

    var nativeDefineProperty = Object.defineProperty;

    // `Object.defineProperty` method
    // https://tc39.github.io/ecma262/#sec-object.defineproperty
    var f$2 = descriptors ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
      anObject(O);
      P = toPrimitive(P, true);
      anObject(Attributes);
      if (ie8DomDefine) try {
        return nativeDefineProperty(O, P, Attributes);
      } catch (error) { /* empty */ }
      if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
      if ('value' in Attributes) O[P] = Attributes.value;
      return O;
    };

    var objectDefineProperty = {
    	f: f$2
    };

    var createNonEnumerableProperty = descriptors ? function (object, key, value) {
      return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
    } : function (object, key, value) {
      object[key] = value;
      return object;
    };

    var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;






    var wrapConstructor = function (NativeConstructor) {
      var Wrapper = function (a, b, c) {
        if (this instanceof NativeConstructor) {
          switch (arguments.length) {
            case 0: return new NativeConstructor();
            case 1: return new NativeConstructor(a);
            case 2: return new NativeConstructor(a, b);
          } return new NativeConstructor(a, b, c);
        } return NativeConstructor.apply(this, arguments);
      };
      Wrapper.prototype = NativeConstructor.prototype;
      return Wrapper;
    };

    /*
      options.target      - name of the target object
      options.global      - target is the global object
      options.stat        - export as static methods of target
      options.proto       - export as prototype methods of target
      options.real        - real prototype method for the `pure` version
      options.forced      - export even if the native feature is available
      options.bind        - bind methods to the target, required for the `pure` version
      options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
      options.unsafe      - use the simple assignment of property instead of delete + defineProperty
      options.sham        - add a flag to not completely full polyfills
      options.enumerable  - export as enumerable property
      options.noTargetGet - prevent calling a getter on target
    */
    var _export = function (options, source) {
      var TARGET = options.target;
      var GLOBAL = options.global;
      var STATIC = options.stat;
      var PROTO = options.proto;

      var nativeSource = GLOBAL ? global_1 : STATIC ? global_1[TARGET] : (global_1[TARGET] || {}).prototype;

      var target = GLOBAL ? path : path[TARGET] || (path[TARGET] = {});
      var targetPrototype = target.prototype;

      var FORCED, USE_NATIVE, VIRTUAL_PROTOTYPE;
      var key, sourceProperty, targetProperty, nativeProperty, resultProperty, descriptor;

      for (key in source) {
        FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
        // contains in native
        USE_NATIVE = !FORCED && nativeSource && has(nativeSource, key);

        targetProperty = target[key];

        if (USE_NATIVE) if (options.noTargetGet) {
          descriptor = getOwnPropertyDescriptor$1(nativeSource, key);
          nativeProperty = descriptor && descriptor.value;
        } else nativeProperty = nativeSource[key];

        // export native or implementation
        sourceProperty = (USE_NATIVE && nativeProperty) ? nativeProperty : source[key];

        if (USE_NATIVE && typeof targetProperty === typeof sourceProperty) continue;

        // bind timers to global for call from export context
        if (options.bind && USE_NATIVE) resultProperty = functionBindContext(sourceProperty, global_1);
        // wrap global constructors for prevent changs in this version
        else if (options.wrap && USE_NATIVE) resultProperty = wrapConstructor(sourceProperty);
        // make static versions for prototype methods
        else if (PROTO && typeof sourceProperty == 'function') resultProperty = functionBindContext(Function.call, sourceProperty);
        // default case
        else resultProperty = sourceProperty;

        // add a flag to not completely full polyfills
        if (options.sham || (sourceProperty && sourceProperty.sham) || (targetProperty && targetProperty.sham)) {
          createNonEnumerableProperty(resultProperty, 'sham', true);
        }

        target[key] = resultProperty;

        if (PROTO) {
          VIRTUAL_PROTOTYPE = TARGET + 'Prototype';
          if (!has(path, VIRTUAL_PROTOTYPE)) {
            createNonEnumerableProperty(path, VIRTUAL_PROTOTYPE, {});
          }
          // export virtual prototype methods
          path[VIRTUAL_PROTOTYPE][key] = sourceProperty;
          // export real prototype methods
          if (options.real && targetPrototype && !targetPrototype[key]) {
            createNonEnumerableProperty(targetPrototype, key, sourceProperty);
          }
        }
      }
    };

    // `Object.defineProperty` method
    // https://tc39.github.io/ecma262/#sec-object.defineproperty
    _export({ target: 'Object', stat: true, forced: !descriptors, sham: !descriptors }, {
      defineProperty: objectDefineProperty.f
    });

    var defineProperty_1 = createCommonjsModule(function (module) {
    var Object = path.Object;

    var defineProperty = module.exports = function defineProperty(it, key, desc) {
      return Object.defineProperty(it, key, desc);
    };

    if (Object.defineProperty.sham) defineProperty.sham = true;
    });

    var defineProperty = defineProperty_1;

    var defineProperty$1 = defineProperty;

    var iterators = {};

    var setGlobal = function (key, value) {
      try {
        createNonEnumerableProperty(global_1, key, value);
      } catch (error) {
        global_1[key] = value;
      } return value;
    };

    var SHARED = '__core-js_shared__';
    var store = global_1[SHARED] || setGlobal(SHARED, {});

    var sharedStore = store;

    var functionToString = Function.toString;

    // this helper broken in `3.4.1-3.4.4`, so we can't use `shared` helper
    if (typeof sharedStore.inspectSource != 'function') {
      sharedStore.inspectSource = function (it) {
        return functionToString.call(it);
      };
    }

    var inspectSource = sharedStore.inspectSource;

    var WeakMap$1 = global_1.WeakMap;

    var nativeWeakMap = typeof WeakMap$1 === 'function' && /native code/.test(inspectSource(WeakMap$1));

    var shared = createCommonjsModule(function (module) {
    (module.exports = function (key, value) {
      return sharedStore[key] || (sharedStore[key] = value !== undefined ? value : {});
    })('versions', []).push({
      version: '3.8.1',
      mode:  'pure' ,
      copyright: '© 2020 Denis Pushkarev (zloirock.ru)'
    });
    });

    var id$1 = 0;
    var postfix = Math.random();

    var uid = function (key) {
      return 'Symbol(' + String(key === undefined ? '' : key) + ')_' + (++id$1 + postfix).toString(36);
    };

    var keys = shared('keys');

    var sharedKey = function (key) {
      return keys[key] || (keys[key] = uid(key));
    };

    var hiddenKeys = {};

    var WeakMap$2 = global_1.WeakMap;
    var set, get, has$1;

    var enforce = function (it) {
      return has$1(it) ? get(it) : set(it, {});
    };

    var getterFor = function (TYPE) {
      return function (it) {
        var state;
        if (!isObject(it) || (state = get(it)).type !== TYPE) {
          throw TypeError('Incompatible receiver, ' + TYPE + ' required');
        } return state;
      };
    };

    if (nativeWeakMap) {
      var store$1 = sharedStore.state || (sharedStore.state = new WeakMap$2());
      var wmget = store$1.get;
      var wmhas = store$1.has;
      var wmset = store$1.set;
      set = function (it, metadata) {
        metadata.facade = it;
        wmset.call(store$1, it, metadata);
        return metadata;
      };
      get = function (it) {
        return wmget.call(store$1, it) || {};
      };
      has$1 = function (it) {
        return wmhas.call(store$1, it);
      };
    } else {
      var STATE = sharedKey('state');
      hiddenKeys[STATE] = true;
      set = function (it, metadata) {
        metadata.facade = it;
        createNonEnumerableProperty(it, STATE, metadata);
        return metadata;
      };
      get = function (it) {
        return has(it, STATE) ? it[STATE] : {};
      };
      has$1 = function (it) {
        return has(it, STATE);
      };
    }

    var internalState = {
      set: set,
      get: get,
      has: has$1,
      enforce: enforce,
      getterFor: getterFor
    };

    // `ToObject` abstract operation
    // https://tc39.github.io/ecma262/#sec-toobject
    var toObject$1 = function (argument) {
      return Object(requireObjectCoercible(argument));
    };

    var correctPrototypeGetter = !fails(function () {
      function F() { /* empty */ }
      F.prototype.constructor = null;
      return Object.getPrototypeOf(new F()) !== F.prototype;
    });

    var IE_PROTO = sharedKey('IE_PROTO');
    var ObjectPrototype = Object.prototype;

    // `Object.getPrototypeOf` method
    // https://tc39.github.io/ecma262/#sec-object.getprototypeof
    var objectGetPrototypeOf = correctPrototypeGetter ? Object.getPrototypeOf : function (O) {
      O = toObject$1(O);
      if (has(O, IE_PROTO)) return O[IE_PROTO];
      if (typeof O.constructor == 'function' && O instanceof O.constructor) {
        return O.constructor.prototype;
      } return O instanceof Object ? ObjectPrototype : null;
    };

    var nativeSymbol = !!Object.getOwnPropertySymbols && !fails(function () {
      // Chrome 38 Symbol has incorrect toString conversion
      // eslint-disable-next-line no-undef
      return !String(Symbol());
    });

    var useSymbolAsUid = nativeSymbol
      // eslint-disable-next-line no-undef
      && !Symbol.sham
      // eslint-disable-next-line no-undef
      && typeof Symbol.iterator == 'symbol';

    var WellKnownSymbolsStore = shared('wks');
    var Symbol$1 = global_1.Symbol;
    var createWellKnownSymbol = useSymbolAsUid ? Symbol$1 : Symbol$1 && Symbol$1.withoutSetter || uid;

    var wellKnownSymbol = function (name) {
      if (!has(WellKnownSymbolsStore, name)) {
        if (nativeSymbol && has(Symbol$1, name)) WellKnownSymbolsStore[name] = Symbol$1[name];
        else WellKnownSymbolsStore[name] = createWellKnownSymbol('Symbol.' + name);
      } return WellKnownSymbolsStore[name];
    };

    var ITERATOR = wellKnownSymbol('iterator');
    var BUGGY_SAFARI_ITERATORS = false;

    // `%IteratorPrototype%` object
    // https://tc39.github.io/ecma262/#sec-%iteratorprototype%-object
    var IteratorPrototype, PrototypeOfArrayIteratorPrototype, arrayIterator;

    if ([].keys) {
      arrayIterator = [].keys();
      // Safari 8 has buggy iterators w/o `next`
      if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS = true;
      else {
        PrototypeOfArrayIteratorPrototype = objectGetPrototypeOf(objectGetPrototypeOf(arrayIterator));
        if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype = PrototypeOfArrayIteratorPrototype;
      }
    }

    if (IteratorPrototype == undefined) IteratorPrototype = {};

    var iteratorsCore = {
      IteratorPrototype: IteratorPrototype,
      BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS
    };

    var ceil = Math.ceil;
    var floor = Math.floor;

    // `ToInteger` abstract operation
    // https://tc39.github.io/ecma262/#sec-tointeger
    var toInteger = function (argument) {
      return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
    };

    var min = Math.min;

    // `ToLength` abstract operation
    // https://tc39.github.io/ecma262/#sec-tolength
    var toLength = function (argument) {
      return argument > 0 ? min(toInteger(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
    };

    var max = Math.max;
    var min$1 = Math.min;

    // Helper for a popular repeating case of the spec:
    // Let integer be ? ToInteger(index).
    // If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
    var toAbsoluteIndex = function (index, length) {
      var integer = toInteger(index);
      return integer < 0 ? max(integer + length, 0) : min$1(integer, length);
    };

    // `Array.prototype.{ indexOf, includes }` methods implementation
    var createMethod = function (IS_INCLUDES) {
      return function ($this, el, fromIndex) {
        var O = toIndexedObject($this);
        var length = toLength(O.length);
        var index = toAbsoluteIndex(fromIndex, length);
        var value;
        // Array#includes uses SameValueZero equality algorithm
        // eslint-disable-next-line no-self-compare
        if (IS_INCLUDES && el != el) while (length > index) {
          value = O[index++];
          // eslint-disable-next-line no-self-compare
          if (value != value) return true;
        // Array#indexOf ignores holes, Array#includes - not
        } else for (;length > index; index++) {
          if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
        } return !IS_INCLUDES && -1;
      };
    };

    var arrayIncludes = {
      // `Array.prototype.includes` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.includes
      includes: createMethod(true),
      // `Array.prototype.indexOf` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
      indexOf: createMethod(false)
    };

    var indexOf = arrayIncludes.indexOf;


    var objectKeysInternal = function (object, names) {
      var O = toIndexedObject(object);
      var i = 0;
      var result = [];
      var key;
      for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key);
      // Don't enum bug & hidden keys
      while (names.length > i) if (has(O, key = names[i++])) {
        ~indexOf(result, key) || result.push(key);
      }
      return result;
    };

    // IE8- don't enum bug keys
    var enumBugKeys = [
      'constructor',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf'
    ];

    // `Object.keys` method
    // https://tc39.github.io/ecma262/#sec-object.keys
    var objectKeys = Object.keys || function keys(O) {
      return objectKeysInternal(O, enumBugKeys);
    };

    // `Object.defineProperties` method
    // https://tc39.github.io/ecma262/#sec-object.defineproperties
    var objectDefineProperties = descriptors ? Object.defineProperties : function defineProperties(O, Properties) {
      anObject(O);
      var keys = objectKeys(Properties);
      var length = keys.length;
      var index = 0;
      var key;
      while (length > index) objectDefineProperty.f(O, key = keys[index++], Properties[key]);
      return O;
    };

    var aFunction$1 = function (variable) {
      return typeof variable == 'function' ? variable : undefined;
    };

    var getBuiltIn = function (namespace, method) {
      return arguments.length < 2 ? aFunction$1(path[namespace]) || aFunction$1(global_1[namespace])
        : path[namespace] && path[namespace][method] || global_1[namespace] && global_1[namespace][method];
    };

    var html = getBuiltIn('document', 'documentElement');

    var GT = '>';
    var LT = '<';
    var PROTOTYPE = 'prototype';
    var SCRIPT = 'script';
    var IE_PROTO$1 = sharedKey('IE_PROTO');

    var EmptyConstructor = function () { /* empty */ };

    var scriptTag = function (content) {
      return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
    };

    // Create object with fake `null` prototype: use ActiveX Object with cleared prototype
    var NullProtoObjectViaActiveX = function (activeXDocument) {
      activeXDocument.write(scriptTag(''));
      activeXDocument.close();
      var temp = activeXDocument.parentWindow.Object;
      activeXDocument = null; // avoid memory leak
      return temp;
    };

    // Create object with fake `null` prototype: use iframe Object with cleared prototype
    var NullProtoObjectViaIFrame = function () {
      // Thrash, waste and sodomy: IE GC bug
      var iframe = documentCreateElement('iframe');
      var JS = 'java' + SCRIPT + ':';
      var iframeDocument;
      iframe.style.display = 'none';
      html.appendChild(iframe);
      // https://github.com/zloirock/core-js/issues/475
      iframe.src = String(JS);
      iframeDocument = iframe.contentWindow.document;
      iframeDocument.open();
      iframeDocument.write(scriptTag('document.F=Object'));
      iframeDocument.close();
      return iframeDocument.F;
    };

    // Check for document.domain and active x support
    // No need to use active x approach when document.domain is not set
    // see https://github.com/es-shims/es5-shim/issues/150
    // variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
    // avoid IE GC bug
    var activeXDocument;
    var NullProtoObject = function () {
      try {
        /* global ActiveXObject */
        activeXDocument = document.domain && new ActiveXObject('htmlfile');
      } catch (error) { /* ignore */ }
      NullProtoObject = activeXDocument ? NullProtoObjectViaActiveX(activeXDocument) : NullProtoObjectViaIFrame();
      var length = enumBugKeys.length;
      while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];
      return NullProtoObject();
    };

    hiddenKeys[IE_PROTO$1] = true;

    // `Object.create` method
    // https://tc39.github.io/ecma262/#sec-object.create
    var objectCreate = Object.create || function create(O, Properties) {
      var result;
      if (O !== null) {
        EmptyConstructor[PROTOTYPE] = anObject(O);
        result = new EmptyConstructor();
        EmptyConstructor[PROTOTYPE] = null;
        // add "__proto__" for Object.getPrototypeOf polyfill
        result[IE_PROTO$1] = O;
      } else result = NullProtoObject();
      return Properties === undefined ? result : objectDefineProperties(result, Properties);
    };

    var TO_STRING_TAG = wellKnownSymbol('toStringTag');
    var test = {};

    test[TO_STRING_TAG] = 'z';

    var toStringTagSupport = String(test) === '[object z]';

    var TO_STRING_TAG$1 = wellKnownSymbol('toStringTag');
    // ES3 wrong here
    var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

    // fallback for IE11 Script Access Denied error
    var tryGet = function (it, key) {
      try {
        return it[key];
      } catch (error) { /* empty */ }
    };

    // getting tag from ES6+ `Object.prototype.toString`
    var classof = toStringTagSupport ? classofRaw : function (it) {
      var O, tag, result;
      return it === undefined ? 'Undefined' : it === null ? 'Null'
        // @@toStringTag case
        : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG$1)) == 'string' ? tag
        // builtinTag case
        : CORRECT_ARGUMENTS ? classofRaw(O)
        // ES3 arguments fallback
        : (result = classofRaw(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : result;
    };

    // `Object.prototype.toString` method implementation
    // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
    var objectToString = toStringTagSupport ? {}.toString : function toString() {
      return '[object ' + classof(this) + ']';
    };

    var defineProperty$2 = objectDefineProperty.f;





    var TO_STRING_TAG$2 = wellKnownSymbol('toStringTag');

    var setToStringTag = function (it, TAG, STATIC, SET_METHOD) {
      if (it) {
        var target = STATIC ? it : it.prototype;
        if (!has(target, TO_STRING_TAG$2)) {
          defineProperty$2(target, TO_STRING_TAG$2, { configurable: true, value: TAG });
        }
        if (SET_METHOD && !toStringTagSupport) {
          createNonEnumerableProperty(target, 'toString', objectToString);
        }
      }
    };

    var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;





    var returnThis = function () { return this; };

    var createIteratorConstructor = function (IteratorConstructor, NAME, next) {
      var TO_STRING_TAG = NAME + ' Iterator';
      IteratorConstructor.prototype = objectCreate(IteratorPrototype$1, { next: createPropertyDescriptor(1, next) });
      setToStringTag(IteratorConstructor, TO_STRING_TAG, false, true);
      iterators[TO_STRING_TAG] = returnThis;
      return IteratorConstructor;
    };

    var aPossiblePrototype = function (it) {
      if (!isObject(it) && it !== null) {
        throw TypeError("Can't set " + String(it) + ' as a prototype');
      } return it;
    };

    // `Object.setPrototypeOf` method
    // https://tc39.github.io/ecma262/#sec-object.setprototypeof
    // Works with __proto__ only. Old v8 can't work with null proto objects.
    /* eslint-disable no-proto */
    var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
      var CORRECT_SETTER = false;
      var test = {};
      var setter;
      try {
        setter = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;
        setter.call(test, []);
        CORRECT_SETTER = test instanceof Array;
      } catch (error) { /* empty */ }
      return function setPrototypeOf(O, proto) {
        anObject(O);
        aPossiblePrototype(proto);
        if (CORRECT_SETTER) setter.call(O, proto);
        else O.__proto__ = proto;
        return O;
      };
    }() : undefined);

    var redefine = function (target, key, value, options) {
      if (options && options.enumerable) target[key] = value;
      else createNonEnumerableProperty(target, key, value);
    };

    var IteratorPrototype$2 = iteratorsCore.IteratorPrototype;
    var BUGGY_SAFARI_ITERATORS$1 = iteratorsCore.BUGGY_SAFARI_ITERATORS;
    var ITERATOR$1 = wellKnownSymbol('iterator');
    var KEYS = 'keys';
    var VALUES = 'values';
    var ENTRIES = 'entries';

    var returnThis$1 = function () { return this; };

    var defineIterator = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
      createIteratorConstructor(IteratorConstructor, NAME, next);

      var getIterationMethod = function (KIND) {
        if (KIND === DEFAULT && defaultIterator) return defaultIterator;
        if (!BUGGY_SAFARI_ITERATORS$1 && KIND in IterablePrototype) return IterablePrototype[KIND];
        switch (KIND) {
          case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
          case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
          case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
        } return function () { return new IteratorConstructor(this); };
      };

      var TO_STRING_TAG = NAME + ' Iterator';
      var INCORRECT_VALUES_NAME = false;
      var IterablePrototype = Iterable.prototype;
      var nativeIterator = IterablePrototype[ITERATOR$1]
        || IterablePrototype['@@iterator']
        || DEFAULT && IterablePrototype[DEFAULT];
      var defaultIterator = !BUGGY_SAFARI_ITERATORS$1 && nativeIterator || getIterationMethod(DEFAULT);
      var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
      var CurrentIteratorPrototype, methods, KEY;

      // fix native
      if (anyNativeIterator) {
        CurrentIteratorPrototype = objectGetPrototypeOf(anyNativeIterator.call(new Iterable()));
        if (IteratorPrototype$2 !== Object.prototype && CurrentIteratorPrototype.next) {
          // Set @@toStringTag to native iterators
          setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true, true);
          iterators[TO_STRING_TAG] = returnThis$1;
        }
      }

      // fix Array#{values, @@iterator}.name in V8 / FF
      if (DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
        INCORRECT_VALUES_NAME = true;
        defaultIterator = function values() { return nativeIterator.call(this); };
      }

      // define iterator
      if (( FORCED) && IterablePrototype[ITERATOR$1] !== defaultIterator) {
        createNonEnumerableProperty(IterablePrototype, ITERATOR$1, defaultIterator);
      }
      iterators[NAME] = defaultIterator;

      // export additional methods
      if (DEFAULT) {
        methods = {
          values: getIterationMethod(VALUES),
          keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
          entries: getIterationMethod(ENTRIES)
        };
        if (FORCED) for (KEY in methods) {
          if (BUGGY_SAFARI_ITERATORS$1 || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
            redefine(IterablePrototype, KEY, methods[KEY]);
          }
        } else _export({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS$1 || INCORRECT_VALUES_NAME }, methods);
      }

      return methods;
    };

    var ARRAY_ITERATOR = 'Array Iterator';
    var setInternalState = internalState.set;
    var getInternalState = internalState.getterFor(ARRAY_ITERATOR);

    // `Array.prototype.entries` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.entries
    // `Array.prototype.keys` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.keys
    // `Array.prototype.values` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.values
    // `Array.prototype[@@iterator]` method
    // https://tc39.github.io/ecma262/#sec-array.prototype-@@iterator
    // `CreateArrayIterator` internal method
    // https://tc39.github.io/ecma262/#sec-createarrayiterator
    var es_array_iterator = defineIterator(Array, 'Array', function (iterated, kind) {
      setInternalState(this, {
        type: ARRAY_ITERATOR,
        target: toIndexedObject(iterated), // target
        index: 0,                          // next index
        kind: kind                         // kind
      });
    // `%ArrayIteratorPrototype%.next` method
    // https://tc39.github.io/ecma262/#sec-%arrayiteratorprototype%.next
    }, function () {
      var state = getInternalState(this);
      var target = state.target;
      var kind = state.kind;
      var index = state.index++;
      if (!target || index >= target.length) {
        state.target = undefined;
        return { value: undefined, done: true };
      }
      if (kind == 'keys') return { value: index, done: false };
      if (kind == 'values') return { value: target[index], done: false };
      return { value: [index, target[index]], done: false };
    }, 'values');

    // argumentsList[@@iterator] is %ArrayProto_values%
    // https://tc39.github.io/ecma262/#sec-createunmappedargumentsobject
    // https://tc39.github.io/ecma262/#sec-createmappedargumentsobject
    iterators.Arguments = iterators.Array;

    // iterable DOM collections
    // flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
    var domIterables = {
      CSSRuleList: 0,
      CSSStyleDeclaration: 0,
      CSSValueList: 0,
      ClientRectList: 0,
      DOMRectList: 0,
      DOMStringList: 0,
      DOMTokenList: 1,
      DataTransferItemList: 0,
      FileList: 0,
      HTMLAllCollection: 0,
      HTMLCollection: 0,
      HTMLFormElement: 0,
      HTMLSelectElement: 0,
      MediaList: 0,
      MimeTypeArray: 0,
      NamedNodeMap: 0,
      NodeList: 1,
      PaintRequestList: 0,
      Plugin: 0,
      PluginArray: 0,
      SVGLengthList: 0,
      SVGNumberList: 0,
      SVGPathSegList: 0,
      SVGPointList: 0,
      SVGStringList: 0,
      SVGTransformList: 0,
      SourceBufferList: 0,
      StyleSheetList: 0,
      TextTrackCueList: 0,
      TextTrackList: 0,
      TouchList: 0
    };

    var TO_STRING_TAG$3 = wellKnownSymbol('toStringTag');

    for (var COLLECTION_NAME in domIterables) {
      var Collection = global_1[COLLECTION_NAME];
      var CollectionPrototype = Collection && Collection.prototype;
      if (CollectionPrototype && classof(CollectionPrototype) !== TO_STRING_TAG$3) {
        createNonEnumerableProperty(CollectionPrototype, TO_STRING_TAG$3, COLLECTION_NAME);
      }
      iterators[COLLECTION_NAME] = iterators.Array;
    }

    // `String.prototype.{ codePointAt, at }` methods implementation
    var createMethod$1 = function (CONVERT_TO_STRING) {
      return function ($this, pos) {
        var S = String(requireObjectCoercible($this));
        var position = toInteger(pos);
        var size = S.length;
        var first, second;
        if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
        first = S.charCodeAt(position);
        return first < 0xD800 || first > 0xDBFF || position + 1 === size
          || (second = S.charCodeAt(position + 1)) < 0xDC00 || second > 0xDFFF
            ? CONVERT_TO_STRING ? S.charAt(position) : first
            : CONVERT_TO_STRING ? S.slice(position, position + 2) : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
      };
    };

    var stringMultibyte = {
      // `String.prototype.codePointAt` method
      // https://tc39.github.io/ecma262/#sec-string.prototype.codepointat
      codeAt: createMethod$1(false),
      // `String.prototype.at` method
      // https://github.com/mathiasbynens/String.prototype.at
      charAt: createMethod$1(true)
    };

    var charAt = stringMultibyte.charAt;



    var STRING_ITERATOR = 'String Iterator';
    var setInternalState$1 = internalState.set;
    var getInternalState$1 = internalState.getterFor(STRING_ITERATOR);

    // `String.prototype[@@iterator]` method
    // https://tc39.github.io/ecma262/#sec-string.prototype-@@iterator
    defineIterator(String, 'String', function (iterated) {
      setInternalState$1(this, {
        type: STRING_ITERATOR,
        string: String(iterated),
        index: 0
      });
    // `%StringIteratorPrototype%.next` method
    // https://tc39.github.io/ecma262/#sec-%stringiteratorprototype%.next
    }, function next() {
      var state = getInternalState$1(this);
      var string = state.string;
      var index = state.index;
      var point;
      if (index >= string.length) return { value: undefined, done: true };
      point = charAt(string, index);
      state.index += point.length;
      return { value: point, done: false };
    });

    var ITERATOR$2 = wellKnownSymbol('iterator');

    var getIteratorMethod = function (it) {
      if (it != undefined) return it[ITERATOR$2]
        || it['@@iterator']
        || iterators[classof(it)];
    };

    var getIterator = function (it) {
      var iteratorMethod = getIteratorMethod(it);
      if (typeof iteratorMethod != 'function') {
        throw TypeError(String(it) + ' is not iterable');
      } return anObject(iteratorMethod.call(it));
    };

    var getIterator_1 = getIterator;

    var getIterator$1 = getIterator_1;

    // `IsArray` abstract operation
    // https://tc39.github.io/ecma262/#sec-isarray
    var isArray = Array.isArray || function isArray(arg) {
      return classofRaw(arg) == 'Array';
    };

    // `Array.isArray` method
    // https://tc39.github.io/ecma262/#sec-array.isarray
    _export({ target: 'Array', stat: true }, {
      isArray: isArray
    });

    var isArray$1 = path.Array.isArray;

    var isArray$2 = isArray$1;

    var isArray$3 = isArray$2;

    var getIteratorMethod_1 = getIteratorMethod;

    var getIteratorMethod$1 = getIteratorMethod_1;

    var createProperty = function (object, key, value) {
      var propertyKey = toPrimitive(key);
      if (propertyKey in object) objectDefineProperty.f(object, propertyKey, createPropertyDescriptor(0, value));
      else object[propertyKey] = value;
    };

    var SPECIES = wellKnownSymbol('species');

    // `ArraySpeciesCreate` abstract operation
    // https://tc39.github.io/ecma262/#sec-arrayspeciescreate
    var arraySpeciesCreate = function (originalArray, length) {
      var C;
      if (isArray(originalArray)) {
        C = originalArray.constructor;
        // cross-realm fallback
        if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
        else if (isObject(C)) {
          C = C[SPECIES];
          if (C === null) C = undefined;
        }
      } return new (C === undefined ? Array : C)(length === 0 ? 0 : length);
    };

    var engineUserAgent = getBuiltIn('navigator', 'userAgent') || '';

    var process = global_1.process;
    var versions = process && process.versions;
    var v8 = versions && versions.v8;
    var match, version$1;

    if (v8) {
      match = v8.split('.');
      version$1 = match[0] + match[1];
    } else if (engineUserAgent) {
      match = engineUserAgent.match(/Edge\/(\d+)/);
      if (!match || match[1] >= 74) {
        match = engineUserAgent.match(/Chrome\/(\d+)/);
        if (match) version$1 = match[1];
      }
    }

    var engineV8Version = version$1 && +version$1;

    var SPECIES$1 = wellKnownSymbol('species');

    var arrayMethodHasSpeciesSupport = function (METHOD_NAME) {
      // We can't use this feature detection in V8 since it causes
      // deoptimization and serious performance degradation
      // https://github.com/zloirock/core-js/issues/677
      return engineV8Version >= 51 || !fails(function () {
        var array = [];
        var constructor = array.constructor = {};
        constructor[SPECIES$1] = function () {
          return { foo: 1 };
        };
        return array[METHOD_NAME](Boolean).foo !== 1;
      });
    };

    var IS_CONCAT_SPREADABLE = wellKnownSymbol('isConcatSpreadable');
    var MAX_SAFE_INTEGER = 0x1FFFFFFFFFFFFF;
    var MAXIMUM_ALLOWED_INDEX_EXCEEDED = 'Maximum allowed index exceeded';

    // We can't use this feature detection in V8 since it causes
    // deoptimization and serious performance degradation
    // https://github.com/zloirock/core-js/issues/679
    var IS_CONCAT_SPREADABLE_SUPPORT = engineV8Version >= 51 || !fails(function () {
      var array = [];
      array[IS_CONCAT_SPREADABLE] = false;
      return array.concat()[0] !== array;
    });

    var SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('concat');

    var isConcatSpreadable = function (O) {
      if (!isObject(O)) return false;
      var spreadable = O[IS_CONCAT_SPREADABLE];
      return spreadable !== undefined ? !!spreadable : isArray(O);
    };

    var FORCED = !IS_CONCAT_SPREADABLE_SUPPORT || !SPECIES_SUPPORT;

    // `Array.prototype.concat` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.concat
    // with adding support of @@isConcatSpreadable and @@species
    _export({ target: 'Array', proto: true, forced: FORCED }, {
      concat: function concat(arg) { // eslint-disable-line no-unused-vars
        var O = toObject$1(this);
        var A = arraySpeciesCreate(O, 0);
        var n = 0;
        var i, k, length, len, E;
        for (i = -1, length = arguments.length; i < length; i++) {
          E = i === -1 ? O : arguments[i];
          if (isConcatSpreadable(E)) {
            len = toLength(E.length);
            if (n + len > MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
            for (k = 0; k < len; k++, n++) if (k in E) createProperty(A, n, E[k]);
          } else {
            if (n >= MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
            createProperty(A, n++, E);
          }
        }
        A.length = n;
        return A;
      }
    });

    var hiddenKeys$1 = enumBugKeys.concat('length', 'prototype');

    // `Object.getOwnPropertyNames` method
    // https://tc39.github.io/ecma262/#sec-object.getownpropertynames
    var f$3 = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
      return objectKeysInternal(O, hiddenKeys$1);
    };

    var objectGetOwnPropertyNames = {
    	f: f$3
    };

    var nativeGetOwnPropertyNames = objectGetOwnPropertyNames.f;

    var toString$1 = {}.toString;

    var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
      ? Object.getOwnPropertyNames(window) : [];

    var getWindowNames = function (it) {
      try {
        return nativeGetOwnPropertyNames(it);
      } catch (error) {
        return windowNames.slice();
      }
    };

    // fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
    var f$4 = function getOwnPropertyNames(it) {
      return windowNames && toString$1.call(it) == '[object Window]'
        ? getWindowNames(it)
        : nativeGetOwnPropertyNames(toIndexedObject(it));
    };

    var objectGetOwnPropertyNamesExternal = {
    	f: f$4
    };

    var f$5 = Object.getOwnPropertySymbols;

    var objectGetOwnPropertySymbols = {
    	f: f$5
    };

    var f$6 = wellKnownSymbol;

    var wellKnownSymbolWrapped = {
    	f: f$6
    };

    var defineProperty$3 = objectDefineProperty.f;

    var defineWellKnownSymbol = function (NAME) {
      var Symbol = path.Symbol || (path.Symbol = {});
      if (!has(Symbol, NAME)) defineProperty$3(Symbol, NAME, {
        value: wellKnownSymbolWrapped.f(NAME)
      });
    };

    var push = [].push;

    // `Array.prototype.{ forEach, map, filter, some, every, find, findIndex, filterOut }` methods implementation
    var createMethod$2 = function (TYPE) {
      var IS_MAP = TYPE == 1;
      var IS_FILTER = TYPE == 2;
      var IS_SOME = TYPE == 3;
      var IS_EVERY = TYPE == 4;
      var IS_FIND_INDEX = TYPE == 6;
      var IS_FILTER_OUT = TYPE == 7;
      var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
      return function ($this, callbackfn, that, specificCreate) {
        var O = toObject$1($this);
        var self = indexedObject(O);
        var boundFunction = functionBindContext(callbackfn, that, 3);
        var length = toLength(self.length);
        var index = 0;
        var create = specificCreate || arraySpeciesCreate;
        var target = IS_MAP ? create($this, length) : IS_FILTER || IS_FILTER_OUT ? create($this, 0) : undefined;
        var value, result;
        for (;length > index; index++) if (NO_HOLES || index in self) {
          value = self[index];
          result = boundFunction(value, index, O);
          if (TYPE) {
            if (IS_MAP) target[index] = result; // map
            else if (result) switch (TYPE) {
              case 3: return true;              // some
              case 5: return value;             // find
              case 6: return index;             // findIndex
              case 2: push.call(target, value); // filter
            } else switch (TYPE) {
              case 4: return false;             // every
              case 7: push.call(target, value); // filterOut
            }
          }
        }
        return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
      };
    };

    var arrayIteration = {
      // `Array.prototype.forEach` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
      forEach: createMethod$2(0),
      // `Array.prototype.map` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.map
      map: createMethod$2(1),
      // `Array.prototype.filter` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.filter
      filter: createMethod$2(2),
      // `Array.prototype.some` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.some
      some: createMethod$2(3),
      // `Array.prototype.every` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.every
      every: createMethod$2(4),
      // `Array.prototype.find` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.find
      find: createMethod$2(5),
      // `Array.prototype.findIndex` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
      findIndex: createMethod$2(6),
      // `Array.prototype.filterOut` method
      // https://github.com/tc39/proposal-array-filtering
      filterOut: createMethod$2(7)
    };

    var $forEach = arrayIteration.forEach;

    var HIDDEN = sharedKey('hidden');
    var SYMBOL = 'Symbol';
    var PROTOTYPE$1 = 'prototype';
    var TO_PRIMITIVE = wellKnownSymbol('toPrimitive');
    var setInternalState$2 = internalState.set;
    var getInternalState$2 = internalState.getterFor(SYMBOL);
    var ObjectPrototype$1 = Object[PROTOTYPE$1];
    var $Symbol = global_1.Symbol;
    var $stringify = getBuiltIn('JSON', 'stringify');
    var nativeGetOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;
    var nativeDefineProperty$1 = objectDefineProperty.f;
    var nativeGetOwnPropertyNames$1 = objectGetOwnPropertyNamesExternal.f;
    var nativePropertyIsEnumerable$1 = objectPropertyIsEnumerable.f;
    var AllSymbols = shared('symbols');
    var ObjectPrototypeSymbols = shared('op-symbols');
    var StringToSymbolRegistry = shared('string-to-symbol-registry');
    var SymbolToStringRegistry = shared('symbol-to-string-registry');
    var WellKnownSymbolsStore$1 = shared('wks');
    var QObject = global_1.QObject;
    // Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
    var USE_SETTER = !QObject || !QObject[PROTOTYPE$1] || !QObject[PROTOTYPE$1].findChild;

    // fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
    var setSymbolDescriptor = descriptors && fails(function () {
      return objectCreate(nativeDefineProperty$1({}, 'a', {
        get: function () { return nativeDefineProperty$1(this, 'a', { value: 7 }).a; }
      })).a != 7;
    }) ? function (O, P, Attributes) {
      var ObjectPrototypeDescriptor = nativeGetOwnPropertyDescriptor$1(ObjectPrototype$1, P);
      if (ObjectPrototypeDescriptor) delete ObjectPrototype$1[P];
      nativeDefineProperty$1(O, P, Attributes);
      if (ObjectPrototypeDescriptor && O !== ObjectPrototype$1) {
        nativeDefineProperty$1(ObjectPrototype$1, P, ObjectPrototypeDescriptor);
      }
    } : nativeDefineProperty$1;

    var wrap = function (tag, description) {
      var symbol = AllSymbols[tag] = objectCreate($Symbol[PROTOTYPE$1]);
      setInternalState$2(symbol, {
        type: SYMBOL,
        tag: tag,
        description: description
      });
      if (!descriptors) symbol.description = description;
      return symbol;
    };

    var isSymbol = useSymbolAsUid ? function (it) {
      return typeof it == 'symbol';
    } : function (it) {
      return Object(it) instanceof $Symbol;
    };

    var $defineProperty = function defineProperty(O, P, Attributes) {
      if (O === ObjectPrototype$1) $defineProperty(ObjectPrototypeSymbols, P, Attributes);
      anObject(O);
      var key = toPrimitive(P, true);
      anObject(Attributes);
      if (has(AllSymbols, key)) {
        if (!Attributes.enumerable) {
          if (!has(O, HIDDEN)) nativeDefineProperty$1(O, HIDDEN, createPropertyDescriptor(1, {}));
          O[HIDDEN][key] = true;
        } else {
          if (has(O, HIDDEN) && O[HIDDEN][key]) O[HIDDEN][key] = false;
          Attributes = objectCreate(Attributes, { enumerable: createPropertyDescriptor(0, false) });
        } return setSymbolDescriptor(O, key, Attributes);
      } return nativeDefineProperty$1(O, key, Attributes);
    };

    var $defineProperties = function defineProperties(O, Properties) {
      anObject(O);
      var properties = toIndexedObject(Properties);
      var keys = objectKeys(properties).concat($getOwnPropertySymbols(properties));
      $forEach(keys, function (key) {
        if (!descriptors || $propertyIsEnumerable.call(properties, key)) $defineProperty(O, key, properties[key]);
      });
      return O;
    };

    var $create = function create(O, Properties) {
      return Properties === undefined ? objectCreate(O) : $defineProperties(objectCreate(O), Properties);
    };

    var $propertyIsEnumerable = function propertyIsEnumerable(V) {
      var P = toPrimitive(V, true);
      var enumerable = nativePropertyIsEnumerable$1.call(this, P);
      if (this === ObjectPrototype$1 && has(AllSymbols, P) && !has(ObjectPrototypeSymbols, P)) return false;
      return enumerable || !has(this, P) || !has(AllSymbols, P) || has(this, HIDDEN) && this[HIDDEN][P] ? enumerable : true;
    };

    var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(O, P) {
      var it = toIndexedObject(O);
      var key = toPrimitive(P, true);
      if (it === ObjectPrototype$1 && has(AllSymbols, key) && !has(ObjectPrototypeSymbols, key)) return;
      var descriptor = nativeGetOwnPropertyDescriptor$1(it, key);
      if (descriptor && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) {
        descriptor.enumerable = true;
      }
      return descriptor;
    };

    var $getOwnPropertyNames = function getOwnPropertyNames(O) {
      var names = nativeGetOwnPropertyNames$1(toIndexedObject(O));
      var result = [];
      $forEach(names, function (key) {
        if (!has(AllSymbols, key) && !has(hiddenKeys, key)) result.push(key);
      });
      return result;
    };

    var $getOwnPropertySymbols = function getOwnPropertySymbols(O) {
      var IS_OBJECT_PROTOTYPE = O === ObjectPrototype$1;
      var names = nativeGetOwnPropertyNames$1(IS_OBJECT_PROTOTYPE ? ObjectPrototypeSymbols : toIndexedObject(O));
      var result = [];
      $forEach(names, function (key) {
        if (has(AllSymbols, key) && (!IS_OBJECT_PROTOTYPE || has(ObjectPrototype$1, key))) {
          result.push(AllSymbols[key]);
        }
      });
      return result;
    };

    // `Symbol` constructor
    // https://tc39.github.io/ecma262/#sec-symbol-constructor
    if (!nativeSymbol) {
      $Symbol = function Symbol() {
        if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor');
        var description = !arguments.length || arguments[0] === undefined ? undefined : String(arguments[0]);
        var tag = uid(description);
        var setter = function (value) {
          if (this === ObjectPrototype$1) setter.call(ObjectPrototypeSymbols, value);
          if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
          setSymbolDescriptor(this, tag, createPropertyDescriptor(1, value));
        };
        if (descriptors && USE_SETTER) setSymbolDescriptor(ObjectPrototype$1, tag, { configurable: true, set: setter });
        return wrap(tag, description);
      };

      redefine($Symbol[PROTOTYPE$1], 'toString', function toString() {
        return getInternalState$2(this).tag;
      });

      redefine($Symbol, 'withoutSetter', function (description) {
        return wrap(uid(description), description);
      });

      objectPropertyIsEnumerable.f = $propertyIsEnumerable;
      objectDefineProperty.f = $defineProperty;
      objectGetOwnPropertyDescriptor.f = $getOwnPropertyDescriptor;
      objectGetOwnPropertyNames.f = objectGetOwnPropertyNamesExternal.f = $getOwnPropertyNames;
      objectGetOwnPropertySymbols.f = $getOwnPropertySymbols;

      wellKnownSymbolWrapped.f = function (name) {
        return wrap(wellKnownSymbol(name), name);
      };

      if (descriptors) {
        // https://github.com/tc39/proposal-Symbol-description
        nativeDefineProperty$1($Symbol[PROTOTYPE$1], 'description', {
          configurable: true,
          get: function description() {
            return getInternalState$2(this).description;
          }
        });
      }
    }

    _export({ global: true, wrap: true, forced: !nativeSymbol, sham: !nativeSymbol }, {
      Symbol: $Symbol
    });

    $forEach(objectKeys(WellKnownSymbolsStore$1), function (name) {
      defineWellKnownSymbol(name);
    });

    _export({ target: SYMBOL, stat: true, forced: !nativeSymbol }, {
      // `Symbol.for` method
      // https://tc39.github.io/ecma262/#sec-symbol.for
      'for': function (key) {
        var string = String(key);
        if (has(StringToSymbolRegistry, string)) return StringToSymbolRegistry[string];
        var symbol = $Symbol(string);
        StringToSymbolRegistry[string] = symbol;
        SymbolToStringRegistry[symbol] = string;
        return symbol;
      },
      // `Symbol.keyFor` method
      // https://tc39.github.io/ecma262/#sec-symbol.keyfor
      keyFor: function keyFor(sym) {
        if (!isSymbol(sym)) throw TypeError(sym + ' is not a symbol');
        if (has(SymbolToStringRegistry, sym)) return SymbolToStringRegistry[sym];
      },
      useSetter: function () { USE_SETTER = true; },
      useSimple: function () { USE_SETTER = false; }
    });

    _export({ target: 'Object', stat: true, forced: !nativeSymbol, sham: !descriptors }, {
      // `Object.create` method
      // https://tc39.github.io/ecma262/#sec-object.create
      create: $create,
      // `Object.defineProperty` method
      // https://tc39.github.io/ecma262/#sec-object.defineproperty
      defineProperty: $defineProperty,
      // `Object.defineProperties` method
      // https://tc39.github.io/ecma262/#sec-object.defineproperties
      defineProperties: $defineProperties,
      // `Object.getOwnPropertyDescriptor` method
      // https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptors
      getOwnPropertyDescriptor: $getOwnPropertyDescriptor
    });

    _export({ target: 'Object', stat: true, forced: !nativeSymbol }, {
      // `Object.getOwnPropertyNames` method
      // https://tc39.github.io/ecma262/#sec-object.getownpropertynames
      getOwnPropertyNames: $getOwnPropertyNames,
      // `Object.getOwnPropertySymbols` method
      // https://tc39.github.io/ecma262/#sec-object.getownpropertysymbols
      getOwnPropertySymbols: $getOwnPropertySymbols
    });

    // Chrome 38 and 39 `Object.getOwnPropertySymbols` fails on primitives
    // https://bugs.chromium.org/p/v8/issues/detail?id=3443
    _export({ target: 'Object', stat: true, forced: fails(function () { objectGetOwnPropertySymbols.f(1); }) }, {
      getOwnPropertySymbols: function getOwnPropertySymbols(it) {
        return objectGetOwnPropertySymbols.f(toObject$1(it));
      }
    });

    // `JSON.stringify` method behavior with symbols
    // https://tc39.github.io/ecma262/#sec-json.stringify
    if ($stringify) {
      var FORCED_JSON_STRINGIFY = !nativeSymbol || fails(function () {
        var symbol = $Symbol();
        // MS Edge converts symbol values to JSON as {}
        return $stringify([symbol]) != '[null]'
          // WebKit converts symbol values to JSON as null
          || $stringify({ a: symbol }) != '{}'
          // V8 throws on boxed symbols
          || $stringify(Object(symbol)) != '{}';
      });

      _export({ target: 'JSON', stat: true, forced: FORCED_JSON_STRINGIFY }, {
        // eslint-disable-next-line no-unused-vars
        stringify: function stringify(it, replacer, space) {
          var args = [it];
          var index = 1;
          var $replacer;
          while (arguments.length > index) args.push(arguments[index++]);
          $replacer = replacer;
          if (!isObject(replacer) && it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
          if (!isArray(replacer)) replacer = function (key, value) {
            if (typeof $replacer == 'function') value = $replacer.call(this, key, value);
            if (!isSymbol(value)) return value;
          };
          args[1] = replacer;
          return $stringify.apply(null, args);
        }
      });
    }

    // `Symbol.prototype[@@toPrimitive]` method
    // https://tc39.github.io/ecma262/#sec-symbol.prototype-@@toprimitive
    if (!$Symbol[PROTOTYPE$1][TO_PRIMITIVE]) {
      createNonEnumerableProperty($Symbol[PROTOTYPE$1], TO_PRIMITIVE, $Symbol[PROTOTYPE$1].valueOf);
    }
    // `Symbol.prototype[@@toStringTag]` property
    // https://tc39.github.io/ecma262/#sec-symbol.prototype-@@tostringtag
    setToStringTag($Symbol, SYMBOL);

    hiddenKeys[HIDDEN] = true;

    // `Symbol.asyncIterator` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.asynciterator
    defineWellKnownSymbol('asyncIterator');

    // `Symbol.hasInstance` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.hasinstance
    defineWellKnownSymbol('hasInstance');

    // `Symbol.isConcatSpreadable` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.isconcatspreadable
    defineWellKnownSymbol('isConcatSpreadable');

    // `Symbol.iterator` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.iterator
    defineWellKnownSymbol('iterator');

    // `Symbol.match` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.match
    defineWellKnownSymbol('match');

    // `Symbol.matchAll` well-known symbol
    defineWellKnownSymbol('matchAll');

    // `Symbol.replace` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.replace
    defineWellKnownSymbol('replace');

    // `Symbol.search` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.search
    defineWellKnownSymbol('search');

    // `Symbol.species` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.species
    defineWellKnownSymbol('species');

    // `Symbol.split` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.split
    defineWellKnownSymbol('split');

    // `Symbol.toPrimitive` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.toprimitive
    defineWellKnownSymbol('toPrimitive');

    // `Symbol.toStringTag` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.tostringtag
    defineWellKnownSymbol('toStringTag');

    // `Symbol.unscopables` well-known symbol
    // https://tc39.github.io/ecma262/#sec-symbol.unscopables
    defineWellKnownSymbol('unscopables');

    // JSON[@@toStringTag] property
    // https://tc39.github.io/ecma262/#sec-json-@@tostringtag
    setToStringTag(global_1.JSON, 'JSON', true);

    var symbol = path.Symbol;

    var symbol$1 = symbol;

    var symbol$2 = symbol$1;

    var iteratorClose = function (iterator) {
      var returnMethod = iterator['return'];
      if (returnMethod !== undefined) {
        return anObject(returnMethod.call(iterator)).value;
      }
    };

    // call something on iterator step with safe closing on error
    var callWithSafeIterationClosing = function (iterator, fn, value, ENTRIES) {
      try {
        return ENTRIES ? fn(anObject(value)[0], value[1]) : fn(value);
      // 7.4.6 IteratorClose(iterator, completion)
      } catch (error) {
        iteratorClose(iterator);
        throw error;
      }
    };

    var ITERATOR$3 = wellKnownSymbol('iterator');
    var ArrayPrototype = Array.prototype;

    // check on default Array iterator
    var isArrayIteratorMethod = function (it) {
      return it !== undefined && (iterators.Array === it || ArrayPrototype[ITERATOR$3] === it);
    };

    // `Array.from` method implementation
    // https://tc39.github.io/ecma262/#sec-array.from
    var arrayFrom = function from(arrayLike /* , mapfn = undefined, thisArg = undefined */) {
      var O = toObject$1(arrayLike);
      var C = typeof this == 'function' ? this : Array;
      var argumentsLength = arguments.length;
      var mapfn = argumentsLength > 1 ? arguments[1] : undefined;
      var mapping = mapfn !== undefined;
      var iteratorMethod = getIteratorMethod(O);
      var index = 0;
      var length, result, step, iterator, next, value;
      if (mapping) mapfn = functionBindContext(mapfn, argumentsLength > 2 ? arguments[2] : undefined, 2);
      // if the target is not iterable or it's an array with the default iterator - use a simple case
      if (iteratorMethod != undefined && !(C == Array && isArrayIteratorMethod(iteratorMethod))) {
        iterator = iteratorMethod.call(O);
        next = iterator.next;
        result = new C();
        for (;!(step = next.call(iterator)).done; index++) {
          value = mapping ? callWithSafeIterationClosing(iterator, mapfn, [step.value, index], true) : step.value;
          createProperty(result, index, value);
        }
      } else {
        length = toLength(O.length);
        result = new C(length);
        for (;length > index; index++) {
          value = mapping ? mapfn(O[index], index) : O[index];
          createProperty(result, index, value);
        }
      }
      result.length = index;
      return result;
    };

    var ITERATOR$4 = wellKnownSymbol('iterator');
    var SAFE_CLOSING = false;

    try {
      var called = 0;
      var iteratorWithReturn = {
        next: function () {
          return { done: !!called++ };
        },
        'return': function () {
          SAFE_CLOSING = true;
        }
      };
      iteratorWithReturn[ITERATOR$4] = function () {
        return this;
      };
      // eslint-disable-next-line no-throw-literal
      Array.from(iteratorWithReturn, function () { throw 2; });
    } catch (error) { /* empty */ }

    var checkCorrectnessOfIteration = function (exec, SKIP_CLOSING) {
      if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
      var ITERATION_SUPPORT = false;
      try {
        var object = {};
        object[ITERATOR$4] = function () {
          return {
            next: function () {
              return { done: ITERATION_SUPPORT = true };
            }
          };
        };
        exec(object);
      } catch (error) { /* empty */ }
      return ITERATION_SUPPORT;
    };

    var INCORRECT_ITERATION = !checkCorrectnessOfIteration(function (iterable) {
      Array.from(iterable);
    });

    // `Array.from` method
    // https://tc39.github.io/ecma262/#sec-array.from
    _export({ target: 'Array', stat: true, forced: INCORRECT_ITERATION }, {
      from: arrayFrom
    });

    var from_1 = path.Array.from;

    var from_1$1 = from_1;

    var from_1$2 = from_1$1;

    var entryVirtual = function (CONSTRUCTOR) {
      return path[CONSTRUCTOR + 'Prototype'];
    };

    var concat = entryVirtual('Array').concat;

    var ArrayPrototype$1 = Array.prototype;

    var concat_1 = function (it) {
      var own = it.concat;
      return it === ArrayPrototype$1 || (it instanceof Array && own === ArrayPrototype$1.concat) ? concat : own;
    };

    var concat$1 = concat_1;

    var concat$2 = concat$1;

    var arrayMethodIsStrict = function (METHOD_NAME, argument) {
      var method = [][METHOD_NAME];
      return !!method && fails(function () {
        // eslint-disable-next-line no-useless-call,no-throw-literal
        method.call(null, argument || function () { throw 1; }, 1);
      });
    };

    var defineProperty$4 = Object.defineProperty;
    var cache = {};

    var thrower = function (it) { throw it; };

    var arrayMethodUsesToLength = function (METHOD_NAME, options) {
      if (has(cache, METHOD_NAME)) return cache[METHOD_NAME];
      if (!options) options = {};
      var method = [][METHOD_NAME];
      var ACCESSORS = has(options, 'ACCESSORS') ? options.ACCESSORS : false;
      var argument0 = has(options, 0) ? options[0] : thrower;
      var argument1 = has(options, 1) ? options[1] : undefined;

      return cache[METHOD_NAME] = !!method && !fails(function () {
        if (ACCESSORS && !descriptors) return true;
        var O = { length: -1 };

        if (ACCESSORS) defineProperty$4(O, 1, { enumerable: true, get: thrower });
        else O[1] = 1;

        method.call(O, argument0, argument1);
      });
    };

    var $indexOf = arrayIncludes.indexOf;



    var nativeIndexOf = [].indexOf;

    var NEGATIVE_ZERO = !!nativeIndexOf && 1 / [1].indexOf(1, -0) < 0;
    var STRICT_METHOD = arrayMethodIsStrict('indexOf');
    var USES_TO_LENGTH = arrayMethodUsesToLength('indexOf', { ACCESSORS: true, 1: 0 });

    // `Array.prototype.indexOf` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
    _export({ target: 'Array', proto: true, forced: NEGATIVE_ZERO || !STRICT_METHOD || !USES_TO_LENGTH }, {
      indexOf: function indexOf(searchElement /* , fromIndex = 0 */) {
        return NEGATIVE_ZERO
          // convert -0 to +0
          ? nativeIndexOf.apply(this, arguments) || 0
          : $indexOf(this, searchElement, arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    var indexOf$1 = entryVirtual('Array').indexOf;

    var ArrayPrototype$2 = Array.prototype;

    var indexOf_1 = function (it) {
      var own = it.indexOf;
      return it === ArrayPrototype$2 || (it instanceof Array && own === ArrayPrototype$2.indexOf) ? indexOf$1 : own;
    };

    var indexOf$2 = indexOf_1;

    var indexOf$3 = indexOf$2;

    // `Object.create` method
    // https://tc39.github.io/ecma262/#sec-object.create
    _export({ target: 'Object', stat: true, sham: !descriptors }, {
      create: objectCreate
    });

    var Object$1 = path.Object;

    var create = function create(P, D) {
      return Object$1.create(P, D);
    };

    var create$1 = create;

    var create$2 = create$1;

    var isArray$4 = isArray$1;

    var isArray$5 = isArray$4;

    function _arrayWithHoles(arr) {
      if (isArray$5(arr)) return arr;
    }

    var arrayWithHoles = _arrayWithHoles;

    var ITERATOR$5 = wellKnownSymbol('iterator');

    var isIterable = function (it) {
      var O = Object(it);
      return O[ITERATOR$5] !== undefined
        || '@@iterator' in O
        // eslint-disable-next-line no-prototype-builtins
        || iterators.hasOwnProperty(classof(O));
    };

    var isIterable_1 = isIterable;

    var isIterable$1 = isIterable_1;

    // `Symbol.asyncDispose` well-known symbol
    // https://github.com/tc39/proposal-using-statement
    defineWellKnownSymbol('asyncDispose');

    // `Symbol.dispose` well-known symbol
    // https://github.com/tc39/proposal-using-statement
    defineWellKnownSymbol('dispose');

    // `Symbol.observable` well-known symbol
    // https://github.com/tc39/proposal-observable
    defineWellKnownSymbol('observable');

    // `Symbol.patternMatch` well-known symbol
    // https://github.com/tc39/proposal-pattern-matching
    defineWellKnownSymbol('patternMatch');

    // TODO: remove from `core-js@4`


    defineWellKnownSymbol('replaceAll');

    // TODO: Remove from `core-js@4`


    var symbol$3 = symbol;

    var symbol$4 = symbol$3;

    function _iterableToArrayLimit(arr, i) {
      if (typeof symbol$4 === "undefined" || !isIterable$1(Object(arr))) return;
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = getIterator$1(arr), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    var iterableToArrayLimit = _iterableToArrayLimit;

    var from_1$3 = from_1;

    var from_1$4 = from_1$3;

    var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('slice');
    var USES_TO_LENGTH$1 = arrayMethodUsesToLength('slice', { ACCESSORS: true, 0: 0, 1: 2 });

    var SPECIES$2 = wellKnownSymbol('species');
    var nativeSlice = [].slice;
    var max$1 = Math.max;

    // `Array.prototype.slice` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.slice
    // fallback for not array-like ES3 strings and DOM objects
    _export({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT || !USES_TO_LENGTH$1 }, {
      slice: function slice(start, end) {
        var O = toIndexedObject(this);
        var length = toLength(O.length);
        var k = toAbsoluteIndex(start, length);
        var fin = toAbsoluteIndex(end === undefined ? length : end, length);
        // inline `ArraySpeciesCreate` for usage native `Array#slice` where it's possible
        var Constructor, result, n;
        if (isArray(O)) {
          Constructor = O.constructor;
          // cross-realm fallback
          if (typeof Constructor == 'function' && (Constructor === Array || isArray(Constructor.prototype))) {
            Constructor = undefined;
          } else if (isObject(Constructor)) {
            Constructor = Constructor[SPECIES$2];
            if (Constructor === null) Constructor = undefined;
          }
          if (Constructor === Array || Constructor === undefined) {
            return nativeSlice.call(O, k, fin);
          }
        }
        result = new (Constructor === undefined ? Array : Constructor)(max$1(fin - k, 0));
        for (n = 0; k < fin; k++, n++) if (k in O) createProperty(result, n, O[k]);
        result.length = n;
        return result;
      }
    });

    var slice = entryVirtual('Array').slice;

    var ArrayPrototype$3 = Array.prototype;

    var slice_1 = function (it) {
      var own = it.slice;
      return it === ArrayPrototype$3 || (it instanceof Array && own === ArrayPrototype$3.slice) ? slice : own;
    };

    var slice$1 = slice_1;

    var slice$2 = slice$1;

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    }

    var arrayLikeToArray = _arrayLikeToArray;

    function _unsupportedIterableToArray(o, minLen) {
      var _context;

      if (!o) return;
      if (typeof o === "string") return arrayLikeToArray(o, minLen);

      var n = slice$2(_context = Object.prototype.toString.call(o)).call(_context, 8, -1);

      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return from_1$4(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
    }

    var unsupportedIterableToArray = _unsupportedIterableToArray;

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var nonIterableRest = _nonIterableRest;

    function _slicedToArray(arr, i) {
      return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || unsupportedIterableToArray(arr, i) || nonIterableRest();
    }

    var slicedToArray = _slicedToArray;

    var $forEach$1 = arrayIteration.forEach;



    var STRICT_METHOD$1 = arrayMethodIsStrict('forEach');
    var USES_TO_LENGTH$2 = arrayMethodUsesToLength('forEach');

    // `Array.prototype.forEach` method implementation
    // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
    var arrayForEach = (!STRICT_METHOD$1 || !USES_TO_LENGTH$2) ? function forEach(callbackfn /* , thisArg */) {
      return $forEach$1(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    } : [].forEach;

    // `Array.prototype.forEach` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
    _export({ target: 'Array', proto: true, forced: [].forEach != arrayForEach }, {
      forEach: arrayForEach
    });

    var forEach = entryVirtual('Array').forEach;

    var forEach$1 = forEach;

    var ArrayPrototype$4 = Array.prototype;

    var DOMIterables = {
      DOMTokenList: true,
      NodeList: true
    };

    var forEach_1 = function (it) {
      var own = it.forEach;
      return it === ArrayPrototype$4 || (it instanceof Array && own === ArrayPrototype$4.forEach)
        // eslint-disable-next-line no-prototype-builtins
        || DOMIterables.hasOwnProperty(classof(it)) ? forEach$1 : own;
    };

    var forEach$2 = forEach_1;

    var $includes = arrayIncludes.includes;



    var USES_TO_LENGTH$3 = arrayMethodUsesToLength('indexOf', { ACCESSORS: true, 1: 0 });

    // `Array.prototype.includes` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.includes
    _export({ target: 'Array', proto: true, forced: !USES_TO_LENGTH$3 }, {
      includes: function includes(el /* , fromIndex = 0 */) {
        return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    var includes = entryVirtual('Array').includes;

    var MATCH = wellKnownSymbol('match');

    // `IsRegExp` abstract operation
    // https://tc39.github.io/ecma262/#sec-isregexp
    var isRegexp = function (it) {
      var isRegExp;
      return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : classofRaw(it) == 'RegExp');
    };

    var notARegexp = function (it) {
      if (isRegexp(it)) {
        throw TypeError("The method doesn't accept regular expressions");
      } return it;
    };

    var MATCH$1 = wellKnownSymbol('match');

    var correctIsRegexpLogic = function (METHOD_NAME) {
      var regexp = /./;
      try {
        '/./'[METHOD_NAME](regexp);
      } catch (error1) {
        try {
          regexp[MATCH$1] = false;
          return '/./'[METHOD_NAME](regexp);
        } catch (error2) { /* empty */ }
      } return false;
    };

    // `String.prototype.includes` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.includes
    _export({ target: 'String', proto: true, forced: !correctIsRegexpLogic('includes') }, {
      includes: function includes(searchString /* , position = 0 */) {
        return !!~String(requireObjectCoercible(this))
          .indexOf(notARegexp(searchString), arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    var includes$1 = entryVirtual('String').includes;

    var ArrayPrototype$5 = Array.prototype;
    var StringPrototype = String.prototype;

    var includes$2 = function (it) {
      var own = it.includes;
      if (it === ArrayPrototype$5 || (it instanceof Array && own === ArrayPrototype$5.includes)) return includes;
      if (typeof it === 'string' || it === StringPrototype || (it instanceof String && own === StringPrototype.includes)) {
        return includes$1;
      } return own;
    };

    var includes$3 = includes$2;

    var includes$4 = includes$3;

    // a string of all valid unicode whitespaces
    // eslint-disable-next-line max-len
    var whitespaces = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

    var whitespace = '[' + whitespaces + ']';
    var ltrim = RegExp('^' + whitespace + whitespace + '*');
    var rtrim = RegExp(whitespace + whitespace + '*$');

    // `String.prototype.{ trim, trimStart, trimEnd, trimLeft, trimRight }` methods implementation
    var createMethod$3 = function (TYPE) {
      return function ($this) {
        var string = String(requireObjectCoercible($this));
        if (TYPE & 1) string = string.replace(ltrim, '');
        if (TYPE & 2) string = string.replace(rtrim, '');
        return string;
      };
    };

    var stringTrim = {
      // `String.prototype.{ trimLeft, trimStart }` methods
      // https://tc39.github.io/ecma262/#sec-string.prototype.trimstart
      start: createMethod$3(1),
      // `String.prototype.{ trimRight, trimEnd }` methods
      // https://tc39.github.io/ecma262/#sec-string.prototype.trimend
      end: createMethod$3(2),
      // `String.prototype.trim` method
      // https://tc39.github.io/ecma262/#sec-string.prototype.trim
      trim: createMethod$3(3)
    };

    var trim = stringTrim.trim;


    var $parseInt = global_1.parseInt;
    var hex = /^[+-]?0[Xx]/;
    var FORCED$1 = $parseInt(whitespaces + '08') !== 8 || $parseInt(whitespaces + '0x16') !== 22;

    // `parseInt` method
    // https://tc39.github.io/ecma262/#sec-parseint-string-radix
    var numberParseInt = FORCED$1 ? function parseInt(string, radix) {
      var S = trim(String(string));
      return $parseInt(S, (radix >>> 0) || (hex.test(S) ? 16 : 10));
    } : $parseInt;

    // `parseInt` method
    // https://tc39.github.io/ecma262/#sec-parseint-string-radix
    _export({ global: true, forced: parseInt != numberParseInt }, {
      parseInt: numberParseInt
    });

    var _parseInt = path.parseInt;

    var _parseInt$1 = _parseInt;

    var _parseInt$2 = _parseInt$1;

    var slice$3 = slice_1;

    var slice$4 = slice$3;

    var test$1 = [];
    var nativeSort = test$1.sort;

    // IE8-
    var FAILS_ON_UNDEFINED = fails(function () {
      test$1.sort(undefined);
    });
    // V8 bug
    var FAILS_ON_NULL = fails(function () {
      test$1.sort(null);
    });
    // Old WebKit
    var STRICT_METHOD$2 = arrayMethodIsStrict('sort');

    var FORCED$2 = FAILS_ON_UNDEFINED || !FAILS_ON_NULL || !STRICT_METHOD$2;

    // `Array.prototype.sort` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.sort
    _export({ target: 'Array', proto: true, forced: FORCED$2 }, {
      sort: function sort(comparefn) {
        return comparefn === undefined
          ? nativeSort.call(toObject$1(this))
          : nativeSort.call(toObject$1(this), aFunction(comparefn));
      }
    });

    var sort = entryVirtual('Array').sort;

    var ArrayPrototype$6 = Array.prototype;

    var sort_1 = function (it) {
      var own = it.sort;
      return it === ArrayPrototype$6 || (it instanceof Array && own === ArrayPrototype$6.sort) ? sort : own;
    };

    var sort$1 = sort_1;

    var sort$2 = sort$1;

    // `RegExp.prototype.flags` getter implementation
    // https://tc39.github.io/ecma262/#sec-get-regexp.prototype.flags
    var regexpFlags = function () {
      var that = anObject(this);
      var result = '';
      if (that.global) result += 'g';
      if (that.ignoreCase) result += 'i';
      if (that.multiline) result += 'm';
      if (that.dotAll) result += 's';
      if (that.unicode) result += 'u';
      if (that.sticky) result += 'y';
      return result;
    };

    var flags_1 = function (it) {
      return regexpFlags.call(it);
    };

    var RegExpPrototype = RegExp.prototype;

    var flags_1$1 = function (it) {
      return (it === RegExpPrototype || it instanceof RegExp) && !('flags' in it) ? flags_1(it) : it.flags;
    };

    var flags = flags_1$1;

    var flags$1 = flags;

    var xregexp = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _getIterator2 = interopRequireDefault(getIterator$1);

    var _isArray = interopRequireDefault(isArray$3);

    var _getIteratorMethod2 = interopRequireDefault(getIteratorMethod$1);

    var _symbol = interopRequireDefault(symbol$2);

    var _from = interopRequireDefault(from_1$2);

    var _concat = interopRequireDefault(concat$2);

    var _indexOf = interopRequireDefault(indexOf$3);

    var _create = interopRequireDefault(create$2);

    var _slicedToArray2 = interopRequireDefault(slicedToArray);

    var _forEach = interopRequireDefault(forEach$2);

    var _includes = interopRequireDefault(includes$4);

    var _parseInt2 = interopRequireDefault(_parseInt$2);

    var _slice = interopRequireDefault(slice$4);

    var _sort = interopRequireDefault(sort$2);

    var _flags = interopRequireDefault(flags$1);

    function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof _symbol["default"] === "undefined" || (0, _getIteratorMethod2["default"])(o) == null) { if ((0, _isArray["default"])(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = (0, _getIterator2["default"])(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

    function _unsupportedIterableToArray(o, minLen) { var _context9; if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = (0, _slice["default"])(_context9 = Object.prototype.toString.call(o)).call(_context9, 8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return (0, _from["default"])(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    /*!
     * XRegExp 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2007-present MIT License
     */

    /**
     * XRegExp provides augmented, extensible regular expressions. You get additional regex syntax and
     * flags, beyond what browsers support natively. XRegExp is also a regex utility belt with tools to
     * make your client-side grepping simpler and more powerful, while freeing you from related
     * cross-browser inconsistencies.
     */
    // ==--------------------------==
    // Private stuff
    // ==--------------------------==
    // Property name used for extended regex instance data
    var REGEX_DATA = 'xregexp'; // Optional features that can be installed and uninstalled

    var features = {
      astral: false,
      namespacing: false
    }; // Native methods to use and restore ('native' is an ES3 reserved keyword)

    var nativ = {
      exec: RegExp.prototype.exec,
      test: RegExp.prototype.test,
      match: String.prototype.match,
      replace: String.prototype.replace,
      split: String.prototype.split
    }; // Storage for fixed/extended native methods

    var fixed = {}; // Storage for regexes cached by `XRegExp.cache`

    var regexCache = {}; // Storage for pattern details cached by the `XRegExp` constructor

    var patternCache = {}; // Storage for regex syntax tokens added internally or by `XRegExp.addToken`

    var tokens = []; // Token scopes

    var defaultScope = 'default';
    var classScope = 'class'; // Regexes that match native regex syntax, including octals

    var nativeTokens = {
      // Any native multicharacter token in default scope, or any single character
      'default': /\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|{[\dA-Fa-f]+})|c[A-Za-z]|[\s\S])|\(\?(?:[:=!]|<[=!])|[?*+]\?|{\d+(?:,\d*)?}\??|[\s\S]/,
      // Any native multicharacter token in character class scope, or any single character
      'class': /\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|{[\dA-Fa-f]+})|c[A-Za-z]|[\s\S])|[\s\S]/
    }; // Any backreference or dollar-prefixed character in replacement strings

    var replacementToken = /\$(?:{([\w$]+)}|<([\w$]+)>|(\d\d?|[\s\S]))/g; // Check for correct `exec` handling of nonparticipating capturing groups

    var correctExecNpcg = nativ.exec.call(/()??/, '')[1] === undefined; // Check for ES6 `flags` prop support

    var hasFlagsProp = (0, _flags["default"])(/x/) !== undefined; // Shortcut to `Object.prototype.toString`

    var _ref = {},
        toString = _ref.toString;

    function hasNativeFlag(flag) {
      // Can't check based on the presence of properties/getters since browsers might support such
      // properties even when they don't support the corresponding flag in regex construction (tested
      // in Chrome 48, where `'unicode' in /x/` is true but trying to construct a regex with flag `u`
      // throws an error)
      var isSupported = true;

      try {
        // Can't use regex literals for testing even in a `try` because regex literals with
        // unsupported flags cause a compilation error in IE
        new RegExp('', flag); // Work around a broken/incomplete IE11 polyfill for sticky introduced in core-js 3.6.0

        if (flag === 'y') {
          // Using function to avoid babel transform to regex literal
          var gy = function () {
            return 'gy';
          }();

          var incompleteY = '.a'.replace(new RegExp('a', gy), '.') === '..';

          if (incompleteY) {
            isSupported = false;
          }
        }
      } catch (exception) {
        isSupported = false;
      }

      return isSupported;
    } // Check for ES6 `u` flag support


    var hasNativeU = hasNativeFlag('u'); // Check for ES6 `y` flag support

    var hasNativeY = hasNativeFlag('y'); // Tracker for known flags, including addon flags

    var registeredFlags = {
      g: true,
      i: true,
      m: true,
      u: hasNativeU,
      y: hasNativeY
    };
    /**
     * Attaches extended data and `XRegExp.prototype` properties to a regex object.
     *
     * @private
     * @param {RegExp} regex Regex to augment.
     * @param {Array} captureNames Array with capture names, or `null`.
     * @param {String} xSource XRegExp pattern used to generate `regex`, or `null` if N/A.
     * @param {String} xFlags XRegExp flags used to generate `regex`, or `null` if N/A.
     * @param {Boolean} [isInternalOnly=false] Whether the regex will be used only for internal
     *   operations, and never exposed to users. For internal-only regexes, we can improve perf by
     *   skipping some operations like attaching `XRegExp.prototype` properties.
     * @returns {!RegExp} Augmented regex.
     */

    function augment(regex, captureNames, xSource, xFlags, isInternalOnly) {
      var _context;

      regex[REGEX_DATA] = {
        captureNames: captureNames
      };

      if (isInternalOnly) {
        return regex;
      } // Can't auto-inherit these since the XRegExp constructor returns a nonprimitive value


      if (regex.__proto__) {
        regex.__proto__ = XRegExp.prototype;
      } else {
        for (var p in XRegExp.prototype) {
          // An `XRegExp.prototype.hasOwnProperty(p)` check wouldn't be worth it here, since this
          // is performance sensitive, and enumerable `Object.prototype` or `RegExp.prototype`
          // extensions exist on `regex.prototype` anyway
          regex[p] = XRegExp.prototype[p];
        }
      }

      regex[REGEX_DATA].source = xSource; // Emulate the ES6 `flags` prop by ensuring flags are in alphabetical order

      regex[REGEX_DATA].flags = xFlags ? (0, _sort["default"])(_context = xFlags.split('')).call(_context).join('') : xFlags;
      return regex;
    }
    /**
     * Removes any duplicate characters from the provided string.
     *
     * @private
     * @param {String} str String to remove duplicate characters from.
     * @returns {string} String with any duplicate characters removed.
     */


    function clipDuplicates(str) {
      return nativ.replace.call(str, /([\s\S])(?=[\s\S]*\1)/g, '');
    }
    /**
     * Copies a regex object while preserving extended data and augmenting with `XRegExp.prototype`
     * properties. The copy has a fresh `lastIndex` property (set to zero). Allows adding and removing
     * flags g and y while copying the regex.
     *
     * @private
     * @param {RegExp} regex Regex to copy.
     * @param {Object} [options] Options object with optional properties:
     *   - `addG` {Boolean} Add flag g while copying the regex.
     *   - `addY` {Boolean} Add flag y while copying the regex.
     *   - `removeG` {Boolean} Remove flag g while copying the regex.
     *   - `removeY` {Boolean} Remove flag y while copying the regex.
     *   - `isInternalOnly` {Boolean} Whether the copied regex will be used only for internal
     *     operations, and never exposed to users. For internal-only regexes, we can improve perf by
     *     skipping some operations like attaching `XRegExp.prototype` properties.
     *   - `source` {String} Overrides `<regex>.source`, for special cases.
     * @returns {RegExp} Copy of the provided regex, possibly with modified flags.
     */


    function copyRegex(regex, options) {
      var _context2;

      if (!XRegExp.isRegExp(regex)) {
        throw new TypeError('Type RegExp expected');
      }

      var xData = regex[REGEX_DATA] || {};
      var flags = getNativeFlags(regex);
      var flagsToAdd = '';
      var flagsToRemove = '';
      var xregexpSource = null;
      var xregexpFlags = null;
      options = options || {};

      if (options.removeG) {
        flagsToRemove += 'g';
      }

      if (options.removeY) {
        flagsToRemove += 'y';
      }

      if (flagsToRemove) {
        flags = nativ.replace.call(flags, new RegExp("[".concat(flagsToRemove, "]+"), 'g'), '');
      }

      if (options.addG) {
        flagsToAdd += 'g';
      }

      if (options.addY) {
        flagsToAdd += 'y';
      }

      if (flagsToAdd) {
        flags = clipDuplicates(flags + flagsToAdd);
      }

      if (!options.isInternalOnly) {
        if (xData.source !== undefined) {
          xregexpSource = xData.source;
        } // null or undefined; don't want to add to `flags` if the previous value was null, since
        // that indicates we're not tracking original precompilation flags


        if ((0, _flags["default"])(xData) != null) {
          // Flags are only added for non-internal regexes by `XRegExp.globalize`. Flags are never
          // removed for non-internal regexes, so don't need to handle it
          xregexpFlags = flagsToAdd ? clipDuplicates((0, _flags["default"])(xData) + flagsToAdd) : (0, _flags["default"])(xData);
        }
      } // Augment with `XRegExp.prototype` properties, but use the native `RegExp` constructor to avoid
      // searching for special tokens. That would be wrong for regexes constructed by `RegExp`, and
      // unnecessary for regexes constructed by `XRegExp` because the regex has already undergone the
      // translation to native regex syntax


      regex = augment(new RegExp(options.source || regex.source, flags), hasNamedCapture(regex) ? (0, _slice["default"])(_context2 = xData.captureNames).call(_context2, 0) : null, xregexpSource, xregexpFlags, options.isInternalOnly);
      return regex;
    }
    /**
     * Converts hexadecimal to decimal.
     *
     * @private
     * @param {String} hex
     * @returns {number}
     */


    function dec(hex) {
      return (0, _parseInt2["default"])(hex, 16);
    }
    /**
     * Returns a pattern that can be used in a native RegExp in place of an ignorable token such as an
     * inline comment or whitespace with flag x. This is used directly as a token handler function
     * passed to `XRegExp.addToken`.
     *
     * @private
     * @param {String} match Match arg of `XRegExp.addToken` handler
     * @param {String} scope Scope arg of `XRegExp.addToken` handler
     * @param {String} flags Flags arg of `XRegExp.addToken` handler
     * @returns {string} Either '' or '(?:)', depending on which is needed in the context of the match.
     */


    function getContextualTokenSeparator(match, scope, flags) {
      if ( // No need to separate tokens if at the beginning or end of a group
      match.input[match.index - 1] === '(' || match.input[match.index + match[0].length] === ')' || // No need to separate tokens if before or after a `|`
      match.input[match.index - 1] === '|' || match.input[match.index + match[0].length] === '|' || // No need to separate tokens if at the beginning or end of the pattern
      match.index < 1 || match.index + match[0].length >= match.input.length || // No need to separate tokens if at the beginning of a noncapturing group or lookahead.
      // The way this is written relies on:
      // - The search regex matching only 3-char strings.
      // - Although `substr` gives chars from the end of the string if given a negative index,
      //   the resulting substring will be too short to match. Ex: `'abcd'.substr(-1, 3) === 'd'`
      nativ.test.call(/^\(\?[:=!]/, match.input.substr(match.index - 3, 3)) || // Avoid separating tokens when the following token is a quantifier
      isQuantifierNext(match.input, match.index + match[0].length, flags)) {
        return '';
      } // Keep tokens separated. This avoids e.g. inadvertedly changing `\1 1` or `\1(?#)1` to `\11`.
      // This also ensures all tokens remain as discrete atoms, e.g. it avoids converting the syntax
      // error `(? :` into `(?:`.


      return '(?:)';
    }
    /**
     * Returns native `RegExp` flags used by a regex object.
     *
     * @private
     * @param {RegExp} regex Regex to check.
     * @returns {string} Native flags in use.
     */


    function getNativeFlags(regex) {
      return hasFlagsProp ? (0, _flags["default"])(regex) : // Explicitly using `RegExp.prototype.toString` (rather than e.g. `String` or concatenation
      // with an empty string) allows this to continue working predictably when
      // `XRegExp.proptotype.toString` is overridden
      nativ.exec.call(/\/([a-z]*)$/i, RegExp.prototype.toString.call(regex))[1];
    }
    /**
     * Determines whether a regex has extended instance data used to track capture names.
     *
     * @private
     * @param {RegExp} regex Regex to check.
     * @returns {boolean} Whether the regex uses named capture.
     */


    function hasNamedCapture(regex) {
      return !!(regex[REGEX_DATA] && regex[REGEX_DATA].captureNames);
    }
    /**
     * Converts decimal to hexadecimal.
     *
     * @private
     * @param {Number|String} dec
     * @returns {string}
     */


    function hex(dec) {
      return (0, _parseInt2["default"])(dec, 10).toString(16);
    }
    /**
     * Checks whether the next nonignorable token after the specified position is a quantifier.
     *
     * @private
     * @param {String} pattern Pattern to search within.
     * @param {Number} pos Index in `pattern` to search at.
     * @param {String} flags Flags used by the pattern.
     * @returns {Boolean} Whether the next nonignorable token is a quantifier.
     */


    function isQuantifierNext(pattern, pos, flags) {
      return nativ.test.call((0, _includes["default"])(flags).call(flags, 'x') ? // Ignore any leading whitespace, line comments, and inline comments
      /^(?:\s|#[^#\n]*|\(\?#[^)]*\))*(?:[?*+]|{\d+(?:,\d*)?})/ : // Ignore any leading inline comments
      /^(?:\(\?#[^)]*\))*(?:[?*+]|{\d+(?:,\d*)?})/, (0, _slice["default"])(pattern).call(pattern, pos));
    }
    /**
     * Determines whether a value is of the specified type, by resolving its internal [[Class]].
     *
     * @private
     * @param {*} value Object to check.
     * @param {String} type Type to check for, in TitleCase.
     * @returns {boolean} Whether the object matches the type.
     */


    function isType(value, type) {
      return toString.call(value) === "[object ".concat(type, "]");
    }
    /**
     * Adds leading zeros if shorter than four characters. Used for fixed-length hexadecimal values.
     *
     * @private
     * @param {String} str
     * @returns {string}
     */


    function pad4(str) {
      while (str.length < 4) {
        str = "0".concat(str);
      }

      return str;
    }
    /**
     * Checks for flag-related errors, and strips/applies flags in a leading mode modifier. Offloads
     * the flag preparation logic from the `XRegExp` constructor.
     *
     * @private
     * @param {String} pattern Regex pattern, possibly with a leading mode modifier.
     * @param {String} flags Any combination of flags.
     * @returns {!Object} Object with properties `pattern` and `flags`.
     */


    function prepareFlags(pattern, flags) {
      // Recent browsers throw on duplicate flags, so copy this behavior for nonnative flags
      if (clipDuplicates(flags) !== flags) {
        throw new SyntaxError("Invalid duplicate regex flag ".concat(flags));
      } // Strip and apply a leading mode modifier with any combination of flags except g or y


      pattern = nativ.replace.call(pattern, /^\(\?([\w$]+)\)/, function ($0, $1) {
        if (nativ.test.call(/[gy]/, $1)) {
          throw new SyntaxError("Cannot use flag g or y in mode modifier ".concat($0));
        } // Allow duplicate flags within the mode modifier


        flags = clipDuplicates(flags + $1);
        return '';
      }); // Throw on unknown native or nonnative flags

      var _iterator = _createForOfIteratorHelper(flags),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var flag = _step.value;

          if (!registeredFlags[flag]) {
            throw new SyntaxError("Unknown regex flag ".concat(flag));
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return {
        pattern: pattern,
        flags: flags
      };
    }
    /**
     * Prepares an options object from the given value.
     *
     * @private
     * @param {String|Object} value Value to convert to an options object.
     * @returns {Object} Options object.
     */


    function prepareOptions(value) {
      var options = {};

      if (isType(value, 'String')) {
        (0, _forEach["default"])(XRegExp).call(XRegExp, value, /[^\s,]+/, function (match) {
          options[match] = true;
        });
        return options;
      }

      return value;
    }
    /**
     * Registers a flag so it doesn't throw an 'unknown flag' error.
     *
     * @private
     * @param {String} flag Single-character flag to register.
     */


    function registerFlag(flag) {
      if (!/^[\w$]$/.test(flag)) {
        throw new Error('Flag must be a single character A-Za-z0-9_$');
      }

      registeredFlags[flag] = true;
    }
    /**
     * Runs built-in and custom regex syntax tokens in reverse insertion order at the specified
     * position, until a match is found.
     *
     * @private
     * @param {String} pattern Original pattern from which an XRegExp object is being built.
     * @param {String} flags Flags being used to construct the regex.
     * @param {Number} pos Position to search for tokens within `pattern`.
     * @param {Number} scope Regex scope to apply: 'default' or 'class'.
     * @param {Object} context Context object to use for token handler functions.
     * @returns {Object} Object with properties `matchLength`, `output`, and `reparse`; or `null`.
     */


    function runTokens(pattern, flags, pos, scope, context) {
      var i = tokens.length;
      var leadChar = pattern[pos];
      var result = null;
      var match;
      var t; // Run in reverse insertion order

      while (i--) {
        t = tokens[i];

        if (t.leadChar && t.leadChar !== leadChar || t.scope !== scope && t.scope !== 'all' || t.flag && !(0, _includes["default"])(flags).call(flags, t.flag)) {
          continue;
        }

        match = XRegExp.exec(pattern, t.regex, pos, 'sticky');

        if (match) {
          result = {
            matchLength: match[0].length,
            output: t.handler.call(context, match, scope, flags),
            reparse: t.reparse
          }; // Finished with token tests

          break;
        }
      }

      return result;
    }
    /**
     * Enables or disables implicit astral mode opt-in. When enabled, flag A is automatically added to
     * all new regexes created by XRegExp. This causes an error to be thrown when creating regexes if
     * the Unicode Base addon is not available, since flag A is registered by that addon.
     *
     * @private
     * @param {Boolean} on `true` to enable; `false` to disable.
     */


    function setAstral(on) {
      features.astral = on;
    }
    /**
     * Adds named capture groups to the `groups` property of match arrays. See here for details:
     * https://github.com/tc39/proposal-regexp-named-groups
     *
     * @private
     * @param {Boolean} on `true` to enable; `false` to disable.
     */


    function setNamespacing(on) {
      features.namespacing = on;
    }
    /**
     * Returns the object, or throws an error if it is `null` or `undefined`. This is used to follow
     * the ES5 abstract operation `ToObject`.
     *
     * @private
     * @param {*} value Object to check and return.
     * @returns {*} The provided object.
     */


    function toObject(value) {
      // null or undefined
      if (value == null) {
        throw new TypeError('Cannot convert null or undefined to object');
      }

      return value;
    } // ==--------------------------==
    // Constructor
    // ==--------------------------==

    /**
     * Creates an extended regular expression object for matching text with a pattern. Differs from a
     * native regular expression in that additional syntax and flags are supported. The returned object
     * is in fact a native `RegExp` and works with all native methods.
     *
     * @class XRegExp
     * @constructor
     * @param {String|RegExp} pattern Regex pattern string, or an existing regex object to copy.
     * @param {String} [flags] Any combination of flags.
     *   Native flags:
     *     - `g` - global
     *     - `i` - ignore case
     *     - `m` - multiline anchors
     *     - `u` - unicode (ES6)
     *     - `y` - sticky (Firefox 3+, ES6)
     *   Additional XRegExp flags:
     *     - `n` - explicit capture
     *     - `s` - dot matches all (aka singleline)
     *     - `x` - free-spacing and line comments (aka extended)
     *     - `A` - astral (requires the Unicode Base addon)
     *   Flags cannot be provided when constructing one `RegExp` from another.
     * @returns {RegExp} Extended regular expression object.
     * @example
     *
     * // With named capture and flag x
     * XRegExp(`(?<year>  [0-9]{4} ) -?  # year
     *          (?<month> [0-9]{2} ) -?  # month
     *          (?<day>   [0-9]{2} )     # day`, 'x');
     *
     * // Providing a regex object copies it. Native regexes are recompiled using native (not XRegExp)
     * // syntax. Copies maintain extended data, are augmented with `XRegExp.prototype` properties, and
     * // have fresh `lastIndex` properties (set to zero).
     * XRegExp(/regex/);
     */


    function XRegExp(pattern, flags) {
      if (XRegExp.isRegExp(pattern)) {
        if (flags !== undefined) {
          throw new TypeError('Cannot supply flags when copying a RegExp');
        }

        return copyRegex(pattern);
      } // Copy the argument behavior of `RegExp`


      pattern = pattern === undefined ? '' : String(pattern);
      flags = flags === undefined ? '' : String(flags);

      if (XRegExp.isInstalled('astral') && !(0, _includes["default"])(flags).call(flags, 'A')) {
        // This causes an error to be thrown if the Unicode Base addon is not available
        flags += 'A';
      }

      if (!patternCache[pattern]) {
        patternCache[pattern] = {};
      }

      if (!patternCache[pattern][flags]) {
        var context = {
          hasNamedCapture: false,
          captureNames: []
        };
        var scope = defaultScope;
        var output = '';
        var pos = 0;
        var result; // Check for flag-related errors, and strip/apply flags in a leading mode modifier

        var applied = prepareFlags(pattern, flags);
        var appliedPattern = applied.pattern;
        var appliedFlags = (0, _flags["default"])(applied); // Use XRegExp's tokens to translate the pattern to a native regex pattern.
        // `appliedPattern.length` may change on each iteration if tokens use `reparse`

        while (pos < appliedPattern.length) {
          do {
            // Check for custom tokens at the current position
            result = runTokens(appliedPattern, appliedFlags, pos, scope, context); // If the matched token used the `reparse` option, splice its output into the
            // pattern before running tokens again at the same position

            if (result && result.reparse) {
              appliedPattern = (0, _slice["default"])(appliedPattern).call(appliedPattern, 0, pos) + result.output + (0, _slice["default"])(appliedPattern).call(appliedPattern, pos + result.matchLength);
            }
          } while (result && result.reparse);

          if (result) {
            output += result.output;
            pos += result.matchLength || 1;
          } else {
            // Get the native token at the current position
            var _XRegExp$exec = XRegExp.exec(appliedPattern, nativeTokens[scope], pos, 'sticky'),
                _XRegExp$exec2 = (0, _slicedToArray2["default"])(_XRegExp$exec, 1),
                token = _XRegExp$exec2[0];

            output += token;
            pos += token.length;

            if (token === '[' && scope === defaultScope) {
              scope = classScope;
            } else if (token === ']' && scope === classScope) {
              scope = defaultScope;
            }
          }
        }

        patternCache[pattern][flags] = {
          // Use basic cleanup to collapse repeated empty groups like `(?:)(?:)` to `(?:)`. Empty
          // groups are sometimes inserted during regex transpilation in order to keep tokens
          // separated. However, more than one empty group in a row is never needed.
          pattern: nativ.replace.call(output, /(?:\(\?:\))+/g, '(?:)'),
          // Strip all but native flags
          flags: nativ.replace.call(appliedFlags, /[^gimuy]+/g, ''),
          // `context.captureNames` has an item for each capturing group, even if unnamed
          captures: context.hasNamedCapture ? context.captureNames : null
        };
      }

      var generated = patternCache[pattern][flags];
      return augment(new RegExp(generated.pattern, (0, _flags["default"])(generated)), generated.captures, pattern, flags);
    } // Add `RegExp.prototype` to the prototype chain


    XRegExp.prototype = /(?:)/; // ==--------------------------==
    // Public properties
    // ==--------------------------==

    /**
     * The XRegExp version number as a string containing three dot-separated parts. For example,
     * '2.0.0-beta-3'.
     *
     * @static
     * @memberOf XRegExp
     * @type String
     */

    XRegExp.version = '4.4.1'; // ==--------------------------==
    // Public methods
    // ==--------------------------==
    // Intentionally undocumented; used in tests and addons

    XRegExp._clipDuplicates = clipDuplicates;
    XRegExp._hasNativeFlag = hasNativeFlag;
    XRegExp._dec = dec;
    XRegExp._hex = hex;
    XRegExp._pad4 = pad4;
    /**
     * Extends XRegExp syntax and allows custom flags. This is used internally and can be used to
     * create XRegExp addons. If more than one token can match the same string, the last added wins.
     *
     * @memberOf XRegExp
     * @param {RegExp} regex Regex object that matches the new token.
     * @param {Function} handler Function that returns a new pattern string (using native regex syntax)
     *   to replace the matched token within all future XRegExp regexes. Has access to persistent
     *   properties of the regex being built, through `this`. Invoked with three arguments:
     *   - The match array, with named backreference properties.
     *   - The regex scope where the match was found: 'default' or 'class'.
     *   - The flags used by the regex, including any flags in a leading mode modifier.
     *   The handler function becomes part of the XRegExp construction process, so be careful not to
     *   construct XRegExps within the function or you will trigger infinite recursion.
     * @param {Object} [options] Options object with optional properties:
     *   - `scope` {String} Scope where the token applies: 'default', 'class', or 'all'.
     *   - `flag` {String} Single-character flag that triggers the token. This also registers the
     *     flag, which prevents XRegExp from throwing an 'unknown flag' error when the flag is used.
     *   - `optionalFlags` {String} Any custom flags checked for within the token `handler` that are
     *     not required to trigger the token. This registers the flags, to prevent XRegExp from
     *     throwing an 'unknown flag' error when any of the flags are used.
     *   - `reparse` {Boolean} Whether the `handler` function's output should not be treated as
     *     final, and instead be reparseable by other tokens (including the current token). Allows
     *     token chaining or deferring.
     *   - `leadChar` {String} Single character that occurs at the beginning of any successful match
     *     of the token (not always applicable). This doesn't change the behavior of the token unless
     *     you provide an erroneous value. However, providing it can increase the token's performance
     *     since the token can be skipped at any positions where this character doesn't appear.
     * @example
     *
     * // Basic usage: Add \a for the ALERT control code
     * XRegExp.addToken(
     *   /\\a/,
     *   () => '\\x07',
     *   {scope: 'all'}
     * );
     * XRegExp('\\a[\\a-\\n]+').test('\x07\n\x07'); // -> true
     *
     * // Add the U (ungreedy) flag from PCRE and RE2, which reverses greedy and lazy quantifiers.
     * // Since `scope` is not specified, it uses 'default' (i.e., transformations apply outside of
     * // character classes only)
     * XRegExp.addToken(
     *   /([?*+]|{\d+(?:,\d*)?})(\??)/,
     *   (match) => `${match[1]}${match[2] ? '' : '?'}`,
     *   {flag: 'U'}
     * );
     * XRegExp('a+', 'U').exec('aaa')[0]; // -> 'a'
     * XRegExp('a+?', 'U').exec('aaa')[0]; // -> 'aaa'
     */

    XRegExp.addToken = function (regex, handler, options) {
      options = options || {};
      var _options = options,
          optionalFlags = _options.optionalFlags;

      if (options.flag) {
        registerFlag(options.flag);
      }

      if (optionalFlags) {
        optionalFlags = nativ.split.call(optionalFlags, '');

        var _iterator2 = _createForOfIteratorHelper(optionalFlags),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var flag = _step2.value;
            registerFlag(flag);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      } // Add to the private list of syntax tokens


      tokens.push({
        regex: copyRegex(regex, {
          addG: true,
          addY: hasNativeY,
          isInternalOnly: true
        }),
        handler: handler,
        scope: options.scope || defaultScope,
        flag: options.flag,
        reparse: options.reparse,
        leadChar: options.leadChar
      }); // Reset the pattern cache used by the `XRegExp` constructor, since the same pattern and flags
      // might now produce different results

      XRegExp.cache.flush('patterns');
    };
    /**
     * Caches and returns the result of calling `XRegExp(pattern, flags)`. On any subsequent call with
     * the same pattern and flag combination, the cached copy of the regex is returned.
     *
     * @memberOf XRegExp
     * @param {String} pattern Regex pattern string.
     * @param {String} [flags] Any combination of XRegExp flags.
     * @returns {RegExp} Cached XRegExp object.
     * @example
     *
     * while (match = XRegExp.cache('.', 'gs').exec(str)) {
     *   // The regex is compiled once only
     * }
     */


    XRegExp.cache = function (pattern, flags) {
      if (!regexCache[pattern]) {
        regexCache[pattern] = {};
      }

      return regexCache[pattern][flags] || (regexCache[pattern][flags] = XRegExp(pattern, flags));
    }; // Intentionally undocumented; used in tests


    XRegExp.cache.flush = function (cacheName) {
      if (cacheName === 'patterns') {
        // Flush the pattern cache used by the `XRegExp` constructor
        patternCache = {};
      } else {
        // Flush the regex cache populated by `XRegExp.cache`
        regexCache = {};
      }
    };
    /**
     * Escapes any regular expression metacharacters, for use when matching literal strings. The result
     * can safely be used at any point within a regex that uses any flags.
     *
     * @memberOf XRegExp
     * @param {String} str String to escape.
     * @returns {string} String with regex metacharacters escaped.
     * @example
     *
     * XRegExp.escape('Escaped? <.>');
     * // -> 'Escaped\?\ <\.>'
     */


    XRegExp.escape = function (str) {
      return nativ.replace.call(toObject(str), /[-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    };
    /**
     * Executes a regex search in a specified string. Returns a match array or `null`. If the provided
     * regex uses named capture, named backreference properties are included on the match array.
     * Optional `pos` and `sticky` arguments specify the search start position, and whether the match
     * must start at the specified position only. The `lastIndex` property of the provided regex is not
     * used, but is updated for compatibility. Also fixes browser bugs compared to the native
     * `RegExp.prototype.exec` and can be used reliably cross-browser.
     *
     * @memberOf XRegExp
     * @param {String} str String to search.
     * @param {RegExp} regex Regex to search with.
     * @param {Number} [pos=0] Zero-based index at which to start the search.
     * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
     *   only. The string `'sticky'` is accepted as an alternative to `true`.
     * @returns {Array} Match array with named backreference properties, or `null`.
     * @example
     *
     * // Basic use, with named backreference
     * let match = XRegExp.exec('U+2620', XRegExp('U\\+(?<hex>[0-9A-F]{4})'));
     * match.hex; // -> '2620'
     *
     * // With pos and sticky, in a loop
     * let pos = 2, result = [], match;
     * while (match = XRegExp.exec('<1><2><3><4>5<6>', /<(\d)>/, pos, 'sticky')) {
     *   result.push(match[1]);
     *   pos = match.index + match[0].length;
     * }
     * // result -> ['2', '3', '4']
     */


    XRegExp.exec = function (str, regex, pos, sticky) {
      var cacheKey = 'g';
      var addY = false;
      var fakeY = false;
      var match;
      addY = hasNativeY && !!(sticky || regex.sticky && sticky !== false);

      if (addY) {
        cacheKey += 'y';
      } else if (sticky) {
        // Simulate sticky matching by appending an empty capture to the original regex. The
        // resulting regex will succeed no matter what at the current index (set with `lastIndex`),
        // and will not search the rest of the subject string. We'll know that the original regex
        // has failed if that last capture is `''` rather than `undefined` (i.e., if that last
        // capture participated in the match).
        fakeY = true;
        cacheKey += 'FakeY';
      }

      regex[REGEX_DATA] = regex[REGEX_DATA] || {}; // Shares cached copies with `XRegExp.match`/`replace`

      var r2 = regex[REGEX_DATA][cacheKey] || (regex[REGEX_DATA][cacheKey] = copyRegex(regex, {
        addG: true,
        addY: addY,
        source: fakeY ? "".concat(regex.source, "|()") : undefined,
        removeY: sticky === false,
        isInternalOnly: true
      }));
      pos = pos || 0;
      r2.lastIndex = pos; // Fixed `exec` required for `lastIndex` fix, named backreferences, etc.

      match = fixed.exec.call(r2, str); // Get rid of the capture added by the pseudo-sticky matcher if needed. An empty string means
      // the original regexp failed (see above).

      if (fakeY && match && match.pop() === '') {
        match = null;
      }

      if (regex.global) {
        regex.lastIndex = match ? r2.lastIndex : 0;
      }

      return match;
    };
    /**
     * Executes a provided function once per regex match. Searches always start at the beginning of the
     * string and continue until the end, regardless of the state of the regex's `global` property and
     * initial `lastIndex`.
     *
     * @memberOf XRegExp
     * @param {String} str String to search.
     * @param {RegExp} regex Regex to search with.
     * @param {Function} callback Function to execute for each match. Invoked with four arguments:
     *   - The match array, with named backreference properties.
     *   - The zero-based match index.
     *   - The string being traversed.
     *   - The regex object being used to traverse the string.
     * @example
     *
     * // Extracts every other digit from a string
     * const evens = [];
     * XRegExp.forEach('1a2345', /\d/, (match, i) => {
     *   if (i % 2) evens.push(+match[0]);
     * });
     * // evens -> [2, 4]
     */


    XRegExp.forEach = function (str, regex, callback) {
      var pos = 0;
      var i = -1;
      var match;

      while (match = XRegExp.exec(str, regex, pos)) {
        // Because `regex` is provided to `callback`, the function could use the deprecated/
        // nonstandard `RegExp.prototype.compile` to mutate the regex. However, since `XRegExp.exec`
        // doesn't use `lastIndex` to set the search position, this can't lead to an infinite loop,
        // at least. Actually, because of the way `XRegExp.exec` caches globalized versions of
        // regexes, mutating the regex will not have any effect on the iteration or matched strings,
        // which is a nice side effect that brings extra safety.
        callback(match, ++i, str, regex);
        pos = match.index + (match[0].length || 1);
      }
    };
    /**
     * Copies a regex object and adds flag `g`. The copy maintains extended data, is augmented with
     * `XRegExp.prototype` properties, and has a fresh `lastIndex` property (set to zero). Native
     * regexes are not recompiled using XRegExp syntax.
     *
     * @memberOf XRegExp
     * @param {RegExp} regex Regex to globalize.
     * @returns {RegExp} Copy of the provided regex with flag `g` added.
     * @example
     *
     * const globalCopy = XRegExp.globalize(/regex/);
     * globalCopy.global; // -> true
     */


    XRegExp.globalize = function (regex) {
      return copyRegex(regex, {
        addG: true
      });
    };
    /**
     * Installs optional features according to the specified options. Can be undone using
     * `XRegExp.uninstall`.
     *
     * @memberOf XRegExp
     * @param {Object|String} options Options object or string.
     * @example
     *
     * // With an options object
     * XRegExp.install({
     *   // Enables support for astral code points in Unicode addons (implicitly sets flag A)
     *   astral: true,
     *
     *   // Adds named capture groups to the `groups` property of matches
     *   namespacing: true
     * });
     *
     * // With an options string
     * XRegExp.install('astral namespacing');
     */


    XRegExp.install = function (options) {
      options = prepareOptions(options);

      if (!features.astral && options.astral) {
        setAstral(true);
      }

      if (!features.namespacing && options.namespacing) {
        setNamespacing(true);
      }
    };
    /**
     * Checks whether an individual optional feature is installed.
     *
     * @memberOf XRegExp
     * @param {String} feature Name of the feature to check. One of:
     *   - `astral`
     *   - `namespacing`
     * @returns {boolean} Whether the feature is installed.
     * @example
     *
     * XRegExp.isInstalled('astral');
     */


    XRegExp.isInstalled = function (feature) {
      return !!features[feature];
    };
    /**
     * Returns `true` if an object is a regex; `false` if it isn't. This works correctly for regexes
     * created in another frame, when `instanceof` and `constructor` checks would fail.
     *
     * @memberOf XRegExp
     * @param {*} value Object to check.
     * @returns {boolean} Whether the object is a `RegExp` object.
     * @example
     *
     * XRegExp.isRegExp('string'); // -> false
     * XRegExp.isRegExp(/regex/i); // -> true
     * XRegExp.isRegExp(RegExp('^', 'm')); // -> true
     * XRegExp.isRegExp(XRegExp('(?s).')); // -> true
     */


    XRegExp.isRegExp = function (value) {
      return toString.call(value) === '[object RegExp]';
    }; // isType(value, 'RegExp');

    /**
     * Returns the first matched string, or in global mode, an array containing all matched strings.
     * This is essentially a more convenient re-implementation of `String.prototype.match` that gives
     * the result types you actually want (string instead of `exec`-style array in match-first mode,
     * and an empty array instead of `null` when no matches are found in match-all mode). It also lets
     * you override flag g and ignore `lastIndex`, and fixes browser bugs.
     *
     * @memberOf XRegExp
     * @param {String} str String to search.
     * @param {RegExp} regex Regex to search with.
     * @param {String} [scope='one'] Use 'one' to return the first match as a string. Use 'all' to
     *   return an array of all matched strings. If not explicitly specified and `regex` uses flag g,
     *   `scope` is 'all'.
     * @returns {String|Array} In match-first mode: First match as a string, or `null`. In match-all
     *   mode: Array of all matched strings, or an empty array.
     * @example
     *
     * // Match first
     * XRegExp.match('abc', /\w/); // -> 'a'
     * XRegExp.match('abc', /\w/g, 'one'); // -> 'a'
     * XRegExp.match('abc', /x/g, 'one'); // -> null
     *
     * // Match all
     * XRegExp.match('abc', /\w/g); // -> ['a', 'b', 'c']
     * XRegExp.match('abc', /\w/, 'all'); // -> ['a', 'b', 'c']
     * XRegExp.match('abc', /x/, 'all'); // -> []
     */


    XRegExp.match = function (str, regex, scope) {
      var global = regex.global && scope !== 'one' || scope === 'all';
      var cacheKey = (global ? 'g' : '') + (regex.sticky ? 'y' : '') || 'noGY';
      regex[REGEX_DATA] = regex[REGEX_DATA] || {}; // Shares cached copies with `XRegExp.exec`/`replace`

      var r2 = regex[REGEX_DATA][cacheKey] || (regex[REGEX_DATA][cacheKey] = copyRegex(regex, {
        addG: !!global,
        removeG: scope === 'one',
        isInternalOnly: true
      }));
      var result = nativ.match.call(toObject(str), r2);

      if (regex.global) {
        regex.lastIndex = scope === 'one' && result ? // Can't use `r2.lastIndex` since `r2` is nonglobal in this case
        result.index + result[0].length : 0;
      }

      return global ? result || [] : result && result[0];
    };
    /**
     * Retrieves the matches from searching a string using a chain of regexes that successively search
     * within previous matches. The provided `chain` array can contain regexes and or objects with
     * `regex` and `backref` properties. When a backreference is specified, the named or numbered
     * backreference is passed forward to the next regex or returned.
     *
     * @memberOf XRegExp
     * @param {String} str String to search.
     * @param {Array} chain Regexes that each search for matches within preceding results.
     * @returns {Array} Matches by the last regex in the chain, or an empty array.
     * @example
     *
     * // Basic usage; matches numbers within <b> tags
     * XRegExp.matchChain('1 <b>2</b> 3 <b>4 a 56</b>', [
     *   XRegExp('(?is)<b>.*?</b>'),
     *   /\d+/
     * ]);
     * // -> ['2', '4', '56']
     *
     * // Passing forward and returning specific backreferences
     * html = '<a href="http://xregexp.com/api/">XRegExp</a>\
     *         <a href="http://www.google.com/">Google</a>';
     * XRegExp.matchChain(html, [
     *   {regex: /<a href="([^"]+)">/i, backref: 1},
     *   {regex: XRegExp('(?i)^https?://(?<domain>[^/?#]+)'), backref: 'domain'}
     * ]);
     * // -> ['xregexp.com', 'www.google.com']
     */


    XRegExp.matchChain = function (str, chain) {
      return function recurseChain(values, level) {
        var item = chain[level].regex ? chain[level] : {
          regex: chain[level]
        };
        var matches = [];

        function addMatch(match) {
          if (item.backref) {
            var ERR_UNDEFINED_GROUP = "Backreference to undefined group: ".concat(item.backref);
            var isNamedBackref = isNaN(item.backref);

            if (isNamedBackref && XRegExp.isInstalled('namespacing')) {
              // `groups` has `null` as prototype, so using `in` instead of `hasOwnProperty`
              if (!(item.backref in match.groups)) {
                throw new ReferenceError(ERR_UNDEFINED_GROUP);
              }
            } else if (!match.hasOwnProperty(item.backref)) {
              throw new ReferenceError(ERR_UNDEFINED_GROUP);
            }

            var backrefValue = isNamedBackref && XRegExp.isInstalled('namespacing') ? match.groups[item.backref] : match[item.backref];
            matches.push(backrefValue || '');
          } else {
            matches.push(match[0]);
          }
        }

        var _iterator3 = _createForOfIteratorHelper(values),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var value = _step3.value;
            (0, _forEach["default"])(XRegExp).call(XRegExp, value, item.regex, addMatch);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }

        return level === chain.length - 1 || !matches.length ? matches : recurseChain(matches, level + 1);
      }([str], 0);
    };
    /**
     * Returns a new string with one or all matches of a pattern replaced. The pattern can be a string
     * or regex, and the replacement can be a string or a function to be called for each match. To
     * perform a global search and replace, use the optional `scope` argument or include flag g if using
     * a regex. Replacement strings can use `${n}` or `$<n>` for named and numbered backreferences.
     * Replacement functions can use named backreferences via `arguments[0].name`. Also fixes browser
     * bugs compared to the native `String.prototype.replace` and can be used reliably cross-browser.
     *
     * @memberOf XRegExp
     * @param {String} str String to search.
     * @param {RegExp|String} search Search pattern to be replaced.
     * @param {String|Function} replacement Replacement string or a function invoked to create it.
     *   Replacement strings can include special replacement syntax:
     *     - $$ - Inserts a literal $ character.
     *     - $&, $0 - Inserts the matched substring.
     *     - $` - Inserts the string that precedes the matched substring (left context).
     *     - $' - Inserts the string that follows the matched substring (right context).
     *     - $n, $nn - Where n/nn are digits referencing an existent capturing group, inserts
     *       backreference n/nn.
     *     - ${n}, $<n> - Where n is a name or any number of digits that reference an existent capturing
     *       group, inserts backreference n.
     *   Replacement functions are invoked with three or more arguments:
     *     - The matched substring (corresponds to $& above). Named backreferences are accessible as
     *       properties of this first argument.
     *     - 0..n arguments, one for each backreference (corresponding to $1, $2, etc. above).
     *     - The zero-based index of the match within the total search string.
     *     - The total string being searched.
     * @param {String} [scope='one'] Use 'one' to replace the first match only, or 'all'. If not
     *   explicitly specified and using a regex with flag g, `scope` is 'all'.
     * @returns {String} New string with one or all matches replaced.
     * @example
     *
     * // Regex search, using named backreferences in replacement string
     * const name = XRegExp('(?<first>\\w+) (?<last>\\w+)');
     * XRegExp.replace('John Smith', name, '$<last>, $<first>');
     * // -> 'Smith, John'
     *
     * // Regex search, using named backreferences in replacement function
     * XRegExp.replace('John Smith', name, (match) => `${match.last}, ${match.first}`);
     * // -> 'Smith, John'
     *
     * // String search, with replace-all
     * XRegExp.replace('RegExp builds RegExps', 'RegExp', 'XRegExp', 'all');
     * // -> 'XRegExp builds XRegExps'
     */


    XRegExp.replace = function (str, search, replacement, scope) {
      var isRegex = XRegExp.isRegExp(search);
      var global = search.global && scope !== 'one' || scope === 'all';
      var cacheKey = (global ? 'g' : '') + (search.sticky ? 'y' : '') || 'noGY';
      var s2 = search;

      if (isRegex) {
        search[REGEX_DATA] = search[REGEX_DATA] || {}; // Shares cached copies with `XRegExp.exec`/`match`. Since a copy is used, `search`'s
        // `lastIndex` isn't updated *during* replacement iterations

        s2 = search[REGEX_DATA][cacheKey] || (search[REGEX_DATA][cacheKey] = copyRegex(search, {
          addG: !!global,
          removeG: scope === 'one',
          isInternalOnly: true
        }));
      } else if (global) {
        s2 = new RegExp(XRegExp.escape(String(search)), 'g');
      } // Fixed `replace` required for named backreferences, etc.


      var result = fixed.replace.call(toObject(str), s2, replacement);

      if (isRegex && search.global) {
        // Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
        search.lastIndex = 0;
      }

      return result;
    };
    /**
     * Performs batch processing of string replacements. Used like `XRegExp.replace`, but accepts an
     * array of replacement details. Later replacements operate on the output of earlier replacements.
     * Replacement details are accepted as an array with a regex or string to search for, the
     * replacement string or function, and an optional scope of 'one' or 'all'. Uses the XRegExp
     * replacement text syntax, which supports named backreference properties via `${name}` or
     * `$<name>`.
     *
     * @memberOf XRegExp
     * @param {String} str String to search.
     * @param {Array} replacements Array of replacement detail arrays.
     * @returns {String} New string with all replacements.
     * @example
     *
     * str = XRegExp.replaceEach(str, [
     *   [XRegExp('(?<name>a)'), 'z${name}'],
     *   [/b/gi, 'y'],
     *   [/c/g, 'x', 'one'], // scope 'one' overrides /g
     *   [/d/, 'w', 'all'],  // scope 'all' overrides lack of /g
     *   ['e', 'v', 'all'],  // scope 'all' allows replace-all for strings
     *   [/f/g, ($0) => $0.toUpperCase()]
     * ]);
     */


    XRegExp.replaceEach = function (str, replacements) {
      var _iterator4 = _createForOfIteratorHelper(replacements),
          _step4;

      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var r = _step4.value;
          str = XRegExp.replace(str, r[0], r[1], r[2]);
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }

      return str;
    };
    /**
     * Splits a string into an array of strings using a regex or string separator. Matches of the
     * separator are not included in the result array. However, if `separator` is a regex that contains
     * capturing groups, backreferences are spliced into the result each time `separator` is matched.
     * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
     * cross-browser.
     *
     * @memberOf XRegExp
     * @param {String} str String to split.
     * @param {RegExp|String} separator Regex or string to use for separating the string.
     * @param {Number} [limit] Maximum number of items to include in the result array.
     * @returns {Array} Array of substrings.
     * @example
     *
     * // Basic use
     * XRegExp.split('a b c', ' ');
     * // -> ['a', 'b', 'c']
     *
     * // With limit
     * XRegExp.split('a b c', ' ', 2);
     * // -> ['a', 'b']
     *
     * // Backreferences in result array
     * XRegExp.split('..word1..', /([a-z]+)(\d+)/i);
     * // -> ['..', 'word', '1', '..']
     */


    XRegExp.split = function (str, separator, limit) {
      return fixed.split.call(toObject(str), separator, limit);
    };
    /**
     * Executes a regex search in a specified string. Returns `true` or `false`. Optional `pos` and
     * `sticky` arguments specify the search start position, and whether the match must start at the
     * specified position only. The `lastIndex` property of the provided regex is not used, but is
     * updated for compatibility. Also fixes browser bugs compared to the native
     * `RegExp.prototype.test` and can be used reliably cross-browser.
     *
     * @memberOf XRegExp
     * @param {String} str String to search.
     * @param {RegExp} regex Regex to search with.
     * @param {Number} [pos=0] Zero-based index at which to start the search.
     * @param {Boolean|String} [sticky=false] Whether the match must start at the specified position
     *   only. The string `'sticky'` is accepted as an alternative to `true`.
     * @returns {boolean} Whether the regex matched the provided value.
     * @example
     *
     * // Basic use
     * XRegExp.test('abc', /c/); // -> true
     *
     * // With pos and sticky
     * XRegExp.test('abc', /c/, 0, 'sticky'); // -> false
     * XRegExp.test('abc', /c/, 2, 'sticky'); // -> true
     */
    // Do this the easy way :-)


    XRegExp.test = function (str, regex, pos, sticky) {
      return !!XRegExp.exec(str, regex, pos, sticky);
    };
    /**
     * Uninstalls optional features according to the specified options. All optional features start out
     * uninstalled, so this is used to undo the actions of `XRegExp.install`.
     *
     * @memberOf XRegExp
     * @param {Object|String} options Options object or string.
     * @example
     *
     * // With an options object
     * XRegExp.uninstall({
     *   // Disables support for astral code points in Unicode addons
     *   astral: true,
     *
     *   // Don't add named capture groups to the `groups` property of matches
     *   namespacing: true
     * });
     *
     * // With an options string
     * XRegExp.uninstall('astral namespacing');
     */


    XRegExp.uninstall = function (options) {
      options = prepareOptions(options);

      if (features.astral && options.astral) {
        setAstral(false);
      }

      if (features.namespacing && options.namespacing) {
        setNamespacing(false);
      }
    };
    /**
     * Returns an XRegExp object that is the union of the given patterns. Patterns can be provided as
     * regex objects or strings. Metacharacters are escaped in patterns provided as strings.
     * Backreferences in provided regex objects are automatically renumbered to work correctly within
     * the larger combined pattern. Native flags used by provided regexes are ignored in favor of the
     * `flags` argument.
     *
     * @memberOf XRegExp
     * @param {Array} patterns Regexes and strings to combine.
     * @param {String} [flags] Any combination of XRegExp flags.
     * @param {Object} [options] Options object with optional properties:
     *   - `conjunction` {String} Type of conjunction to use: 'or' (default) or 'none'.
     * @returns {RegExp} Union of the provided regexes and strings.
     * @example
     *
     * XRegExp.union(['a+b*c', /(dogs)\1/, /(cats)\1/], 'i');
     * // -> /a\+b\*c|(dogs)\1|(cats)\2/i
     *
     * XRegExp.union([/man/, /bear/, /pig/], 'i', {conjunction: 'none'});
     * // -> /manbearpig/i
     */


    XRegExp.union = function (patterns, flags, options) {
      options = options || {};
      var conjunction = options.conjunction || 'or';
      var numCaptures = 0;
      var numPriorCaptures;
      var captureNames;

      function rewrite(match, paren, backref) {
        var name = captureNames[numCaptures - numPriorCaptures]; // Capturing group

        if (paren) {
          ++numCaptures; // If the current capture has a name, preserve the name

          if (name) {
            return "(?<".concat(name, ">");
          } // Backreference

        } else if (backref) {
          // Rewrite the backreference
          return "\\".concat(+backref + numPriorCaptures);
        }

        return match;
      }

      if (!(isType(patterns, 'Array') && patterns.length)) {
        throw new TypeError('Must provide a nonempty array of patterns to merge');
      }

      var parts = /(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*\]/g;
      var output = [];

      var _iterator5 = _createForOfIteratorHelper(patterns),
          _step5;

      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var pattern = _step5.value;

          if (XRegExp.isRegExp(pattern)) {
            numPriorCaptures = numCaptures;
            captureNames = pattern[REGEX_DATA] && pattern[REGEX_DATA].captureNames || []; // Rewrite backreferences. Passing to XRegExp dies on octals and ensures patterns are
            // independently valid; helps keep this simple. Named captures are put back

            output.push(nativ.replace.call(XRegExp(pattern.source).source, parts, rewrite));
          } else {
            output.push(XRegExp.escape(pattern));
          }
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }

      var separator = conjunction === 'none' ? '' : '|';
      return XRegExp(output.join(separator), flags);
    }; // ==--------------------------==
    // Fixed/extended native methods
    // ==--------------------------==

    /**
     * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
     * bugs in the native `RegExp.prototype.exec`. Use via `XRegExp.exec`.
     *
     * @memberOf RegExp
     * @param {String} str String to search.
     * @returns {Array} Match array with named backreference properties, or `null`.
     */


    fixed.exec = function (str) {
      var origLastIndex = this.lastIndex;
      var match = nativ.exec.apply(this, arguments);

      if (match) {
        // Fix browsers whose `exec` methods don't return `undefined` for nonparticipating capturing
        // groups. This fixes IE 5.5-8, but not IE 9's quirks mode or emulation of older IEs. IE 9
        // in standards mode follows the spec.
        if (!correctExecNpcg && match.length > 1 && (0, _includes["default"])(match).call(match, '')) {
          var _context3;

          var r2 = copyRegex(this, {
            removeG: true,
            isInternalOnly: true
          }); // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
          // matching due to characters outside the match

          nativ.replace.call((0, _slice["default"])(_context3 = String(str)).call(_context3, match.index), r2, function () {
            var len = arguments.length; // Skip index 0 and the last 2

            for (var i = 1; i < len - 2; ++i) {
              if ((i < 0 || arguments.length <= i ? undefined : arguments[i]) === undefined) {
                match[i] = undefined;
              }
            }
          });
        } // Attach named capture properties


        var groupsObject = match;

        if (XRegExp.isInstalled('namespacing')) {
          // https://tc39.github.io/proposal-regexp-named-groups/#sec-regexpbuiltinexec
          match.groups = (0, _create["default"])(null);
          groupsObject = match.groups;
        }

        if (this[REGEX_DATA] && this[REGEX_DATA].captureNames) {
          // Skip index 0
          for (var i = 1; i < match.length; ++i) {
            var name = this[REGEX_DATA].captureNames[i - 1];

            if (name) {
              groupsObject[name] = match[i];
            }
          }
        } // Fix browsers that increment `lastIndex` after zero-length matches


        if (this.global && !match[0].length && this.lastIndex > match.index) {
          this.lastIndex = match.index;
        }
      }

      if (!this.global) {
        // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
        this.lastIndex = origLastIndex;
      }

      return match;
    };
    /**
     * Fixes browser bugs in the native `RegExp.prototype.test`.
     *
     * @memberOf RegExp
     * @param {String} str String to search.
     * @returns {boolean} Whether the regex matched the provided value.
     */


    fixed.test = function (str) {
      // Do this the easy way :-)
      return !!fixed.exec.call(this, str);
    };
    /**
     * Adds named capture support (with backreferences returned as `result.name`), and fixes browser
     * bugs in the native `String.prototype.match`.
     *
     * @memberOf String
     * @param {RegExp|*} regex Regex to search with. If not a regex object, it is passed to `RegExp`.
     * @returns {Array} If `regex` uses flag g, an array of match strings or `null`. Without flag g,
     *   the result of calling `regex.exec(this)`.
     */


    fixed.match = function (regex) {
      if (!XRegExp.isRegExp(regex)) {
        // Use the native `RegExp` rather than `XRegExp`
        regex = new RegExp(regex);
      } else if (regex.global) {
        var result = nativ.match.apply(this, arguments); // Fixes IE bug

        regex.lastIndex = 0;
        return result;
      }

      return fixed.exec.call(regex, toObject(this));
    };
    /**
     * Adds support for `${n}` (or `$<n>`) tokens for named and numbered backreferences in replacement
     * text, and provides named backreferences to replacement functions as `arguments[0].name`. Also
     * fixes browser bugs in replacement text syntax when performing a replacement using a nonregex
     * search value, and the value of a replacement regex's `lastIndex` property during replacement
     * iterations and upon completion. Note that this doesn't support SpiderMonkey's proprietary third
     * (`flags`) argument. Use via `XRegExp.replace`.
     *
     * @memberOf String
     * @param {RegExp|String} search Search pattern to be replaced.
     * @param {String|Function} replacement Replacement string or a function invoked to create it.
     * @returns {string} New string with one or all matches replaced.
     */


    fixed.replace = function (search, replacement) {
      var isRegex = XRegExp.isRegExp(search);
      var origLastIndex;
      var captureNames;
      var result;

      if (isRegex) {
        if (search[REGEX_DATA]) {
          captureNames = search[REGEX_DATA].captureNames;
        } // Only needed if `search` is nonglobal


        origLastIndex = search.lastIndex;
      } else {
        search += ''; // Type-convert
      } // Don't use `typeof`; some older browsers return 'function' for regex objects


      if (isType(replacement, 'Function')) {
        // Stringifying `this` fixes a bug in IE < 9 where the last argument in replacement
        // functions isn't type-converted to a string
        result = nativ.replace.call(String(this), search, function () {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          if (captureNames) {
            var groupsObject;

            if (XRegExp.isInstalled('namespacing')) {
              // https://tc39.github.io/proposal-regexp-named-groups/#sec-regexpbuiltinexec
              groupsObject = (0, _create["default"])(null);
              args.push(groupsObject);
            } else {
              // Change the `args[0]` string primitive to a `String` object that can store
              // properties. This really does need to use `String` as a constructor
              args[0] = new String(args[0]);
              groupsObject = args[0];
            } // Store named backreferences


            for (var i = 0; i < captureNames.length; ++i) {
              if (captureNames[i]) {
                groupsObject[captureNames[i]] = args[i + 1];
              }
            }
          } // ES6 specs the context for replacement functions as `undefined`


          return replacement.apply(void 0, args);
        });
      } else {
        // Ensure that the last value of `args` will be a string when given nonstring `this`,
        // while still throwing on null or undefined context
        result = nativ.replace.call(this == null ? this : String(this), search, function () {
          for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          return nativ.replace.call(String(replacement), replacementToken, replacer);

          function replacer($0, bracketed, angled, dollarToken) {
            bracketed = bracketed || angled; // Named or numbered backreference with curly or angled braces

            if (bracketed) {
              // XRegExp behavior for `${n}` or `$<n>`:
              // 1. Backreference to numbered capture, if `n` is an integer. Use `0` for the
              //    entire match. Any number of leading zeros may be used.
              // 2. Backreference to named capture `n`, if it exists and is not an integer
              //    overridden by numbered capture. In practice, this does not overlap with
              //    numbered capture since XRegExp does not allow named capture to use a bare
              //    integer as the name.
              // 3. If the name or number does not refer to an existing capturing group, it's
              //    an error.
              var n = +bracketed; // Type-convert; drop leading zeros

              if (n <= args.length - 3) {
                return args[n] || '';
              } // Groups with the same name is an error, else would need `lastIndexOf`


              n = captureNames ? (0, _indexOf["default"])(captureNames).call(captureNames, bracketed) : -1;

              if (n < 0) {
                throw new SyntaxError("Backreference to undefined group ".concat($0));
              }

              return args[n + 1] || '';
            } // Else, special variable or numbered backreference without curly braces


            if (dollarToken === '$') {
              // $$
              return '$';
            }

            if (dollarToken === '&' || +dollarToken === 0) {
              // $&, $0 (not followed by 1-9), $00
              return args[0];
            }

            if (dollarToken === '`') {
              var _context4;

              // $` (left context)
              return (0, _slice["default"])(_context4 = args[args.length - 1]).call(_context4, 0, args[args.length - 2]);
            }

            if (dollarToken === "'") {
              var _context5;

              // $' (right context)
              return (0, _slice["default"])(_context5 = args[args.length - 1]).call(_context5, args[args.length - 2] + args[0].length);
            } // Else, numbered backreference without braces


            dollarToken = +dollarToken; // Type-convert; drop leading zero
            // XRegExp behavior for `$n` and `$nn`:
            // - Backrefs end after 1 or 2 digits. Use `${..}` or `$<..>` for more digits.
            // - `$1` is an error if no capturing groups.
            // - `$10` is an error if less than 10 capturing groups. Use `${1}0` or `$<1>0`
            //   instead.
            // - `$01` is `$1` if at least one capturing group, else it's an error.
            // - `$0` (not followed by 1-9) and `$00` are the entire match.
            // Native behavior, for comparison:
            // - Backrefs end after 1 or 2 digits. Cannot reference capturing group 100+.
            // - `$1` is a literal `$1` if no capturing groups.
            // - `$10` is `$1` followed by a literal `0` if less than 10 capturing groups.
            // - `$01` is `$1` if at least one capturing group, else it's a literal `$01`.
            // - `$0` is a literal `$0`.

            if (!isNaN(dollarToken)) {
              if (dollarToken > args.length - 3) {
                throw new SyntaxError("Backreference to undefined group ".concat($0));
              }

              return args[dollarToken] || '';
            } // `$` followed by an unsupported char is an error, unlike native JS


            throw new SyntaxError("Invalid token ".concat($0));
          }
        });
      }

      if (isRegex) {
        if (search.global) {
          // Fixes IE, Safari bug (last tested IE 9, Safari 5.1)
          search.lastIndex = 0;
        } else {
          // Fixes IE, Opera bug (last tested IE 9, Opera 11.6)
          search.lastIndex = origLastIndex;
        }
      }

      return result;
    };
    /**
     * Fixes browser bugs in the native `String.prototype.split`. Use via `XRegExp.split`.
     *
     * @memberOf String
     * @param {RegExp|String} separator Regex or string to use for separating the string.
     * @param {Number} [limit] Maximum number of items to include in the result array.
     * @returns {!Array} Array of substrings.
     */


    fixed.split = function (separator, limit) {
      if (!XRegExp.isRegExp(separator)) {
        // Browsers handle nonregex split correctly, so use the faster native method
        return nativ.split.apply(this, arguments);
      }

      var str = String(this);
      var output = [];
      var origLastIndex = separator.lastIndex;
      var lastLastIndex = 0;
      var lastLength; // Values for `limit`, per the spec:
      // If undefined: pow(2,32) - 1
      // If 0, Infinity, or NaN: 0
      // If positive number: limit = floor(limit); if (limit >= pow(2,32)) limit -= pow(2,32);
      // If negative number: pow(2,32) - floor(abs(limit))
      // If other: Type-convert, then use the above rules
      // This line fails in very strange ways for some values of `limit` in Opera 10.5-10.63, unless
      // Opera Dragonfly is open (go figure). It works in at least Opera 9.5-10.1 and 11+

      limit = (limit === undefined ? -1 : limit) >>> 0;
      (0, _forEach["default"])(XRegExp).call(XRegExp, str, separator, function (match) {
        // This condition is not the same as `if (match[0].length)`
        if (match.index + match[0].length > lastLastIndex) {
          output.push((0, _slice["default"])(str).call(str, lastLastIndex, match.index));

          if (match.length > 1 && match.index < str.length) {
            Array.prototype.push.apply(output, (0, _slice["default"])(match).call(match, 1));
          }

          lastLength = match[0].length;
          lastLastIndex = match.index + lastLength;
        }
      });

      if (lastLastIndex === str.length) {
        if (!nativ.test.call(separator, '') || lastLength) {
          output.push('');
        }
      } else {
        output.push((0, _slice["default"])(str).call(str, lastLastIndex));
      }

      separator.lastIndex = origLastIndex;
      return output.length > limit ? (0, _slice["default"])(output).call(output, 0, limit) : output;
    }; // ==--------------------------==
    // Built-in syntax/flag tokens
    // ==--------------------------==

    /*
     * Letter escapes that natively match literal characters: `\a`, `\A`, etc. These should be
     * SyntaxErrors but are allowed in web reality. XRegExp makes them errors for cross-browser
     * consistency and to reserve their syntax, but lets them be superseded by addons.
     */


    XRegExp.addToken(/\\([ABCE-RTUVXYZaeg-mopqyz]|c(?![A-Za-z])|u(?![\dA-Fa-f]{4}|{[\dA-Fa-f]+})|x(?![\dA-Fa-f]{2}))/, function (match, scope) {
      // \B is allowed in default scope only
      if (match[1] === 'B' && scope === defaultScope) {
        return match[0];
      }

      throw new SyntaxError("Invalid escape ".concat(match[0]));
    }, {
      scope: 'all',
      leadChar: '\\'
    });
    /*
     * Unicode code point escape with curly braces: `\u{N..}`. `N..` is any one or more digit
     * hexadecimal number from 0-10FFFF, and can include leading zeros. Requires the native ES6 `u` flag
     * to support code points greater than U+FFFF. Avoids converting code points above U+FFFF to
     * surrogate pairs (which could be done without flag `u`), since that could lead to broken behavior
     * if you follow a `\u{N..}` token that references a code point above U+FFFF with a quantifier, or
     * if you use the same in a character class.
     */

    XRegExp.addToken(/\\u{([\dA-Fa-f]+)}/, function (match, scope, flags) {
      var code = dec(match[1]);

      if (code > 0x10FFFF) {
        throw new SyntaxError("Invalid Unicode code point ".concat(match[0]));
      }

      if (code <= 0xFFFF) {
        // Converting to \uNNNN avoids needing to escape the literal character and keep it
        // separate from preceding tokens
        return "\\u".concat(pad4(hex(code)));
      } // If `code` is between 0xFFFF and 0x10FFFF, require and defer to native handling


      if (hasNativeU && (0, _includes["default"])(flags).call(flags, 'u')) {
        return match[0];
      }

      throw new SyntaxError('Cannot use Unicode code point above \\u{FFFF} without flag u');
    }, {
      scope: 'all',
      leadChar: '\\'
    });
    /*
     * Empty character class: `[]` or `[^]`. This fixes a critical cross-browser syntax inconsistency.
     * Unless this is standardized (per the ES spec), regex syntax can't be accurately parsed because
     * character class endings can't be determined.
     */

    XRegExp.addToken(/\[(\^?)\]/, // For cross-browser compatibility with ES3, convert [] to \b\B and [^] to [\s\S].
    // (?!) should work like \b\B, but is unreliable in some versions of Firefox

    /* eslint-disable no-confusing-arrow */
    function (match) {
      return match[1] ? '[\\s\\S]' : '\\b\\B';
    },
    /* eslint-enable no-confusing-arrow */
    {
      leadChar: '['
    });
    /*
     * Comment pattern: `(?# )`. Inline comments are an alternative to the line comments allowed in
     * free-spacing mode (flag x).
     */

    XRegExp.addToken(/\(\?#[^)]*\)/, getContextualTokenSeparator, {
      leadChar: '('
    });
    /*
     * Whitespace and line comments, in free-spacing mode (aka extended mode, flag x) only.
     */

    XRegExp.addToken(/\s+|#[^\n]*\n?/, getContextualTokenSeparator, {
      flag: 'x'
    });
    /*
     * Dot, in dotall mode (aka singleline mode, flag s) only.
     */

    XRegExp.addToken(/\./, function () {
      return '[\\s\\S]';
    }, {
      flag: 's',
      leadChar: '.'
    });
    /*
     * Named backreference: `\k<name>`. Backreference names can use the characters A-Z, a-z, 0-9, _,
     * and $ only. Also allows numbered backreferences as `\k<n>`.
     */

    XRegExp.addToken(/\\k<([\w$]+)>/, function (match) {
      var _context6, _context7;

      // Groups with the same name is an error, else would need `lastIndexOf`
      var index = isNaN(match[1]) ? (0, _indexOf["default"])(_context6 = this.captureNames).call(_context6, match[1]) + 1 : +match[1];
      var endIndex = match.index + match[0].length;

      if (!index || index > this.captureNames.length) {
        throw new SyntaxError("Backreference to undefined group ".concat(match[0]));
      } // Keep backreferences separate from subsequent literal numbers. This avoids e.g.
      // inadvertedly changing `(?<n>)\k<n>1` to `()\11`.


      return (0, _concat["default"])(_context7 = "\\".concat(index)).call(_context7, endIndex === match.input.length || isNaN(match.input[endIndex]) ? '' : '(?:)');
    }, {
      leadChar: '\\'
    });
    /*
     * Numbered backreference or octal, plus any following digits: `\0`, `\11`, etc. Octals except `\0`
     * not followed by 0-9 and backreferences to unopened capture groups throw an error. Other matches
     * are returned unaltered. IE < 9 doesn't support backreferences above `\99` in regex syntax.
     */

    XRegExp.addToken(/\\(\d+)/, function (match, scope) {
      if (!(scope === defaultScope && /^[1-9]/.test(match[1]) && +match[1] <= this.captureNames.length) && match[1] !== '0') {
        throw new SyntaxError("Cannot use octal escape or backreference to undefined group ".concat(match[0]));
      }

      return match[0];
    }, {
      scope: 'all',
      leadChar: '\\'
    });
    /*
     * Named capturing group; match the opening delimiter only: `(?<name>`. Capture names can use the
     * characters A-Z, a-z, 0-9, _, and $ only. Names can't be integers. Supports Python-style
     * `(?P<name>` as an alternate syntax to avoid issues in some older versions of Opera which natively
     * supported the Python-style syntax. Otherwise, XRegExp might treat numbered backreferences to
     * Python-style named capture as octals.
     */

    XRegExp.addToken(/\(\?P?<([\w$]+)>/, function (match) {
      var _context8;

      // Disallow bare integers as names because named backreferences are added to match arrays
      // and therefore numeric properties may lead to incorrect lookups
      if (!isNaN(match[1])) {
        throw new SyntaxError("Cannot use integer as capture name ".concat(match[0]));
      }

      if (!XRegExp.isInstalled('namespacing') && (match[1] === 'length' || match[1] === '__proto__')) {
        throw new SyntaxError("Cannot use reserved word as capture name ".concat(match[0]));
      }

      if ((0, _includes["default"])(_context8 = this.captureNames).call(_context8, match[1])) {
        throw new SyntaxError("Cannot use same name for multiple groups ".concat(match[0]));
      }

      this.captureNames.push(match[1]);
      this.hasNamedCapture = true;
      return '(';
    }, {
      leadChar: '('
    });
    /*
     * Capturing group; match the opening parenthesis only. Required for support of named capturing
     * groups. Also adds explicit capture mode (flag n).
     */

    XRegExp.addToken(/\((?!\?)/, function (match, scope, flags) {
      if ((0, _includes["default"])(flags).call(flags, 'n')) {
        return '(?:';
      }

      this.captureNames.push(null);
      return '(';
    }, {
      optionalFlags: 'n',
      leadChar: '('
    });
    var _default = XRegExp;
    exports["default"] = _default;
    module.exports = exports.default;
    });

    var $map = arrayIteration.map;



    var HAS_SPECIES_SUPPORT$1 = arrayMethodHasSpeciesSupport('map');
    // FF49- issue
    var USES_TO_LENGTH$4 = arrayMethodUsesToLength('map');

    // `Array.prototype.map` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.map
    // with adding support of @@species
    _export({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT$1 || !USES_TO_LENGTH$4 }, {
      map: function map(callbackfn /* , thisArg */) {
        return $map(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    var map = entryVirtual('Array').map;

    var ArrayPrototype$7 = Array.prototype;

    var map_1 = function (it) {
      var own = it.map;
      return it === ArrayPrototype$7 || (it instanceof Array && own === ArrayPrototype$7.map) ? map : own;
    };

    var map$1 = map_1;

    var map$2 = map$1;

    // `Array.prototype.{ reduce, reduceRight }` methods implementation
    var createMethod$4 = function (IS_RIGHT) {
      return function (that, callbackfn, argumentsLength, memo) {
        aFunction(callbackfn);
        var O = toObject$1(that);
        var self = indexedObject(O);
        var length = toLength(O.length);
        var index = IS_RIGHT ? length - 1 : 0;
        var i = IS_RIGHT ? -1 : 1;
        if (argumentsLength < 2) while (true) {
          if (index in self) {
            memo = self[index];
            index += i;
            break;
          }
          index += i;
          if (IS_RIGHT ? index < 0 : length <= index) {
            throw TypeError('Reduce of empty array with no initial value');
          }
        }
        for (;IS_RIGHT ? index >= 0 : length > index; index += i) if (index in self) {
          memo = callbackfn(memo, self[index], index, O);
        }
        return memo;
      };
    };

    var arrayReduce = {
      // `Array.prototype.reduce` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.reduce
      left: createMethod$4(false),
      // `Array.prototype.reduceRight` method
      // https://tc39.github.io/ecma262/#sec-array.prototype.reduceright
      right: createMethod$4(true)
    };

    var engineIsNode = classofRaw(global_1.process) == 'process';

    var $reduce = arrayReduce.left;





    var STRICT_METHOD$3 = arrayMethodIsStrict('reduce');
    var USES_TO_LENGTH$5 = arrayMethodUsesToLength('reduce', { 1: 0 });
    // Chrome 80-82 has a critical bug
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1049982
    var CHROME_BUG = !engineIsNode && engineV8Version > 79 && engineV8Version < 83;

    // `Array.prototype.reduce` method
    // https://tc39.github.io/ecma262/#sec-array.prototype.reduce
    _export({ target: 'Array', proto: true, forced: !STRICT_METHOD$3 || !USES_TO_LENGTH$5 || CHROME_BUG }, {
      reduce: function reduce(callbackfn /* , initialValue */) {
        return $reduce(this, callbackfn, arguments.length, arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    var reduce = entryVirtual('Array').reduce;

    var ArrayPrototype$8 = Array.prototype;

    var reduce_1 = function (it) {
      var own = it.reduce;
      return it === ArrayPrototype$8 || (it instanceof Array && own === ArrayPrototype$8.reduce) ? reduce : own;
    };

    var reduce$1 = reduce_1;

    var reduce$2 = reduce$1;

    var build = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _concat = interopRequireDefault(concat$2);

    var _includes = interopRequireDefault(includes$4);

    var _map = interopRequireDefault(map$2);

    var _reduce = interopRequireDefault(reduce$2);

    /*!
     * XRegExp.build 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2012-present MIT License
     */
    var _default = function _default(XRegExp) {
      var REGEX_DATA = 'xregexp';
      var subParts = /(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*\]/g;
      var parts = XRegExp.union([/\({{([\w$]+)}}\)|{{([\w$]+)}}/, subParts], 'g', {
        conjunction: 'or'
      });
      /**
       * Strips a leading `^` and trailing unescaped `$`, if both are present.
       *
       * @private
       * @param {String} pattern Pattern to process.
       * @returns {String} Pattern with edge anchors removed.
       */

      function deanchor(pattern) {
        // Allow any number of empty noncapturing groups before/after anchors, because regexes
        // built/generated by XRegExp sometimes include them
        var leadingAnchor = /^(?:\(\?:\))*\^/;
        var trailingAnchor = /\$(?:\(\?:\))*$/;

        if (leadingAnchor.test(pattern) && trailingAnchor.test(pattern) && // Ensure that the trailing `$` isn't escaped
        trailingAnchor.test(pattern.replace(/\\[\s\S]/g, ''))) {
          return pattern.replace(leadingAnchor, '').replace(trailingAnchor, '');
        }

        return pattern;
      }
      /**
       * Converts the provided value to an XRegExp. Native RegExp flags are not preserved.
       *
       * @private
       * @param {String|RegExp} value Value to convert.
       * @param {Boolean} [addFlagX] Whether to apply the `x` flag in cases when `value` is not
       *   already a regex generated by XRegExp
       * @returns {RegExp} XRegExp object with XRegExp syntax applied.
       */


      function asXRegExp(value, addFlagX) {
        var flags = addFlagX ? 'x' : '';
        return XRegExp.isRegExp(value) ? value[REGEX_DATA] && value[REGEX_DATA].captureNames ? // Don't recompile, to preserve capture names
        value : // Recompile as XRegExp
        XRegExp(value.source, flags) : // Compile string as XRegExp
        XRegExp(value, flags);
      }

      function interpolate(substitution) {
        return substitution instanceof RegExp ? substitution : XRegExp.escape(substitution);
      }

      function reduceToSubpatternsObject(subpatterns, interpolated, subpatternIndex) {
        subpatterns["subpattern".concat(subpatternIndex)] = interpolated;
        return subpatterns;
      }

      function embedSubpatternAfter(raw, subpatternIndex, rawLiterals) {
        var hasSubpattern = subpatternIndex < rawLiterals.length - 1;
        return raw + (hasSubpattern ? "{{subpattern".concat(subpatternIndex, "}}") : '');
      }
      /**
       * Provides tagged template literals that create regexes with XRegExp syntax and flags. The
       * provided pattern is handled as a raw string, so backslashes don't need to be escaped.
       *
       * Interpolation of strings and regexes shares the features of `XRegExp.build`. Interpolated
       * patterns are treated as atomic units when quantified, interpolated strings have their special
       * characters escaped, a leading `^` and trailing unescaped `$` are stripped from interpolated
       * regexes if both are present, and any backreferences within an interpolated regex are
       * rewritten to work within the overall pattern.
       *
       * @memberOf XRegExp
       * @param {String} [flags] Any combination of XRegExp flags.
       * @returns {Function} Handler for template literals that construct regexes with XRegExp syntax.
       * @example
       *
       * const h12 = /1[0-2]|0?[1-9]/;
       * const h24 = /2[0-3]|[01][0-9]/;
       * const hours = XRegExp.tag('x')`${h12} : | ${h24}`;
       * const minutes = /^[0-5][0-9]$/;
       * // Note that explicitly naming the 'minutes' group is required for named backreferences
       * const time = XRegExp.tag('x')`^ ${hours} (?<minutes>${minutes}) $`;
       * time.test('10:59'); // -> true
       * XRegExp.exec('10:59', time).minutes; // -> '59'
       */


      XRegExp.tag = function (flags) {
        return function (literals) {
          var _context, _context2;

          for (var _len = arguments.length, substitutions = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            substitutions[_key - 1] = arguments[_key];
          }

          var subpatterns = (0, _reduce["default"])(_context = (0, _map["default"])(substitutions).call(substitutions, interpolate)).call(_context, reduceToSubpatternsObject, {});
          var pattern = (0, _map["default"])(_context2 = literals.raw).call(_context2, embedSubpatternAfter).join('');
          return XRegExp.build(pattern, subpatterns, flags);
        };
      };
      /**
       * Builds regexes using named subpatterns, for readability and pattern reuse. Backreferences in
       * the outer pattern and provided subpatterns are automatically renumbered to work correctly.
       * Native flags used by provided subpatterns are ignored in favor of the `flags` argument.
       *
       * @memberOf XRegExp
       * @param {String} pattern XRegExp pattern using `{{name}}` for embedded subpatterns. Allows
       *   `({{name}})` as shorthand for `(?<name>{{name}})`. Patterns cannot be embedded within
       *   character classes.
       * @param {Object} subs Lookup object for named subpatterns. Values can be strings or regexes. A
       *   leading `^` and trailing unescaped `$` are stripped from subpatterns, if both are present.
       * @param {String} [flags] Any combination of XRegExp flags.
       * @returns {RegExp} Regex with interpolated subpatterns.
       * @example
       *
       * const time = XRegExp.build('(?x)^ {{hours}} ({{minutes}}) $', {
       *   hours: XRegExp.build('{{h12}} : | {{h24}}', {
       *     h12: /1[0-2]|0?[1-9]/,
       *     h24: /2[0-3]|[01][0-9]/
       *   }, 'x'),
       *   minutes: /^[0-5][0-9]$/
       * });
       * time.test('10:59'); // -> true
       * XRegExp.exec('10:59', time).minutes; // -> '59'
       */


      XRegExp.build = function (pattern, subs, flags) {
        flags = flags || ''; // Used with `asXRegExp` calls for `pattern` and subpatterns in `subs`, to work around how
        // some browsers convert `RegExp('\n')` to a regex that contains the literal characters `\`
        // and `n`. See more details at <https://github.com/slevithan/xregexp/pull/163>.

        var addFlagX = (0, _includes["default"])(flags).call(flags, 'x');
        var inlineFlags = /^\(\?([\w$]+)\)/.exec(pattern); // Add flags within a leading mode modifier to the overall pattern's flags

        if (inlineFlags) {
          flags = XRegExp._clipDuplicates(flags + inlineFlags[1]);
        }

        var data = {};

        for (var p in subs) {
          if (subs.hasOwnProperty(p)) {
            // Passing to XRegExp enables extended syntax and ensures independent validity,
            // lest an unescaped `(`, `)`, `[`, or trailing `\` breaks the `(?:)` wrapper. For
            // subpatterns provided as native regexes, it dies on octals and adds the property
            // used to hold extended regex instance data, for simplicity.
            var sub = asXRegExp(subs[p], addFlagX);
            data[p] = {
              // Deanchoring allows embedding independently useful anchored regexes. If you
              // really need to keep your anchors, double them (i.e., `^^...$$`).
              pattern: deanchor(sub.source),
              names: sub[REGEX_DATA].captureNames || []
            };
          }
        } // Passing to XRegExp dies on octals and ensures the outer pattern is independently valid;
        // helps keep this simple. Named captures will be put back.


        var patternAsRegex = asXRegExp(pattern, addFlagX); // 'Caps' is short for 'captures'

        var numCaps = 0;
        var numPriorCaps;
        var numOuterCaps = 0;
        var outerCapsMap = [0];
        var outerCapNames = patternAsRegex[REGEX_DATA].captureNames || [];
        var output = patternAsRegex.source.replace(parts, function ($0, $1, $2, $3, $4) {
          var subName = $1 || $2;
          var capName;
          var intro;
          var localCapIndex; // Named subpattern

          if (subName) {
            var _context3;

            if (!data.hasOwnProperty(subName)) {
              throw new ReferenceError("Undefined property ".concat($0));
            } // Named subpattern was wrapped in a capturing group


            if ($1) {
              capName = outerCapNames[numOuterCaps];
              outerCapsMap[++numOuterCaps] = ++numCaps; // If it's a named group, preserve the name. Otherwise, use the subpattern name
              // as the capture name

              intro = "(?<".concat(capName || subName, ">");
            } else {
              intro = '(?:';
            }

            numPriorCaps = numCaps;
            var rewrittenSubpattern = data[subName].pattern.replace(subParts, function (match, paren, backref) {
              // Capturing group
              if (paren) {
                capName = data[subName].names[numCaps - numPriorCaps];
                ++numCaps; // If the current capture has a name, preserve the name

                if (capName) {
                  return "(?<".concat(capName, ">");
                } // Backreference

              } else if (backref) {
                localCapIndex = +backref - 1; // Rewrite the backreference

                return data[subName].names[localCapIndex] ? // Need to preserve the backreference name in case using flag `n`
                "\\k<".concat(data[subName].names[localCapIndex], ">") : "\\".concat(+backref + numPriorCaps);
              }

              return match;
            });
            return (0, _concat["default"])(_context3 = "".concat(intro)).call(_context3, rewrittenSubpattern, ")");
          } // Capturing group


          if ($3) {
            capName = outerCapNames[numOuterCaps];
            outerCapsMap[++numOuterCaps] = ++numCaps; // If the current capture has a name, preserve the name

            if (capName) {
              return "(?<".concat(capName, ">");
            } // Backreference

          } else if ($4) {
            localCapIndex = +$4 - 1; // Rewrite the backreference

            return outerCapNames[localCapIndex] ? // Need to preserve the backreference name in case using flag `n`
            "\\k<".concat(outerCapNames[localCapIndex], ">") : "\\".concat(outerCapsMap[+$4]);
          }

          return $0;
        });
        return XRegExp(output, flags);
      };
    };

    exports["default"] = _default;
    module.exports = exports.default;
    });

    var matchrecursive = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _slice = interopRequireDefault(slice$4);

    var _concat = interopRequireDefault(concat$2);

    var _includes = interopRequireDefault(includes$4);

    /*!
     * XRegExp.matchRecursive 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2009-present MIT License
     */
    var _default = function _default(XRegExp) {
      /**
       * Returns a match detail object composed of the provided values.
       *
       * @private
       */
      function row(name, value, start, end) {
        return {
          name: name,
          value: value,
          start: start,
          end: end
        };
      }
      /**
       * Returns an array of match strings between outermost left and right delimiters, or an array of
       * objects with detailed match parts and position data. An error is thrown if delimiters are
       * unbalanced within the data.
       *
       * @memberOf XRegExp
       * @param {String} str String to search.
       * @param {String} left Left delimiter as an XRegExp pattern.
       * @param {String} right Right delimiter as an XRegExp pattern.
       * @param {String} [flags] Any native or XRegExp flags, used for the left and right delimiters.
       * @param {Object} [options] Lets you specify `valueNames` and `escapeChar` options.
       * @returns {!Array} Array of matches, or an empty array.
       * @example
       *
       * // Basic usage
       * let str = '(t((e))s)t()(ing)';
       * XRegExp.matchRecursive(str, '\\(', '\\)', 'g');
       * // -> ['t((e))s', '', 'ing']
       *
       * // Extended information mode with valueNames
       * str = 'Here is <div> <div>an</div></div> example';
       * XRegExp.matchRecursive(str, '<div\\s*>', '</div>', 'gi', {
       *   valueNames: ['between', 'left', 'match', 'right']
       * });
       * // -> [
       * // {name: 'between', value: 'Here is ',       start: 0,  end: 8},
       * // {name: 'left',    value: '<div>',          start: 8,  end: 13},
       * // {name: 'match',   value: ' <div>an</div>', start: 13, end: 27},
       * // {name: 'right',   value: '</div>',         start: 27, end: 33},
       * // {name: 'between', value: ' example',       start: 33, end: 41}
       * // ]
       *
       * // Omitting unneeded parts with null valueNames, and using escapeChar
       * str = '...{1}.\\{{function(x,y){return {y:x}}}';
       * XRegExp.matchRecursive(str, '{', '}', 'g', {
       *   valueNames: ['literal', null, 'value', null],
       *   escapeChar: '\\'
       * });
       * // -> [
       * // {name: 'literal', value: '...',  start: 0, end: 3},
       * // {name: 'value',   value: '1',    start: 4, end: 5},
       * // {name: 'literal', value: '.\\{', start: 6, end: 9},
       * // {name: 'value',   value: 'function(x,y){return {y:x}}', start: 10, end: 37}
       * // ]
       *
       * // Sticky mode via flag y
       * str = '<1><<<2>>><3>4<5>';
       * XRegExp.matchRecursive(str, '<', '>', 'gy');
       * // -> ['1', '<<2>>', '3']
       */


      XRegExp.matchRecursive = function (str, left, right, flags, options) {
        flags = flags || '';
        options = options || {};
        var global = (0, _includes["default"])(flags).call(flags, 'g');
        var sticky = (0, _includes["default"])(flags).call(flags, 'y'); // Flag `y` is controlled internally

        var basicFlags = flags.replace(/y/g, '');
        var _options = options,
            escapeChar = _options.escapeChar;
        var vN = options.valueNames;
        var output = [];
        var openTokens = 0;
        var delimStart = 0;
        var delimEnd = 0;
        var lastOuterEnd = 0;
        var outerStart;
        var innerStart;
        var leftMatch;
        var rightMatch;
        var esc;
        left = XRegExp(left, basicFlags);
        right = XRegExp(right, basicFlags);

        if (escapeChar) {
          var _context, _context2;

          if (escapeChar.length > 1) {
            throw new Error('Cannot use more than one escape character');
          }

          escapeChar = XRegExp.escape(escapeChar); // Example of concatenated `esc` regex:
          // `escapeChar`: '%'
          // `left`: '<'
          // `right`: '>'
          // Regex is: /(?:%[\S\s]|(?:(?!<|>)[^%])+)+/

          esc = new RegExp((0, _concat["default"])(_context = (0, _concat["default"])(_context2 = "(?:".concat(escapeChar, "[\\S\\s]|(?:(?!")).call(_context2, // Using `XRegExp.union` safely rewrites backreferences in `left` and `right`.
          // Intentionally not passing `basicFlags` to `XRegExp.union` since any syntax
          // transformation resulting from those flags was already applied to `left` and
          // `right` when they were passed through the XRegExp constructor above.
          XRegExp.union([left, right], '', {
            conjunction: 'or'
          }).source, ")[^")).call(_context, escapeChar, "])+)+"), // Flags `gy` not needed here
          flags.replace(/[^imu]+/g, ''));
        }

        while (true) {
          // If using an escape character, advance to the delimiter's next starting position,
          // skipping any escaped characters in between
          if (escapeChar) {
            delimEnd += (XRegExp.exec(str, esc, delimEnd, 'sticky') || [''])[0].length;
          }

          leftMatch = XRegExp.exec(str, left, delimEnd);
          rightMatch = XRegExp.exec(str, right, delimEnd); // Keep the leftmost match only

          if (leftMatch && rightMatch) {
            if (leftMatch.index <= rightMatch.index) {
              rightMatch = null;
            } else {
              leftMatch = null;
            }
          } // Paths (LM: leftMatch, RM: rightMatch, OT: openTokens):
          // LM | RM | OT | Result
          // 1  | 0  | 1  | loop
          // 1  | 0  | 0  | loop
          // 0  | 1  | 1  | loop
          // 0  | 1  | 0  | throw
          // 0  | 0  | 1  | throw
          // 0  | 0  | 0  | break
          // The paths above don't include the sticky mode special case. The loop ends after the
          // first completed match if not `global`.


          if (leftMatch || rightMatch) {
            delimStart = (leftMatch || rightMatch).index;
            delimEnd = delimStart + (leftMatch || rightMatch)[0].length;
          } else if (!openTokens) {
            break;
          }

          if (sticky && !openTokens && delimStart > lastOuterEnd) {
            break;
          }

          if (leftMatch) {
            if (!openTokens) {
              outerStart = delimStart;
              innerStart = delimEnd;
            }

            ++openTokens;
          } else if (rightMatch && openTokens) {
            if (! --openTokens) {
              if (vN) {
                if (vN[0] && outerStart > lastOuterEnd) {
                  output.push(row(vN[0], (0, _slice["default"])(str).call(str, lastOuterEnd, outerStart), lastOuterEnd, outerStart));
                }

                if (vN[1]) {
                  output.push(row(vN[1], (0, _slice["default"])(str).call(str, outerStart, innerStart), outerStart, innerStart));
                }

                if (vN[2]) {
                  output.push(row(vN[2], (0, _slice["default"])(str).call(str, innerStart, delimStart), innerStart, delimStart));
                }

                if (vN[3]) {
                  output.push(row(vN[3], (0, _slice["default"])(str).call(str, delimStart, delimEnd), delimStart, delimEnd));
                }
              } else {
                output.push((0, _slice["default"])(str).call(str, innerStart, delimStart));
              }

              lastOuterEnd = delimEnd;

              if (!global) {
                break;
              }
            }
          } else {
            throw new Error('Unbalanced delimiter found in string');
          } // If the delimiter matched an empty string, avoid an infinite loop


          if (delimStart === delimEnd) {
            ++delimEnd;
          }
        }

        if (global && !sticky && vN && vN[0] && str.length > lastOuterEnd) {
          output.push(row(vN[0], (0, _slice["default"])(str).call(str, lastOuterEnd), lastOuterEnd, str.length));
        }

        return output;
      };
    };

    exports["default"] = _default;
    module.exports = exports.default;
    });

    var unicodeBase = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _getIterator2 = interopRequireDefault(getIterator$1);

    var _isArray = interopRequireDefault(isArray$3);

    var _getIteratorMethod2 = interopRequireDefault(getIteratorMethod$1);

    var _symbol = interopRequireDefault(symbol$2);

    var _from = interopRequireDefault(from_1$2);

    var _slice = interopRequireDefault(slice$4);

    var _includes = interopRequireDefault(includes$4);

    var _concat = interopRequireDefault(concat$2);

    var _forEach = interopRequireDefault(forEach$2);

    function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof _symbol["default"] === "undefined" || (0, _getIteratorMethod2["default"])(o) == null) { if ((0, _isArray["default"])(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = (0, _getIterator2["default"])(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

    function _unsupportedIterableToArray(o, minLen) { var _context4; if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = (0, _slice["default"])(_context4 = Object.prototype.toString.call(o)).call(_context4, 8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return (0, _from["default"])(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    /*!
     * XRegExp Unicode Base 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2008-present MIT License
     */
    var _default = function _default(XRegExp) {
      /**
       * Adds base support for Unicode matching:
       * - Adds syntax `\p{..}` for matching Unicode tokens. Tokens can be inverted using `\P{..}` or
       *   `\p{^..}`. Token names ignore case, spaces, hyphens, and underscores. You can omit the
       *   braces for token names that are a single letter (e.g. `\pL` or `PL`).
       * - Adds flag A (astral), which enables 21-bit Unicode support.
       * - Adds the `XRegExp.addUnicodeData` method used by other addons to provide character data.
       *
       * Unicode Base relies on externally provided Unicode character data. Official addons are
       * available to provide data for Unicode categories, scripts, blocks, and properties.
       *
       * @requires XRegExp
       */
      // ==--------------------------==
      // Private stuff
      // ==--------------------------==
      // Storage for Unicode data
      var unicode = {}; // Reuse utils

      var dec = XRegExp._dec;
      var hex = XRegExp._hex;
      var pad4 = XRegExp._pad4; // Generates a token lookup name: lowercase, with hyphens, spaces, and underscores removed

      function normalize(name) {
        return name.replace(/[- _]+/g, '').toLowerCase();
      } // Gets the decimal code of a literal code unit, \xHH, \uHHHH, or a backslash-escaped literal


      function charCode(chr) {
        var esc = /^\\[xu](.+)/.exec(chr);
        return esc ? dec(esc[1]) : chr.charCodeAt(chr[0] === '\\' ? 1 : 0);
      } // Inverts a list of ordered BMP characters and ranges


      function invertBmp(range) {
        var output = '';
        var lastEnd = -1;
        (0, _forEach["default"])(XRegExp).call(XRegExp, range, /(\\x..|\\u....|\\?[\s\S])(?:-(\\x..|\\u....|\\?[\s\S]))?/, function (m) {
          var start = charCode(m[1]);

          if (start > lastEnd + 1) {
            output += "\\u".concat(pad4(hex(lastEnd + 1)));

            if (start > lastEnd + 2) {
              output += "-\\u".concat(pad4(hex(start - 1)));
            }
          }

          lastEnd = charCode(m[2] || m[1]);
        });

        if (lastEnd < 0xFFFF) {
          output += "\\u".concat(pad4(hex(lastEnd + 1)));

          if (lastEnd < 0xFFFE) {
            output += '-\\uFFFF';
          }
        }

        return output;
      } // Generates an inverted BMP range on first use


      function cacheInvertedBmp(slug) {
        var prop = 'b!';
        return unicode[slug][prop] || (unicode[slug][prop] = invertBmp(unicode[slug].bmp));
      } // Combines and optionally negates BMP and astral data


      function buildAstral(slug, isNegated) {
        var item = unicode[slug];
        var combined = '';

        if (item.bmp && !item.isBmpLast) {
          var _context;

          combined = (0, _concat["default"])(_context = "[".concat(item.bmp, "]")).call(_context, item.astral ? '|' : '');
        }

        if (item.astral) {
          combined += item.astral;
        }

        if (item.isBmpLast && item.bmp) {
          var _context2;

          combined += (0, _concat["default"])(_context2 = "".concat(item.astral ? '|' : '', "[")).call(_context2, item.bmp, "]");
        } // Astral Unicode tokens always match a code point, never a code unit


        return isNegated ? "(?:(?!".concat(combined, ")(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\0-\uFFFF]))") : "(?:".concat(combined, ")");
      } // Builds a complete astral pattern on first use


      function cacheAstral(slug, isNegated) {
        var prop = isNegated ? 'a!' : 'a=';
        return unicode[slug][prop] || (unicode[slug][prop] = buildAstral(slug, isNegated));
      } // ==--------------------------==
      // Core functionality
      // ==--------------------------==

      /*
       * Add astral mode (flag A) and Unicode token syntax: `\p{..}`, `\P{..}`, `\p{^..}`, `\pC`.
       */


      XRegExp.addToken( // Use `*` instead of `+` to avoid capturing `^` as the token name in `\p{^}`
      /\\([pP])(?:{(\^?)([^}]*)}|([A-Za-z]))/, function (match, scope, flags) {
        var ERR_DOUBLE_NEG = 'Invalid double negation ';
        var ERR_UNKNOWN_NAME = 'Unknown Unicode token ';
        var ERR_UNKNOWN_REF = 'Unicode token missing data ';
        var ERR_ASTRAL_ONLY = 'Astral mode required for Unicode token ';
        var ERR_ASTRAL_IN_CLASS = 'Astral mode does not support Unicode tokens within character classes'; // Negated via \P{..} or \p{^..}

        var isNegated = match[1] === 'P' || !!match[2]; // Switch from BMP (0-FFFF) to astral (0-10FFFF) mode via flag A

        var isAstralMode = (0, _includes["default"])(flags).call(flags, 'A'); // Token lookup name. Check `[4]` first to avoid passing `undefined` via `\p{}`

        var slug = normalize(match[4] || match[3]); // Token data object

        var item = unicode[slug];

        if (match[1] === 'P' && match[2]) {
          throw new SyntaxError(ERR_DOUBLE_NEG + match[0]);
        }

        if (!unicode.hasOwnProperty(slug)) {
          throw new SyntaxError(ERR_UNKNOWN_NAME + match[0]);
        } // Switch to the negated form of the referenced Unicode token


        if (item.inverseOf) {
          slug = normalize(item.inverseOf);

          if (!unicode.hasOwnProperty(slug)) {
            var _context3;

            throw new ReferenceError((0, _concat["default"])(_context3 = "".concat(ERR_UNKNOWN_REF + match[0], " -> ")).call(_context3, item.inverseOf));
          }

          item = unicode[slug];
          isNegated = !isNegated;
        }

        if (!(item.bmp || isAstralMode)) {
          throw new SyntaxError(ERR_ASTRAL_ONLY + match[0]);
        }

        if (isAstralMode) {
          if (scope === 'class') {
            throw new SyntaxError(ERR_ASTRAL_IN_CLASS);
          }

          return cacheAstral(slug, isNegated);
        }

        return scope === 'class' ? isNegated ? cacheInvertedBmp(slug) : item.bmp : "".concat((isNegated ? '[^' : '[') + item.bmp, "]");
      }, {
        scope: 'all',
        optionalFlags: 'A',
        leadChar: '\\'
      });
      /**
       * Adds to the list of Unicode tokens that XRegExp regexes can match via `\p` or `\P`.
       *
       * @memberOf XRegExp
       * @param {Array} data Objects with named character ranges. Each object may have properties
       *   `name`, `alias`, `isBmpLast`, `inverseOf`, `bmp`, and `astral`. All but `name` are
       *   optional, although one of `bmp` or `astral` is required (unless `inverseOf` is set). If
       *   `astral` is absent, the `bmp` data is used for BMP and astral modes. If `bmp` is absent,
       *   the name errors in BMP mode but works in astral mode. If both `bmp` and `astral` are
       *   provided, the `bmp` data only is used in BMP mode, and the combination of `bmp` and
       *   `astral` data is used in astral mode. `isBmpLast` is needed when a token matches orphan
       *   high surrogates *and* uses surrogate pairs to match astral code points. The `bmp` and
       *   `astral` data should be a combination of literal characters and `\xHH` or `\uHHHH` escape
       *   sequences, with hyphens to create ranges. Any regex metacharacters in the data should be
       *   escaped, apart from range-creating hyphens. The `astral` data can additionally use
       *   character classes and alternation, and should use surrogate pairs to represent astral code
       *   points. `inverseOf` can be used to avoid duplicating character data if a Unicode token is
       *   defined as the exact inverse of another token.
       * @example
       *
       * // Basic use
       * XRegExp.addUnicodeData([{
       *   name: 'XDigit',
       *   alias: 'Hexadecimal',
       *   bmp: '0-9A-Fa-f'
       * }]);
       * XRegExp('\\p{XDigit}:\\p{Hexadecimal}+').test('0:3D'); // -> true
       */

      XRegExp.addUnicodeData = function (data) {
        var ERR_NO_NAME = 'Unicode token requires name';
        var ERR_NO_DATA = 'Unicode token has no character data ';

        var _iterator = _createForOfIteratorHelper(data),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var item = _step.value;

            if (!item.name) {
              throw new Error(ERR_NO_NAME);
            }

            if (!(item.inverseOf || item.bmp || item.astral)) {
              throw new Error(ERR_NO_DATA + item.name);
            }

            unicode[normalize(item.name)] = item;

            if (item.alias) {
              unicode[normalize(item.alias)] = item;
            }
          } // Reset the pattern cache used by the `XRegExp` constructor, since the same pattern and
          // flags might now produce different results

        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        XRegExp.cache.flush('patterns');
      };
      /**
       * @ignore
       *
       * Return a reference to the internal Unicode definition structure for the given Unicode
       * Property if the given name is a legal Unicode Property for use in XRegExp `\p` or `\P` regex
       * constructs.
       *
       * @memberOf XRegExp
       * @param {String} name Name by which the Unicode Property may be recognized (case-insensitive),
       *   e.g. `'N'` or `'Number'`. The given name is matched against all registered Unicode
       *   Properties and Property Aliases.
       * @returns {Object} Reference to definition structure when the name matches a Unicode Property.
       *
       * @note
       * For more info on Unicode Properties, see also http://unicode.org/reports/tr18/#Categories.
       *
       * @note
       * This method is *not* part of the officially documented API and may change or be removed in
       * the future. It is meant for userland code that wishes to reuse the (large) internal Unicode
       * structures set up by XRegExp.
       */


      XRegExp._getUnicodeProperty = function (name) {
        var slug = normalize(name);
        return unicode[slug];
      };
    };

    exports["default"] = _default;
    module.exports = exports.default;
    });

    var blocks = [
        {
            'name': 'InAdlam',
            'astral': '\uD83A[\uDD00-\uDD5F]'
        },
        {
            'name': 'InAegean_Numbers',
            'astral': '\uD800[\uDD00-\uDD3F]'
        },
        {
            'name': 'InAhom',
            'astral': '\uD805[\uDF00-\uDF3F]'
        },
        {
            'name': 'InAlchemical_Symbols',
            'astral': '\uD83D[\uDF00-\uDF7F]'
        },
        {
            'name': 'InAlphabetic_Presentation_Forms',
            'bmp': '\uFB00-\uFB4F'
        },
        {
            'name': 'InAnatolian_Hieroglyphs',
            'astral': '\uD811[\uDC00-\uDE7F]'
        },
        {
            'name': 'InAncient_Greek_Musical_Notation',
            'astral': '\uD834[\uDE00-\uDE4F]'
        },
        {
            'name': 'InAncient_Greek_Numbers',
            'astral': '\uD800[\uDD40-\uDD8F]'
        },
        {
            'name': 'InAncient_Symbols',
            'astral': '\uD800[\uDD90-\uDDCF]'
        },
        {
            'name': 'InArabic',
            'bmp': '\u0600-\u06FF'
        },
        {
            'name': 'InArabic_Extended_A',
            'bmp': '\u08A0-\u08FF'
        },
        {
            'name': 'InArabic_Mathematical_Alphabetic_Symbols',
            'astral': '\uD83B[\uDE00-\uDEFF]'
        },
        {
            'name': 'InArabic_Presentation_Forms_A',
            'bmp': '\uFB50-\uFDFF'
        },
        {
            'name': 'InArabic_Presentation_Forms_B',
            'bmp': '\uFE70-\uFEFF'
        },
        {
            'name': 'InArabic_Supplement',
            'bmp': '\u0750-\u077F'
        },
        {
            'name': 'InArmenian',
            'bmp': '\u0530-\u058F'
        },
        {
            'name': 'InArrows',
            'bmp': '\u2190-\u21FF'
        },
        {
            'name': 'InAvestan',
            'astral': '\uD802[\uDF00-\uDF3F]'
        },
        {
            'name': 'InBalinese',
            'bmp': '\u1B00-\u1B7F'
        },
        {
            'name': 'InBamum',
            'bmp': '\uA6A0-\uA6FF'
        },
        {
            'name': 'InBamum_Supplement',
            'astral': '\uD81A[\uDC00-\uDE3F]'
        },
        {
            'name': 'InBasic_Latin',
            'bmp': '\0-\x7F'
        },
        {
            'name': 'InBassa_Vah',
            'astral': '\uD81A[\uDED0-\uDEFF]'
        },
        {
            'name': 'InBatak',
            'bmp': '\u1BC0-\u1BFF'
        },
        {
            'name': 'InBengali',
            'bmp': '\u0980-\u09FF'
        },
        {
            'name': 'InBhaiksuki',
            'astral': '\uD807[\uDC00-\uDC6F]'
        },
        {
            'name': 'InBlock_Elements',
            'bmp': '\u2580-\u259F'
        },
        {
            'name': 'InBopomofo',
            'bmp': '\u3100-\u312F'
        },
        {
            'name': 'InBopomofo_Extended',
            'bmp': '\u31A0-\u31BF'
        },
        {
            'name': 'InBox_Drawing',
            'bmp': '\u2500-\u257F'
        },
        {
            'name': 'InBrahmi',
            'astral': '\uD804[\uDC00-\uDC7F]'
        },
        {
            'name': 'InBraille_Patterns',
            'bmp': '\u2800-\u28FF'
        },
        {
            'name': 'InBuginese',
            'bmp': '\u1A00-\u1A1F'
        },
        {
            'name': 'InBuhid',
            'bmp': '\u1740-\u175F'
        },
        {
            'name': 'InByzantine_Musical_Symbols',
            'astral': '\uD834[\uDC00-\uDCFF]'
        },
        {
            'name': 'InCJK_Compatibility',
            'bmp': '\u3300-\u33FF'
        },
        {
            'name': 'InCJK_Compatibility_Forms',
            'bmp': '\uFE30-\uFE4F'
        },
        {
            'name': 'InCJK_Compatibility_Ideographs',
            'bmp': '\uF900-\uFAFF'
        },
        {
            'name': 'InCJK_Compatibility_Ideographs_Supplement',
            'astral': '\uD87E[\uDC00-\uDE1F]'
        },
        {
            'name': 'InCJK_Radicals_Supplement',
            'bmp': '\u2E80-\u2EFF'
        },
        {
            'name': 'InCJK_Strokes',
            'bmp': '\u31C0-\u31EF'
        },
        {
            'name': 'InCJK_Symbols_And_Punctuation',
            'bmp': '\u3000-\u303F'
        },
        {
            'name': 'InCJK_Unified_Ideographs',
            'bmp': '\u4E00-\u9FFF'
        },
        {
            'name': 'InCJK_Unified_Ideographs_Extension_A',
            'bmp': '\u3400-\u4DBF'
        },
        {
            'name': 'InCJK_Unified_Ideographs_Extension_B',
            'astral': '[\uD840-\uD868][\uDC00-\uDFFF]|\uD869[\uDC00-\uDEDF]'
        },
        {
            'name': 'InCJK_Unified_Ideographs_Extension_C',
            'astral': '\uD869[\uDF00-\uDFFF]|[\uD86A-\uD86C][\uDC00-\uDFFF]|\uD86D[\uDC00-\uDF3F]'
        },
        {
            'name': 'InCJK_Unified_Ideographs_Extension_D',
            'astral': '\uD86D[\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1F]'
        },
        {
            'name': 'InCJK_Unified_Ideographs_Extension_E',
            'astral': '\uD86E[\uDC20-\uDFFF]|[\uD86F-\uD872][\uDC00-\uDFFF]|\uD873[\uDC00-\uDEAF]'
        },
        {
            'name': 'InCJK_Unified_Ideographs_Extension_F',
            'astral': '\uD873[\uDEB0-\uDFFF]|[\uD874-\uD879][\uDC00-\uDFFF]|\uD87A[\uDC00-\uDFEF]'
        },
        {
            'name': 'InCarian',
            'astral': '\uD800[\uDEA0-\uDEDF]'
        },
        {
            'name': 'InCaucasian_Albanian',
            'astral': '\uD801[\uDD30-\uDD6F]'
        },
        {
            'name': 'InChakma',
            'astral': '\uD804[\uDD00-\uDD4F]'
        },
        {
            'name': 'InCham',
            'bmp': '\uAA00-\uAA5F'
        },
        {
            'name': 'InCherokee',
            'bmp': '\u13A0-\u13FF'
        },
        {
            'name': 'InCherokee_Supplement',
            'bmp': '\uAB70-\uABBF'
        },
        {
            'name': 'InChess_Symbols',
            'astral': '\uD83E[\uDE00-\uDE6F]'
        },
        {
            'name': 'InCombining_Diacritical_Marks',
            'bmp': '\u0300-\u036F'
        },
        {
            'name': 'InCombining_Diacritical_Marks_Extended',
            'bmp': '\u1AB0-\u1AFF'
        },
        {
            'name': 'InCombining_Diacritical_Marks_For_Symbols',
            'bmp': '\u20D0-\u20FF'
        },
        {
            'name': 'InCombining_Diacritical_Marks_Supplement',
            'bmp': '\u1DC0-\u1DFF'
        },
        {
            'name': 'InCombining_Half_Marks',
            'bmp': '\uFE20-\uFE2F'
        },
        {
            'name': 'InCommon_Indic_Number_Forms',
            'bmp': '\uA830-\uA83F'
        },
        {
            'name': 'InControl_Pictures',
            'bmp': '\u2400-\u243F'
        },
        {
            'name': 'InCoptic',
            'bmp': '\u2C80-\u2CFF'
        },
        {
            'name': 'InCoptic_Epact_Numbers',
            'astral': '\uD800[\uDEE0-\uDEFF]'
        },
        {
            'name': 'InCounting_Rod_Numerals',
            'astral': '\uD834[\uDF60-\uDF7F]'
        },
        {
            'name': 'InCuneiform',
            'astral': '\uD808[\uDC00-\uDFFF]'
        },
        {
            'name': 'InCuneiform_Numbers_And_Punctuation',
            'astral': '\uD809[\uDC00-\uDC7F]'
        },
        {
            'name': 'InCurrency_Symbols',
            'bmp': '\u20A0-\u20CF'
        },
        {
            'name': 'InCypriot_Syllabary',
            'astral': '\uD802[\uDC00-\uDC3F]'
        },
        {
            'name': 'InCyrillic',
            'bmp': '\u0400-\u04FF'
        },
        {
            'name': 'InCyrillic_Extended_A',
            'bmp': '\u2DE0-\u2DFF'
        },
        {
            'name': 'InCyrillic_Extended_B',
            'bmp': '\uA640-\uA69F'
        },
        {
            'name': 'InCyrillic_Extended_C',
            'bmp': '\u1C80-\u1C8F'
        },
        {
            'name': 'InCyrillic_Supplement',
            'bmp': '\u0500-\u052F'
        },
        {
            'name': 'InDeseret',
            'astral': '\uD801[\uDC00-\uDC4F]'
        },
        {
            'name': 'InDevanagari',
            'bmp': '\u0900-\u097F'
        },
        {
            'name': 'InDevanagari_Extended',
            'bmp': '\uA8E0-\uA8FF'
        },
        {
            'name': 'InDingbats',
            'bmp': '\u2700-\u27BF'
        },
        {
            'name': 'InDogra',
            'astral': '\uD806[\uDC00-\uDC4F]'
        },
        {
            'name': 'InDomino_Tiles',
            'astral': '\uD83C[\uDC30-\uDC9F]'
        },
        {
            'name': 'InDuployan',
            'astral': '\uD82F[\uDC00-\uDC9F]'
        },
        {
            'name': 'InEarly_Dynastic_Cuneiform',
            'astral': '\uD809[\uDC80-\uDD4F]'
        },
        {
            'name': 'InEgyptian_Hieroglyphs',
            'astral': '\uD80C[\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2F]'
        },
        {
            'name': 'InElbasan',
            'astral': '\uD801[\uDD00-\uDD2F]'
        },
        {
            'name': 'InEmoticons',
            'astral': '\uD83D[\uDE00-\uDE4F]'
        },
        {
            'name': 'InEnclosed_Alphanumeric_Supplement',
            'astral': '\uD83C[\uDD00-\uDDFF]'
        },
        {
            'name': 'InEnclosed_Alphanumerics',
            'bmp': '\u2460-\u24FF'
        },
        {
            'name': 'InEnclosed_CJK_Letters_And_Months',
            'bmp': '\u3200-\u32FF'
        },
        {
            'name': 'InEnclosed_Ideographic_Supplement',
            'astral': '\uD83C[\uDE00-\uDEFF]'
        },
        {
            'name': 'InEthiopic',
            'bmp': '\u1200-\u137F'
        },
        {
            'name': 'InEthiopic_Extended',
            'bmp': '\u2D80-\u2DDF'
        },
        {
            'name': 'InEthiopic_Extended_A',
            'bmp': '\uAB00-\uAB2F'
        },
        {
            'name': 'InEthiopic_Supplement',
            'bmp': '\u1380-\u139F'
        },
        {
            'name': 'InGeneral_Punctuation',
            'bmp': '\u2000-\u206F'
        },
        {
            'name': 'InGeometric_Shapes',
            'bmp': '\u25A0-\u25FF'
        },
        {
            'name': 'InGeometric_Shapes_Extended',
            'astral': '\uD83D[\uDF80-\uDFFF]'
        },
        {
            'name': 'InGeorgian',
            'bmp': '\u10A0-\u10FF'
        },
        {
            'name': 'InGeorgian_Extended',
            'bmp': '\u1C90-\u1CBF'
        },
        {
            'name': 'InGeorgian_Supplement',
            'bmp': '\u2D00-\u2D2F'
        },
        {
            'name': 'InGlagolitic',
            'bmp': '\u2C00-\u2C5F'
        },
        {
            'name': 'InGlagolitic_Supplement',
            'astral': '\uD838[\uDC00-\uDC2F]'
        },
        {
            'name': 'InGothic',
            'astral': '\uD800[\uDF30-\uDF4F]'
        },
        {
            'name': 'InGrantha',
            'astral': '\uD804[\uDF00-\uDF7F]'
        },
        {
            'name': 'InGreek_And_Coptic',
            'bmp': '\u0370-\u03FF'
        },
        {
            'name': 'InGreek_Extended',
            'bmp': '\u1F00-\u1FFF'
        },
        {
            'name': 'InGujarati',
            'bmp': '\u0A80-\u0AFF'
        },
        {
            'name': 'InGunjala_Gondi',
            'astral': '\uD807[\uDD60-\uDDAF]'
        },
        {
            'name': 'InGurmukhi',
            'bmp': '\u0A00-\u0A7F'
        },
        {
            'name': 'InHalfwidth_And_Fullwidth_Forms',
            'bmp': '\uFF00-\uFFEF'
        },
        {
            'name': 'InHangul_Compatibility_Jamo',
            'bmp': '\u3130-\u318F'
        },
        {
            'name': 'InHangul_Jamo',
            'bmp': '\u1100-\u11FF'
        },
        {
            'name': 'InHangul_Jamo_Extended_A',
            'bmp': '\uA960-\uA97F'
        },
        {
            'name': 'InHangul_Jamo_Extended_B',
            'bmp': '\uD7B0-\uD7FF'
        },
        {
            'name': 'InHangul_Syllables',
            'bmp': '\uAC00-\uD7AF'
        },
        {
            'name': 'InHanifi_Rohingya',
            'astral': '\uD803[\uDD00-\uDD3F]'
        },
        {
            'name': 'InHanunoo',
            'bmp': '\u1720-\u173F'
        },
        {
            'name': 'InHatran',
            'astral': '\uD802[\uDCE0-\uDCFF]'
        },
        {
            'name': 'InHebrew',
            'bmp': '\u0590-\u05FF'
        },
        {
            'name': 'InHigh_Private_Use_Surrogates',
            'bmp': '\uDB80-\uDBFF'
        },
        {
            'name': 'InHigh_Surrogates',
            'bmp': '\uD800-\uDB7F'
        },
        {
            'name': 'InHiragana',
            'bmp': '\u3040-\u309F'
        },
        {
            'name': 'InIPA_Extensions',
            'bmp': '\u0250-\u02AF'
        },
        {
            'name': 'InIdeographic_Description_Characters',
            'bmp': '\u2FF0-\u2FFF'
        },
        {
            'name': 'InIdeographic_Symbols_And_Punctuation',
            'astral': '\uD81B[\uDFE0-\uDFFF]'
        },
        {
            'name': 'InImperial_Aramaic',
            'astral': '\uD802[\uDC40-\uDC5F]'
        },
        {
            'name': 'InIndic_Siyaq_Numbers',
            'astral': '\uD83B[\uDC70-\uDCBF]'
        },
        {
            'name': 'InInscriptional_Pahlavi',
            'astral': '\uD802[\uDF60-\uDF7F]'
        },
        {
            'name': 'InInscriptional_Parthian',
            'astral': '\uD802[\uDF40-\uDF5F]'
        },
        {
            'name': 'InJavanese',
            'bmp': '\uA980-\uA9DF'
        },
        {
            'name': 'InKaithi',
            'astral': '\uD804[\uDC80-\uDCCF]'
        },
        {
            'name': 'InKana_Extended_A',
            'astral': '\uD82C[\uDD00-\uDD2F]'
        },
        {
            'name': 'InKana_Supplement',
            'astral': '\uD82C[\uDC00-\uDCFF]'
        },
        {
            'name': 'InKanbun',
            'bmp': '\u3190-\u319F'
        },
        {
            'name': 'InKangxi_Radicals',
            'bmp': '\u2F00-\u2FDF'
        },
        {
            'name': 'InKannada',
            'bmp': '\u0C80-\u0CFF'
        },
        {
            'name': 'InKatakana',
            'bmp': '\u30A0-\u30FF'
        },
        {
            'name': 'InKatakana_Phonetic_Extensions',
            'bmp': '\u31F0-\u31FF'
        },
        {
            'name': 'InKayah_Li',
            'bmp': '\uA900-\uA92F'
        },
        {
            'name': 'InKharoshthi',
            'astral': '\uD802[\uDE00-\uDE5F]'
        },
        {
            'name': 'InKhmer',
            'bmp': '\u1780-\u17FF'
        },
        {
            'name': 'InKhmer_Symbols',
            'bmp': '\u19E0-\u19FF'
        },
        {
            'name': 'InKhojki',
            'astral': '\uD804[\uDE00-\uDE4F]'
        },
        {
            'name': 'InKhudawadi',
            'astral': '\uD804[\uDEB0-\uDEFF]'
        },
        {
            'name': 'InLao',
            'bmp': '\u0E80-\u0EFF'
        },
        {
            'name': 'InLatin_1_Supplement',
            'bmp': '\x80-\xFF'
        },
        {
            'name': 'InLatin_Extended_A',
            'bmp': '\u0100-\u017F'
        },
        {
            'name': 'InLatin_Extended_Additional',
            'bmp': '\u1E00-\u1EFF'
        },
        {
            'name': 'InLatin_Extended_B',
            'bmp': '\u0180-\u024F'
        },
        {
            'name': 'InLatin_Extended_C',
            'bmp': '\u2C60-\u2C7F'
        },
        {
            'name': 'InLatin_Extended_D',
            'bmp': '\uA720-\uA7FF'
        },
        {
            'name': 'InLatin_Extended_E',
            'bmp': '\uAB30-\uAB6F'
        },
        {
            'name': 'InLepcha',
            'bmp': '\u1C00-\u1C4F'
        },
        {
            'name': 'InLetterlike_Symbols',
            'bmp': '\u2100-\u214F'
        },
        {
            'name': 'InLimbu',
            'bmp': '\u1900-\u194F'
        },
        {
            'name': 'InLinear_A',
            'astral': '\uD801[\uDE00-\uDF7F]'
        },
        {
            'name': 'InLinear_B_Ideograms',
            'astral': '\uD800[\uDC80-\uDCFF]'
        },
        {
            'name': 'InLinear_B_Syllabary',
            'astral': '\uD800[\uDC00-\uDC7F]'
        },
        {
            'name': 'InLisu',
            'bmp': '\uA4D0-\uA4FF'
        },
        {
            'name': 'InLow_Surrogates',
            'bmp': '\uDC00-\uDFFF'
        },
        {
            'name': 'InLycian',
            'astral': '\uD800[\uDE80-\uDE9F]'
        },
        {
            'name': 'InLydian',
            'astral': '\uD802[\uDD20-\uDD3F]'
        },
        {
            'name': 'InMahajani',
            'astral': '\uD804[\uDD50-\uDD7F]'
        },
        {
            'name': 'InMahjong_Tiles',
            'astral': '\uD83C[\uDC00-\uDC2F]'
        },
        {
            'name': 'InMakasar',
            'astral': '\uD807[\uDEE0-\uDEFF]'
        },
        {
            'name': 'InMalayalam',
            'bmp': '\u0D00-\u0D7F'
        },
        {
            'name': 'InMandaic',
            'bmp': '\u0840-\u085F'
        },
        {
            'name': 'InManichaean',
            'astral': '\uD802[\uDEC0-\uDEFF]'
        },
        {
            'name': 'InMarchen',
            'astral': '\uD807[\uDC70-\uDCBF]'
        },
        {
            'name': 'InMasaram_Gondi',
            'astral': '\uD807[\uDD00-\uDD5F]'
        },
        {
            'name': 'InMathematical_Alphanumeric_Symbols',
            'astral': '\uD835[\uDC00-\uDFFF]'
        },
        {
            'name': 'InMathematical_Operators',
            'bmp': '\u2200-\u22FF'
        },
        {
            'name': 'InMayan_Numerals',
            'astral': '\uD834[\uDEE0-\uDEFF]'
        },
        {
            'name': 'InMedefaidrin',
            'astral': '\uD81B[\uDE40-\uDE9F]'
        },
        {
            'name': 'InMeetei_Mayek',
            'bmp': '\uABC0-\uABFF'
        },
        {
            'name': 'InMeetei_Mayek_Extensions',
            'bmp': '\uAAE0-\uAAFF'
        },
        {
            'name': 'InMende_Kikakui',
            'astral': '\uD83A[\uDC00-\uDCDF]'
        },
        {
            'name': 'InMeroitic_Cursive',
            'astral': '\uD802[\uDDA0-\uDDFF]'
        },
        {
            'name': 'InMeroitic_Hieroglyphs',
            'astral': '\uD802[\uDD80-\uDD9F]'
        },
        {
            'name': 'InMiao',
            'astral': '\uD81B[\uDF00-\uDF9F]'
        },
        {
            'name': 'InMiscellaneous_Mathematical_Symbols_A',
            'bmp': '\u27C0-\u27EF'
        },
        {
            'name': 'InMiscellaneous_Mathematical_Symbols_B',
            'bmp': '\u2980-\u29FF'
        },
        {
            'name': 'InMiscellaneous_Symbols',
            'bmp': '\u2600-\u26FF'
        },
        {
            'name': 'InMiscellaneous_Symbols_And_Arrows',
            'bmp': '\u2B00-\u2BFF'
        },
        {
            'name': 'InMiscellaneous_Symbols_And_Pictographs',
            'astral': '\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]'
        },
        {
            'name': 'InMiscellaneous_Technical',
            'bmp': '\u2300-\u23FF'
        },
        {
            'name': 'InModi',
            'astral': '\uD805[\uDE00-\uDE5F]'
        },
        {
            'name': 'InModifier_Tone_Letters',
            'bmp': '\uA700-\uA71F'
        },
        {
            'name': 'InMongolian',
            'bmp': '\u1800-\u18AF'
        },
        {
            'name': 'InMongolian_Supplement',
            'astral': '\uD805[\uDE60-\uDE7F]'
        },
        {
            'name': 'InMro',
            'astral': '\uD81A[\uDE40-\uDE6F]'
        },
        {
            'name': 'InMultani',
            'astral': '\uD804[\uDE80-\uDEAF]'
        },
        {
            'name': 'InMusical_Symbols',
            'astral': '\uD834[\uDD00-\uDDFF]'
        },
        {
            'name': 'InMyanmar',
            'bmp': '\u1000-\u109F'
        },
        {
            'name': 'InMyanmar_Extended_A',
            'bmp': '\uAA60-\uAA7F'
        },
        {
            'name': 'InMyanmar_Extended_B',
            'bmp': '\uA9E0-\uA9FF'
        },
        {
            'name': 'InNKo',
            'bmp': '\u07C0-\u07FF'
        },
        {
            'name': 'InNabataean',
            'astral': '\uD802[\uDC80-\uDCAF]'
        },
        {
            'name': 'InNew_Tai_Lue',
            'bmp': '\u1980-\u19DF'
        },
        {
            'name': 'InNewa',
            'astral': '\uD805[\uDC00-\uDC7F]'
        },
        {
            'name': 'InNumber_Forms',
            'bmp': '\u2150-\u218F'
        },
        {
            'name': 'InNushu',
            'astral': '\uD82C[\uDD70-\uDEFF]'
        },
        {
            'name': 'InOgham',
            'bmp': '\u1680-\u169F'
        },
        {
            'name': 'InOl_Chiki',
            'bmp': '\u1C50-\u1C7F'
        },
        {
            'name': 'InOld_Hungarian',
            'astral': '\uD803[\uDC80-\uDCFF]'
        },
        {
            'name': 'InOld_Italic',
            'astral': '\uD800[\uDF00-\uDF2F]'
        },
        {
            'name': 'InOld_North_Arabian',
            'astral': '\uD802[\uDE80-\uDE9F]'
        },
        {
            'name': 'InOld_Permic',
            'astral': '\uD800[\uDF50-\uDF7F]'
        },
        {
            'name': 'InOld_Persian',
            'astral': '\uD800[\uDFA0-\uDFDF]'
        },
        {
            'name': 'InOld_Sogdian',
            'astral': '\uD803[\uDF00-\uDF2F]'
        },
        {
            'name': 'InOld_South_Arabian',
            'astral': '\uD802[\uDE60-\uDE7F]'
        },
        {
            'name': 'InOld_Turkic',
            'astral': '\uD803[\uDC00-\uDC4F]'
        },
        {
            'name': 'InOptical_Character_Recognition',
            'bmp': '\u2440-\u245F'
        },
        {
            'name': 'InOriya',
            'bmp': '\u0B00-\u0B7F'
        },
        {
            'name': 'InOrnamental_Dingbats',
            'astral': '\uD83D[\uDE50-\uDE7F]'
        },
        {
            'name': 'InOsage',
            'astral': '\uD801[\uDCB0-\uDCFF]'
        },
        {
            'name': 'InOsmanya',
            'astral': '\uD801[\uDC80-\uDCAF]'
        },
        {
            'name': 'InPahawh_Hmong',
            'astral': '\uD81A[\uDF00-\uDF8F]'
        },
        {
            'name': 'InPalmyrene',
            'astral': '\uD802[\uDC60-\uDC7F]'
        },
        {
            'name': 'InPau_Cin_Hau',
            'astral': '\uD806[\uDEC0-\uDEFF]'
        },
        {
            'name': 'InPhags_Pa',
            'bmp': '\uA840-\uA87F'
        },
        {
            'name': 'InPhaistos_Disc',
            'astral': '\uD800[\uDDD0-\uDDFF]'
        },
        {
            'name': 'InPhoenician',
            'astral': '\uD802[\uDD00-\uDD1F]'
        },
        {
            'name': 'InPhonetic_Extensions',
            'bmp': '\u1D00-\u1D7F'
        },
        {
            'name': 'InPhonetic_Extensions_Supplement',
            'bmp': '\u1D80-\u1DBF'
        },
        {
            'name': 'InPlaying_Cards',
            'astral': '\uD83C[\uDCA0-\uDCFF]'
        },
        {
            'name': 'InPrivate_Use_Area',
            'bmp': '\uE000-\uF8FF'
        },
        {
            'name': 'InPsalter_Pahlavi',
            'astral': '\uD802[\uDF80-\uDFAF]'
        },
        {
            'name': 'InRejang',
            'bmp': '\uA930-\uA95F'
        },
        {
            'name': 'InRumi_Numeral_Symbols',
            'astral': '\uD803[\uDE60-\uDE7F]'
        },
        {
            'name': 'InRunic',
            'bmp': '\u16A0-\u16FF'
        },
        {
            'name': 'InSamaritan',
            'bmp': '\u0800-\u083F'
        },
        {
            'name': 'InSaurashtra',
            'bmp': '\uA880-\uA8DF'
        },
        {
            'name': 'InSharada',
            'astral': '\uD804[\uDD80-\uDDDF]'
        },
        {
            'name': 'InShavian',
            'astral': '\uD801[\uDC50-\uDC7F]'
        },
        {
            'name': 'InShorthand_Format_Controls',
            'astral': '\uD82F[\uDCA0-\uDCAF]'
        },
        {
            'name': 'InSiddham',
            'astral': '\uD805[\uDD80-\uDDFF]'
        },
        {
            'name': 'InSinhala',
            'bmp': '\u0D80-\u0DFF'
        },
        {
            'name': 'InSinhala_Archaic_Numbers',
            'astral': '\uD804[\uDDE0-\uDDFF]'
        },
        {
            'name': 'InSmall_Form_Variants',
            'bmp': '\uFE50-\uFE6F'
        },
        {
            'name': 'InSogdian',
            'astral': '\uD803[\uDF30-\uDF6F]'
        },
        {
            'name': 'InSora_Sompeng',
            'astral': '\uD804[\uDCD0-\uDCFF]'
        },
        {
            'name': 'InSoyombo',
            'astral': '\uD806[\uDE50-\uDEAF]'
        },
        {
            'name': 'InSpacing_Modifier_Letters',
            'bmp': '\u02B0-\u02FF'
        },
        {
            'name': 'InSpecials',
            'bmp': '\uFFF0-\uFFFF'
        },
        {
            'name': 'InSundanese',
            'bmp': '\u1B80-\u1BBF'
        },
        {
            'name': 'InSundanese_Supplement',
            'bmp': '\u1CC0-\u1CCF'
        },
        {
            'name': 'InSuperscripts_And_Subscripts',
            'bmp': '\u2070-\u209F'
        },
        {
            'name': 'InSupplemental_Arrows_A',
            'bmp': '\u27F0-\u27FF'
        },
        {
            'name': 'InSupplemental_Arrows_B',
            'bmp': '\u2900-\u297F'
        },
        {
            'name': 'InSupplemental_Arrows_C',
            'astral': '\uD83E[\uDC00-\uDCFF]'
        },
        {
            'name': 'InSupplemental_Mathematical_Operators',
            'bmp': '\u2A00-\u2AFF'
        },
        {
            'name': 'InSupplemental_Punctuation',
            'bmp': '\u2E00-\u2E7F'
        },
        {
            'name': 'InSupplemental_Symbols_And_Pictographs',
            'astral': '\uD83E[\uDD00-\uDDFF]'
        },
        {
            'name': 'InSupplementary_Private_Use_Area_A',
            'astral': '[\uDB80-\uDBBF][\uDC00-\uDFFF]'
        },
        {
            'name': 'InSupplementary_Private_Use_Area_B',
            'astral': '[\uDBC0-\uDBFF][\uDC00-\uDFFF]'
        },
        {
            'name': 'InSutton_SignWriting',
            'astral': '\uD836[\uDC00-\uDEAF]'
        },
        {
            'name': 'InSyloti_Nagri',
            'bmp': '\uA800-\uA82F'
        },
        {
            'name': 'InSyriac',
            'bmp': '\u0700-\u074F'
        },
        {
            'name': 'InSyriac_Supplement',
            'bmp': '\u0860-\u086F'
        },
        {
            'name': 'InTagalog',
            'bmp': '\u1700-\u171F'
        },
        {
            'name': 'InTagbanwa',
            'bmp': '\u1760-\u177F'
        },
        {
            'name': 'InTags',
            'astral': '\uDB40[\uDC00-\uDC7F]'
        },
        {
            'name': 'InTai_Le',
            'bmp': '\u1950-\u197F'
        },
        {
            'name': 'InTai_Tham',
            'bmp': '\u1A20-\u1AAF'
        },
        {
            'name': 'InTai_Viet',
            'bmp': '\uAA80-\uAADF'
        },
        {
            'name': 'InTai_Xuan_Jing_Symbols',
            'astral': '\uD834[\uDF00-\uDF5F]'
        },
        {
            'name': 'InTakri',
            'astral': '\uD805[\uDE80-\uDECF]'
        },
        {
            'name': 'InTamil',
            'bmp': '\u0B80-\u0BFF'
        },
        {
            'name': 'InTangut',
            'astral': '[\uD81C-\uD821][\uDC00-\uDFFF]'
        },
        {
            'name': 'InTangut_Components',
            'astral': '\uD822[\uDC00-\uDEFF]'
        },
        {
            'name': 'InTelugu',
            'bmp': '\u0C00-\u0C7F'
        },
        {
            'name': 'InThaana',
            'bmp': '\u0780-\u07BF'
        },
        {
            'name': 'InThai',
            'bmp': '\u0E00-\u0E7F'
        },
        {
            'name': 'InTibetan',
            'bmp': '\u0F00-\u0FFF'
        },
        {
            'name': 'InTifinagh',
            'bmp': '\u2D30-\u2D7F'
        },
        {
            'name': 'InTirhuta',
            'astral': '\uD805[\uDC80-\uDCDF]'
        },
        {
            'name': 'InTransport_And_Map_Symbols',
            'astral': '\uD83D[\uDE80-\uDEFF]'
        },
        {
            'name': 'InUgaritic',
            'astral': '\uD800[\uDF80-\uDF9F]'
        },
        {
            'name': 'InUnified_Canadian_Aboriginal_Syllabics',
            'bmp': '\u1400-\u167F'
        },
        {
            'name': 'InUnified_Canadian_Aboriginal_Syllabics_Extended',
            'bmp': '\u18B0-\u18FF'
        },
        {
            'name': 'InVai',
            'bmp': '\uA500-\uA63F'
        },
        {
            'name': 'InVariation_Selectors',
            'bmp': '\uFE00-\uFE0F'
        },
        {
            'name': 'InVariation_Selectors_Supplement',
            'astral': '\uDB40[\uDD00-\uDDEF]'
        },
        {
            'name': 'InVedic_Extensions',
            'bmp': '\u1CD0-\u1CFF'
        },
        {
            'name': 'InVertical_Forms',
            'bmp': '\uFE10-\uFE1F'
        },
        {
            'name': 'InWarang_Citi',
            'astral': '\uD806[\uDCA0-\uDCFF]'
        },
        {
            'name': 'InYi_Radicals',
            'bmp': '\uA490-\uA4CF'
        },
        {
            'name': 'InYi_Syllables',
            'bmp': '\uA000-\uA48F'
        },
        {
            'name': 'InYijing_Hexagram_Symbols',
            'bmp': '\u4DC0-\u4DFF'
        },
        {
            'name': 'InZanabazar_Square',
            'astral': '\uD806[\uDE00-\uDE4F]'
        },
        {
            'name': 'Inundefined',
            'astral': '\uD803[\uDE80-\uDEBF\uDFB0-\uDFFF]|\uD806[\uDD00-\uDD5F\uDDA0-\uDDFF]|\uD807[\uDFB0-\uDFFF]|\uD80D[\uDC30-\uDC3F]|\uD822[\uDF00-\uDFFF]|\uD823[\uDC00-\uDD8F]|\uD82C[\uDD30-\uDD6F]|\uD838[\uDD00-\uDD4F\uDEC0-\uDEFF]|\uD83B[\uDD00-\uDD4F]|\uD83E[\uDE70-\uDFFF]|[\uD880-\uD883][\uDC00-\uDFFF]|\uD884[\uDC00-\uDF4F]'
        }
    ];

    var unicodeBlocks = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _blocks = interopRequireDefault(blocks);

    /*!
     * XRegExp Unicode Blocks 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2010-present MIT License
     * Unicode data by Mathias Bynens <mathiasbynens.be>
     */
    var _default = function _default(XRegExp) {
      /**
       * Adds support for all Unicode blocks. Block names use the prefix 'In'. E.g.,
       * `\p{InBasicLatin}`. Token names are case insensitive, and any spaces, hyphens, and
       * underscores are ignored.
       *
       * Uses Unicode 13.0.0.
       *
       * @requires XRegExp, Unicode Base
       */
      if (!XRegExp.addUnicodeData) {
        throw new ReferenceError('Unicode Base must be loaded before Unicode Blocks');
      }

      XRegExp.addUnicodeData(_blocks["default"]);
    };

    exports["default"] = _default;
    module.exports = exports.default;
    });

    var categories = [
        {
            'name': 'C',
            'alias': 'Other',
            'isBmpLast': true,
            'bmp': '\0-\x1F\x7F-\x9F\xAD\u0378\u0379\u0380-\u0383\u038B\u038D\u03A2\u0530\u0557\u0558\u058B\u058C\u0590\u05C8-\u05CF\u05EB-\u05EE\u05F5-\u0605\u061C\u061D\u06DD\u070E\u070F\u074B\u074C\u07B2-\u07BF\u07FB\u07FC\u082E\u082F\u083F\u085C\u085D\u085F\u086B-\u089F\u08B5\u08C8-\u08D2\u08E2\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FF\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A77-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0AF8\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B54\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0BFF\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B-\u0C5F\u0C64\u0C65\u0C70-\u0C76\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0CFF\u0D0D\u0D11\u0D45\u0D49\u0D50-\u0D53\u0D64\u0D65\u0D80\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F6\u13F7\u13FE\u13FF\u169D-\u169F\u16F9-\u16FF\u170D\u1715-\u171F\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180E\u180F\u181A-\u181F\u1879-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE\u1AAF\u1AC1-\u1AFF\u1B4C-\u1B4F\u1B7D-\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C89-\u1C8F\u1CBB\u1CBC\u1CC8-\u1CCF\u1CFB-\u1CFF\u1DFA\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2072\u2073\u208F\u209D-\u209F\u20C0-\u20CF\u20F1-\u20FF\u218C-\u218F\u2427-\u243F\u244B-\u245F\u2B74\u2B75\u2B96\u2C2F\u2C5F\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E53-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u3130\u318F\u31E4-\u31EF\u321F\u9FFD-\u9FFF\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA6F8-\uA6FF\uA7C0\uA7C1\uA7CB-\uA7F4\uA82D-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C6-\uA8CD\uA8DA-\uA8DF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB6C-\uAB6F\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFE\uFDFF\uFE1A-\uFE1F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD-\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFFB\uFFFE\uFFFF',
            'astral': '\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDCFF\uDD03-\uDD06\uDD34-\uDD36\uDD8F\uDD9D-\uDD9F\uDDA1-\uDDCF\uDDFE-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEDF\uDEFC-\uDEFF\uDF24-\uDF2C\uDF4B-\uDF4F\uDF7B-\uDF7F\uDF9E\uDFC4-\uDFC7\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDD6E\uDD70-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56\uDC9F-\uDCA6\uDCB0-\uDCDF\uDCF3\uDCF6-\uDCFA\uDD1C-\uDD1E\uDD3A-\uDD3E\uDD40-\uDD7F\uDDB8-\uDDBB\uDDD0\uDDD1\uDE04\uDE07-\uDE0B\uDE14\uDE18\uDE36\uDE37\uDE3B-\uDE3E\uDE49-\uDE4F\uDE59-\uDE5F\uDEA0-\uDEBF\uDEE7-\uDEEA\uDEF7-\uDEFF\uDF36-\uDF38\uDF56\uDF57\uDF73-\uDF77\uDF92-\uDF98\uDF9D-\uDFA8\uDFB0-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCF9\uDD28-\uDD2F\uDD3A-\uDE5F\uDE7F\uDEAA\uDEAE\uDEAF\uDEB2-\uDEFF\uDF28-\uDF2F\uDF5A-\uDFAF\uDFCC-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC4E-\uDC51\uDC70-\uDC7E\uDCBD\uDCC2-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDCFF\uDD35\uDD48-\uDD4F\uDD77-\uDD7F\uDDE0\uDDF5-\uDDFF\uDE12\uDE3F-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEAA-\uDEAF\uDEEB-\uDEEF\uDEFA-\uDEFF\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A\uDF45\uDF46\uDF49\uDF4A\uDF4E\uDF4F\uDF51-\uDF56\uDF58-\uDF5C\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC5C\uDC62-\uDC7F\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDB6\uDDB7\uDDDE-\uDDFF\uDE45-\uDE4F\uDE5A-\uDE5F\uDE6D-\uDE7F\uDEB9-\uDEBF\uDECA-\uDEFF\uDF1B\uDF1C\uDF2C-\uDF2F\uDF40-\uDFFF]|\uD806[\uDC3C-\uDC9F\uDCF3-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD36\uDD39\uDD3A\uDD47-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD8\uDDD9\uDDE5-\uDDFF\uDE48-\uDE4F\uDEA3-\uDEBF\uDEF9-\uDFFF]|\uD807[\uDC09\uDC37\uDC46-\uDC4F\uDC6D-\uDC6F\uDC90\uDC91\uDCA8\uDCB7-\uDCFF\uDD07\uDD0A\uDD37-\uDD39\uDD3B\uDD3E\uDD48-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8F\uDD92\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF9-\uDFAF\uDFB1-\uDFBF\uDFF2-\uDFFE]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F\uDC75-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD80B\uD80E-\uD810\uD812-\uD819\uD824-\uD82B\uD82D\uD82E\uD830-\uD833\uD837\uD839\uD83F\uD87B-\uD87D\uD87F\uD885-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|\uD80D[\uDC2F-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDE6D\uDE70-\uDECF\uDEEE\uDEEF\uDEF6-\uDEFF\uDF46-\uDF4F\uDF5A\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDE3F\uDE9B-\uDEFF\uDF4B-\uDF4E\uDF88-\uDF8E\uDFA0-\uDFDF\uDFE5-\uDFEF\uDFF2-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFF\uDD09-\uDFFF]|\uD82C[\uDD1F-\uDD4F\uDD53-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A\uDC9B\uDCA0-\uDFFF]|\uD834[\uDCF6-\uDCFF\uDD27\uDD28\uDD73-\uDD7A\uDDE9-\uDDFF\uDE46-\uDEDF\uDEF4-\uDEFF\uDF57-\uDF5F\uDF79-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDFCC\uDFCD]|\uD836[\uDE8C-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDCFF\uDD2D-\uDD2F\uDD3E\uDD3F\uDD4A-\uDD4D\uDD50-\uDEBF\uDEFA-\uDEFE\uDF00-\uDFFF]|\uD83A[\uDCC5\uDCC6\uDCD7-\uDCFF\uDD4C-\uDD4F\uDD5A-\uDD5D\uDD60-\uDFFF]|\uD83B[\uDC00-\uDC70\uDCB5-\uDD00\uDD3E-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDEEF\uDEF2-\uDFFF]|\uD83C[\uDC2C-\uDC2F\uDC94-\uDC9F\uDCAF\uDCB0\uDCC0\uDCD0\uDCF6-\uDCFF\uDDAE-\uDDE5\uDE03-\uDE0F\uDE3C-\uDE3F\uDE49-\uDE4F\uDE52-\uDE5F\uDE66-\uDEFF]|\uD83D[\uDED8-\uDEDF\uDEED-\uDEEF\uDEFD-\uDEFF\uDF74-\uDF7F\uDFD9-\uDFDF\uDFEC-\uDFFF]|\uD83E[\uDC0C-\uDC0F\uDC48-\uDC4F\uDC5A-\uDC5F\uDC88-\uDC8F\uDCAE\uDCAF\uDCB2-\uDCFF\uDD79\uDDCC\uDE54-\uDE5F\uDE6E\uDE6F\uDE75-\uDE77\uDE7B-\uDE7F\uDE87-\uDE8F\uDEA9-\uDEAF\uDEB7-\uDEBF\uDEC3-\uDECF\uDED7-\uDEFF\uDF93\uDFCB-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEDE-\uDEFF]|\uD86D[\uDF35-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]'
        },
        {
            'name': 'Cc',
            'alias': 'Control',
            'bmp': '\0-\x1F\x7F-\x9F'
        },
        {
            'name': 'Cf',
            'alias': 'Format',
            'bmp': '\xAD\u0600-\u0605\u061C\u06DD\u070F\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB',
            'astral': '\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC38]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]'
        },
        {
            'name': 'Cn',
            'alias': 'Unassigned',
            'bmp': '\u0378\u0379\u0380-\u0383\u038B\u038D\u03A2\u0530\u0557\u0558\u058B\u058C\u0590\u05C8-\u05CF\u05EB-\u05EE\u05F5-\u05FF\u061D\u070E\u074B\u074C\u07B2-\u07BF\u07FB\u07FC\u082E\u082F\u083F\u085C\u085D\u085F\u086B-\u089F\u08B5\u08C8-\u08D2\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FF\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A77-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0AF8\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B54\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0BFF\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B-\u0C5F\u0C64\u0C65\u0C70-\u0C76\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0CFF\u0D0D\u0D11\u0D45\u0D49\u0D50-\u0D53\u0D64\u0D65\u0D80\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F6\u13F7\u13FE\u13FF\u169D-\u169F\u16F9-\u16FF\u170D\u1715-\u171F\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180F\u181A-\u181F\u1879-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE\u1AAF\u1AC1-\u1AFF\u1B4C-\u1B4F\u1B7D-\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C89-\u1C8F\u1CBB\u1CBC\u1CC8-\u1CCF\u1CFB-\u1CFF\u1DFA\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u2065\u2072\u2073\u208F\u209D-\u209F\u20C0-\u20CF\u20F1-\u20FF\u218C-\u218F\u2427-\u243F\u244B-\u245F\u2B74\u2B75\u2B96\u2C2F\u2C5F\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E53-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u3130\u318F\u31E4-\u31EF\u321F\u9FFD-\u9FFF\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA6F8-\uA6FF\uA7C0\uA7C1\uA7CB-\uA7F4\uA82D-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C6-\uA8CD\uA8DA-\uA8DF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB6C-\uAB6F\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFE\uFDFF\uFE1A-\uFE1F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD\uFEFE\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFF8\uFFFE\uFFFF',
            'astral': '\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDCFF\uDD03-\uDD06\uDD34-\uDD36\uDD8F\uDD9D-\uDD9F\uDDA1-\uDDCF\uDDFE-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEDF\uDEFC-\uDEFF\uDF24-\uDF2C\uDF4B-\uDF4F\uDF7B-\uDF7F\uDF9E\uDFC4-\uDFC7\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDD6E\uDD70-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56\uDC9F-\uDCA6\uDCB0-\uDCDF\uDCF3\uDCF6-\uDCFA\uDD1C-\uDD1E\uDD3A-\uDD3E\uDD40-\uDD7F\uDDB8-\uDDBB\uDDD0\uDDD1\uDE04\uDE07-\uDE0B\uDE14\uDE18\uDE36\uDE37\uDE3B-\uDE3E\uDE49-\uDE4F\uDE59-\uDE5F\uDEA0-\uDEBF\uDEE7-\uDEEA\uDEF7-\uDEFF\uDF36-\uDF38\uDF56\uDF57\uDF73-\uDF77\uDF92-\uDF98\uDF9D-\uDFA8\uDFB0-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCF9\uDD28-\uDD2F\uDD3A-\uDE5F\uDE7F\uDEAA\uDEAE\uDEAF\uDEB2-\uDEFF\uDF28-\uDF2F\uDF5A-\uDFAF\uDFCC-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC4E-\uDC51\uDC70-\uDC7E\uDCC2-\uDCCC\uDCCE\uDCCF\uDCE9-\uDCEF\uDCFA-\uDCFF\uDD35\uDD48-\uDD4F\uDD77-\uDD7F\uDDE0\uDDF5-\uDDFF\uDE12\uDE3F-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEAA-\uDEAF\uDEEB-\uDEEF\uDEFA-\uDEFF\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A\uDF45\uDF46\uDF49\uDF4A\uDF4E\uDF4F\uDF51-\uDF56\uDF58-\uDF5C\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC5C\uDC62-\uDC7F\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDB6\uDDB7\uDDDE-\uDDFF\uDE45-\uDE4F\uDE5A-\uDE5F\uDE6D-\uDE7F\uDEB9-\uDEBF\uDECA-\uDEFF\uDF1B\uDF1C\uDF2C-\uDF2F\uDF40-\uDFFF]|\uD806[\uDC3C-\uDC9F\uDCF3-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD36\uDD39\uDD3A\uDD47-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD8\uDDD9\uDDE5-\uDDFF\uDE48-\uDE4F\uDEA3-\uDEBF\uDEF9-\uDFFF]|\uD807[\uDC09\uDC37\uDC46-\uDC4F\uDC6D-\uDC6F\uDC90\uDC91\uDCA8\uDCB7-\uDCFF\uDD07\uDD0A\uDD37-\uDD39\uDD3B\uDD3E\uDD48-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8F\uDD92\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF9-\uDFAF\uDFB1-\uDFBF\uDFF2-\uDFFE]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F\uDC75-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD80B\uD80E-\uD810\uD812-\uD819\uD824-\uD82B\uD82D\uD82E\uD830-\uD833\uD837\uD839\uD83F\uD87B-\uD87D\uD87F\uD885-\uDB3F\uDB41-\uDB7F][\uDC00-\uDFFF]|\uD80D[\uDC2F\uDC39-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDE6D\uDE70-\uDECF\uDEEE\uDEEF\uDEF6-\uDEFF\uDF46-\uDF4F\uDF5A\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDE3F\uDE9B-\uDEFF\uDF4B-\uDF4E\uDF88-\uDF8E\uDFA0-\uDFDF\uDFE5-\uDFEF\uDFF2-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFF\uDD09-\uDFFF]|\uD82C[\uDD1F-\uDD4F\uDD53-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A\uDC9B\uDCA4-\uDFFF]|\uD834[\uDCF6-\uDCFF\uDD27\uDD28\uDDE9-\uDDFF\uDE46-\uDEDF\uDEF4-\uDEFF\uDF57-\uDF5F\uDF79-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDFCC\uDFCD]|\uD836[\uDE8C-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDCFF\uDD2D-\uDD2F\uDD3E\uDD3F\uDD4A-\uDD4D\uDD50-\uDEBF\uDEFA-\uDEFE\uDF00-\uDFFF]|\uD83A[\uDCC5\uDCC6\uDCD7-\uDCFF\uDD4C-\uDD4F\uDD5A-\uDD5D\uDD60-\uDFFF]|\uD83B[\uDC00-\uDC70\uDCB5-\uDD00\uDD3E-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDEEF\uDEF2-\uDFFF]|\uD83C[\uDC2C-\uDC2F\uDC94-\uDC9F\uDCAF\uDCB0\uDCC0\uDCD0\uDCF6-\uDCFF\uDDAE-\uDDE5\uDE03-\uDE0F\uDE3C-\uDE3F\uDE49-\uDE4F\uDE52-\uDE5F\uDE66-\uDEFF]|\uD83D[\uDED8-\uDEDF\uDEED-\uDEEF\uDEFD-\uDEFF\uDF74-\uDF7F\uDFD9-\uDFDF\uDFEC-\uDFFF]|\uD83E[\uDC0C-\uDC0F\uDC48-\uDC4F\uDC5A-\uDC5F\uDC88-\uDC8F\uDCAE\uDCAF\uDCB2-\uDCFF\uDD79\uDDCC\uDE54-\uDE5F\uDE6E\uDE6F\uDE75-\uDE77\uDE7B-\uDE7F\uDE87-\uDE8F\uDEA9-\uDEAF\uDEB7-\uDEBF\uDEC3-\uDECF\uDED7-\uDEFF\uDF93\uDFCB-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEDE-\uDEFF]|\uD86D[\uDF35-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDFFF]|\uDB40[\uDC00\uDC02-\uDC1F\uDC80-\uDCFF\uDDF0-\uDFFF]|[\uDBBF\uDBFF][\uDFFE\uDFFF]'
        },
        {
            'name': 'Co',
            'alias': 'Private_Use',
            'bmp': '\uE000-\uF8FF',
            'astral': '[\uDB80-\uDBBE\uDBC0-\uDBFE][\uDC00-\uDFFF]|[\uDBBF\uDBFF][\uDC00-\uDFFD]'
        },
        {
            'name': 'Cs',
            'alias': 'Surrogate',
            'bmp': '\uD800-\uDFFF'
        },
        {
            'name': 'L',
            'alias': 'Letter',
            'bmp': 'A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC',
            'astral': '\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF40\uDF42-\uDF49\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD23\uDE80-\uDEA9\uDEB0\uDEB1\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDFB0-\uDFC4\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDEB8\uDF00-\uDF1A]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCDF\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDEE0-\uDEF2\uDFB0]|\uD808[\uDC00-\uDF99]|\uD809[\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD4E\uDEC0-\uDEEB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43\uDD4B]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A]'
        },
        {
            'name': 'LC',
            'alias': 'Cased_Letter',
            'bmp': 'A-Za-z\xB5\xC0-\xD6\xD8-\xF6\xF8-\u01BA\u01BC-\u01BF\u01C4-\u0293\u0295-\u02AF\u0370-\u0373\u0376\u0377\u037B-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0560-\u0588\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FD-\u10FF\u13A0-\u13F5\u13F8-\u13FD\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1D00-\u1D2B\u1D6B-\u1D77\u1D79-\u1D9A\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2134\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2C7B\u2C7E-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA640-\uA66D\uA680-\uA69B\uA722-\uA76F\uA771-\uA787\uA78B-\uA78E\uA790-\uA7BF\uA7C2-\uA7CA\uA7F5\uA7F6\uA7FA\uAB30-\uAB5A\uAB60-\uAB68\uAB70-\uABBF\uFB00-\uFB06\uFB13-\uFB17\uFF21-\uFF3A\uFF41-\uFF5A',
            'astral': '\uD801[\uDC00-\uDC4F\uDCB0-\uDCD3\uDCD8-\uDCFB]|\uD803[\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD806[\uDCA0-\uDCDF]|\uD81B[\uDE40-\uDE7F]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDD00-\uDD43]'
        },
        {
            'name': 'Ll',
            'alias': 'Lowercase_Letter',
            'bmp': 'a-z\xB5\xDF-\xF6\xF8-\xFF\u0101\u0103\u0105\u0107\u0109\u010B\u010D\u010F\u0111\u0113\u0115\u0117\u0119\u011B\u011D\u011F\u0121\u0123\u0125\u0127\u0129\u012B\u012D\u012F\u0131\u0133\u0135\u0137\u0138\u013A\u013C\u013E\u0140\u0142\u0144\u0146\u0148\u0149\u014B\u014D\u014F\u0151\u0153\u0155\u0157\u0159\u015B\u015D\u015F\u0161\u0163\u0165\u0167\u0169\u016B\u016D\u016F\u0171\u0173\u0175\u0177\u017A\u017C\u017E-\u0180\u0183\u0185\u0188\u018C\u018D\u0192\u0195\u0199-\u019B\u019E\u01A1\u01A3\u01A5\u01A8\u01AA\u01AB\u01AD\u01B0\u01B4\u01B6\u01B9\u01BA\u01BD-\u01BF\u01C6\u01C9\u01CC\u01CE\u01D0\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u01DD\u01DF\u01E1\u01E3\u01E5\u01E7\u01E9\u01EB\u01ED\u01EF\u01F0\u01F3\u01F5\u01F9\u01FB\u01FD\u01FF\u0201\u0203\u0205\u0207\u0209\u020B\u020D\u020F\u0211\u0213\u0215\u0217\u0219\u021B\u021D\u021F\u0221\u0223\u0225\u0227\u0229\u022B\u022D\u022F\u0231\u0233-\u0239\u023C\u023F\u0240\u0242\u0247\u0249\u024B\u024D\u024F-\u0293\u0295-\u02AF\u0371\u0373\u0377\u037B-\u037D\u0390\u03AC-\u03CE\u03D0\u03D1\u03D5-\u03D7\u03D9\u03DB\u03DD\u03DF\u03E1\u03E3\u03E5\u03E7\u03E9\u03EB\u03ED\u03EF-\u03F3\u03F5\u03F8\u03FB\u03FC\u0430-\u045F\u0461\u0463\u0465\u0467\u0469\u046B\u046D\u046F\u0471\u0473\u0475\u0477\u0479\u047B\u047D\u047F\u0481\u048B\u048D\u048F\u0491\u0493\u0495\u0497\u0499\u049B\u049D\u049F\u04A1\u04A3\u04A5\u04A7\u04A9\u04AB\u04AD\u04AF\u04B1\u04B3\u04B5\u04B7\u04B9\u04BB\u04BD\u04BF\u04C2\u04C4\u04C6\u04C8\u04CA\u04CC\u04CE\u04CF\u04D1\u04D3\u04D5\u04D7\u04D9\u04DB\u04DD\u04DF\u04E1\u04E3\u04E5\u04E7\u04E9\u04EB\u04ED\u04EF\u04F1\u04F3\u04F5\u04F7\u04F9\u04FB\u04FD\u04FF\u0501\u0503\u0505\u0507\u0509\u050B\u050D\u050F\u0511\u0513\u0515\u0517\u0519\u051B\u051D\u051F\u0521\u0523\u0525\u0527\u0529\u052B\u052D\u052F\u0560-\u0588\u10D0-\u10FA\u10FD-\u10FF\u13F8-\u13FD\u1C80-\u1C88\u1D00-\u1D2B\u1D6B-\u1D77\u1D79-\u1D9A\u1E01\u1E03\u1E05\u1E07\u1E09\u1E0B\u1E0D\u1E0F\u1E11\u1E13\u1E15\u1E17\u1E19\u1E1B\u1E1D\u1E1F\u1E21\u1E23\u1E25\u1E27\u1E29\u1E2B\u1E2D\u1E2F\u1E31\u1E33\u1E35\u1E37\u1E39\u1E3B\u1E3D\u1E3F\u1E41\u1E43\u1E45\u1E47\u1E49\u1E4B\u1E4D\u1E4F\u1E51\u1E53\u1E55\u1E57\u1E59\u1E5B\u1E5D\u1E5F\u1E61\u1E63\u1E65\u1E67\u1E69\u1E6B\u1E6D\u1E6F\u1E71\u1E73\u1E75\u1E77\u1E79\u1E7B\u1E7D\u1E7F\u1E81\u1E83\u1E85\u1E87\u1E89\u1E8B\u1E8D\u1E8F\u1E91\u1E93\u1E95-\u1E9D\u1E9F\u1EA1\u1EA3\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EB9\u1EBB\u1EBD\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u1EC9\u1ECB\u1ECD\u1ECF\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u1EE5\u1EE7\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\u1EF5\u1EF7\u1EF9\u1EFB\u1EFD\u1EFF-\u1F07\u1F10-\u1F15\u1F20-\u1F27\u1F30-\u1F37\u1F40-\u1F45\u1F50-\u1F57\u1F60-\u1F67\u1F70-\u1F7D\u1F80-\u1F87\u1F90-\u1F97\u1FA0-\u1FA7\u1FB0-\u1FB4\u1FB6\u1FB7\u1FBE\u1FC2-\u1FC4\u1FC6\u1FC7\u1FD0-\u1FD3\u1FD6\u1FD7\u1FE0-\u1FE7\u1FF2-\u1FF4\u1FF6\u1FF7\u210A\u210E\u210F\u2113\u212F\u2134\u2139\u213C\u213D\u2146-\u2149\u214E\u2184\u2C30-\u2C5E\u2C61\u2C65\u2C66\u2C68\u2C6A\u2C6C\u2C71\u2C73\u2C74\u2C76-\u2C7B\u2C81\u2C83\u2C85\u2C87\u2C89\u2C8B\u2C8D\u2C8F\u2C91\u2C93\u2C95\u2C97\u2C99\u2C9B\u2C9D\u2C9F\u2CA1\u2CA3\u2CA5\u2CA7\u2CA9\u2CAB\u2CAD\u2CAF\u2CB1\u2CB3\u2CB5\u2CB7\u2CB9\u2CBB\u2CBD\u2CBF\u2CC1\u2CC3\u2CC5\u2CC7\u2CC9\u2CCB\u2CCD\u2CCF\u2CD1\u2CD3\u2CD5\u2CD7\u2CD9\u2CDB\u2CDD\u2CDF\u2CE1\u2CE3\u2CE4\u2CEC\u2CEE\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA641\uA643\uA645\uA647\uA649\uA64B\uA64D\uA64F\uA651\uA653\uA655\uA657\uA659\uA65B\uA65D\uA65F\uA661\uA663\uA665\uA667\uA669\uA66B\uA66D\uA681\uA683\uA685\uA687\uA689\uA68B\uA68D\uA68F\uA691\uA693\uA695\uA697\uA699\uA69B\uA723\uA725\uA727\uA729\uA72B\uA72D\uA72F-\uA731\uA733\uA735\uA737\uA739\uA73B\uA73D\uA73F\uA741\uA743\uA745\uA747\uA749\uA74B\uA74D\uA74F\uA751\uA753\uA755\uA757\uA759\uA75B\uA75D\uA75F\uA761\uA763\uA765\uA767\uA769\uA76B\uA76D\uA76F\uA771-\uA778\uA77A\uA77C\uA77F\uA781\uA783\uA785\uA787\uA78C\uA78E\uA791\uA793-\uA795\uA797\uA799\uA79B\uA79D\uA79F\uA7A1\uA7A3\uA7A5\uA7A7\uA7A9\uA7AF\uA7B5\uA7B7\uA7B9\uA7BB\uA7BD\uA7BF\uA7C3\uA7C8\uA7CA\uA7F6\uA7FA\uAB30-\uAB5A\uAB60-\uAB68\uAB70-\uABBF\uFB00-\uFB06\uFB13-\uFB17\uFF41-\uFF5A',
            'astral': '\uD801[\uDC28-\uDC4F\uDCD8-\uDCFB]|\uD803[\uDCC0-\uDCF2]|\uD806[\uDCC0-\uDCDF]|\uD81B[\uDE60-\uDE7F]|\uD835[\uDC1A-\uDC33\uDC4E-\uDC54\uDC56-\uDC67\uDC82-\uDC9B\uDCB6-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDCCF\uDCEA-\uDD03\uDD1E-\uDD37\uDD52-\uDD6B\uDD86-\uDD9F\uDDBA-\uDDD3\uDDEE-\uDE07\uDE22-\uDE3B\uDE56-\uDE6F\uDE8A-\uDEA5\uDEC2-\uDEDA\uDEDC-\uDEE1\uDEFC-\uDF14\uDF16-\uDF1B\uDF36-\uDF4E\uDF50-\uDF55\uDF70-\uDF88\uDF8A-\uDF8F\uDFAA-\uDFC2\uDFC4-\uDFC9\uDFCB]|\uD83A[\uDD22-\uDD43]'
        },
        {
            'name': 'Lm',
            'alias': 'Modifier_Letter',
            'bmp': '\u02B0-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0374\u037A\u0559\u0640\u06E5\u06E6\u07F4\u07F5\u07FA\u081A\u0824\u0828\u0971\u0E46\u0EC6\u10FC\u17D7\u1843\u1AA7\u1C78-\u1C7D\u1D2C-\u1D6A\u1D78\u1D9B-\u1DBF\u2071\u207F\u2090-\u209C\u2C7C\u2C7D\u2D6F\u2E2F\u3005\u3031-\u3035\u303B\u309D\u309E\u30FC-\u30FE\uA015\uA4F8-\uA4FD\uA60C\uA67F\uA69C\uA69D\uA717-\uA71F\uA770\uA788\uA7F8\uA7F9\uA9CF\uA9E6\uAA70\uAADD\uAAF3\uAAF4\uAB5C-\uAB5F\uAB69\uFF70\uFF9E\uFF9F',
            'astral': '\uD81A[\uDF40-\uDF43]|\uD81B[\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD838[\uDD37-\uDD3D]|\uD83A\uDD4B'
        },
        {
            'name': 'Lo',
            'alias': 'Other_Letter',
            'bmp': '\xAA\xBA\u01BB\u01C0-\u01C3\u0294\u05D0-\u05EA\u05EF-\u05F2\u0620-\u063F\u0641-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u0800-\u0815\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u0904-\u0939\u093D\u0950\u0958-\u0961\u0972-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E45\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1100-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17DC\u1820-\u1842\u1844-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C77\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u2135-\u2138\u2D30-\u2D67\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3006\u303C\u3041-\u3096\u309F\u30A1-\u30FA\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA014\uA016-\uA48C\uA4D0-\uA4F7\uA500-\uA60B\uA610-\uA61F\uA62A\uA62B\uA66E\uA6A0-\uA6E5\uA78F\uA7F7\uA7FB-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9E0-\uA9E4\uA9E7-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA6F\uAA71-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB\uAADC\uAAE0-\uAAEA\uAAF2\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF66-\uFF6F\uFF71-\uFF9D\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC',
            'astral': '\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF40\uDF42-\uDF49\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF]|\uD801[\uDC50-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDD00-\uDD23\uDE80-\uDEA9\uDEB0\uDEB1\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDFB0-\uDFC4\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDEB8\uDF00-\uDF1A]|\uD806[\uDC00-\uDC2B\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDEE0-\uDEF2\uDFB0]|\uD808[\uDC00-\uDF99]|\uD809[\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF4A\uDF50]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD838[\uDD00-\uDD2C\uDD4E\uDEC0-\uDEEB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A]'
        },
        {
            'name': 'Lt',
            'alias': 'Titlecase_Letter',
            'bmp': '\u01C5\u01C8\u01CB\u01F2\u1F88-\u1F8F\u1F98-\u1F9F\u1FA8-\u1FAF\u1FBC\u1FCC\u1FFC'
        },
        {
            'name': 'Lu',
            'alias': 'Uppercase_Letter',
            'bmp': 'A-Z\xC0-\xD6\xD8-\xDE\u0100\u0102\u0104\u0106\u0108\u010A\u010C\u010E\u0110\u0112\u0114\u0116\u0118\u011A\u011C\u011E\u0120\u0122\u0124\u0126\u0128\u012A\u012C\u012E\u0130\u0132\u0134\u0136\u0139\u013B\u013D\u013F\u0141\u0143\u0145\u0147\u014A\u014C\u014E\u0150\u0152\u0154\u0156\u0158\u015A\u015C\u015E\u0160\u0162\u0164\u0166\u0168\u016A\u016C\u016E\u0170\u0172\u0174\u0176\u0178\u0179\u017B\u017D\u0181\u0182\u0184\u0186\u0187\u0189-\u018B\u018E-\u0191\u0193\u0194\u0196-\u0198\u019C\u019D\u019F\u01A0\u01A2\u01A4\u01A6\u01A7\u01A9\u01AC\u01AE\u01AF\u01B1-\u01B3\u01B5\u01B7\u01B8\u01BC\u01C4\u01C7\u01CA\u01CD\u01CF\u01D1\u01D3\u01D5\u01D7\u01D9\u01DB\u01DE\u01E0\u01E2\u01E4\u01E6\u01E8\u01EA\u01EC\u01EE\u01F1\u01F4\u01F6-\u01F8\u01FA\u01FC\u01FE\u0200\u0202\u0204\u0206\u0208\u020A\u020C\u020E\u0210\u0212\u0214\u0216\u0218\u021A\u021C\u021E\u0220\u0222\u0224\u0226\u0228\u022A\u022C\u022E\u0230\u0232\u023A\u023B\u023D\u023E\u0241\u0243-\u0246\u0248\u024A\u024C\u024E\u0370\u0372\u0376\u037F\u0386\u0388-\u038A\u038C\u038E\u038F\u0391-\u03A1\u03A3-\u03AB\u03CF\u03D2-\u03D4\u03D8\u03DA\u03DC\u03DE\u03E0\u03E2\u03E4\u03E6\u03E8\u03EA\u03EC\u03EE\u03F4\u03F7\u03F9\u03FA\u03FD-\u042F\u0460\u0462\u0464\u0466\u0468\u046A\u046C\u046E\u0470\u0472\u0474\u0476\u0478\u047A\u047C\u047E\u0480\u048A\u048C\u048E\u0490\u0492\u0494\u0496\u0498\u049A\u049C\u049E\u04A0\u04A2\u04A4\u04A6\u04A8\u04AA\u04AC\u04AE\u04B0\u04B2\u04B4\u04B6\u04B8\u04BA\u04BC\u04BE\u04C0\u04C1\u04C3\u04C5\u04C7\u04C9\u04CB\u04CD\u04D0\u04D2\u04D4\u04D6\u04D8\u04DA\u04DC\u04DE\u04E0\u04E2\u04E4\u04E6\u04E8\u04EA\u04EC\u04EE\u04F0\u04F2\u04F4\u04F6\u04F8\u04FA\u04FC\u04FE\u0500\u0502\u0504\u0506\u0508\u050A\u050C\u050E\u0510\u0512\u0514\u0516\u0518\u051A\u051C\u051E\u0520\u0522\u0524\u0526\u0528\u052A\u052C\u052E\u0531-\u0556\u10A0-\u10C5\u10C7\u10CD\u13A0-\u13F5\u1C90-\u1CBA\u1CBD-\u1CBF\u1E00\u1E02\u1E04\u1E06\u1E08\u1E0A\u1E0C\u1E0E\u1E10\u1E12\u1E14\u1E16\u1E18\u1E1A\u1E1C\u1E1E\u1E20\u1E22\u1E24\u1E26\u1E28\u1E2A\u1E2C\u1E2E\u1E30\u1E32\u1E34\u1E36\u1E38\u1E3A\u1E3C\u1E3E\u1E40\u1E42\u1E44\u1E46\u1E48\u1E4A\u1E4C\u1E4E\u1E50\u1E52\u1E54\u1E56\u1E58\u1E5A\u1E5C\u1E5E\u1E60\u1E62\u1E64\u1E66\u1E68\u1E6A\u1E6C\u1E6E\u1E70\u1E72\u1E74\u1E76\u1E78\u1E7A\u1E7C\u1E7E\u1E80\u1E82\u1E84\u1E86\u1E88\u1E8A\u1E8C\u1E8E\u1E90\u1E92\u1E94\u1E9E\u1EA0\u1EA2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EB8\u1EBA\u1EBC\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\u1EC8\u1ECA\u1ECC\u1ECE\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\u1EE4\u1EE6\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\u1EF4\u1EF6\u1EF8\u1EFA\u1EFC\u1EFE\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F59\u1F5B\u1F5D\u1F5F\u1F68-\u1F6F\u1FB8-\u1FBB\u1FC8-\u1FCB\u1FD8-\u1FDB\u1FE8-\u1FEC\u1FF8-\u1FFB\u2102\u2107\u210B-\u210D\u2110-\u2112\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u2130-\u2133\u213E\u213F\u2145\u2183\u2C00-\u2C2E\u2C60\u2C62-\u2C64\u2C67\u2C69\u2C6B\u2C6D-\u2C70\u2C72\u2C75\u2C7E-\u2C80\u2C82\u2C84\u2C86\u2C88\u2C8A\u2C8C\u2C8E\u2C90\u2C92\u2C94\u2C96\u2C98\u2C9A\u2C9C\u2C9E\u2CA0\u2CA2\u2CA4\u2CA6\u2CA8\u2CAA\u2CAC\u2CAE\u2CB0\u2CB2\u2CB4\u2CB6\u2CB8\u2CBA\u2CBC\u2CBE\u2CC0\u2CC2\u2CC4\u2CC6\u2CC8\u2CCA\u2CCC\u2CCE\u2CD0\u2CD2\u2CD4\u2CD6\u2CD8\u2CDA\u2CDC\u2CDE\u2CE0\u2CE2\u2CEB\u2CED\u2CF2\uA640\uA642\uA644\uA646\uA648\uA64A\uA64C\uA64E\uA650\uA652\uA654\uA656\uA658\uA65A\uA65C\uA65E\uA660\uA662\uA664\uA666\uA668\uA66A\uA66C\uA680\uA682\uA684\uA686\uA688\uA68A\uA68C\uA68E\uA690\uA692\uA694\uA696\uA698\uA69A\uA722\uA724\uA726\uA728\uA72A\uA72C\uA72E\uA732\uA734\uA736\uA738\uA73A\uA73C\uA73E\uA740\uA742\uA744\uA746\uA748\uA74A\uA74C\uA74E\uA750\uA752\uA754\uA756\uA758\uA75A\uA75C\uA75E\uA760\uA762\uA764\uA766\uA768\uA76A\uA76C\uA76E\uA779\uA77B\uA77D\uA77E\uA780\uA782\uA784\uA786\uA78B\uA78D\uA790\uA792\uA796\uA798\uA79A\uA79C\uA79E\uA7A0\uA7A2\uA7A4\uA7A6\uA7A8\uA7AA-\uA7AE\uA7B0-\uA7B4\uA7B6\uA7B8\uA7BA\uA7BC\uA7BE\uA7C2\uA7C4-\uA7C7\uA7C9\uA7F5\uFF21-\uFF3A',
            'astral': '\uD801[\uDC00-\uDC27\uDCB0-\uDCD3]|\uD803[\uDC80-\uDCB2]|\uD806[\uDCA0-\uDCBF]|\uD81B[\uDE40-\uDE5F]|\uD835[\uDC00-\uDC19\uDC34-\uDC4D\uDC68-\uDC81\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB5\uDCD0-\uDCE9\uDD04\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD38\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD6C-\uDD85\uDDA0-\uDDB9\uDDD4-\uDDED\uDE08-\uDE21\uDE3C-\uDE55\uDE70-\uDE89\uDEA8-\uDEC0\uDEE2-\uDEFA\uDF1C-\uDF34\uDF56-\uDF6E\uDF90-\uDFA8\uDFCA]|\uD83A[\uDD00-\uDD21]'
        },
        {
            'name': 'M',
            'alias': 'Mark',
            'bmp': '\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1AC0\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F',
            'astral': '\uD800[\uDDFD\uDEE0\uDF76-\uDF7A]|\uD802[\uDE01-\uDE03\uDE05\uDE06\uDE0C-\uDE0F\uDE38-\uDE3A\uDE3F\uDEE5\uDEE6]|\uD803[\uDD24-\uDD27\uDEAB\uDEAC\uDF46-\uDF50]|\uD804[\uDC00-\uDC02\uDC38-\uDC46\uDC7F-\uDC82\uDCB0-\uDCBA\uDD00-\uDD02\uDD27-\uDD34\uDD45\uDD46\uDD73\uDD80-\uDD82\uDDB3-\uDDC0\uDDC9-\uDDCC\uDDCE\uDDCF\uDE2C-\uDE37\uDE3E\uDEDF-\uDEEA\uDF00-\uDF03\uDF3B\uDF3C\uDF3E-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF62\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC35-\uDC46\uDC5E\uDCB0-\uDCC3\uDDAF-\uDDB5\uDDB8-\uDDC0\uDDDC\uDDDD\uDE30-\uDE40\uDEAB-\uDEB7\uDF1D-\uDF2B]|\uD806[\uDC2C-\uDC3A\uDD30-\uDD35\uDD37\uDD38\uDD3B-\uDD3E\uDD40\uDD42\uDD43\uDDD1-\uDDD7\uDDDA-\uDDE0\uDDE4\uDE01-\uDE0A\uDE33-\uDE39\uDE3B-\uDE3E\uDE47\uDE51-\uDE5B\uDE8A-\uDE99]|\uD807[\uDC2F-\uDC36\uDC38-\uDC3F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD31-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD45\uDD47\uDD8A-\uDD8E\uDD90\uDD91\uDD93-\uDD97\uDEF3-\uDEF6]|\uD81A[\uDEF0-\uDEF4\uDF30-\uDF36]|\uD81B[\uDF4F\uDF51-\uDF87\uDF8F-\uDF92\uDFE4\uDFF0\uDFF1]|\uD82F[\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDD30-\uDD36\uDEEC-\uDEEF]|\uD83A[\uDCD0-\uDCD6\uDD44-\uDD4A]|\uDB40[\uDD00-\uDDEF]'
        },
        {
            'name': 'Mc',
            'alias': 'Spacing_Mark',
            'bmp': '\u0903\u093B\u093E-\u0940\u0949-\u094C\u094E\u094F\u0982\u0983\u09BE-\u09C0\u09C7\u09C8\u09CB\u09CC\u09D7\u0A03\u0A3E-\u0A40\u0A83\u0ABE-\u0AC0\u0AC9\u0ACB\u0ACC\u0B02\u0B03\u0B3E\u0B40\u0B47\u0B48\u0B4B\u0B4C\u0B57\u0BBE\u0BBF\u0BC1\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCC\u0BD7\u0C01-\u0C03\u0C41-\u0C44\u0C82\u0C83\u0CBE\u0CC0-\u0CC4\u0CC7\u0CC8\u0CCA\u0CCB\u0CD5\u0CD6\u0D02\u0D03\u0D3E-\u0D40\u0D46-\u0D48\u0D4A-\u0D4C\u0D57\u0D82\u0D83\u0DCF-\u0DD1\u0DD8-\u0DDF\u0DF2\u0DF3\u0F3E\u0F3F\u0F7F\u102B\u102C\u1031\u1038\u103B\u103C\u1056\u1057\u1062-\u1064\u1067-\u106D\u1083\u1084\u1087-\u108C\u108F\u109A-\u109C\u17B6\u17BE-\u17C5\u17C7\u17C8\u1923-\u1926\u1929-\u192B\u1930\u1931\u1933-\u1938\u1A19\u1A1A\u1A55\u1A57\u1A61\u1A63\u1A64\u1A6D-\u1A72\u1B04\u1B35\u1B3B\u1B3D-\u1B41\u1B43\u1B44\u1B82\u1BA1\u1BA6\u1BA7\u1BAA\u1BE7\u1BEA-\u1BEC\u1BEE\u1BF2\u1BF3\u1C24-\u1C2B\u1C34\u1C35\u1CE1\u1CF7\u302E\u302F\uA823\uA824\uA827\uA880\uA881\uA8B4-\uA8C3\uA952\uA953\uA983\uA9B4\uA9B5\uA9BA\uA9BB\uA9BE-\uA9C0\uAA2F\uAA30\uAA33\uAA34\uAA4D\uAA7B\uAA7D\uAAEB\uAAEE\uAAEF\uAAF5\uABE3\uABE4\uABE6\uABE7\uABE9\uABEA\uABEC',
            'astral': '\uD804[\uDC00\uDC02\uDC82\uDCB0-\uDCB2\uDCB7\uDCB8\uDD2C\uDD45\uDD46\uDD82\uDDB3-\uDDB5\uDDBF\uDDC0\uDDCE\uDE2C-\uDE2E\uDE32\uDE33\uDE35\uDEE0-\uDEE2\uDF02\uDF03\uDF3E\uDF3F\uDF41-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF62\uDF63]|\uD805[\uDC35-\uDC37\uDC40\uDC41\uDC45\uDCB0-\uDCB2\uDCB9\uDCBB-\uDCBE\uDCC1\uDDAF-\uDDB1\uDDB8-\uDDBB\uDDBE\uDE30-\uDE32\uDE3B\uDE3C\uDE3E\uDEAC\uDEAE\uDEAF\uDEB6\uDF20\uDF21\uDF26]|\uD806[\uDC2C-\uDC2E\uDC38\uDD30-\uDD35\uDD37\uDD38\uDD3D\uDD40\uDD42\uDDD1-\uDDD3\uDDDC-\uDDDF\uDDE4\uDE39\uDE57\uDE58\uDE97]|\uD807[\uDC2F\uDC3E\uDCA9\uDCB1\uDCB4\uDD8A-\uDD8E\uDD93\uDD94\uDD96\uDEF5\uDEF6]|\uD81B[\uDF51-\uDF87\uDFF0\uDFF1]|\uD834[\uDD65\uDD66\uDD6D-\uDD72]'
        },
        {
            'name': 'Me',
            'alias': 'Enclosing_Mark',
            'bmp': '\u0488\u0489\u1ABE\u20DD-\u20E0\u20E2-\u20E4\uA670-\uA672'
        },
        {
            'name': 'Mn',
            'alias': 'Nonspacing_Mark',
            'bmp': '\u0300-\u036F\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0902\u093A\u093C\u0941-\u0948\u094D\u0951-\u0957\u0962\u0963\u0981\u09BC\u09C1-\u09C4\u09CD\u09E2\u09E3\u09FE\u0A01\u0A02\u0A3C\u0A41\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81\u0A82\u0ABC\u0AC1-\u0AC5\u0AC7\u0AC8\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01\u0B3C\u0B3F\u0B41-\u0B44\u0B4D\u0B55\u0B56\u0B62\u0B63\u0B82\u0BC0\u0BCD\u0C00\u0C04\u0C3E-\u0C40\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81\u0CBC\u0CBF\u0CC6\u0CCC\u0CCD\u0CE2\u0CE3\u0D00\u0D01\u0D3B\u0D3C\u0D41-\u0D44\u0D4D\u0D62\u0D63\u0D81\u0DCA\u0DD2-\u0DD4\u0DD6\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F71-\u0F7E\u0F80-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102D-\u1030\u1032-\u1037\u1039\u103A\u103D\u103E\u1058\u1059\u105E-\u1060\u1071-\u1074\u1082\u1085\u1086\u108D\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4\u17B5\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193B\u1A17\u1A18\u1A1B\u1A56\u1A58-\u1A5E\u1A60\u1A62\u1A65-\u1A6C\u1A73-\u1A7C\u1A7F\u1AB0-\u1ABD\u1ABF\u1AC0\u1B00-\u1B03\u1B34\u1B36-\u1B3A\u1B3C\u1B42\u1B6B-\u1B73\u1B80\u1B81\u1BA2-\u1BA5\u1BA8\u1BA9\u1BAB-\u1BAD\u1BE6\u1BE8\u1BE9\u1BED\u1BEF-\u1BF1\u1C2C-\u1C33\u1C36\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE0\u1CE2-\u1CE8\u1CED\u1CF4\u1CF8\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302D\u3099\u309A\uA66F\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA825\uA826\uA82C\uA8C4\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA951\uA980-\uA982\uA9B3\uA9B6-\uA9B9\uA9BC\uA9BD\uA9E5\uAA29-\uAA2E\uAA31\uAA32\uAA35\uAA36\uAA43\uAA4C\uAA7C\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEC\uAAED\uAAF6\uABE5\uABE8\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F',
            'astral': '\uD800[\uDDFD\uDEE0\uDF76-\uDF7A]|\uD802[\uDE01-\uDE03\uDE05\uDE06\uDE0C-\uDE0F\uDE38-\uDE3A\uDE3F\uDEE5\uDEE6]|\uD803[\uDD24-\uDD27\uDEAB\uDEAC\uDF46-\uDF50]|\uD804[\uDC01\uDC38-\uDC46\uDC7F-\uDC81\uDCB3-\uDCB6\uDCB9\uDCBA\uDD00-\uDD02\uDD27-\uDD2B\uDD2D-\uDD34\uDD73\uDD80\uDD81\uDDB6-\uDDBE\uDDC9-\uDDCC\uDDCF\uDE2F-\uDE31\uDE34\uDE36\uDE37\uDE3E\uDEDF\uDEE3-\uDEEA\uDF00\uDF01\uDF3B\uDF3C\uDF40\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC38-\uDC3F\uDC42-\uDC44\uDC46\uDC5E\uDCB3-\uDCB8\uDCBA\uDCBF\uDCC0\uDCC2\uDCC3\uDDB2-\uDDB5\uDDBC\uDDBD\uDDBF\uDDC0\uDDDC\uDDDD\uDE33-\uDE3A\uDE3D\uDE3F\uDE40\uDEAB\uDEAD\uDEB0-\uDEB5\uDEB7\uDF1D-\uDF1F\uDF22-\uDF25\uDF27-\uDF2B]|\uD806[\uDC2F-\uDC37\uDC39\uDC3A\uDD3B\uDD3C\uDD3E\uDD43\uDDD4-\uDDD7\uDDDA\uDDDB\uDDE0\uDE01-\uDE0A\uDE33-\uDE38\uDE3B-\uDE3E\uDE47\uDE51-\uDE56\uDE59-\uDE5B\uDE8A-\uDE96\uDE98\uDE99]|\uD807[\uDC30-\uDC36\uDC38-\uDC3D\uDC3F\uDC92-\uDCA7\uDCAA-\uDCB0\uDCB2\uDCB3\uDCB5\uDCB6\uDD31-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD45\uDD47\uDD90\uDD91\uDD95\uDD97\uDEF3\uDEF4]|\uD81A[\uDEF0-\uDEF4\uDF30-\uDF36]|\uD81B[\uDF4F\uDF8F-\uDF92\uDFE4]|\uD82F[\uDC9D\uDC9E]|\uD834[\uDD67-\uDD69\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDD30-\uDD36\uDEEC-\uDEEF]|\uD83A[\uDCD0-\uDCD6\uDD44-\uDD4A]|\uDB40[\uDD00-\uDDEF]'
        },
        {
            'name': 'N',
            'alias': 'Number',
            'bmp': '0-9\xB2\xB3\xB9\xBC-\xBE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D58-\u0D5E\u0D66-\u0D78\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19',
            'astral': '\uD800[\uDD07-\uDD33\uDD40-\uDD78\uDD8A\uDD8B\uDEE1-\uDEFB\uDF20-\uDF23\uDF41\uDF4A\uDFD1-\uDFD5]|\uD801[\uDCA0-\uDCA9]|\uD802[\uDC58-\uDC5F\uDC79-\uDC7F\uDCA7-\uDCAF\uDCFB-\uDCFF\uDD16-\uDD1B\uDDBC\uDDBD\uDDC0-\uDDCF\uDDD2-\uDDFF\uDE40-\uDE48\uDE7D\uDE7E\uDE9D-\uDE9F\uDEEB-\uDEEF\uDF58-\uDF5F\uDF78-\uDF7F\uDFA9-\uDFAF]|\uD803[\uDCFA-\uDCFF\uDD30-\uDD39\uDE60-\uDE7E\uDF1D-\uDF26\uDF51-\uDF54\uDFC5-\uDFCB]|\uD804[\uDC52-\uDC6F\uDCF0-\uDCF9\uDD36-\uDD3F\uDDD0-\uDDD9\uDDE1-\uDDF4\uDEF0-\uDEF9]|\uD805[\uDC50-\uDC59\uDCD0-\uDCD9\uDE50-\uDE59\uDEC0-\uDEC9\uDF30-\uDF3B]|\uD806[\uDCE0-\uDCF2\uDD50-\uDD59]|\uD807[\uDC50-\uDC6C\uDD50-\uDD59\uDDA0-\uDDA9\uDFC0-\uDFD4]|\uD809[\uDC00-\uDC6E]|\uD81A[\uDE60-\uDE69\uDF50-\uDF59\uDF5B-\uDF61]|\uD81B[\uDE80-\uDE96]|\uD834[\uDEE0-\uDEF3\uDF60-\uDF78]|\uD835[\uDFCE-\uDFFF]|\uD838[\uDD40-\uDD49\uDEF0-\uDEF9]|\uD83A[\uDCC7-\uDCCF\uDD50-\uDD59]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D]|\uD83C[\uDD00-\uDD0C]|\uD83E[\uDFF0-\uDFF9]'
        },
        {
            'name': 'Nd',
            'alias': 'Decimal_Number',
            'bmp': '0-9\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19',
            'astral': '\uD801[\uDCA0-\uDCA9]|\uD803[\uDD30-\uDD39]|\uD804[\uDC66-\uDC6F\uDCF0-\uDCF9\uDD36-\uDD3F\uDDD0-\uDDD9\uDEF0-\uDEF9]|\uD805[\uDC50-\uDC59\uDCD0-\uDCD9\uDE50-\uDE59\uDEC0-\uDEC9\uDF30-\uDF39]|\uD806[\uDCE0-\uDCE9\uDD50-\uDD59]|\uD807[\uDC50-\uDC59\uDD50-\uDD59\uDDA0-\uDDA9]|\uD81A[\uDE60-\uDE69\uDF50-\uDF59]|\uD835[\uDFCE-\uDFFF]|\uD838[\uDD40-\uDD49\uDEF0-\uDEF9]|\uD83A[\uDD50-\uDD59]|\uD83E[\uDFF0-\uDFF9]'
        },
        {
            'name': 'Nl',
            'alias': 'Letter_Number',
            'bmp': '\u16EE-\u16F0\u2160-\u2182\u2185-\u2188\u3007\u3021-\u3029\u3038-\u303A\uA6E6-\uA6EF',
            'astral': '\uD800[\uDD40-\uDD74\uDF41\uDF4A\uDFD1-\uDFD5]|\uD809[\uDC00-\uDC6E]'
        },
        {
            'name': 'No',
            'alias': 'Other_Number',
            'bmp': '\xB2\xB3\xB9\xBC-\xBE\u09F4-\u09F9\u0B72-\u0B77\u0BF0-\u0BF2\u0C78-\u0C7E\u0D58-\u0D5E\u0D70-\u0D78\u0F2A-\u0F33\u1369-\u137C\u17F0-\u17F9\u19DA\u2070\u2074-\u2079\u2080-\u2089\u2150-\u215F\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA830-\uA835',
            'astral': '\uD800[\uDD07-\uDD33\uDD75-\uDD78\uDD8A\uDD8B\uDEE1-\uDEFB\uDF20-\uDF23]|\uD802[\uDC58-\uDC5F\uDC79-\uDC7F\uDCA7-\uDCAF\uDCFB-\uDCFF\uDD16-\uDD1B\uDDBC\uDDBD\uDDC0-\uDDCF\uDDD2-\uDDFF\uDE40-\uDE48\uDE7D\uDE7E\uDE9D-\uDE9F\uDEEB-\uDEEF\uDF58-\uDF5F\uDF78-\uDF7F\uDFA9-\uDFAF]|\uD803[\uDCFA-\uDCFF\uDE60-\uDE7E\uDF1D-\uDF26\uDF51-\uDF54\uDFC5-\uDFCB]|\uD804[\uDC52-\uDC65\uDDE1-\uDDF4]|\uD805[\uDF3A\uDF3B]|\uD806[\uDCEA-\uDCF2]|\uD807[\uDC5A-\uDC6C\uDFC0-\uDFD4]|\uD81A[\uDF5B-\uDF61]|\uD81B[\uDE80-\uDE96]|\uD834[\uDEE0-\uDEF3\uDF60-\uDF78]|\uD83A[\uDCC7-\uDCCF]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D]|\uD83C[\uDD00-\uDD0C]'
        },
        {
            'name': 'P',
            'alias': 'Punctuation',
            'bmp': '!-#%-\\*,-\\/:;\\?@\\[-\\]_\\{\\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65',
            'astral': '\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDFFF]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]'
        },
        {
            'name': 'Pc',
            'alias': 'Connector_Punctuation',
            'bmp': '_\u203F\u2040\u2054\uFE33\uFE34\uFE4D-\uFE4F\uFF3F'
        },
        {
            'name': 'Pd',
            'alias': 'Dash_Punctuation',
            'bmp': '\\-\u058A\u05BE\u1400\u1806\u2010-\u2015\u2E17\u2E1A\u2E3A\u2E3B\u2E40\u301C\u3030\u30A0\uFE31\uFE32\uFE58\uFE63\uFF0D',
            'astral': '\uD803\uDEAD'
        },
        {
            'name': 'Pe',
            'alias': 'Close_Punctuation',
            'bmp': '\\)\\]\\}\u0F3B\u0F3D\u169C\u2046\u207E\u208E\u2309\u230B\u232A\u2769\u276B\u276D\u276F\u2771\u2773\u2775\u27C6\u27E7\u27E9\u27EB\u27ED\u27EF\u2984\u2986\u2988\u298A\u298C\u298E\u2990\u2992\u2994\u2996\u2998\u29D9\u29DB\u29FD\u2E23\u2E25\u2E27\u2E29\u3009\u300B\u300D\u300F\u3011\u3015\u3017\u3019\u301B\u301E\u301F\uFD3E\uFE18\uFE36\uFE38\uFE3A\uFE3C\uFE3E\uFE40\uFE42\uFE44\uFE48\uFE5A\uFE5C\uFE5E\uFF09\uFF3D\uFF5D\uFF60\uFF63'
        },
        {
            'name': 'Pf',
            'alias': 'Final_Punctuation',
            'bmp': '\xBB\u2019\u201D\u203A\u2E03\u2E05\u2E0A\u2E0D\u2E1D\u2E21'
        },
        {
            'name': 'Pi',
            'alias': 'Initial_Punctuation',
            'bmp': '\xAB\u2018\u201B\u201C\u201F\u2039\u2E02\u2E04\u2E09\u2E0C\u2E1C\u2E20'
        },
        {
            'name': 'Po',
            'alias': 'Other_Punctuation',
            'bmp': '!-#%-\'\\*,\\.\\/:;\\?@\\\xA1\xA7\xB6\xB7\xBF\u037E\u0387\u055A-\u055F\u0589\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u166E\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u1805\u1807-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203B-\u203E\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205E\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00\u2E01\u2E06-\u2E08\u2E0B\u2E0E-\u2E16\u2E18\u2E19\u2E1B\u2E1E\u2E1F\u2E2A-\u2E2E\u2E30-\u2E39\u2E3C-\u2E3F\u2E41\u2E43-\u2E4F\u2E52\u3001-\u3003\u303D\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFE10-\uFE16\uFE19\uFE30\uFE45\uFE46\uFE49-\uFE4C\uFE50-\uFE52\uFE54-\uFE57\uFE5F-\uFE61\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF07\uFF0A\uFF0C\uFF0E\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3C\uFF61\uFF64\uFF65',
            'astral': '\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDF55-\uDF59]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDFFF]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]'
        },
        {
            'name': 'Ps',
            'alias': 'Open_Punctuation',
            'bmp': '\\(\\[\\{\u0F3A\u0F3C\u169B\u201A\u201E\u2045\u207D\u208D\u2308\u230A\u2329\u2768\u276A\u276C\u276E\u2770\u2772\u2774\u27C5\u27E6\u27E8\u27EA\u27EC\u27EE\u2983\u2985\u2987\u2989\u298B\u298D\u298F\u2991\u2993\u2995\u2997\u29D8\u29DA\u29FC\u2E22\u2E24\u2E26\u2E28\u2E42\u3008\u300A\u300C\u300E\u3010\u3014\u3016\u3018\u301A\u301D\uFD3F\uFE17\uFE35\uFE37\uFE39\uFE3B\uFE3D\uFE3F\uFE41\uFE43\uFE47\uFE59\uFE5B\uFE5D\uFF08\uFF3B\uFF5B\uFF5F\uFF62'
        },
        {
            'name': 'S',
            'alias': 'Symbol',
            'bmp': '\\$\\+<->\\^`\\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20BF\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC1\uFDFC\uFDFD\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD',
            'astral': '\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDE8\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEE0-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF73\uDF80-\uDFD8\uDFE0-\uDFEB]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDD78\uDD7A-\uDDCB\uDDCD-\uDE53\uDE60-\uDE6D\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6\uDF00-\uDF92\uDF94-\uDFCA]'
        },
        {
            'name': 'Sc',
            'alias': 'Currency_Symbol',
            'bmp': '\\$\xA2-\xA5\u058F\u060B\u07FE\u07FF\u09F2\u09F3\u09FB\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BF\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6',
            'astral': '\uD807[\uDFDD-\uDFE0]|\uD838\uDEFF|\uD83B\uDCB0'
        },
        {
            'name': 'Sk',
            'alias': 'Modifier_Symbol',
            'bmp': '\\^`\xA8\xAF\xB4\xB8\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u309B\u309C\uA700-\uA716\uA720\uA721\uA789\uA78A\uAB5B\uAB6A\uAB6B\uFBB2-\uFBC1\uFF3E\uFF40\uFFE3',
            'astral': '\uD83C[\uDFFB-\uDFFF]'
        },
        {
            'name': 'Sm',
            'alias': 'Math_Symbol',
            'bmp': '\\+<->\\|~\xAC\xB1\xD7\xF7\u03F6\u0606-\u0608\u2044\u2052\u207A-\u207C\u208A-\u208C\u2118\u2140-\u2144\u214B\u2190-\u2194\u219A\u219B\u21A0\u21A3\u21A6\u21AE\u21CE\u21CF\u21D2\u21D4\u21F4-\u22FF\u2320\u2321\u237C\u239B-\u23B3\u23DC-\u23E1\u25B7\u25C1\u25F8-\u25FF\u266F\u27C0-\u27C4\u27C7-\u27E5\u27F0-\u27FF\u2900-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2AFF\u2B30-\u2B44\u2B47-\u2B4C\uFB29\uFE62\uFE64-\uFE66\uFF0B\uFF1C-\uFF1E\uFF5C\uFF5E\uFFE2\uFFE9-\uFFEC',
            'astral': '\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD83B[\uDEF0\uDEF1]'
        },
        {
            'name': 'So',
            'alias': 'Other_Symbol',
            'bmp': '\xA6\xA9\xAE\xB0\u0482\u058D\u058E\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u09FA\u0B70\u0BF3-\u0BF8\u0BFA\u0C7F\u0D4F\u0D79\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116\u2117\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u214A\u214C\u214D\u214F\u218A\u218B\u2195-\u2199\u219C-\u219F\u21A1\u21A2\u21A4\u21A5\u21A7-\u21AD\u21AF-\u21CD\u21D0\u21D1\u21D3\u21D5-\u21F3\u2300-\u2307\u230C-\u231F\u2322-\u2328\u232B-\u237B\u237D-\u239A\u23B4-\u23DB\u23E2-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u25B6\u25B8-\u25C0\u25C2-\u25F7\u2600-\u266E\u2670-\u2767\u2794-\u27BF\u2800-\u28FF\u2B00-\u2B2F\u2B45\u2B46\u2B4D-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA828-\uA82B\uA836\uA837\uA839\uAA77-\uAA79\uFDFD\uFFE4\uFFE8\uFFED\uFFEE\uFFFC\uFFFD',
            'astral': '\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFDC\uDFE1-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDE8\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838\uDD4F|\uD83B[\uDCAC\uDD2E]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFA]|\uD83D[\uDC00-\uDED7\uDEE0-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF73\uDF80-\uDFD8\uDFE0-\uDFEB]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDD78\uDD7A-\uDDCB\uDDCD-\uDE53\uDE60-\uDE6D\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6\uDF00-\uDF92\uDF94-\uDFCA]'
        },
        {
            'name': 'Z',
            'alias': 'Separator',
            'bmp': ' \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000'
        },
        {
            'name': 'Zl',
            'alias': 'Line_Separator',
            'bmp': '\u2028'
        },
        {
            'name': 'Zp',
            'alias': 'Paragraph_Separator',
            'bmp': '\u2029'
        },
        {
            'name': 'Zs',
            'alias': 'Space_Separator',
            'bmp': ' \xA0\u1680\u2000-\u200A\u202F\u205F\u3000'
        }
    ];

    var unicodeCategories = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _categories = interopRequireDefault(categories);

    /*!
     * XRegExp Unicode Categories 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2010-present MIT License
     * Unicode data by Mathias Bynens <mathiasbynens.be>
     */
    var _default = function _default(XRegExp) {
      /**
       * Adds support for Unicode's general categories. E.g., `\p{Lu}` or `\p{Uppercase Letter}`. See
       * category descriptions in UAX #44 <http://unicode.org/reports/tr44/#GC_Values_Table>. Token
       * names are case insensitive, and any spaces, hyphens, and underscores are ignored.
       *
       * Uses Unicode 13.0.0.
       *
       * @requires XRegExp, Unicode Base
       */
      if (!XRegExp.addUnicodeData) {
        throw new ReferenceError('Unicode Base must be loaded before Unicode Categories');
      }

      XRegExp.addUnicodeData(_categories["default"]);
    };

    exports["default"] = _default;
    module.exports = exports.default;
    });

    var properties = [
        {
            'name': 'ASCII',
            'bmp': '\0-\x7F'
        },
        {
            'name': 'Alphabetic',
            'bmp': 'A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0345\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05EF-\u05F2\u0610-\u061A\u0620-\u0657\u0659-\u065F\u066E-\u06D3\u06D5-\u06DC\u06E1-\u06E8\u06ED-\u06EF\u06FA-\u06FC\u06FF\u0710-\u073F\u074D-\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0817\u081A-\u082C\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u08D4-\u08DF\u08E3-\u08E9\u08F0-\u093B\u093D-\u094C\u094E-\u0950\u0955-\u0963\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD-\u09C4\u09C7\u09C8\u09CB\u09CC\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09F0\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3E-\u0A42\u0A47\u0A48\u0A4B\u0A4C\u0A51\u0A59-\u0A5C\u0A5E\u0A70-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD-\u0AC5\u0AC7-\u0AC9\u0ACB\u0ACC\u0AD0\u0AE0-\u0AE3\u0AF9-\u0AFC\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D-\u0B44\u0B47\u0B48\u0B4B\u0B4C\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCC\u0BD0\u0BD7\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4C\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCC\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CF1\u0CF2\u0D00-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4C\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D7A-\u0D7F\u0D81-\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E46\u0E4D\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0ECD\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F71-\u0F81\u0F88-\u0F97\u0F99-\u0FBC\u1000-\u1036\u1038\u103B-\u103F\u1050-\u108F\u109A-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1713\u1720-\u1733\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17B3\u17B6-\u17C8\u17D7\u17DC\u1820-\u1878\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u1938\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A1B\u1A20-\u1A5E\u1A61-\u1A74\u1AA7\u1ABF\u1AC0\u1B00-\u1B33\u1B35-\u1B43\u1B45-\u1B4B\u1B80-\u1BA9\u1BAC-\u1BAF\u1BBA-\u1BE5\u1BE7-\u1BF1\u1C00-\u1C36\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1DE7-\u1DF4\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u24B6-\u24E9\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA674-\uA67B\uA67F-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA805\uA807-\uA827\uA840-\uA873\uA880-\uA8C3\uA8C5\uA8F2-\uA8F7\uA8FB\uA8FD-\uA8FF\uA90A-\uA92A\uA930-\uA952\uA960-\uA97C\uA980-\uA9B2\uA9B4-\uA9BF\uA9CF\uA9E0-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA60-\uAA76\uAA7A-\uAABE\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF5\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABEA\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC',
            'astral': '\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDD00-\uDD27\uDE80-\uDEA9\uDEAB\uDEAC\uDEB0\uDEB1\uDF00-\uDF1C\uDF27\uDF30-\uDF45\uDFB0-\uDFC4\uDFE0-\uDFF6]|\uD804[\uDC00-\uDC45\uDC82-\uDCB8\uDCD0-\uDCE8\uDD00-\uDD32\uDD44-\uDD47\uDD50-\uDD72\uDD76\uDD80-\uDDBF\uDDC1-\uDDC4\uDDCE\uDDCF\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE34\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEE8\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D-\uDF44\uDF47\uDF48\uDF4B\uDF4C\uDF50\uDF57\uDF5D-\uDF63]|\uD805[\uDC00-\uDC41\uDC43-\uDC45\uDC47-\uDC4A\uDC5F-\uDC61\uDC80-\uDCC1\uDCC4\uDCC5\uDCC7\uDD80-\uDDB5\uDDB8-\uDDBE\uDDD8-\uDDDD\uDE00-\uDE3E\uDE40\uDE44\uDE80-\uDEB5\uDEB8\uDF00-\uDF1A\uDF1D-\uDF2A]|\uD806[\uDC00-\uDC38\uDCA0-\uDCDF\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD35\uDD37\uDD38\uDD3B\uDD3C\uDD3F-\uDD42\uDDA0-\uDDA7\uDDAA-\uDDD7\uDDDA-\uDDDF\uDDE1\uDDE3\uDDE4\uDE00-\uDE32\uDE35-\uDE3E\uDE50-\uDE97\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC3E\uDC40\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD41\uDD43\uDD46\uDD47\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD8E\uDD90\uDD91\uDD93-\uDD96\uDD98\uDEE0-\uDEF6\uDFB0]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE7F\uDF00-\uDF4A\uDF4F-\uDF87\uDF8F-\uDF9F\uDFE0\uDFE1\uDFE3\uDFF0\uDFF1]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9E]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDD00-\uDD2C\uDD37-\uDD3D\uDD4E\uDEC0-\uDEEB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43\uDD47\uDD4B]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD83C[\uDD30-\uDD49\uDD50-\uDD69\uDD70-\uDD89]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A]'
        },
        {
            'name': 'Any',
            'isBmpLast': true,
            'bmp': '\0-\uFFFF',
            'astral': '[\uD800-\uDBFF][\uDC00-\uDFFF]'
        },
        {
            'name': 'Default_Ignorable_Code_Point',
            'bmp': '\xAD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFF8',
            'astral': '\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|[\uDB40-\uDB43][\uDC00-\uDFFF]'
        },
        {
            'name': 'Lowercase',
            'bmp': 'a-z\xAA\xB5\xBA\xDF-\xF6\xF8-\xFF\u0101\u0103\u0105\u0107\u0109\u010B\u010D\u010F\u0111\u0113\u0115\u0117\u0119\u011B\u011D\u011F\u0121\u0123\u0125\u0127\u0129\u012B\u012D\u012F\u0131\u0133\u0135\u0137\u0138\u013A\u013C\u013E\u0140\u0142\u0144\u0146\u0148\u0149\u014B\u014D\u014F\u0151\u0153\u0155\u0157\u0159\u015B\u015D\u015F\u0161\u0163\u0165\u0167\u0169\u016B\u016D\u016F\u0171\u0173\u0175\u0177\u017A\u017C\u017E-\u0180\u0183\u0185\u0188\u018C\u018D\u0192\u0195\u0199-\u019B\u019E\u01A1\u01A3\u01A5\u01A8\u01AA\u01AB\u01AD\u01B0\u01B4\u01B6\u01B9\u01BA\u01BD-\u01BF\u01C6\u01C9\u01CC\u01CE\u01D0\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u01DD\u01DF\u01E1\u01E3\u01E5\u01E7\u01E9\u01EB\u01ED\u01EF\u01F0\u01F3\u01F5\u01F9\u01FB\u01FD\u01FF\u0201\u0203\u0205\u0207\u0209\u020B\u020D\u020F\u0211\u0213\u0215\u0217\u0219\u021B\u021D\u021F\u0221\u0223\u0225\u0227\u0229\u022B\u022D\u022F\u0231\u0233-\u0239\u023C\u023F\u0240\u0242\u0247\u0249\u024B\u024D\u024F-\u0293\u0295-\u02B8\u02C0\u02C1\u02E0-\u02E4\u0345\u0371\u0373\u0377\u037A-\u037D\u0390\u03AC-\u03CE\u03D0\u03D1\u03D5-\u03D7\u03D9\u03DB\u03DD\u03DF\u03E1\u03E3\u03E5\u03E7\u03E9\u03EB\u03ED\u03EF-\u03F3\u03F5\u03F8\u03FB\u03FC\u0430-\u045F\u0461\u0463\u0465\u0467\u0469\u046B\u046D\u046F\u0471\u0473\u0475\u0477\u0479\u047B\u047D\u047F\u0481\u048B\u048D\u048F\u0491\u0493\u0495\u0497\u0499\u049B\u049D\u049F\u04A1\u04A3\u04A5\u04A7\u04A9\u04AB\u04AD\u04AF\u04B1\u04B3\u04B5\u04B7\u04B9\u04BB\u04BD\u04BF\u04C2\u04C4\u04C6\u04C8\u04CA\u04CC\u04CE\u04CF\u04D1\u04D3\u04D5\u04D7\u04D9\u04DB\u04DD\u04DF\u04E1\u04E3\u04E5\u04E7\u04E9\u04EB\u04ED\u04EF\u04F1\u04F3\u04F5\u04F7\u04F9\u04FB\u04FD\u04FF\u0501\u0503\u0505\u0507\u0509\u050B\u050D\u050F\u0511\u0513\u0515\u0517\u0519\u051B\u051D\u051F\u0521\u0523\u0525\u0527\u0529\u052B\u052D\u052F\u0560-\u0588\u10D0-\u10FA\u10FD-\u10FF\u13F8-\u13FD\u1C80-\u1C88\u1D00-\u1DBF\u1E01\u1E03\u1E05\u1E07\u1E09\u1E0B\u1E0D\u1E0F\u1E11\u1E13\u1E15\u1E17\u1E19\u1E1B\u1E1D\u1E1F\u1E21\u1E23\u1E25\u1E27\u1E29\u1E2B\u1E2D\u1E2F\u1E31\u1E33\u1E35\u1E37\u1E39\u1E3B\u1E3D\u1E3F\u1E41\u1E43\u1E45\u1E47\u1E49\u1E4B\u1E4D\u1E4F\u1E51\u1E53\u1E55\u1E57\u1E59\u1E5B\u1E5D\u1E5F\u1E61\u1E63\u1E65\u1E67\u1E69\u1E6B\u1E6D\u1E6F\u1E71\u1E73\u1E75\u1E77\u1E79\u1E7B\u1E7D\u1E7F\u1E81\u1E83\u1E85\u1E87\u1E89\u1E8B\u1E8D\u1E8F\u1E91\u1E93\u1E95-\u1E9D\u1E9F\u1EA1\u1EA3\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EB9\u1EBB\u1EBD\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u1EC9\u1ECB\u1ECD\u1ECF\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u1EE5\u1EE7\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\u1EF5\u1EF7\u1EF9\u1EFB\u1EFD\u1EFF-\u1F07\u1F10-\u1F15\u1F20-\u1F27\u1F30-\u1F37\u1F40-\u1F45\u1F50-\u1F57\u1F60-\u1F67\u1F70-\u1F7D\u1F80-\u1F87\u1F90-\u1F97\u1FA0-\u1FA7\u1FB0-\u1FB4\u1FB6\u1FB7\u1FBE\u1FC2-\u1FC4\u1FC6\u1FC7\u1FD0-\u1FD3\u1FD6\u1FD7\u1FE0-\u1FE7\u1FF2-\u1FF4\u1FF6\u1FF7\u2071\u207F\u2090-\u209C\u210A\u210E\u210F\u2113\u212F\u2134\u2139\u213C\u213D\u2146-\u2149\u214E\u2170-\u217F\u2184\u24D0-\u24E9\u2C30-\u2C5E\u2C61\u2C65\u2C66\u2C68\u2C6A\u2C6C\u2C71\u2C73\u2C74\u2C76-\u2C7D\u2C81\u2C83\u2C85\u2C87\u2C89\u2C8B\u2C8D\u2C8F\u2C91\u2C93\u2C95\u2C97\u2C99\u2C9B\u2C9D\u2C9F\u2CA1\u2CA3\u2CA5\u2CA7\u2CA9\u2CAB\u2CAD\u2CAF\u2CB1\u2CB3\u2CB5\u2CB7\u2CB9\u2CBB\u2CBD\u2CBF\u2CC1\u2CC3\u2CC5\u2CC7\u2CC9\u2CCB\u2CCD\u2CCF\u2CD1\u2CD3\u2CD5\u2CD7\u2CD9\u2CDB\u2CDD\u2CDF\u2CE1\u2CE3\u2CE4\u2CEC\u2CEE\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA641\uA643\uA645\uA647\uA649\uA64B\uA64D\uA64F\uA651\uA653\uA655\uA657\uA659\uA65B\uA65D\uA65F\uA661\uA663\uA665\uA667\uA669\uA66B\uA66D\uA681\uA683\uA685\uA687\uA689\uA68B\uA68D\uA68F\uA691\uA693\uA695\uA697\uA699\uA69B-\uA69D\uA723\uA725\uA727\uA729\uA72B\uA72D\uA72F-\uA731\uA733\uA735\uA737\uA739\uA73B\uA73D\uA73F\uA741\uA743\uA745\uA747\uA749\uA74B\uA74D\uA74F\uA751\uA753\uA755\uA757\uA759\uA75B\uA75D\uA75F\uA761\uA763\uA765\uA767\uA769\uA76B\uA76D\uA76F-\uA778\uA77A\uA77C\uA77F\uA781\uA783\uA785\uA787\uA78C\uA78E\uA791\uA793-\uA795\uA797\uA799\uA79B\uA79D\uA79F\uA7A1\uA7A3\uA7A5\uA7A7\uA7A9\uA7AF\uA7B5\uA7B7\uA7B9\uA7BB\uA7BD\uA7BF\uA7C3\uA7C8\uA7CA\uA7F6\uA7F8-\uA7FA\uAB30-\uAB5A\uAB5C-\uAB68\uAB70-\uABBF\uFB00-\uFB06\uFB13-\uFB17\uFF41-\uFF5A',
            'astral': '\uD801[\uDC28-\uDC4F\uDCD8-\uDCFB]|\uD803[\uDCC0-\uDCF2]|\uD806[\uDCC0-\uDCDF]|\uD81B[\uDE60-\uDE7F]|\uD835[\uDC1A-\uDC33\uDC4E-\uDC54\uDC56-\uDC67\uDC82-\uDC9B\uDCB6-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDCCF\uDCEA-\uDD03\uDD1E-\uDD37\uDD52-\uDD6B\uDD86-\uDD9F\uDDBA-\uDDD3\uDDEE-\uDE07\uDE22-\uDE3B\uDE56-\uDE6F\uDE8A-\uDEA5\uDEC2-\uDEDA\uDEDC-\uDEE1\uDEFC-\uDF14\uDF16-\uDF1B\uDF36-\uDF4E\uDF50-\uDF55\uDF70-\uDF88\uDF8A-\uDF8F\uDFAA-\uDFC2\uDFC4-\uDFC9\uDFCB]|\uD83A[\uDD22-\uDD43]'
        },
        {
            'name': 'Noncharacter_Code_Point',
            'bmp': '\uFDD0-\uFDEF\uFFFE\uFFFF',
            'astral': '[\uD83F\uD87F\uD8BF\uD8FF\uD93F\uD97F\uD9BF\uD9FF\uDA3F\uDA7F\uDABF\uDAFF\uDB3F\uDB7F\uDBBF\uDBFF][\uDFFE\uDFFF]'
        },
        {
            'name': 'Uppercase',
            'bmp': 'A-Z\xC0-\xD6\xD8-\xDE\u0100\u0102\u0104\u0106\u0108\u010A\u010C\u010E\u0110\u0112\u0114\u0116\u0118\u011A\u011C\u011E\u0120\u0122\u0124\u0126\u0128\u012A\u012C\u012E\u0130\u0132\u0134\u0136\u0139\u013B\u013D\u013F\u0141\u0143\u0145\u0147\u014A\u014C\u014E\u0150\u0152\u0154\u0156\u0158\u015A\u015C\u015E\u0160\u0162\u0164\u0166\u0168\u016A\u016C\u016E\u0170\u0172\u0174\u0176\u0178\u0179\u017B\u017D\u0181\u0182\u0184\u0186\u0187\u0189-\u018B\u018E-\u0191\u0193\u0194\u0196-\u0198\u019C\u019D\u019F\u01A0\u01A2\u01A4\u01A6\u01A7\u01A9\u01AC\u01AE\u01AF\u01B1-\u01B3\u01B5\u01B7\u01B8\u01BC\u01C4\u01C7\u01CA\u01CD\u01CF\u01D1\u01D3\u01D5\u01D7\u01D9\u01DB\u01DE\u01E0\u01E2\u01E4\u01E6\u01E8\u01EA\u01EC\u01EE\u01F1\u01F4\u01F6-\u01F8\u01FA\u01FC\u01FE\u0200\u0202\u0204\u0206\u0208\u020A\u020C\u020E\u0210\u0212\u0214\u0216\u0218\u021A\u021C\u021E\u0220\u0222\u0224\u0226\u0228\u022A\u022C\u022E\u0230\u0232\u023A\u023B\u023D\u023E\u0241\u0243-\u0246\u0248\u024A\u024C\u024E\u0370\u0372\u0376\u037F\u0386\u0388-\u038A\u038C\u038E\u038F\u0391-\u03A1\u03A3-\u03AB\u03CF\u03D2-\u03D4\u03D8\u03DA\u03DC\u03DE\u03E0\u03E2\u03E4\u03E6\u03E8\u03EA\u03EC\u03EE\u03F4\u03F7\u03F9\u03FA\u03FD-\u042F\u0460\u0462\u0464\u0466\u0468\u046A\u046C\u046E\u0470\u0472\u0474\u0476\u0478\u047A\u047C\u047E\u0480\u048A\u048C\u048E\u0490\u0492\u0494\u0496\u0498\u049A\u049C\u049E\u04A0\u04A2\u04A4\u04A6\u04A8\u04AA\u04AC\u04AE\u04B0\u04B2\u04B4\u04B6\u04B8\u04BA\u04BC\u04BE\u04C0\u04C1\u04C3\u04C5\u04C7\u04C9\u04CB\u04CD\u04D0\u04D2\u04D4\u04D6\u04D8\u04DA\u04DC\u04DE\u04E0\u04E2\u04E4\u04E6\u04E8\u04EA\u04EC\u04EE\u04F0\u04F2\u04F4\u04F6\u04F8\u04FA\u04FC\u04FE\u0500\u0502\u0504\u0506\u0508\u050A\u050C\u050E\u0510\u0512\u0514\u0516\u0518\u051A\u051C\u051E\u0520\u0522\u0524\u0526\u0528\u052A\u052C\u052E\u0531-\u0556\u10A0-\u10C5\u10C7\u10CD\u13A0-\u13F5\u1C90-\u1CBA\u1CBD-\u1CBF\u1E00\u1E02\u1E04\u1E06\u1E08\u1E0A\u1E0C\u1E0E\u1E10\u1E12\u1E14\u1E16\u1E18\u1E1A\u1E1C\u1E1E\u1E20\u1E22\u1E24\u1E26\u1E28\u1E2A\u1E2C\u1E2E\u1E30\u1E32\u1E34\u1E36\u1E38\u1E3A\u1E3C\u1E3E\u1E40\u1E42\u1E44\u1E46\u1E48\u1E4A\u1E4C\u1E4E\u1E50\u1E52\u1E54\u1E56\u1E58\u1E5A\u1E5C\u1E5E\u1E60\u1E62\u1E64\u1E66\u1E68\u1E6A\u1E6C\u1E6E\u1E70\u1E72\u1E74\u1E76\u1E78\u1E7A\u1E7C\u1E7E\u1E80\u1E82\u1E84\u1E86\u1E88\u1E8A\u1E8C\u1E8E\u1E90\u1E92\u1E94\u1E9E\u1EA0\u1EA2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EB8\u1EBA\u1EBC\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\u1EC8\u1ECA\u1ECC\u1ECE\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\u1EE4\u1EE6\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\u1EF4\u1EF6\u1EF8\u1EFA\u1EFC\u1EFE\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F59\u1F5B\u1F5D\u1F5F\u1F68-\u1F6F\u1FB8-\u1FBB\u1FC8-\u1FCB\u1FD8-\u1FDB\u1FE8-\u1FEC\u1FF8-\u1FFB\u2102\u2107\u210B-\u210D\u2110-\u2112\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u2130-\u2133\u213E\u213F\u2145\u2160-\u216F\u2183\u24B6-\u24CF\u2C00-\u2C2E\u2C60\u2C62-\u2C64\u2C67\u2C69\u2C6B\u2C6D-\u2C70\u2C72\u2C75\u2C7E-\u2C80\u2C82\u2C84\u2C86\u2C88\u2C8A\u2C8C\u2C8E\u2C90\u2C92\u2C94\u2C96\u2C98\u2C9A\u2C9C\u2C9E\u2CA0\u2CA2\u2CA4\u2CA6\u2CA8\u2CAA\u2CAC\u2CAE\u2CB0\u2CB2\u2CB4\u2CB6\u2CB8\u2CBA\u2CBC\u2CBE\u2CC0\u2CC2\u2CC4\u2CC6\u2CC8\u2CCA\u2CCC\u2CCE\u2CD0\u2CD2\u2CD4\u2CD6\u2CD8\u2CDA\u2CDC\u2CDE\u2CE0\u2CE2\u2CEB\u2CED\u2CF2\uA640\uA642\uA644\uA646\uA648\uA64A\uA64C\uA64E\uA650\uA652\uA654\uA656\uA658\uA65A\uA65C\uA65E\uA660\uA662\uA664\uA666\uA668\uA66A\uA66C\uA680\uA682\uA684\uA686\uA688\uA68A\uA68C\uA68E\uA690\uA692\uA694\uA696\uA698\uA69A\uA722\uA724\uA726\uA728\uA72A\uA72C\uA72E\uA732\uA734\uA736\uA738\uA73A\uA73C\uA73E\uA740\uA742\uA744\uA746\uA748\uA74A\uA74C\uA74E\uA750\uA752\uA754\uA756\uA758\uA75A\uA75C\uA75E\uA760\uA762\uA764\uA766\uA768\uA76A\uA76C\uA76E\uA779\uA77B\uA77D\uA77E\uA780\uA782\uA784\uA786\uA78B\uA78D\uA790\uA792\uA796\uA798\uA79A\uA79C\uA79E\uA7A0\uA7A2\uA7A4\uA7A6\uA7A8\uA7AA-\uA7AE\uA7B0-\uA7B4\uA7B6\uA7B8\uA7BA\uA7BC\uA7BE\uA7C2\uA7C4-\uA7C7\uA7C9\uA7F5\uFF21-\uFF3A',
            'astral': '\uD801[\uDC00-\uDC27\uDCB0-\uDCD3]|\uD803[\uDC80-\uDCB2]|\uD806[\uDCA0-\uDCBF]|\uD81B[\uDE40-\uDE5F]|\uD835[\uDC00-\uDC19\uDC34-\uDC4D\uDC68-\uDC81\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB5\uDCD0-\uDCE9\uDD04\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD38\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD6C-\uDD85\uDDA0-\uDDB9\uDDD4-\uDDED\uDE08-\uDE21\uDE3C-\uDE55\uDE70-\uDE89\uDEA8-\uDEC0\uDEE2-\uDEFA\uDF1C-\uDF34\uDF56-\uDF6E\uDF90-\uDFA8\uDFCA]|\uD83A[\uDD00-\uDD21]|\uD83C[\uDD30-\uDD49\uDD50-\uDD69\uDD70-\uDD89]'
        },
        {
            'name': 'White_Space',
            'bmp': '\t-\r \x85\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000'
        }
    ];

    var unicodeProperties = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _properties = interopRequireDefault(properties);

    /*!
     * XRegExp Unicode Properties 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2012-present MIT License
     * Unicode data by Mathias Bynens <mathiasbynens.be>
     */
    var _default = function _default(XRegExp) {
      /**
       * Adds properties to meet the UTS #18 Level 1 RL1.2 requirements for Unicode regex support. See
       * <http://unicode.org/reports/tr18/#RL1.2>. Following are definitions of these properties from
       * UAX #44 <http://unicode.org/reports/tr44/>:
       *
       * - Alphabetic
       *   Characters with the Alphabetic property. Generated from: Lowercase + Uppercase + Lt + Lm +
       *   Lo + Nl + Other_Alphabetic.
       *
       * - Default_Ignorable_Code_Point
       *   For programmatic determination of default ignorable code points. New characters that should
       *   be ignored in rendering (unless explicitly supported) will be assigned in these ranges,
       *   permitting programs to correctly handle the default rendering of such characters when not
       *   otherwise supported.
       *
       * - Lowercase
       *   Characters with the Lowercase property. Generated from: Ll + Other_Lowercase.
       *
       * - Noncharacter_Code_Point
       *   Code points permanently reserved for internal use.
       *
       * - Uppercase
       *   Characters with the Uppercase property. Generated from: Lu + Other_Uppercase.
       *
       * - White_Space
       *   Spaces, separator characters and other control characters which should be treated by
       *   programming languages as "white space" for the purpose of parsing elements.
       *
       * The properties ASCII, Any, and Assigned are also included but are not defined in UAX #44. UTS
       * #18 RL1.2 additionally requires support for Unicode scripts and general categories. These are
       * included in XRegExp's Unicode Categories and Unicode Scripts addons.
       *
       * Token names are case insensitive, and any spaces, hyphens, and underscores are ignored.
       *
       * Uses Unicode 13.0.0.
       *
       * @requires XRegExp, Unicode Base
       */
      if (!XRegExp.addUnicodeData) {
        throw new ReferenceError('Unicode Base must be loaded before Unicode Properties');
      }

      var unicodeData = _properties["default"]; // Add non-generated data

      unicodeData.push({
        name: 'Assigned',
        // Since this is defined as the inverse of Unicode category Cn (Unassigned), the Unicode
        // Categories addon is required to use this property
        inverseOf: 'Cn'
      });
      XRegExp.addUnicodeData(unicodeData);
    };

    exports["default"] = _default;
    module.exports = exports.default;
    });

    var scripts = [
        {
            'name': 'Adlam',
            'astral': '\uD83A[\uDD00-\uDD4B\uDD50-\uDD59\uDD5E\uDD5F]'
        },
        {
            'name': 'Ahom',
            'astral': '\uD805[\uDF00-\uDF1A\uDF1D-\uDF2B\uDF30-\uDF3F]'
        },
        {
            'name': 'Anatolian_Hieroglyphs',
            'astral': '\uD811[\uDC00-\uDE46]'
        },
        {
            'name': 'Arabic',
            'bmp': '\u0600-\u0604\u0606-\u060B\u060D-\u061A\u061C\u061E\u0620-\u063F\u0641-\u064A\u0656-\u066F\u0671-\u06DC\u06DE-\u06FF\u0750-\u077F\u08A0-\u08B4\u08B6-\u08C7\u08D3-\u08E1\u08E3-\u08FF\uFB50-\uFBC1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFD\uFE70-\uFE74\uFE76-\uFEFC',
            'astral': '\uD803[\uDE60-\uDE7E]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB\uDEF0\uDEF1]'
        },
        {
            'name': 'Armenian',
            'bmp': '\u0531-\u0556\u0559-\u058A\u058D-\u058F\uFB13-\uFB17'
        },
        {
            'name': 'Avestan',
            'astral': '\uD802[\uDF00-\uDF35\uDF39-\uDF3F]'
        },
        {
            'name': 'Balinese',
            'bmp': '\u1B00-\u1B4B\u1B50-\u1B7C'
        },
        {
            'name': 'Bamum',
            'bmp': '\uA6A0-\uA6F7',
            'astral': '\uD81A[\uDC00-\uDE38]'
        },
        {
            'name': 'Bassa_Vah',
            'astral': '\uD81A[\uDED0-\uDEED\uDEF0-\uDEF5]'
        },
        {
            'name': 'Batak',
            'bmp': '\u1BC0-\u1BF3\u1BFC-\u1BFF'
        },
        {
            'name': 'Bengali',
            'bmp': '\u0980-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09FE'
        },
        {
            'name': 'Bhaiksuki',
            'astral': '\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC45\uDC50-\uDC6C]'
        },
        {
            'name': 'Bopomofo',
            'bmp': '\u02EA\u02EB\u3105-\u312F\u31A0-\u31BF'
        },
        {
            'name': 'Brahmi',
            'astral': '\uD804[\uDC00-\uDC4D\uDC52-\uDC6F\uDC7F]'
        },
        {
            'name': 'Braille',
            'bmp': '\u2800-\u28FF'
        },
        {
            'name': 'Buginese',
            'bmp': '\u1A00-\u1A1B\u1A1E\u1A1F'
        },
        {
            'name': 'Buhid',
            'bmp': '\u1740-\u1753'
        },
        {
            'name': 'Canadian_Aboriginal',
            'bmp': '\u1400-\u167F\u18B0-\u18F5'
        },
        {
            'name': 'Carian',
            'astral': '\uD800[\uDEA0-\uDED0]'
        },
        {
            'name': 'Caucasian_Albanian',
            'astral': '\uD801[\uDD30-\uDD63\uDD6F]'
        },
        {
            'name': 'Chakma',
            'astral': '\uD804[\uDD00-\uDD34\uDD36-\uDD47]'
        },
        {
            'name': 'Cham',
            'bmp': '\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA5C-\uAA5F'
        },
        {
            'name': 'Cherokee',
            'bmp': '\u13A0-\u13F5\u13F8-\u13FD\uAB70-\uABBF'
        },
        {
            'name': 'Chorasmian',
            'astral': '\uD803[\uDFB0-\uDFCB]'
        },
        {
            'name': 'Common',
            'bmp': '\0-@\\[-`\\{-\xA9\xAB-\xB9\xBB-\xBF\xD7\xF7\u02B9-\u02DF\u02E5-\u02E9\u02EC-\u02FF\u0374\u037E\u0385\u0387\u0605\u060C\u061B\u061F\u0640\u06DD\u08E2\u0964\u0965\u0E3F\u0FD5-\u0FD8\u10FB\u16EB-\u16ED\u1735\u1736\u1802\u1803\u1805\u1CD3\u1CE1\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5-\u1CF7\u1CFA\u2000-\u200B\u200E-\u2064\u2066-\u2070\u2074-\u207E\u2080-\u208E\u20A0-\u20BF\u2100-\u2125\u2127-\u2129\u212C-\u2131\u2133-\u214D\u214F-\u215F\u2189-\u218B\u2190-\u2426\u2440-\u244A\u2460-\u27FF\u2900-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2E00-\u2E52\u2FF0-\u2FFB\u3000-\u3004\u3006\u3008-\u3020\u3030-\u3037\u303C-\u303F\u309B\u309C\u30A0\u30FB\u30FC\u3190-\u319F\u31C0-\u31E3\u3220-\u325F\u327F-\u32CF\u32FF\u3358-\u33FF\u4DC0-\u4DFF\uA700-\uA721\uA788-\uA78A\uA830-\uA839\uA92E\uA9CF\uAB5B\uAB6A\uAB6B\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFEFF\uFF01-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\uFF70\uFF9E\uFF9F\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFF9-\uFFFD',
            'astral': '\uD800[\uDD00-\uDD02\uDD07-\uDD33\uDD37-\uDD3F\uDD90-\uDD9C\uDDD0-\uDDFC\uDEE1-\uDEFB]|\uD81B[\uDFE2\uDFE3]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD66\uDD6A-\uDD7A\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDE8\uDEE0-\uDEF3\uDF00-\uDF56\uDF60-\uDF78]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDFCB\uDFCE-\uDFFF]|\uD83B[\uDC71-\uDCB4\uDD01-\uDD3D]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD00-\uDDAD\uDDE6-\uDDFF\uDE01\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEE0-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF73\uDF80-\uDFD8\uDFE0-\uDFEB]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDD78\uDD7A-\uDDCB\uDDCD-\uDE53\uDE60-\uDE6D\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6\uDF00-\uDF92\uDF94-\uDFCA\uDFF0-\uDFF9]|\uDB40[\uDC01\uDC20-\uDC7F]'
        },
        {
            'name': 'Coptic',
            'bmp': '\u03E2-\u03EF\u2C80-\u2CF3\u2CF9-\u2CFF'
        },
        {
            'name': 'Cuneiform',
            'astral': '\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC70-\uDC74\uDC80-\uDD43]'
        },
        {
            'name': 'Cypriot',
            'astral': '\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F]'
        },
        {
            'name': 'Cyrillic',
            'bmp': '\u0400-\u0484\u0487-\u052F\u1C80-\u1C88\u1D2B\u1D78\u2DE0-\u2DFF\uA640-\uA69F\uFE2E\uFE2F'
        },
        {
            'name': 'Deseret',
            'astral': '\uD801[\uDC00-\uDC4F]'
        },
        {
            'name': 'Devanagari',
            'bmp': '\u0900-\u0950\u0955-\u0963\u0966-\u097F\uA8E0-\uA8FF'
        },
        {
            'name': 'Dives_Akuru',
            'astral': '\uD806[\uDD00-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD35\uDD37\uDD38\uDD3B-\uDD46\uDD50-\uDD59]'
        },
        {
            'name': 'Dogra',
            'astral': '\uD806[\uDC00-\uDC3B]'
        },
        {
            'name': 'Duployan',
            'astral': '\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9C-\uDC9F]'
        },
        {
            'name': 'Egyptian_Hieroglyphs',
            'astral': '\uD80C[\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E\uDC30-\uDC38]'
        },
        {
            'name': 'Elbasan',
            'astral': '\uD801[\uDD00-\uDD27]'
        },
        {
            'name': 'Elymaic',
            'astral': '\uD803[\uDFE0-\uDFF6]'
        },
        {
            'name': 'Ethiopic',
            'bmp': '\u1200-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u137C\u1380-\u1399\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E'
        },
        {
            'name': 'Georgian',
            'bmp': '\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u10FF\u1C90-\u1CBA\u1CBD-\u1CBF\u2D00-\u2D25\u2D27\u2D2D'
        },
        {
            'name': 'Glagolitic',
            'bmp': '\u2C00-\u2C2E\u2C30-\u2C5E',
            'astral': '\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]'
        },
        {
            'name': 'Gothic',
            'astral': '\uD800[\uDF30-\uDF4A]'
        },
        {
            'name': 'Grantha',
            'astral': '\uD804[\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]'
        },
        {
            'name': 'Greek',
            'bmp': '\u0370-\u0373\u0375-\u0377\u037A-\u037D\u037F\u0384\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03E1\u03F0-\u03FF\u1D26-\u1D2A\u1D5D-\u1D61\u1D66-\u1D6A\u1DBF\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FC4\u1FC6-\u1FD3\u1FD6-\u1FDB\u1FDD-\u1FEF\u1FF2-\u1FF4\u1FF6-\u1FFE\u2126\uAB65',
            'astral': '\uD800[\uDD40-\uDD8E\uDDA0]|\uD834[\uDE00-\uDE45]'
        },
        {
            'name': 'Gujarati',
            'bmp': '\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AF1\u0AF9-\u0AFF'
        },
        {
            'name': 'Gunjala_Gondi',
            'astral': '\uD807[\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD8E\uDD90\uDD91\uDD93-\uDD98\uDDA0-\uDDA9]'
        },
        {
            'name': 'Gurmukhi',
            'bmp': '\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A76'
        },
        {
            'name': 'Han',
            'bmp': '\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DBF\u4E00-\u9FFC\uF900-\uFA6D\uFA70-\uFAD9',
            'astral': '\uD81B[\uDFF0\uDFF1]|[\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A]'
        },
        {
            'name': 'Hangul',
            'bmp': '\u1100-\u11FF\u302E\u302F\u3131-\u318E\u3200-\u321E\u3260-\u327E\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC'
        },
        {
            'name': 'Hanifi_Rohingya',
            'astral': '\uD803[\uDD00-\uDD27\uDD30-\uDD39]'
        },
        {
            'name': 'Hanunoo',
            'bmp': '\u1720-\u1734'
        },
        {
            'name': 'Hatran',
            'astral': '\uD802[\uDCE0-\uDCF2\uDCF4\uDCF5\uDCFB-\uDCFF]'
        },
        {
            'name': 'Hebrew',
            'bmp': '\u0591-\u05C7\u05D0-\u05EA\u05EF-\u05F4\uFB1D-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFB4F'
        },
        {
            'name': 'Hiragana',
            'bmp': '\u3041-\u3096\u309D-\u309F',
            'astral': '\uD82C[\uDC01-\uDD1E\uDD50-\uDD52]|\uD83C\uDE00'
        },
        {
            'name': 'Imperial_Aramaic',
            'astral': '\uD802[\uDC40-\uDC55\uDC57-\uDC5F]'
        },
        {
            'name': 'Inherited',
            'bmp': '\u0300-\u036F\u0485\u0486\u064B-\u0655\u0670\u0951-\u0954\u1AB0-\u1AC0\u1CD0-\u1CD2\u1CD4-\u1CE0\u1CE2-\u1CE8\u1CED\u1CF4\u1CF8\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u200C\u200D\u20D0-\u20F0\u302A-\u302D\u3099\u309A\uFE00-\uFE0F\uFE20-\uFE2D',
            'astral': '\uD800[\uDDFD\uDEE0]|\uD804\uDF3B|\uD834[\uDD67-\uDD69\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD]|\uDB40[\uDD00-\uDDEF]'
        },
        {
            'name': 'Inscriptional_Pahlavi',
            'astral': '\uD802[\uDF60-\uDF72\uDF78-\uDF7F]'
        },
        {
            'name': 'Inscriptional_Parthian',
            'astral': '\uD802[\uDF40-\uDF55\uDF58-\uDF5F]'
        },
        {
            'name': 'Javanese',
            'bmp': '\uA980-\uA9CD\uA9D0-\uA9D9\uA9DE\uA9DF'
        },
        {
            'name': 'Kaithi',
            'astral': '\uD804[\uDC80-\uDCC1\uDCCD]'
        },
        {
            'name': 'Kannada',
            'bmp': '\u0C80-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2'
        },
        {
            'name': 'Katakana',
            'bmp': '\u30A1-\u30FA\u30FD-\u30FF\u31F0-\u31FF\u32D0-\u32FE\u3300-\u3357\uFF66-\uFF6F\uFF71-\uFF9D',
            'astral': '\uD82C[\uDC00\uDD64-\uDD67]'
        },
        {
            'name': 'Kayah_Li',
            'bmp': '\uA900-\uA92D\uA92F'
        },
        {
            'name': 'Kharoshthi',
            'astral': '\uD802[\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE38-\uDE3A\uDE3F-\uDE48\uDE50-\uDE58]'
        },
        {
            'name': 'Khitan_Small_Script',
            'astral': '\uD81B\uDFE4|\uD822[\uDF00-\uDFFF]|\uD823[\uDC00-\uDCD5]'
        },
        {
            'name': 'Khmer',
            'bmp': '\u1780-\u17DD\u17E0-\u17E9\u17F0-\u17F9\u19E0-\u19FF'
        },
        {
            'name': 'Khojki',
            'astral': '\uD804[\uDE00-\uDE11\uDE13-\uDE3E]'
        },
        {
            'name': 'Khudawadi',
            'astral': '\uD804[\uDEB0-\uDEEA\uDEF0-\uDEF9]'
        },
        {
            'name': 'Lao',
            'bmp': '\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF'
        },
        {
            'name': 'Latin',
            'bmp': 'A-Za-z\xAA\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02B8\u02E0-\u02E4\u1D00-\u1D25\u1D2C-\u1D5C\u1D62-\u1D65\u1D6B-\u1D77\u1D79-\u1DBE\u1E00-\u1EFF\u2071\u207F\u2090-\u209C\u212A\u212B\u2132\u214E\u2160-\u2188\u2C60-\u2C7F\uA722-\uA787\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA7FF\uAB30-\uAB5A\uAB5C-\uAB64\uAB66-\uAB69\uFB00-\uFB06\uFF21-\uFF3A\uFF41-\uFF5A'
        },
        {
            'name': 'Lepcha',
            'bmp': '\u1C00-\u1C37\u1C3B-\u1C49\u1C4D-\u1C4F'
        },
        {
            'name': 'Limbu',
            'bmp': '\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1940\u1944-\u194F'
        },
        {
            'name': 'Linear_A',
            'astral': '\uD801[\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]'
        },
        {
            'name': 'Linear_B',
            'astral': '\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA]'
        },
        {
            'name': 'Lisu',
            'bmp': '\uA4D0-\uA4FF',
            'astral': '\uD807\uDFB0'
        },
        {
            'name': 'Lycian',
            'astral': '\uD800[\uDE80-\uDE9C]'
        },
        {
            'name': 'Lydian',
            'astral': '\uD802[\uDD20-\uDD39\uDD3F]'
        },
        {
            'name': 'Mahajani',
            'astral': '\uD804[\uDD50-\uDD76]'
        },
        {
            'name': 'Makasar',
            'astral': '\uD807[\uDEE0-\uDEF8]'
        },
        {
            'name': 'Malayalam',
            'bmp': '\u0D00-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4F\u0D54-\u0D63\u0D66-\u0D7F'
        },
        {
            'name': 'Mandaic',
            'bmp': '\u0840-\u085B\u085E'
        },
        {
            'name': 'Manichaean',
            'astral': '\uD802[\uDEC0-\uDEE6\uDEEB-\uDEF6]'
        },
        {
            'name': 'Marchen',
            'astral': '\uD807[\uDC70-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6]'
        },
        {
            'name': 'Masaram_Gondi',
            'astral': '\uD807[\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]'
        },
        {
            'name': 'Medefaidrin',
            'astral': '\uD81B[\uDE40-\uDE9A]'
        },
        {
            'name': 'Meetei_Mayek',
            'bmp': '\uAAE0-\uAAF6\uABC0-\uABED\uABF0-\uABF9'
        },
        {
            'name': 'Mende_Kikakui',
            'astral': '\uD83A[\uDC00-\uDCC4\uDCC7-\uDCD6]'
        },
        {
            'name': 'Meroitic_Cursive',
            'astral': '\uD802[\uDDA0-\uDDB7\uDDBC-\uDDCF\uDDD2-\uDDFF]'
        },
        {
            'name': 'Meroitic_Hieroglyphs',
            'astral': '\uD802[\uDD80-\uDD9F]'
        },
        {
            'name': 'Miao',
            'astral': '\uD81B[\uDF00-\uDF4A\uDF4F-\uDF87\uDF8F-\uDF9F]'
        },
        {
            'name': 'Modi',
            'astral': '\uD805[\uDE00-\uDE44\uDE50-\uDE59]'
        },
        {
            'name': 'Mongolian',
            'bmp': '\u1800\u1801\u1804\u1806-\u180E\u1810-\u1819\u1820-\u1878\u1880-\u18AA',
            'astral': '\uD805[\uDE60-\uDE6C]'
        },
        {
            'name': 'Mro',
            'astral': '\uD81A[\uDE40-\uDE5E\uDE60-\uDE69\uDE6E\uDE6F]'
        },
        {
            'name': 'Multani',
            'astral': '\uD804[\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA9]'
        },
        {
            'name': 'Myanmar',
            'bmp': '\u1000-\u109F\uA9E0-\uA9FE\uAA60-\uAA7F'
        },
        {
            'name': 'Nabataean',
            'astral': '\uD802[\uDC80-\uDC9E\uDCA7-\uDCAF]'
        },
        {
            'name': 'Nandinagari',
            'astral': '\uD806[\uDDA0-\uDDA7\uDDAA-\uDDD7\uDDDA-\uDDE4]'
        },
        {
            'name': 'New_Tai_Lue',
            'bmp': '\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u19DE\u19DF'
        },
        {
            'name': 'Newa',
            'astral': '\uD805[\uDC00-\uDC5B\uDC5D-\uDC61]'
        },
        {
            'name': 'Nko',
            'bmp': '\u07C0-\u07FA\u07FD-\u07FF'
        },
        {
            'name': 'Nushu',
            'astral': '\uD81B\uDFE1|\uD82C[\uDD70-\uDEFB]'
        },
        {
            'name': 'Nyiakeng_Puachue_Hmong',
            'astral': '\uD838[\uDD00-\uDD2C\uDD30-\uDD3D\uDD40-\uDD49\uDD4E\uDD4F]'
        },
        {
            'name': 'Ogham',
            'bmp': '\u1680-\u169C'
        },
        {
            'name': 'Ol_Chiki',
            'bmp': '\u1C50-\u1C7F'
        },
        {
            'name': 'Old_Hungarian',
            'astral': '\uD803[\uDC80-\uDCB2\uDCC0-\uDCF2\uDCFA-\uDCFF]'
        },
        {
            'name': 'Old_Italic',
            'astral': '\uD800[\uDF00-\uDF23\uDF2D-\uDF2F]'
        },
        {
            'name': 'Old_North_Arabian',
            'astral': '\uD802[\uDE80-\uDE9F]'
        },
        {
            'name': 'Old_Permic',
            'astral': '\uD800[\uDF50-\uDF7A]'
        },
        {
            'name': 'Old_Persian',
            'astral': '\uD800[\uDFA0-\uDFC3\uDFC8-\uDFD5]'
        },
        {
            'name': 'Old_Sogdian',
            'astral': '\uD803[\uDF00-\uDF27]'
        },
        {
            'name': 'Old_South_Arabian',
            'astral': '\uD802[\uDE60-\uDE7F]'
        },
        {
            'name': 'Old_Turkic',
            'astral': '\uD803[\uDC00-\uDC48]'
        },
        {
            'name': 'Oriya',
            'bmp': '\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B77'
        },
        {
            'name': 'Osage',
            'astral': '\uD801[\uDCB0-\uDCD3\uDCD8-\uDCFB]'
        },
        {
            'name': 'Osmanya',
            'astral': '\uD801[\uDC80-\uDC9D\uDCA0-\uDCA9]'
        },
        {
            'name': 'Pahawh_Hmong',
            'astral': '\uD81A[\uDF00-\uDF45\uDF50-\uDF59\uDF5B-\uDF61\uDF63-\uDF77\uDF7D-\uDF8F]'
        },
        {
            'name': 'Palmyrene',
            'astral': '\uD802[\uDC60-\uDC7F]'
        },
        {
            'name': 'Pau_Cin_Hau',
            'astral': '\uD806[\uDEC0-\uDEF8]'
        },
        {
            'name': 'Phags_Pa',
            'bmp': '\uA840-\uA877'
        },
        {
            'name': 'Phoenician',
            'astral': '\uD802[\uDD00-\uDD1B\uDD1F]'
        },
        {
            'name': 'Psalter_Pahlavi',
            'astral': '\uD802[\uDF80-\uDF91\uDF99-\uDF9C\uDFA9-\uDFAF]'
        },
        {
            'name': 'Rejang',
            'bmp': '\uA930-\uA953\uA95F'
        },
        {
            'name': 'Runic',
            'bmp': '\u16A0-\u16EA\u16EE-\u16F8'
        },
        {
            'name': 'Samaritan',
            'bmp': '\u0800-\u082D\u0830-\u083E'
        },
        {
            'name': 'Saurashtra',
            'bmp': '\uA880-\uA8C5\uA8CE-\uA8D9'
        },
        {
            'name': 'Sharada',
            'astral': '\uD804[\uDD80-\uDDDF]'
        },
        {
            'name': 'Shavian',
            'astral': '\uD801[\uDC50-\uDC7F]'
        },
        {
            'name': 'Siddham',
            'astral': '\uD805[\uDD80-\uDDB5\uDDB8-\uDDDD]'
        },
        {
            'name': 'SignWriting',
            'astral': '\uD836[\uDC00-\uDE8B\uDE9B-\uDE9F\uDEA1-\uDEAF]'
        },
        {
            'name': 'Sinhala',
            'bmp': '\u0D81-\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2-\u0DF4',
            'astral': '\uD804[\uDDE1-\uDDF4]'
        },
        {
            'name': 'Sogdian',
            'astral': '\uD803[\uDF30-\uDF59]'
        },
        {
            'name': 'Sora_Sompeng',
            'astral': '\uD804[\uDCD0-\uDCE8\uDCF0-\uDCF9]'
        },
        {
            'name': 'Soyombo',
            'astral': '\uD806[\uDE50-\uDEA2]'
        },
        {
            'name': 'Sundanese',
            'bmp': '\u1B80-\u1BBF\u1CC0-\u1CC7'
        },
        {
            'name': 'Syloti_Nagri',
            'bmp': '\uA800-\uA82C'
        },
        {
            'name': 'Syriac',
            'bmp': '\u0700-\u070D\u070F-\u074A\u074D-\u074F\u0860-\u086A'
        },
        {
            'name': 'Tagalog',
            'bmp': '\u1700-\u170C\u170E-\u1714'
        },
        {
            'name': 'Tagbanwa',
            'bmp': '\u1760-\u176C\u176E-\u1770\u1772\u1773'
        },
        {
            'name': 'Tai_Le',
            'bmp': '\u1950-\u196D\u1970-\u1974'
        },
        {
            'name': 'Tai_Tham',
            'bmp': '\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA0-\u1AAD'
        },
        {
            'name': 'Tai_Viet',
            'bmp': '\uAA80-\uAAC2\uAADB-\uAADF'
        },
        {
            'name': 'Takri',
            'astral': '\uD805[\uDE80-\uDEB8\uDEC0-\uDEC9]'
        },
        {
            'name': 'Tamil',
            'bmp': '\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BFA',
            'astral': '\uD807[\uDFC0-\uDFF1\uDFFF]'
        },
        {
            'name': 'Tangut',
            'astral': '\uD81B\uDFE0|[\uD81C-\uD820][\uDC00-\uDFFF]|\uD821[\uDC00-\uDFF7]|\uD822[\uDC00-\uDEFF]|\uD823[\uDD00-\uDD08]'
        },
        {
            'name': 'Telugu',
            'bmp': '\u0C00-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C77-\u0C7F'
        },
        {
            'name': 'Thaana',
            'bmp': '\u0780-\u07B1'
        },
        {
            'name': 'Thai',
            'bmp': '\u0E01-\u0E3A\u0E40-\u0E5B'
        },
        {
            'name': 'Tibetan',
            'bmp': '\u0F00-\u0F47\u0F49-\u0F6C\u0F71-\u0F97\u0F99-\u0FBC\u0FBE-\u0FCC\u0FCE-\u0FD4\u0FD9\u0FDA'
        },
        {
            'name': 'Tifinagh',
            'bmp': '\u2D30-\u2D67\u2D6F\u2D70\u2D7F'
        },
        {
            'name': 'Tirhuta',
            'astral': '\uD805[\uDC80-\uDCC7\uDCD0-\uDCD9]'
        },
        {
            'name': 'Ugaritic',
            'astral': '\uD800[\uDF80-\uDF9D\uDF9F]'
        },
        {
            'name': 'Vai',
            'bmp': '\uA500-\uA62B'
        },
        {
            'name': 'Wancho',
            'astral': '\uD838[\uDEC0-\uDEF9\uDEFF]'
        },
        {
            'name': 'Warang_Citi',
            'astral': '\uD806[\uDCA0-\uDCF2\uDCFF]'
        },
        {
            'name': 'Yezidi',
            'astral': '\uD803[\uDE80-\uDEA9\uDEAB-\uDEAD\uDEB0\uDEB1]'
        },
        {
            'name': 'Yi',
            'bmp': '\uA000-\uA48C\uA490-\uA4C6'
        },
        {
            'name': 'Zanabazar_Square',
            'astral': '\uD806[\uDE00-\uDE47]'
        }
    ];

    var unicodeScripts = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _scripts = interopRequireDefault(scripts);

    /*!
     * XRegExp Unicode Scripts 4.4.1
     * <xregexp.com>
     * Steven Levithan (c) 2010-present MIT License
     * Unicode data by Mathias Bynens <mathiasbynens.be>
     */
    var _default = function _default(XRegExp) {
      /**
       * Adds support for all Unicode scripts. E.g., `\p{Latin}`. Token names are case insensitive,
       * and any spaces, hyphens, and underscores are ignored.
       *
       * Uses Unicode 13.0.0.
       *
       * @requires XRegExp, Unicode Base
       */
      if (!XRegExp.addUnicodeData) {
        throw new ReferenceError('Unicode Base must be loaded before Unicode Scripts');
      }

      XRegExp.addUnicodeData(_scripts["default"]);
    };

    exports["default"] = _default;
    module.exports = exports.default;
    });

    var lib = createCommonjsModule(function (module, exports) {





    defineProperty$1(exports, "__esModule", {
      value: true
    });

    exports["default"] = void 0;

    var _xregexp = interopRequireDefault(xregexp);

    var _build = interopRequireDefault(build);

    var _matchrecursive = interopRequireDefault(matchrecursive);

    var _unicodeBase = interopRequireDefault(unicodeBase);

    var _unicodeBlocks = interopRequireDefault(unicodeBlocks);

    var _unicodeCategories = interopRequireDefault(unicodeCategories);

    var _unicodeProperties = interopRequireDefault(unicodeProperties);

    var _unicodeScripts = interopRequireDefault(unicodeScripts);

    (0, _build["default"])(_xregexp["default"]);
    (0, _matchrecursive["default"])(_xregexp["default"]);
    (0, _unicodeBase["default"])(_xregexp["default"]);
    (0, _unicodeBlocks["default"])(_xregexp["default"]);
    (0, _unicodeCategories["default"])(_xregexp["default"]);
    (0, _unicodeProperties["default"])(_xregexp["default"]);
    (0, _unicodeScripts["default"])(_xregexp["default"]);
    var _default = _xregexp["default"];
    exports["default"] = _default;
    module.exports = exports.default;
    });

    var occurrences = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.occurrencesInString = exports.occurrenceInString = exports.occurrencesInTokens = exports.occurrenceInTokens = void 0;



    /**
     * Gets the occurrence of a subString in a string by using the subString index in the string.
     * @param {Array} tokens
     * @param {Number} currentWordIndex
     * @param {String} subString
     * @return {Object}
     */
    var occurrenceInTokens = function occurrenceInTokens(tokens, currentWordIndex, subString) {
      var occurrence = 0;

      for (var i = 0; i <= currentWordIndex; i++) {
        if (tokens[i].token === subString) occurrence++;
      }

      return occurrence;
    };
    /**
     * Function that count occurrences of a substring in a string
     * @param {Array} tokens - The string to search in
     * @param {String} subString - The sub string to search for
     * @return {Integer} - the count of the occurrences
     */


    exports.occurrenceInTokens = occurrenceInTokens;

    var occurrencesInTokens = function occurrencesInTokens(tokens, subString) {
      var occurrences = 0;
      tokens.forEach(function (token) {
        if (token && token.token === subString) occurrences++;
      });
      return occurrences;
    };
    /**
     * Gets the occurrence of a subString in a string by using the subString index in the string.
     * @param {String} text
     * @param {Number} currentWordIndex
     * @param {String} subString
     * @return {Object}
     */


    exports.occurrencesInTokens = occurrencesInTokens;

    var occurrenceInString = function occurrenceInString(text, currentWordIndex, subString) {
      var tokens = (0, tokenizers.tokenize)({
        text: text,
        verbose: true
      });
      var occurrence = occurrenceInTokens(tokens, currentWordIndex, subString);
      return occurrence;
    };
    /**
     * Function that count occurrences of a substring in a string
     * @param {String} text - The string to search in
     * @param {String} subString - The sub string to search for
     * @return {Integer} - the count of the occurrences
     */


    exports.occurrenceInString = occurrenceInString;

    var occurrencesInString = function occurrencesInString(text, subString) {
      var tokens = (0, tokenizers.tokenize)({
        text: text,
        verbose: true
      });
      var occurrences = occurrencesInTokens(tokens, subString);
      return occurrences;
    };

    exports.occurrencesInString = occurrencesInString;

    });

    var tokenizers = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.classifyTokens = exports.tokenize = exports.number_ = exports.greedyNumber = exports.number = exports.whitespace = exports.punctuation = exports.greedyWord = exports.word = exports._greedyNumber = exports._greedyWord = exports._wordOrNumber = exports._number = exports._word = void 0;

    var _xregexp = _interopRequireDefault(lib);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

    function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    // constants
    var _word = "[\\pL\\pM\\u200D\\u2060]+";
    exports._word = _word;
    var _number = '[\\pN\\pNd\\pNl\\pNo]+';
    exports._number = _number;

    var _wordOrNumber = '(' + _word + '|' + _number + ')';

    exports._wordOrNumber = _wordOrNumber;

    var _greedyWord = '(' + _wordOrNumber + '([-\'’]?' + _word + ')+|' + _word + ')';

    exports._greedyWord = _greedyWord;

    var _greedyNumber = '(' + _number + '([:.,]?' + _number + ')+|' + _number + ')';

    exports._greedyNumber = _greedyNumber;
    var word = (0, _xregexp["default"])(_word, '');
    exports.word = word;
    var greedyWord = (0, _xregexp["default"])(_greedyWord, '');
    exports.greedyWord = greedyWord;
    var punctuation = (0, _xregexp["default"])('(^\\p{P}|[<>]{2})', '');
    exports.punctuation = punctuation;
    var whitespace = /\s+/;
    exports.whitespace = whitespace;
    var number = (0, _xregexp["default"])(_number);
    exports.number = number;
    var greedyNumber = (0, _xregexp["default"])(_greedyNumber); //  /(\d+([:.,]?\d)+|\d+)/;

    exports.greedyNumber = greedyNumber;
    var number_ = (0, _xregexp["default"])(number);
    /**
     * Tokenize a string into an array of words
     * @param {Object} params - string to be tokenized
     * @return {Array} - array of tokenized words/strings
     */

    exports.number_ = number_;

    var tokenize = function tokenize(_ref) {
      var _ref$text = _ref.text,
          text = _ref$text === void 0 ? '' : _ref$text,
          _ref$includeWords = _ref.includeWords,
          includeWords = _ref$includeWords === void 0 ? true : _ref$includeWords,
          _ref$includeNumbers = _ref.includeNumbers,
          includeNumbers = _ref$includeNumbers === void 0 ? true : _ref$includeNumbers,
          _ref$includePunctuati = _ref.includePunctuation,
          includePunctuation = _ref$includePunctuati === void 0 ? false : _ref$includePunctuati,
          _ref$includeWhitespac = _ref.includeWhitespace,
          includeWhitespace = _ref$includeWhitespac === void 0 ? false : _ref$includeWhitespac,
          _ref$greedy = _ref.greedy,
          greedy = _ref$greedy === void 0 ? false : _ref$greedy,
          _ref$verbose = _ref.verbose,
          verbose = _ref$verbose === void 0 ? false : _ref$verbose,
          _ref$occurrences = _ref.occurrences,
          occurrences$1 = _ref$occurrences === void 0 ? false : _ref$occurrences,
          _ref$parsers = _ref.parsers,
          parsers = _ref$parsers === void 0 ? {
        word: word,
        whitespace: whitespace,
        punctuation: punctuation,
        number: number
      } : _ref$parsers;

      var greedyParsers = _objectSpread({}, parsers, {
        word: greedyWord,
        number: greedyNumber
      });

      var _parsers = greedy ? greedyParsers : parsers;

      var tokens = classifyTokens(text, _parsers);
      var types = [];
      if (includeWords) types.push('word');
      if (includeNumbers) types.push('number');
      if (includeWhitespace) types.push('whitespace');
      if (includePunctuation) types.push('punctuation');
      tokens = tokens.filter(function (token) {
        return types.includes(token.type);
      });

      if (occurrences$1) {
        tokens = tokens.map(function (token, index) {
          var _occurrences = (0, occurrences.occurrencesInTokens)(tokens, token.token);

          var _occurrence = (0, occurrences.occurrenceInTokens)(tokens, index, token.token);

          return _objectSpread({}, token, {
            occurrence: _occurrence,
            occurrences: _occurrences
          });
        });
      }

      if (verbose) {
        tokens = tokens.map(function (token) {
          delete token.matches;
          return token;
        });
      } else {
        tokens = tokens.map(function (token) {
          return token.token;
        });
      }

      return tokens;
    };
    /**
     * Tiny tokenizer - https://gist.github.com/borgar/451393
     * @param {String} string - string to be tokenized
     * @param {Object} parsers - { word:/\w+/, whitespace:/\s+/, punctuation:/[^\w\s]/ }
     * @param {String} deftok - type to label tokens that are not classified with the above parsers
     * @return {Array} - array of objects => [{ token:"this", type:"word" },{ token:" ", type:"whitespace" }, Object { token:"is", type:"word" }, ... ]
    **/


    exports.tokenize = tokenize;

    var classifyTokens = function classifyTokens(string, parsers, deftok) {
      string = !string ? '' : string; // if string is undefined, make it an empty string

      if (typeof string !== 'string') {
        throw new Error("tokenizer.tokenize() string is not String: ".concat(string));
      }

      var m;
      var r;
      var t;
      var tokens = [];

      while (string) {
        t = null;
        m = string.length;
        var key = void 0;

        for (key in parsers) {
          if (Object.prototype.hasOwnProperty.call(parsers, key)) {
            r = parsers[key].exec(string); // try to choose the best match if there are several
            // where "best" is the closest to the current starting point

            if (r && r.index < m) {
              t = {
                token: r[0],
                type: key,
                matches: r.slice(1)
              };
              m = r.index;
            }
          }
        }

        if (m) {
          // there is text between last token and currently
          // matched token - push that out as default or "unknown"
          tokens.push({
            token: string.substr(0, m),
            type: deftok || 'unknown'
          });
        }

        if (t) {
          // push current token onto sequence
          tokens.push(t);
        }

        string = string.substr(m + (t ? t.token.length : 0));
      }

      return tokens;
    };

    exports.classifyTokens = classifyTokens;

    });

    var selectionHelpers = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.selectionArray = exports.selectionsToRanges = exports.spliceStringOnRanges = void 0;



    /**
     * Splice string into array of ranges, flagging what is selected
     * @param {String} string - string.
     * @param {Array} ranges - array of ranges [[int,int],...]
     * @return {Array} - array of objects [obj,...]
     */
    var spliceStringOnRanges = function spliceStringOnRanges(string, ranges) {
      var selectionArray = []; // response

      var remainingString = string; // shift the range since the loop is destructive by working on the remainingString and not original string

      var rangeShift = 0; // start the range shift at the first character

      ranges.forEach(function (range) {
        var firstCharacterPosition = range[0] - rangeShift; // original range start - the rangeShift

        var beforeSelection = remainingString.slice(0, firstCharacterPosition); // save all the text before the selection

        if (beforeSelection) {
          // only add to the array if string isn't empty
          selectionArray.push({
            text: beforeSelection,
            selected: false
          });
        }

        var shiftedRangeStart = range[0] - rangeShift; // range start - the rangeShift

        var shiftedRangeEnd = range[1] + 1 - rangeShift; // range end - rangeShift + 1 to include last character

        var selection = remainingString.slice(shiftedRangeStart, shiftedRangeEnd); // save the text in the selection

        var stringBeforeRange = string.slice(0, range[0]);
        var occurrence = (0, occurrences.occurrencesInString)(stringBeforeRange, selection) + 1;
        var occurrences$1 = (0, occurrences.occurrencesInString)(string, selection);
        var selectionObject = {
          text: selection,
          selected: true,
          occurrence: occurrence,
          occurrences: occurrences$1
        };
        selectionArray.push(selectionObject); // add the selection to the response array
        // next iteration is using remaining string

        var lastCharacterPosition = range[1] - rangeShift + 1; // original range end position - the rangeShift + 1 to not include the last range character in the remaining string

        remainingString = remainingString.slice(lastCharacterPosition); // update the remainingString to after the range
        // shift the range up to last char of substring (before+sub)

        rangeShift += beforeSelection.length; // adjust the rangeShift by the length prior to the selection

        rangeShift += selection.length; // adjust the rangeShift by the length of the selection itself
      });

      if (remainingString) {
        // only add to the array if string isn't empty
        selectionArray.push({
          text: remainingString,
          selected: false
        });
      }

      return selectionArray;
    };
    /**
     * Converts ranges to array of selection objects
     * @param {String} string - text used to get the ranges of
     * @param {Array} selections - array of selections [obj,...]
     * @return {Array} - array of range objects
     */


    exports.spliceStringOnRanges = spliceStringOnRanges;

    var selectionsToRanges = function selectionsToRanges(string, selections) {
      var ranges = []; // response

      selections.forEach(function (selection) {
        if (string && string.includes(selection.text)) {
          // conditions to prevent errors
          var splitArray = string.split(selection.text); // split the string to get the text between occurrences

          var beforeSelection = splitArray.slice(0, selection.occurrence);
          beforeSelection = beforeSelection.join(selection.text); // get the text before the selection to handle multiple occurrences

          var start = beforeSelection.length; // the start position happens at the length of the string that comes before it

          var end = start + selection.text.length - 1; // the end position happens at the end of the selection text, but length doesn't account for 0 based position start

          var range = [start, end]; // new range

          ranges.push(range); // add the new range
        }
      });
      return ranges;
    };

    exports.selectionsToRanges = selectionsToRanges;

    var selectionArray = function selectionArray(string, selections) {
      var selectionArray = [];
      var ranges = selectionsToRanges(string, selections);
      selectionArray = spliceStringOnRanges(string, ranges);
      return selectionArray;
    };

    exports.selectionArray = selectionArray;

    });

    var lib$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "tokenize", {
      enumerable: true,
      get: function get() {
        return tokenizers.tokenize;
      }
    });
    Object.defineProperty(exports, "word", {
      enumerable: true,
      get: function get() {
        return tokenizers.word;
      }
    });
    Object.defineProperty(exports, "punctuation", {
      enumerable: true,
      get: function get() {
        return tokenizers.punctuation;
      }
    });
    Object.defineProperty(exports, "whitespace", {
      enumerable: true,
      get: function get() {
        return tokenizers.whitespace;
      }
    });
    Object.defineProperty(exports, "number", {
      enumerable: true,
      get: function get() {
        return tokenizers.number_;
      }
    });
    Object.defineProperty(exports, "occurrenceInString", {
      enumerable: true,
      get: function get() {
        return occurrences.occurrenceInString;
      }
    });
    Object.defineProperty(exports, "occurrencesInString", {
      enumerable: true,
      get: function get() {
        return occurrences.occurrencesInString;
      }
    });
    Object.defineProperty(exports, "selectionArray", {
      enumerable: true,
      get: function get() {
        return selectionHelpers.selectionArray;
      }
    });
    Object.defineProperty(exports, "spliceStringOnRanges", {
      enumerable: true,
      get: function get() {
        return selectionHelpers.spliceStringOnRanges;
      }
    });
    Object.defineProperty(exports, "selectionsToRanges", {
      enumerable: true,
      get: function get() {
        return selectionHelpers.selectionsToRanges;
      }
    });







    });

    var Token_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Represents a single token from a text.
     */
    class Token {
        /**
         *
         * @param {string} text - The text of the token.
         * @param {number} [position = 0] - the position of the n-gram within the sentence measured in {$link Token}'s
         * @param {number} [characterPosition = 0] - The token's position within the sentence measured in characters.
         * @param {number} sentenceTokenLen - the length of the sentence measured in {@link Token}'s
         * @param {number} sentenceCharLen - the length of the sentence measured in characters.
         * @param {number} occurrence - the index of occurrence (indexed by 1). e.g. how many times have we seen this token so far.
         * @param {number} occurrences - how many times this token appears in the sentence.
         * @param {string} strong
         * @param {string} lemma
         * @param {string} morph
         */
        constructor({ text = "", position = 0, characterPosition = 0, sentenceTokenLen = 0, sentenceCharLen = 0, occurrence = 1, occurrences = 1, strong = "", lemma = "", morph = "" }) {
            this.text = text;
            if (position < 0 || characterPosition < 0) {
                throw new Error("Position cannot be less than 0");
            }
            // This makes it difficult to test
            // if (sentenceTokenLen <= 0 || sentenceCharLen <= 0) {
            //   throw new Error("Sentence length cannot be 0");
            // }
            this.tokenPos = position;
            this.charPos = characterPosition;
            this.sentenceCharLen = sentenceCharLen;
            this.sentenceTokenLen = sentenceTokenLen;
            this.tokenOccurrence = occurrence;
            this.tokenOccurrences = occurrences;
            this.strongNumber = strong;
            this.lemmaString = lemma;
            this.morphString = morph;
            this.metadata = Object.assign({}, arguments[0]);
        }
        /**
         * Returns the metadata stored on the token
         * @return {object}
         */
        get meta() {
            return this.metadata;
        }
        /**
         * Returns the strong's number
         * @return {string}
         */
        get strong() {
            return this.strongNumber;
        }
        /**
         * Returns the lemma
         * @return {string}
         */
        get lemma() {
            return this.lemmaString;
        }
        /**
         * Returns the morphology
         * @return {string}
         */
        get morph() {
            return this.morphString;
        }
        /**
         * Returns the position (in units of {@link Token}) of the token within the sentence.
         * @return {number}
         */
        get position() {
            return this.tokenPos;
        }
        /**
         * Returns the occurrence index of this token
         * @return {number}
         */
        get occurrence() {
            return this.tokenOccurrence;
        }
        /**
         * Returns the number of times this token occurs in the sentence
         * @return {number}
         */
        get occurrences() {
            return this.tokenOccurrences;
        }
        /**
         * The length of the sentence (in units of character) in which this token occurs.
         * This includes whitespace in the sentence
         */
        get sentenceCharacterLength() {
            return this.sentenceCharLen;
        }
        /**
         * The length of the sentence (in units of {@link Token}) in which this token occurs.
         */
        get sentenceTokenLength() {
            return this.sentenceTokenLen;
        }
        /**
         * Returns the position (in units of character) of the token within the sentence.
         * @return {number}
         */
        get charPosition() {
            return this.charPos;
        }
        /**
         * Returns a human readable form of the token
         * @return {string}
         */
        toString() {
            return this.text;
        }
        /**
         * Checks if two tokens are linguistically equal
         * @param {Token} token - the token to compare
         * @return {boolean}
         */
        equals(token) {
            return this.toString() === token.toString()
                && this.position === token.position;
        }
        /**
         * Checks if two tokens look the same.
         * Just because a token looks the same doesn't mean it's the same token.
         * @param {Token} token - the token to compare
         * @return {boolean}
         */
        looksLike(token) {
            return this.toString() === token.toString();
        }
        /**
         * Outputs the token to json
         * @param verbose - print full metadata.
         * @return {object}
         */
        toJSON(verbose = false) {
            if (verbose) {
                return Object.assign({}, this.metadata, { index: this.tokenPos });
            }
            else {
                return {
                    index: this.tokenPos,
                    occurrence: this.tokenOccurrence,
                    occurrences: this.tokenOccurrences
                };
            }
        }
    }
    exports.default = Token;
    });

    var Lexer_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    // @ts-ignore


    /**
     * A collection of lexical functions
     */
    class Lexer {
        /**
         * Converts an array of words into an array of measured tokens
         * @param {string[]} words - an array of words
         * @param sentenceCharLength - the length of the sentence in characters
         * @return an array of {@link Token}s
         */
        static tokenizeWords(words, sentenceCharLength = -1) {
            if (sentenceCharLength === -1) {
                sentenceCharLength = words.join(" ").length;
            }
            const tokens = [];
            let charPos = 0;
            const occurrenceIndex = {};
            for (const word of words) {
                if (!occurrenceIndex[word]) {
                    occurrenceIndex[word] = 0;
                }
                occurrenceIndex[word] += 1;
                tokens.push({
                    text: word,
                    position: tokens.length,
                    characterPosition: charPos,
                    sentenceTokenLen: words.length,
                    sentenceCharLen: sentenceCharLength,
                    occurrence: occurrenceIndex[word]
                });
                charPos += word.length;
            }
            // Finish adding occurrence information
            const occurrenceTokens = [];
            for (const t of tokens) {
                occurrenceTokens.push(new Token_1.default({
                    text: t.text,
                    position: t.position,
                    characterPosition: t.characterPosition,
                    sentenceTokenLen: t.sentenceTokenLen,
                    sentenceCharLen: t.sentenceCharLen,
                    occurrence: t.occurrence,
                    occurrences: occurrenceIndex[t.text]
                }));
            }
            return occurrenceTokens;
        }
        /**
         * Generates an array of measured tokens for the sentence.
         * @param {string} sentence - the sentence to tokenize
         * @param [punctuation=false] - optionally indicate if punctuation should be preserved.
         * @return {Token[]} An array of {@link Token}s
         */
        static tokenize(sentence, { punctuation = false } = {}) {
            const words = lib$1.tokenize({ text: sentence, includePunctuation: punctuation });
            return Lexer.tokenizeWords(words, sentence.length);
        }
    }
    exports.default = Lexer;
    });

    var dist = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.default = Lexer_1.default;

    exports.Token = Token_1.default;
    });

    var AlignmentOccurrences_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A commonly seen pattern in translation is that word repetition in the primary text
     * is often seen in the secondary text.
     */
    class AlignmentOccurrences {
        constructor() {
            this.name = "alignment occurrences";
        }
        /**
         * Calculates the
         * @param sourceNgramFrequency
         * @param targetNgramFrequency
         */
        static calc(sourceNgramFrequency, targetNgramFrequency) {
            if (sourceNgramFrequency === 0 || targetNgramFrequency === 0) {
                return 0;
            }
            else {
                return Math.min(sourceNgramFrequency, targetNgramFrequency) /
                    Math.max(sourceNgramFrequency, targetNgramFrequency);
                // TODO: Review above change with Klappy
                // const delta = Math.abs(sourceNgramFrequency - targetNgramFrequency);
                // return 1 / (delta + 1);
            }
        }
        /**
         * Calculates the weight based on the word
         * @param p
         * @param usIndex
         */
        static calcOccurrenceSimilarity(p, usIndex) {
            const sourceFrequency = usIndex.static.sourceNgramFrequency.read(p.source);
            const targetFrequency = usIndex.static.targetNgramFrequency.read(p.target);
            const weight = AlignmentOccurrences.calc(sourceFrequency, targetFrequency);
            p.setScore("alignmentOccurrences", weight);
        }
        /**
         * Calculates the weight based on the lemma
         * @param p
         * @param usIndex
         */
        static calcLemmaOccurrenceSimilarity(p, usIndex) {
            if (p.source.lemmaKey !== undefined && p.target.lemmaKey !== undefined) {
                const sourceFrequency = usIndex.static.sourceNgramFrequency.read(p.source.lemmaKey);
                const targetFrequency = usIndex.static.targetNgramFrequency.read(p.target.lemmaKey);
                const weight = AlignmentOccurrences.calc(sourceFrequency, targetFrequency);
                p.setScore("lemmaAlignmentOccurrences", weight);
            }
            else {
                p.setScore("lemmaAlignmentOccurrences", 0);
            }
        }
        execute(predictions, cIndex, saIndex, usIndex) {
            for (const p of predictions) {
                AlignmentOccurrences.calcOccurrenceSimilarity(p, usIndex);
                AlignmentOccurrences.calcLemmaOccurrenceSimilarity(p, usIndex);
            }
            return predictions;
        }
    }
    exports.default = AlignmentOccurrences;
    });

    var AlignmentPosition_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * This algorithm calculates the relative position of n-grams in a sentence.
     * Only literal translations are supported.
     *
     * A very high score indicates the aligned n-grams are in the same relative position.
     * A very low score indicates the aligned n-grams occur on opposite sides of the sentence.
     *
     * Results range from near 0 to 1
     */
    class AlignmentPosition {
        constructor() {
            this.name = "alignment position";
        }
        execute(predictions) {
            for (const p of predictions) {
                let weight = 0;
                // TRICKY: do not score null alignments
                if (!p.target.isNull()) {
                    // TRICKY: token positions are zero indexed
                    const sourcePosition = 1 + p.source.tokenPosition;
                    const targetPosition = 1 + p.target.tokenPosition;
                    const sourceSentenceLength = p.source.sentenceTokenLength;
                    const targetSentenceLength = p.target.sentenceTokenLength;
                    const sourceRelativePosition = sourcePosition / sourceSentenceLength;
                    const targetRelativePosition = targetPosition / targetSentenceLength;
                    const delta = Math.abs(sourceRelativePosition - targetRelativePosition);
                    weight = 1 - delta;
                }
                p.setScore("alignmentPosition", weight);
            }
            return predictions;
        }
    }
    exports.default = AlignmentPosition;
    });

    var CharacterLength_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Determines the likely hood that an n-gram is a phrase.
     */
    class CharacterLength {
        constructor() {
            this.name = "character length";
        }
        execute(predictions) {
            for (const p of predictions) {
                let weight = 0;
                // TRICKY: do not score null alignments
                if (!p.target.isNull()) {
                    // sentence lengths
                    const sourceSentenceLength = p.source.sentenceCharacterLength;
                    const targetSentenceLength = p.target.sentenceCharacterLength;
                    // n-gram lengths
                    const sourceLength = p.source.characterLength;
                    const targetLength = p.target.characterLength;
                    const primaryLengthRatio = sourceLength / sourceSentenceLength;
                    const secondaryLengthRatio = targetLength / targetSentenceLength;
                    // length affinity
                    const delta = Math.abs(primaryLengthRatio - secondaryLengthRatio);
                    // TRICKY: the power of 5 improves the curve
                    weight = Math.pow(1 - delta, 5);
                }
                p.setScore("characterLength", weight);
            }
            return predictions;
        }
    }
    exports.default = CharacterLength;
    });

    var LemmaNgramFrequency_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * This algorithm calculates the frequency of n-gram occurrences.
     */
    class LemmaNgramFrequency {
        constructor() {
            this.name = "lemma n-gram frequency";
        }
        /**
         * Performs a numerical addition with the value of a key in a number object.
         * TODO: move this into it's own class?
         *
         * @param {NumberObject} object
         * @param {string} key
         * @param {number} value
         */
        static addObjectNumber(object, key, value) {
            if (!(key in object)) {
                object[key] = 0;
            }
            object[key] += value;
        }
        /**
         * Performs a numerical division.
         * Division by zero will result in 0.
         * TODO: move this into a math utility?
         *
         * @param {number} dividend
         * @param {number} divisor
         * @return {number}
         */
        static divideSafe(dividend, divisor) {
            if (divisor === 0) {
                return 0;
            }
            else {
                return dividend / divisor;
            }
        }
        /**
         * Load data into the predictions
         * @param  predictions [description]
         * @param  cIndex      [description]
         * @param  saIndex     [description]
         * @return             [description]
         */
        execute(predictions, cIndex, saIndex) {
            const alignmentFrequencyCorpusSums = {};
            const alignmentFrequencyAlignmentMemorySums = {};
            for (const p of predictions) {
                // skip predictions without lemmas
                if (p.alignment.lemmaKey === undefined) {
                    p.setScores({
                        "sourceCorpusLemmaPermutationsFrequencyRatio": 0,
                        "targetCorpusLemmaPermutationsFrequencyRatio": 0,
                        "sourceAlignmentMemoryLemmaFrequencyRatio": 0,
                        "targetAlignmentMemoryLemmaFrequencyRatio": 0
                    });
                    continue;
                }
                // alignment permutation frequency within the corpus/alignment memory
                const alignmentFrequencyCorpus = cIndex.permutations.alignmentFrequency.read(p.alignment.lemmaKey);
                const alignmentFrequencyAlignmentMemory = saIndex.alignmentFrequency.read(p.alignment.lemmaKey);
                // n-gram permutation frequency within the corpus/alignment memory
                // looked up by n-gram
                // TODO: rename to something like this.
                // const sourceNgramFrequencyInCorpusPermutations
                // first. default to default n-gram frequency
                let ngramFrequencyCorpusSource = cIndex.permutations.sourceNgramFrequency.read(p.source.key);
                let ngramFrequencyAlignmentMemorySource = saIndex.sourceNgramFrequency.read(p.source.key);
                let ngramFrequencyCorpusTarget = cIndex.permutations.targetNgramFrequency.read(p.target.key);
                let ngramFrequencyAlignmentMemoryTarget = saIndex.targetNgramFrequency.read(p.target.key);
                // second. use lemma n-gram frequency where available
                if (p.source.lemmaKey !== undefined) {
                    ngramFrequencyCorpusSource = cIndex.permutations.sourceNgramFrequency.read(p.source.lemmaKey);
                    ngramFrequencyAlignmentMemorySource = saIndex.sourceNgramFrequency.read(p.source.lemmaKey);
                }
                if (p.target.lemmaKey !== undefined) {
                    ngramFrequencyCorpusTarget = cIndex.permutations.targetNgramFrequency.read(p.target.lemmaKey);
                    ngramFrequencyAlignmentMemoryTarget = saIndex.targetNgramFrequency.read(p.target.lemmaKey);
                }
                // permutation frequency ratio
                const sourceCorpusLemmaPermutationsFrequencyRatio = LemmaNgramFrequency.divideSafe(alignmentFrequencyCorpus, ngramFrequencyCorpusSource);
                const targetCorpusLemmaPermutationsFrequencyRatio = LemmaNgramFrequency.divideSafe(alignmentFrequencyCorpus, ngramFrequencyCorpusTarget);
                const sourceAlignmentMemoryLemmaFrequencyRatio = LemmaNgramFrequency.divideSafe(alignmentFrequencyAlignmentMemory, ngramFrequencyAlignmentMemorySource);
                const targetAlignmentMemoryLemmaFrequencyRatio = LemmaNgramFrequency.divideSafe(alignmentFrequencyAlignmentMemory, ngramFrequencyAlignmentMemoryTarget);
                // store scores
                p.setScores({
                    sourceCorpusLemmaPermutationsFrequencyRatio,
                    targetCorpusLemmaPermutationsFrequencyRatio,
                    sourceAlignmentMemoryLemmaFrequencyRatio,
                    targetAlignmentMemoryLemmaFrequencyRatio
                });
                // sum alignment frequencies
                LemmaNgramFrequency.addObjectNumber(alignmentFrequencyCorpusSums, p.key, alignmentFrequencyCorpus);
                LemmaNgramFrequency.addObjectNumber(alignmentFrequencyAlignmentMemorySums, p.key, alignmentFrequencyAlignmentMemory);
            }
            // calculate filtered frequency ratios
            for (const p of predictions) {
                // skip predictions without lemmas
                if (p.alignment.lemmaKey === undefined) {
                    p.setScores({
                        // alignmentFrequencyCorpusFiltered,
                        // alignmentFrequencyAlignmentMemoryFiltered,
                        // TODO: we aren't using these at the moment
                        "lemmaFrequencyRatioCorpusFiltered": 0,
                        "lemmaFrequencyRatioAlignmentMemoryFiltered": 0
                    });
                    continue;
                }
                const alignmentFrequencyCorpus = cIndex.permutations.alignmentFrequency.read(p.alignment.lemmaKey);
                const alignmentFrequencyAlignmentMemory = saIndex.alignmentFrequency.read(p.alignment.lemmaKey);
                // TODO: instead of generating filters of alignmentFrequencyCorpus etc
                // we want to generate filtered ngramFrequencyCorpusSource and ngramFrequencyCorpusTarget
                // see notes in ngram_frequency line 160.
                // alignment frequency in the filtered corpus and alignment memory
                const alignmentFrequencyCorpusFiltered = alignmentFrequencyCorpusSums[p.key];
                const alignmentFrequencyAlignmentMemoryFiltered = alignmentFrequencyAlignmentMemorySums[p.key];
                // source and target frequency ratio for the corpus and alignment memory
                const lemmaFrequencyRatioCorpusFiltered = LemmaNgramFrequency.divideSafe(alignmentFrequencyCorpus, alignmentFrequencyCorpusFiltered);
                const lemmaFrequencyRatioAlignmentMemoryFiltered = LemmaNgramFrequency.divideSafe(alignmentFrequencyAlignmentMemory, alignmentFrequencyAlignmentMemoryFiltered);
                // store scores
                p.setScores({
                    // alignmentFrequencyCorpusFiltered,
                    // alignmentFrequencyAlignmentMemoryFiltered,
                    // TODO: we aren't using these at the moment
                    lemmaFrequencyRatioCorpusFiltered,
                    lemmaFrequencyRatioAlignmentMemoryFiltered
                });
            }
            return predictions;
        }
    }
    exports.default = LemmaNgramFrequency;
    });

    var NgramFrequency_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * This algorithm calculates the frequency of n-gram occurrences.
     */
    class NgramFrequency {
        constructor() {
            this.name = "n-gram frequency";
        }
        /**
         * Performs a numerical addition with the value of a key in a number object.
         * TODO: move this into it's own class?
         *
         * @param {NumberObject} object
         * @param {string} key
         * @param {number} value
         */
        static addObjectNumber(object, key, value) {
            if (!(key in object)) {
                object[key] = 0;
            }
            object[key] += value;
        }
        /**
         * Performs a numerical division.
         * Division by zero will result in 0.
         * TODO: move this into a math utility?
         *
         * @param {number} dividend
         * @param {number} divisor
         * @return {number}
         */
        static divideSafe(dividend, divisor) {
            if (divisor === 0) {
                return 0;
            }
            else {
                return dividend / divisor;
            }
        }
        /**
         * Load data into the predictions
         * @param  predictions [description]
         * @param  cIndex      [description]
         * @param  saIndex     [description]
         * @return             [description]
         */
        execute(predictions, cIndex, saIndex) {
            const alignmentFrequencyCorpusSums = {};
            const alignmentFrequencyAlignmentMemorySums = {};
            for (const p of predictions) {
                // alignment permutation frequency within the corpus/alignment memory
                const alignmentFrequencyCorpus = cIndex.permutations.alignmentFrequency.read(p.alignment);
                const alignmentFrequencyAlignmentMemory = saIndex.alignmentFrequency.read(p.alignment);
                // n-gram permutation frequency within the corpus/alignment memory
                // looked up by n-gram
                // TODO: rename to something like this.
                // const sourceNgramFrequencyInCorpusPermutations
                const ngramFrequencyCorpusSource = cIndex.permutations.sourceNgramFrequency.read(p.source);
                const ngramFrequencyAlignmentMemorySource = saIndex.sourceNgramFrequency.read(p.source);
                const ngramFrequencyCorpusTarget = cIndex.permutations.targetNgramFrequency.read(p.target);
                const ngramFrequencyAlignmentMemoryTarget = saIndex.targetNgramFrequency.read(p.target);
                // permutation frequency ratio
                const sourceCorpusPermutationsFrequencyRatio = NgramFrequency.divideSafe(alignmentFrequencyCorpus, ngramFrequencyCorpusSource);
                const targetCorpusPermutationsFrequencyRatio = NgramFrequency.divideSafe(alignmentFrequencyCorpus, ngramFrequencyCorpusTarget);
                const sourceAlignmentMemoryFrequencyRatio = NgramFrequency.divideSafe(alignmentFrequencyAlignmentMemory, ngramFrequencyAlignmentMemorySource);
                const targetAlignmentMemoryFrequencyRatio = NgramFrequency.divideSafe(alignmentFrequencyAlignmentMemory, ngramFrequencyAlignmentMemoryTarget);
                // store scores
                p.setScores({
                    sourceCorpusPermutationsFrequencyRatio,
                    targetCorpusPermutationsFrequencyRatio,
                    sourceAlignmentMemoryFrequencyRatio,
                    targetAlignmentMemoryFrequencyRatio
                });
                // sum alignment frequencies
                NgramFrequency.addObjectNumber(alignmentFrequencyCorpusSums, p.key, alignmentFrequencyCorpus);
                NgramFrequency.addObjectNumber(alignmentFrequencyAlignmentMemorySums, p.key, alignmentFrequencyAlignmentMemory);
            }
            // calculate filtered frequency ratios
            for (const p of predictions) {
                const alignmentFrequencyCorpus = cIndex.permutations.alignmentFrequency.read(p.alignment);
                const alignmentFrequencyAlignmentMemory = saIndex.alignmentFrequency.read(p.alignment);
                // TODO: instead of generating filters of alignmentFrequencyCorpus etc
                // we want to generate filtered ngramFrequencyCorpusSource and ngramFrequencyCorpusTarget
                // see notes in ngram_frequency line 160.
                // alignment frequency in the filtered corpus and alignment memory
                const alignmentFrequencyCorpusFiltered = alignmentFrequencyCorpusSums[p.key];
                const alignmentFrequencyAlignmentMemoryFiltered = alignmentFrequencyAlignmentMemorySums[p.key];
                // source and target frequency ratio for the corpus and alignment memory
                const frequencyRatioCorpusFiltered = NgramFrequency.divideSafe(alignmentFrequencyCorpus, alignmentFrequencyCorpusFiltered);
                const frequencyRatioAlignmentMemoryFiltered = NgramFrequency.divideSafe(alignmentFrequencyAlignmentMemory, alignmentFrequencyAlignmentMemoryFiltered);
                // store scores
                p.setScores({
                    // alignmentFrequencyCorpusFiltered,
                    // alignmentFrequencyAlignmentMemoryFiltered,
                    // TODO: we aren't using these at the moment
                    frequencyRatioCorpusFiltered,
                    frequencyRatioAlignmentMemoryFiltered
                });
            }
            return predictions;
        }
    }
    exports.default = NgramFrequency;
    });

    var NgramLength_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    class NgramLength {
        constructor() {
            this.name = "n-gram length";
        }
        execute(predictions) {
            for (const p of predictions) {
                let weight = 0;
                // TRICKY: do not score null alignments
                if (!p.target.isNull()) {
                    // sentence lengths
                    const sourceSentenceLength = p.source.sentenceTokenLength;
                    const targetSentenceLength = p.target.sentenceTokenLength;
                    // n-gram lengths
                    const sourceLength = p.source.tokenLength;
                    const targetLength = p.target.tokenLength;
                    const primaryLengthRatio = sourceLength / sourceSentenceLength;
                    const secondaryLengthRatio = targetLength / targetSentenceLength;
                    // length affinity
                    const delta = Math.abs(primaryLengthRatio - secondaryLengthRatio);
                    // TRICKY: the power of 5 improves the curve
                    weight = Math.pow(1 - delta, 5);
                }
                p.setScore("ngramLength", weight);
            }
            return predictions;
        }
    }
    exports.default = NgramLength;
    });

    var PhrasePlausibility_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Determines the likely hood that an n-gram is a phrase.
     */
    class PhrasePlausibility {
        constructor() {
            this.name = "phrase plausibility";
        }
        /**
         * Calculates the plausibility
         * @param sourceNgram - The source n-gram
         * @param targetNgram - The target n-gram
         * @param sourceNgramFrequency - The source n-gram frequency in the corpus
         * @param targetNgramFrequency - The target n-gram frequency in the corpus
         * @param sourceTokenLength - length of the source text in units of {@link Token}
         * @param targetTokenLength - length of the target text in units of {@link Token}
         */
        static calc(sourceNgram, targetNgram, sourceNgramFrequency, targetNgramFrequency, sourceTokenLength, targetTokenLength) {
            // TRICKY: let null n-grams be common
            if (targetNgram.isNull()) {
                return 1;
            }
            let weight = 0;
            // TODO: this is similar to uniqueness. I want a high uniqueness value (meaning it is not unique) and high similarity (meaning they both have similar occurrence)
            if (sourceNgramFrequency > 0 && targetNgramFrequency > 0) {
                const sourcePlausibility = sourceNgramFrequency / sourceTokenLength;
                const targetPlausibility = targetNgramFrequency / targetTokenLength;
                weight = Math.min(sourcePlausibility, targetPlausibility) /
                    Math.max(sourcePlausibility, targetPlausibility);
                // TODO: double check the above change with Klappy
                // let x = 1 - 1 / sourceNgramFrequency;
                // let y = 1 - 1 / targetNgramFrequency;
                // // TRICKY: uni-grams are always phrases
                // if (sourceNgram.isUnigram()) {
                //   x = 1;
                // }
                // if (targetNgram.isUnigram()) {
                //   y = 1;
                // }
                //
                // weight = Math.min(x, y);
            }
            return weight;
        }
        /**
         * Calculates phrase plausibility based on the word
         * @param p
         * @param cIndex
         */
        static calcPlausibility(p, cIndex) {
            const sourceFrequency = cIndex.static.sourceNgramFrequency.read(p.source);
            const targetFrequency = cIndex.static.targetNgramFrequency.read(p.target);
            const weight = PhrasePlausibility.calc(p.source, p.target, sourceFrequency, targetFrequency, cIndex.static.sourceTokenLength, cIndex.static.targetTokenLength);
            p.setScore("phrasePlausibility", weight);
        }
        /**
         * Calculates phrase plausibility based on the lemma
         * @param p
         * @param cIndex
         */
        static calcLemmaPlausibility(p, cIndex) {
            if (p.source.lemmaKey !== undefined && p.target.lemmaKey !== undefined) {
                const sourceFrequency = cIndex.static.sourceNgramFrequency.read(p.source.lemmaKey);
                const targetFrequency = cIndex.static.targetNgramFrequency.read(p.target.lemmaKey);
                const weight = PhrasePlausibility.calc(p.source, p.target, sourceFrequency, targetFrequency, cIndex.static.sourceTokenLength, cIndex.static.targetTokenLength);
                p.setScore("lemmaPhrasePlausibility", weight);
            }
            else {
                p.setScore("lemmaPhrasePlausibility", 0);
            }
        }
        execute(predictions, cIndex) {
            for (const p of predictions) {
                PhrasePlausibility.calcPlausibility(p, cIndex);
                PhrasePlausibility.calcLemmaPlausibility(p, cIndex);
            }
            return predictions;
        }
    }
    exports.default = PhrasePlausibility;
    });

    var Uniqueness_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Determines the likely hood that an n-gram is a phrase.
     */
    class Uniqueness {
        constructor() {
            this.name = "uniqueness";
        }
        /**
         * Performs the uniqueness calculation.
         * This is the pure algorithm code.
         * @param sourceNgramFrequency - source n-gram frequency in the static corpus
         * @param targetNgramFrequency - target n-gram frequency in the static corpus
         * @param sourceTokenLength - length of the source text in units of {@link Token}
         * @param targetTokenLength - length of the target text in units of {@link Token}
         * @param phrasePlausibility - the likely hood that the n-gram is a phrase. Produced by {@link PhrasePlausibility}
         */
        static calc(sourceNgramFrequency, targetNgramFrequency, sourceTokenLength, targetTokenLength, phrasePlausibility) {
            let weight = 0;
            if (sourceTokenLength !== 0 && targetTokenLength !== 0) {
                // lower is better
                const sourceUniqueness = sourceNgramFrequency / sourceTokenLength;
                const targetUniqueness = targetNgramFrequency / targetTokenLength;
                // higher is better
                weight = Math.min(sourceUniqueness, targetUniqueness) /
                    Math.max(sourceUniqueness, targetUniqueness);
                // TODO: if similarity is high and uniqueness is low we want to give a low score.
            }
            return weight * phrasePlausibility;
        }
        /**
         * Calculates the uniqueness of the n-gram
         * @param p
         * @param cIndex
         */
        static calcUniqueness(p, cIndex) {
            const sourceNgramStaticCorpusFrequency = cIndex.static.sourceNgramFrequency.read(p.source);
            const targetNgramStaticCorpusFrequency = cIndex.static.targetNgramFrequency.read(p.target);
            const weight = Uniqueness.calc(sourceNgramStaticCorpusFrequency, targetNgramStaticCorpusFrequency, cIndex.static.sourceTokenLength, cIndex.static.targetTokenLength, p.getScore("phrasePlausibility"));
            p.setScore("uniqueness", weight);
        }
        /**
         * Calculates the uniqueness of the n-gram based on the lemma
         * @param p
         * @param cIndex
         */
        static calcLemmaUniqueness(p, cIndex) {
            if (p.source.lemmaKey !== undefined && p.target.lemmaKey !== undefined) {
                const sourceNgramStaticCorpusLemmaFrequency = cIndex.static.sourceNgramFrequency.read(p.source.lemmaKey);
                const targetNgramStaticCorpusLemmaFrequency = cIndex.static.targetNgramFrequency.read(p.target.lemmaKey);
                const lemmaWeight = Uniqueness.calc(sourceNgramStaticCorpusLemmaFrequency, targetNgramStaticCorpusLemmaFrequency, cIndex.static.sourceTokenLength, cIndex.static.targetTokenLength, p.getScore("lemmaPhrasePlausibility"));
                p.setScore("lemmaUniqueness", lemmaWeight);
            }
            else {
                p.setScore("lemmaUniqueness", 0);
            }
        }
        execute(predictions, cIndex) {
            for (const p of predictions) {
                Uniqueness.calcUniqueness(p, cIndex);
                Uniqueness.calcLemmaUniqueness(p, cIndex);
            }
            return predictions;
        }
    }
    exports.default = Uniqueness;
    });

    var FrequencyIndex_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * An index of frequencies
     */
    class FrequencyIndex {
        constructor() {
            this.index = new Map();
        }
        /**
         * Reads a value from the index.
         * If the key does not exist the result will be 0.
         * @param {string} key
         */
        readIndex(key) {
            const val = this.index.get(key);
            if (val !== undefined) {
                return val;
            }
            else {
                return 0;
            }
        }
        /**
         * Adds a number to the key's value.
         * If no number is given the default amount will be added to the value.
         * @param key
         * @param value - optional value to add
         */
        incrementIndex(key, value = 1) {
            const originalValue = this.readIndex(key);
            this.index.set(key, originalValue + value);
        }
        /**
         * Manually writes a value to the index
         * @deprecated use {@link incrementIndex} instead.
         * @param {string} key
         * @param {number} value
         */
        writeIndex(key, value) {
            this.index.set(key, value);
        }
    }
    exports.default = FrequencyIndex;
    });

    var AlignmentIndex_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    /**
     * An index of alignment frequencies
     */
    class AlignmentIndex extends FrequencyIndex_1.default {
        /**
         * Reads a value from the index
         * @param alignment - the alignment index to read. This may be a specific key, or the alignment object to read the default key.
         */
        read(alignment) {
            if (typeof alignment === "string") {
                return this.readIndex(alignment);
            }
            else {
                return this.readIndex(alignment.key);
            }
        }
        /**
         * Writes a value to the index
         * @deprecated - use {@link increment} instead
         * @param {Alignment} alignment
         * @param {number} value
         */
        write(alignment, value) {
            this.writeIndex(alignment.key, value);
        }
        /**
         * Increments a value in the index
         * @param {Alignment} alignment
         * @param {number} value
         */
        increment(alignment, value = 1) {
            this.incrementIndex(alignment.key, value);
            if (alignment.lemmaKey !== undefined) {
                this.incrementIndex(alignment.lemmaKey, value);
            }
        }
    }
    exports.default = AlignmentIndex;
    });

    var NgramIndex_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    /**
     * An index of n-gram frequencies
     */
    class NgramIndex extends FrequencyIndex_1.default {
        /**
         * Reads a value from the index
         * @param ngram - the n-gram index to read. This may be a specific key, or the ngram object to read the default key.
         */
        read(ngram) {
            if (typeof ngram === "string") {
                return this.readIndex(ngram);
            }
            else {
                return this.readIndex(ngram.key);
            }
        }
        /**
         * Writes a value to the index
         * @deprecated - use {@link increment} instead
         * @param {Ngram} ngram - the n-gram index to write
         * @param {number} value
         */
        write(ngram, value) {
            this.writeIndex(ngram.key, value);
        }
        /**
         * Increments the n-gram frequency.
         * This will increment all of the important keys in the n-gram such as
         * the words in question, lemma, etc.
         * @param {Ngram} ngram - the n-gram index to add
         * @param {number} value
         */
        increment(ngram, value = 1) {
            this.incrementIndex(ngram.key, value);
            if (ngram.lemmaKey !== undefined) {
                this.incrementIndex(ngram.lemmaKey, value);
            }
        }
    }
    exports.default = NgramIndex;
    });

    var PermutationIndex_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });


    /**
     * A collection of indexes on the permutation of possible alignments.
     */
    class PermutationIndex {
        /**
         * Returns an index of alignment frequencies in the permutations
         */
        get alignmentFrequency() {
            return this.alignPermFreqIndex;
        }
        /**
         * Returns an index of source n-gram frequencies in the permutations
         * @return {NgramIndex}
         */
        get sourceNgramFrequency() {
            return this.srcNgramPermFreqIndex;
        }
        /**
         * Returns an index of target n-gram frequencies in the permutations
         * @return {NgramIndex}
         */
        get targetNgramFrequency() {
            return this.tgtNgramPermFreqIndex;
        }
        constructor() {
            this.alignPermFreqIndex = new AlignmentIndex_1.default();
            this.srcNgramPermFreqIndex = new NgramIndex_1.default();
            this.tgtNgramPermFreqIndex = new NgramIndex_1.default();
        }
        /**
         * Adds a sentence alignment to the index.
         * @param {Alignment[]} alignments - an array of alignments to add
         */
        addAlignments(alignments) {
            for (let i = 0, len = alignments.length; i < len; i++) {
                this.addAlignment(alignments[i]);
            }
        }
        /**
         * Adds a single alignment to the index
         * @param alignment
         */
        addAlignment(alignment) {
            // alignment frequency in permutations
            this.alignPermFreqIndex.increment(alignment);
            // n-gram frequency in permutations
            this.srcNgramPermFreqIndex.increment(alignment.sourceNgram);
            this.tgtNgramPermFreqIndex.increment(alignment.targetNgram);
        }
    }
    exports.default = PermutationIndex;
    });

    var AlignmentMemoryIndex_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    /**
     * A collection of indexes for the alignment memory
     */
    class AlignmentMemoryIndex {
        get alignmentFrequency() {
            return this.permutationIndex.alignmentFrequency;
        }
        get sourceNgramFrequency() {
            return this.permutationIndex.sourceNgramFrequency;
        }
        get targetNgramFrequency() {
            return this.permutationIndex.targetNgramFrequency;
        }
        constructor() {
            this.permutationIndex = new PermutationIndex_1.default();
        }
        append(alignmentMemory) {
            this.permutationIndex.addAlignments(alignmentMemory);
        }
    }
    exports.default = AlignmentMemoryIndex;
    });

    var Alignment_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Represents two individual n-grams that have been matched from two texts.
     * e.g. from a primary text and secondary text.
     */
    class Alignment {
        /**
         * Returns the n-gram from the source text.
         * @deprecated Consider using {@link sourceNgram} instead since getters have a performance hit.
         * @return {Ngram}
         */
        get source() {
            return this.sourceNgram;
        }
        /**
         * Returns the n-gram from the target text
         * @deprecated Consider using {@link targetNgram} instead since getters have a performance hit.
         * @return {Ngram}
         */
        get target() {
            return this.targetNgram;
        }
        /**
         * Returns the alignment key.
         * TODO: would a regular function be faster?
         * @return {string}
         */
        get key() {
            this.cacheKeys();
            return this.cachedKey;
        }
        /**
         * Returns the alignment lemma-based key
         */
        get lemmaKey() {
            this.cacheKeys();
            return this.cachedLemmaKey;
        }
        /**
         * Instantiates a new alignment
         * @param {Ngram} sourceNgram - an n-gram from the source text
         * @param {Ngram} targetNgram - an n-gram from the secondary text
         */
        constructor(sourceNgram, targetNgram) {
            this.sourceNgram = sourceNgram;
            this.targetNgram = targetNgram;
        }
        /**
         * Outputs the alignment to json
         * @param verbose - print full metadata
         * @return {object}
         */
        toJSON(verbose = false) {
            return {
                sourceNgram: this.sourceNgram.toJSON(verbose),
                targetNgram: this.targetNgram.toJSON(verbose)
            };
        }
        /**
         * Caches the keys if they have not already been generated
         */
        cacheKeys() {
            if (this.cachedKey === undefined) {
                this.cachedKey = `${this.sourceNgram.key}->${this.targetNgram.key}`;
                // TRICKY: the alignment supports lemma fallback if either language has lemma
                const sourceHasLemma = this.sourceNgram.lemmaKey !== undefined;
                const targetHasLemma = this.targetNgram.lemmaKey !== undefined;
                if (sourceHasLemma || targetHasLemma) {
                    const sourceLemma = sourceHasLemma ?
                        this.sourceNgram.lemmaKey :
                        this.sourceNgram.key;
                    const targetLemma = targetHasLemma ?
                        this.targetNgram.lemmaKey :
                        this.targetNgram.key;
                    this.cachedLemmaKey = `${sourceLemma}->${targetLemma}`;
                }
            }
        }
    }
    exports.default = Alignment;
    });

    var Ngram_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Represents a set of zero or more tokens from a text.
     */
    class Ngram {
        /**
         * Returns the length of the n-gram in {@link Token}'s
         * @return {number}
         */
        get tokenLength() {
            return this.tokens.length;
        }
        /**
         * Returns the length of the n-gram in characters.
         * This does not account for whitespace.
         * @return {number}
         */
        get characterLength() {
            let length = 0;
            for (let i = 0, len = this.tokens.length; i < len; i++) {
                length += this.tokens[i].toString().length;
            }
            return length;
        }
        /**
         * Returns the position (in units of {@link Token} ) at which this n-gram appears in the sentence.
         * @return {number} - the position
         */
        get tokenPosition() {
            if (this.tokens.length) {
                return this.tokens[0].position;
            }
            else {
                return 0;
            }
        }
        /**
         * Returns the length of the sentence (in units of {@link Token}) in which this n-gram occurs.
         * @return {number}
         */
        get sentenceTokenLength() {
            if (this.tokens.length) {
                return this.tokens[0].sentenceTokenLength;
            }
            else {
                return 0;
            }
        }
        /**
         * Returns the length of the sentence (in units of character) in which this n-gram occurs.
         * This includes whitespace in the sentence
         * @return {number}
         */
        get sentenceCharacterLength() {
            if (this.tokens.length) {
                return this.tokens[0].sentenceCharacterLength;
            }
            else {
                return 0;
            }
        }
        /**
         * Returns the position (in units of character) at which this n-gram appears in the sentence.
         * @return {number} - the position
         */
        get characterPosition() {
            if (this.tokens.length) {
                return this.tokens[0].charPosition;
            }
            else {
                return 0;
            }
        }
        /**
         * Returns the n-gram key
         */
        get key() {
            this.cacheKeys();
            return this.cachedKey;
        }
        /**
         * Returns the n-gram lemma-based key
         */
        get lemmaKey() {
            this.cacheKeys();
            return this.cachedLemmaKey;
        }
        /**
         * @param {Array<Token>} [tokens=[]] - a list of tokens of which this n-gram is composed
         */
        constructor(tokens = []) {
            this.tokens = tokens;
        }
        /**
         * Checks if this n-gram contains one token
         * @return {boolean}
         */
        isUnigram() {
            return this.tokens.length === 1;
        }
        /**
         * Checks if this n-gram contains two tokens
         * @return {boolean}
         */
        isBigram() {
            return this.tokens.length === 2;
        }
        /**
         * Checks if this n-gram contains three tokens
         * @return {boolean}
         */
        isTrigram() {
            return this.tokens.length === 3;
        }
        /**
         * Checks if this n-grams is an empty placeholder
         * @return {boolean}
         */
        isNull() {
            return this.tokens.length === 0;
        }
        /**
         * Returns the tokens in this n-gram
         * @return {Token[]}
         */
        getTokens() {
            return this.tokens;
        }
        /**
         * Returns a human readable form of the n-gram
         * @return {string}
         */
        toString() {
            return this.key;
        }
        /**
         * Outputs the n-gram to json
         * @param verbose - print full metadata
         * @return {object}
         */
        toJSON(verbose = false) {
            const json = [];
            for (let i = 0, len = this.tokens.length; i < len; i++) {
                json.push(this.tokens[i].toJSON(verbose));
            }
            return json;
        }
        /**
         * Checks if two n-grams are equal
         * @param {Ngram} ngram
         * @return {boolean}
         */
        equals(ngram) {
            if (this.tokens.length === ngram.tokens.length) {
                // check if tokens are equal
                for (let i = 0, len = this.tokens.length; i < len; i++) {
                    if (!this.tokens[i].equals(ngram.tokens[i])) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
        /**
         * Checks if two n-grams look the same
         * @param {Ngram} ngram
         * @return {boolean}
         */
        looksLike(ngram) {
            if (this.tokens.length === ngram.tokens.length) {
                // check if tokens are equal
                for (let i = 0, len = this.tokens.length; i < len; i++) {
                    if (!this.tokens[i].looksLike(ngram.tokens[i])) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
        /**
         * Caches the keys if they have not already been generated
         */
        cacheKeys() {
            if (this.cachedKey === undefined) {
                let defaultKey = "n:";
                let lemmaKey = "n:";
                let missingLemma = false;
                const numTokens = this.tokens.length;
                for (let i = 0; i < numTokens; i++) {
                    const token = this.tokens[i];
                    defaultKey += token.toString() + ":";
                    // TRICKY: lemma is not always available
                    const lemma = token.lemma;
                    if (lemma !== "") {
                        lemmaKey += lemma + ":";
                    }
                    else {
                        missingLemma = true;
                    }
                }
                if (numTokens > 0) {
                    this.cachedKey = defaultKey.slice(0, -1).toLowerCase();
                }
                else {
                    this.cachedKey = defaultKey;
                }
                // TRICKY: all tokens must have a lemma
                if (lemmaKey.length > 0 && !missingLemma) {
                    this.cachedLemmaKey = lemmaKey.slice(0, -1).toLowerCase();
                }
            }
        }
    }
    exports.default = Ngram;
    });

    var Parser_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });


    /**
     * A collection of parsing functions
     */
    class Parser {
        /**
         * Returns an array of n-grams of a particular size from a sentence
         * @param {Array<Token>} sentence - the sentence from which n-grams will be read
         * @param {number} ngramLength - the length of each n-gram.
         * @returns {Array<Ngram>}
         */
        static sizedNgrams(sentence, ngramLength) {
            const ngrams = [];
            const sentenceLength = sentence.length;
            for (let pos = 0; pos < sentenceLength; pos++) {
                const end = pos + ngramLength;
                if (end > sentenceLength) {
                    break;
                }
                const ngram = new Ngram_1.default(sentence.slice(pos, end));
                ngrams.push(ngram);
            }
            return ngrams;
        }
        /**
         * Generates an array of all possible contiguous n-grams within the sentence.
         * @param {Array<Token>} sentence - the tokens in a sentence
         * @param {number} [maxNgramLength=3] - the maximum n-gram size to generate
         * @returns {any[]}
         */
        static ngrams(sentence, maxNgramLength = 3) {
            if (maxNgramLength < 0) {
                throw new RangeError(`Maximum n-gram size cannot be less than 0. Received ${maxNgramLength}`);
            }
            const ngrams = [];
            const maxLength = Math.min(maxNgramLength, sentence.length);
            for (let ngramLength = 1; ngramLength <= maxLength; ngramLength++) {
                ngrams.push.apply(ngrams, Parser.sizedNgrams(sentence, ngramLength));
            }
            return ngrams;
        }
        /**
         * Generates an array of all possible alignments between two sets of n-grams
         * @deprecated used {@link indexAlignmentPermutations} instead (it's faster).
         * @param {Ngram[]} sourceNgrams - every possible n-gram in the source text
         * @param {Ngram[]} targetNgrams - every possible n-gram in the target text
         * @return {Alignment[]}
         */
        static alignments(sourceNgrams, targetNgrams) {
            const alignments = [];
            for (const source of sourceNgrams) {
                for (const target of targetNgrams) {
                    alignments.push(new Alignment_1.default(source, target));
                }
                // TRICKY: include empty match alignment
                alignments.push(new Alignment_1.default(source, new Ngram_1.default()));
            }
            return alignments;
        }
        /**
         * Indexes all possible alignment permutations between two sets of n-grams
         * @param {Ngram[]} sourceNgrams - every possible n-gram in the source text
         * @param {Ngram[]} targetNgrams - every possible n-gram in the target text
         * @param {PermutationIndex} index - the index that will receive the permutations
         */
        static indexAlignmentPermutations(sourceNgrams, targetNgrams, index) {
            const tlen = targetNgrams.length;
            for (let s = 0, slen = sourceNgrams.length; s < slen; s++) {
                const sourceNgram = sourceNgrams[s];
                for (let t = 0; t < tlen; t++) {
                    index.addAlignment(new Alignment_1.default(sourceNgram, targetNgrams[t]));
                }
                // TRICKY: include empty match alignment
                index.addAlignment(new Alignment_1.default(sourceNgram, new Ngram_1.default()));
            }
        }
    }
    exports.default = Parser;
    });

    var StaticIndex_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    /**
     * A collection of indexes on the static content.
     * TODO: maybe I should split this into sentences as well.
     * e.g. a source SentenceIndex and a target SentenceIndex
     * Then we could reuse it in other places such as word-mt.
     */
    class StaticIndex {
        /**
         * Returns an index of source n-gram frequencies in the corpus
         * @return {NgramIndex}
         */
        get sourceNgramFrequency() {
            return this.srcNgramFreqIndex;
        }
        /**
         * Returns an index of target n-gram frequencies in the corpus
         * @return {NgramIndex}
         */
        get targetNgramFrequency() {
            return this.tgtNgramFreqIndex;
        }
        /**
         * Returns the {@link Token} length of the entire source
         * @return {number}
         */
        get sourceTokenLength() {
            return this.srcTokenLength;
        }
        /**
         * Returns the {@link Token} length of the entire target
         * @return {number}
         */
        get targetTokenLength() {
            return this.tgtTokenLength;
        }
        /**
         * Returns the character length of the entire source
         * @return {number}
         */
        get sourceCharacterLength() {
            return this.srcCharLength;
        }
        /**
         * Returns the character length of the entire target
         * @return {number}
         */
        get targetCharLength() {
            return this.tgtCharLength;
        }
        constructor() {
            this.srcNgramFreqIndex = new NgramIndex_1.default();
            this.tgtNgramFreqIndex = new NgramIndex_1.default();
            this.srcTokenLength = 0;
            this.tgtTokenLength = 0;
            this.srcCharLength = 0;
            this.tgtCharLength = 0;
        }
        /**
         * Adds a sentence to the index.
         * The tokens in these n-grams must be measured for accurate positional metrics.
         * The n-grams are passed as arguments instead of being generated internally to reduce
         * duplicating work.
         *
         * @param sourceTokens - the source sentence tokens
         * @param targetTokens - the target sentence tokens
         * @param sourceNgrams - the source sentence n-grams
         * @param targetNgrams - the target sentence n-grams
         */
        addSentence(sourceTokens, targetTokens, sourceNgrams, targetNgrams) {
            // token length
            this.srcTokenLength += sourceTokens.length;
            this.tgtTokenLength += targetTokens.length;
            // character length
            for (let i = 0, len = sourceTokens.length; i < len; i++) {
                this.srcCharLength += sourceTokens[i].toString().length;
            }
            for (let i = 0, len = targetTokens.length; i < len; i++) {
                this.tgtCharLength += targetTokens[i].toString().length;
            }
            // n-gram frequency
            for (let i = 0, len = sourceNgrams.length; i < len; i++) {
                this.srcNgramFreqIndex.increment(sourceNgrams[i]);
            }
            for (let i = 0, len = targetNgrams.length; i < len; i++) {
                this.tgtNgramFreqIndex.increment(targetNgrams[i]);
            }
        }
    }
    exports.default = StaticIndex;
    });

    var CorpusIndex_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });



    /**
     * A collection of indexes for the corpus.
     */
    class CorpusIndex {
        /**
         * Returns an index of permutation metrics.
         */
        get permutations() {
            return this.permutationIndex;
        }
        /**
         * Returns an index of static metrics.
         */
        get static() {
            return this.staticIndex;
        }
        constructor() {
            this.permutationIndex = new PermutationIndex_1.default();
            this.staticIndex = new StaticIndex_1.default();
        }
        /**
         * Appends sentences to the index.
         * The tokens must contain positional metrics for better accuracy.
         *
         * @param {Token[][]} source
         * @param {Token[][]} target
         */
        append(source, target) {
            const sourceLength = source.length;
            if (sourceLength !== target.length) {
                throw Error("source and target corpus must be the same length");
            }
            else {
                for (let i = 0; i < sourceLength; i++) {
                    const sourceToken = source[i];
                    const targetToken = target[i];
                    const sourceNgrams = Parser_1.default.ngrams(sourceToken);
                    const targetNgrams = Parser_1.default.ngrams(targetToken);
                    // index static metrics
                    this.staticIndex.addSentence(sourceToken, targetToken, sourceNgrams, targetNgrams);
                    // index permutation metrics
                    Parser_1.default.indexAlignmentPermutations(sourceNgrams, targetNgrams, this.permutationIndex);
                }
            }
        }
    }
    exports.default = CorpusIndex;
    });

    var UnalignedSentenceIndex = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    /**
     * a collection of indexes for the unaligned sentence pair.
     * The underlying index is the {@link CorpusIndex}.
     * @type {UnalignedSentenceIndex}
     */
    exports.default = CorpusIndex_1.default;
    });

    var Prediction_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Represents a single alignment prediction
     */
    class Prediction {
        /**
         * Returns an array of score keys
         * @return {string[]}
         */
        get scoreKeys() {
            return Object.keys(this.scores);
        }
        /**
         * Returns the alignment represented by this prediction
         * @return {Alignment}
         */
        get alignment() {
            return this.predictedAlignment;
        }
        /**
         * Convenience method to access the source n-gram of the alignment
         * @return {Ngram}
         */
        get source() {
            return this.predictedAlignment.sourceNgram;
        }
        /**
         * Convenience method to access the target n-gram of the alignment.
         * @return {Ngram}
         */
        get target() {
            return this.predictedAlignment.targetNgram;
        }
        /**
         * Convenience method for retrieving the prediction confidence.
         * @return {number}
         */
        get confidence() {
            return this.getScore("confidence");
        }
        /**
         * Returns the prediction key
         * @return {string}
         */
        get key() {
            return this.predictedAlignment.key;
        }
        /**
         * Instantiates a new alignment prediction
         * @param {Alignment} alignment - the alignment for which a prediction will be calculated
         */
        constructor(alignment) {
            this.scores = {};
            this.predictedAlignment = alignment;
        }
        /**
         * Sets a score for this prediction
         * @param {string} key - the score key
         * @param {number} value - the score value
         */
        setScore(key, value) {
            if (key in this.scores) {
                throw new Error(`Score key "${key}" already exists. Scores can only be written once.`);
            }
            else {
                this.scores[key] = value;
            }
        }
        /**
         * Convenience method for setting multiple scores at a time
         * @param {NumberObject} scores - an object of scores
         */
        setScores(scores) {
            const keys = Object.keys(scores);
            for (const key of keys) {
                this.setScore(key, scores[key]);
            }
        }
        /**
         * Reads a single score from this prediction.
         * @param {string} key - the score key
         * @return {number} - the score value
         */
        getScore(key) {
            if (key in this.scores) {
                return this.scores[key];
            }
            else {
                throw new Error(`Unknown score key ${key}`);
            }
        }
        /**
         * Checks if the score key exists.
         * @param key
         */
        hasScore(key) {
            return key in this.scores;
        }
        /**
         * Returns a copy of the prediction scores
         * @return {NumberObject}
         */
        getScores() {
            return Object.assign({}, this.scores);
        }
        /**
         * Checks if this prediction intersects with another prediction.
         * @param {Prediction} prediction
         * @return {boolean}
         */
        intersects(prediction) {
            const predictionSourceTokens = prediction.source.getTokens();
            const predictionTargetTokens = prediction.target.getTokens();
            const sourceTokens = this.source.getTokens();
            const targetTokens = this.target.getTokens();
            // check source tokens
            for (const t of sourceTokens) {
                for (const pt of predictionSourceTokens) {
                    if (t.equals(pt)) {
                        return true;
                    }
                }
            }
            // check target tokens
            for (const t of targetTokens) {
                for (const pt of predictionTargetTokens) {
                    if (t.equals(pt)) {
                        return true;
                    }
                }
            }
            return false;
        }
        /**
         * Prints a user friendly form of the prediction
         * @return {string}
         */
        toString() {
            const confidence = this.confidence.toString().substring(0, 4);
            return `${confidence}|${this.alignment.key}`;
        }
        /**
         * Outputs the prediction to json
         * @param verbose - print full metadata.
         * @return {object}
         */
        toJSON(verbose = false) {
            return {
                confidence: this.confidence,
                sourceNgram: this.source.toJSON(verbose),
                targetNgram: this.target.toJSON(verbose)
            };
        }
    }
    exports.default = Prediction;
    });

    var math = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * If the denominator is 0 the output will be 0 otherwise normal division occurs.
     * @param {number} numerator
     * @param {number} denominator
     * @return {number}
     */
    function divide(numerator, denominator) {
        if (denominator === 0) {
            return 0;
        }
        else {
            return numerator / denominator;
        }
    }
    exports.divide = divide;
    /**
     * The "median" is the "middle" value in the list of numbers.
     *
     * @param {number[]} numbers - an array of numbers
     * @return {number} - the calculated median value from the specified numbers
     */
    function median(numbers) {
        let medianVal = 0;
        const numsLen = numbers.length;
        numbers.sort();
        if (numsLen === 0) {
            medianVal = 0;
        }
        else if (numsLen % 2 === 0) {
            // average of two middle numbers
            medianVal = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
        }
        else {
            // middle number only
            medianVal = numbers[(numsLen - 1) / 2];
        }
        return medianVal;
    }
    exports.median = median;
    });

    var Suggestion_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    /**
     * A translation suggestion
     */
    class Suggestion {
        /**
         * Sorts predictions by token position
         * @param {Prediction[]} predictions - the predictions to sort
         * @return {Prediction[]}
         */
        static sortPredictions(predictions) {
            return predictions.sort((a, b) => {
                const aPos = a.source.tokenPosition;
                const bPos = b.source.tokenPosition;
                if (aPos < bPos) {
                    return -1;
                }
                if (aPos > bPos) {
                    return 1;
                }
                return 0;
            });
        }
        constructor() {
            this.predictions = [];
        }
        /**
         * Adds a prediction to the suggestion.
         * @param {Prediction} prediction
         */
        addPrediction(prediction) {
            this.predictions.push(prediction);
            this.predictions = Suggestion.sortPredictions(this.predictions);
        }
        getPredictions() {
            return this.predictions;
        }
        /**
         * Returns the compounded confidence score of all predictions within the suggestion.
         * @return {number}
         */
        compoundConfidence() {
            const confidenceNumbers = [];
            for (const p of this.predictions) {
                const c = p.getScore("confidence");
                confidenceNumbers.push(c);
            }
            return math.median(confidenceNumbers);
        }
        /**
         * Prints a user friendly form of the suggestion
         */
        toString() {
            const result = [];
            for (const p of this.predictions) {
                result.push(`[${p.toString()}]`);
            }
            if (result.length) {
                const confidence = this.compoundConfidence().toString().substring(0, 8);
                return `${confidence} ${result.join(" ")}`;
            }
            else {
                return "0 []";
            }
        }
        /**
         * Outputs the alignment predictions to json
         * @param verbose - print full metadata
         * @return {object}
         */
        toJSON(verbose = false) {
            const json = [];
            for (const p of this.predictions) {
                json.push(p.toJSON(verbose));
            }
            return {
                compoundConfidence: this.compoundConfidence(),
                source: {
                    text: "",
                    tokens: [],
                    contextId: ""
                },
                target: {
                    text: "",
                    tokens: [],
                    contextId: ""
                },
                alignments: json
            };
        }
    }
    exports.default = Suggestion;
    });

    var Engine_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });








    /**
     * Represents a multi-lingual word alignment prediction engine.
     */
    class Engine {
        constructor({ sourceNgramLength = 3, targetNgramLength = 3, nGramWarnings = true } = {
            sourceNgramLength: 3,
            targetNgramLength: 3,
            nGramWarnings: true
        }) {
            this.registeredAlgorithms = [];
            this.maxSourceNgramLength = sourceNgramLength;
            this.maxTargetNgramLength = targetNgramLength;
            this.nGramWarnings = nGramWarnings;
            this.corpusIndex = new CorpusIndex_1.default();
            this.alignmentMemoryIndex = new AlignmentMemoryIndex_1.default();
        }
        /**
         * Generates an array of all possible alignment predictions
         * @param {Ngram[]} sourceNgrams - every possible n-gram in the source text
         * @param {Ngram[]} targetNgrams - every possible n-gram in the target text
         * @return {Prediction[]}
         */
        static generatePredictions(sourceNgrams, targetNgrams) {
            const predictions = [];
            for (const source of sourceNgrams) {
                for (const target of targetNgrams) {
                    predictions.push(new Prediction_1.default(new Alignment_1.default(source, target)));
                }
                // TRICKY: include empty match alignment
                predictions.push(new Prediction_1.default(new Alignment_1.default(source, new Ngram_1.default())));
            }
            return predictions;
        }
        /**
         * Generates an array of all possible contiguous n-grams within the sentence.
         * @param {Array<Token>} sentence - the tokens in a sentence
         * @param {number} [maxNgramLength=3] - the maximum n-gram size to generate
         * @returns {any[]}
         */
        static generateSentenceNgrams(sentence, maxNgramLength = 3) {
            if (maxNgramLength < 0) {
                throw new RangeError(`Maximum n-gram size cannot be less than 0. Received ${maxNgramLength}`);
            }
            const ngrams = [];
            const maxLength = Math.min(maxNgramLength, sentence.length);
            for (let ngramLength = 1; ngramLength <= maxLength; ngramLength++) {
                ngrams.push.apply(ngrams, Engine.readSizedNgrams(sentence, ngramLength));
            }
            return ngrams;
        }
        /**
         * Returns an array of n-grams of a particular size from a sentence
         * @param {Array<Token>} sentence - the sentence from which n-grams will be read
         * @param {number} ngramLength - the length of each n-gram.
         * @returns {Array<Ngram>}
         */
        static readSizedNgrams(sentence, ngramLength) {
            const ngrams = [];
            const sentenceLength = sentence.length;
            for (let pos = 0; pos < sentenceLength; pos++) {
                const end = pos + ngramLength;
                if (end > sentenceLength) {
                    break;
                }
                const ngram = new Ngram_1.default(sentence.slice(pos, end));
                ngrams.push(ngram);
            }
            return ngrams;
        }
        /**
         * Calculates the weighted confidence score of a prediction
         * @param {Prediction} prediction - the prediction to score
         * @param {string[]} scoreKeys - the score keys to include in the calculation
         * @param {NumberObject} weights - the weights to influence the calculation
         * @return {number}
         */
        static calculateWeightedConfidence(prediction, scoreKeys, weights) {
            let weightSum = 0;
            let scoreSum = 0;
            for (const key of scoreKeys) {
                let weight = 1;
                if (key in weights) {
                    weight = weights[key];
                }
                // if (prediction.hasScore(key)) {
                scoreSum += prediction.getScore(key) * weight;
                weightSum += weight;
                // }
            }
            return scoreSum / weightSum;
        }
        /**
         * Scores the predictions and returns a filtered set of suggestions
         * TODO: this should not be done in the engine because we don't know anything about the algorithms here.
         * @param predictions
         * @param saIndex
         */
        static calculateConfidence(predictions, saIndex) {
            const finalPredictions = [];
            const weights = {
                "alignmentPosition": 0.7,
                "sourceNgramLength": 0.2,
                "characterLength": 0.3,
                "alignmentOccurrences": 0.4,
                "lemmaAlignmentOccurrences": 0.4,
                "uniqueness": 0.5,
                "lemmaUniqueness": 0.5,
                "sourceCorpusPermutationsFrequencyRatio": 0.7,
                "sourceCorpusLemmaPermutationsFrequencyRatio": 0.7,
                "targetCorpusPermutationsFrequencyRatio": 0.7,
                "targetCorpusLemmaPermutationsFrequencyRatio": 0.7,
                "sourceAlignmentMemoryFrequencyRatio": 0.7,
                "sourceAlignmentMemoryLemmaFrequencyRatio": 0.7,
                "targetAlignmentMemoryFrequencyRatio": 0.7,
                "targetAlignmentMemoryLemmaFrequencyRatio": 0.7
            };
            for (const p of predictions) {
                let isAlignmentMemory = saIndex.alignmentFrequency.read(p.alignment);
                // TRICKY: fall back to lemma
                if (!isAlignmentMemory && p.alignment.lemmaKey !== undefined) {
                    isAlignmentMemory = saIndex.alignmentFrequency.read(p.alignment.lemmaKey);
                }
                // confidence based on corpus
                const corpusWeightedKeys = [
                    "sourceCorpusPermutationsFrequencyRatio",
                    "sourceCorpusLemmaPermutationsFrequencyRatio",
                    "targetCorpusPermutationsFrequencyRatio",
                    "targetCorpusLemmaPermutationsFrequencyRatio",
                    "alignmentPosition",
                    "ngramLength",
                    "characterLength",
                    "alignmentOccurrences",
                    "lemmaAlignmentOccurrences",
                    "uniqueness",
                    "lemmaUniqueness"
                ];
                const corpusConfidence = Engine.calculateWeightedConfidence(p, corpusWeightedKeys, weights);
                // confidence based on alignment memory
                const alignmentMemoryWeightedKeys = [
                    "sourceAlignmentMemoryFrequencyRatio",
                    "sourceAlignmentMemoryLemmaFrequencyRatio",
                    "targetAlignmentMemoryFrequencyRatio",
                    "targetAlignmentMemoryLemmaFrequencyRatio",
                    "alignmentPosition",
                    "ngramLength",
                    "characterLength",
                    "alignmentOccurrences",
                    "lemmaAlignmentOccurrences",
                    "uniqueness",
                    "lemmaUniqueness"
                ];
                let confidence = Engine.calculateWeightedConfidence(p, alignmentMemoryWeightedKeys, weights);
                // prefer to use the saved alignment confidence
                if (!isAlignmentMemory) {
                    confidence = corpusConfidence;
                    confidence *= p.getScore("phrasePlausibility");
                    // TODO: lemmaPhrasePlausibility
                }
                // boost confidence for alignment memory
                if (isAlignmentMemory) {
                    confidence++;
                }
                p.setScore("confidence", confidence);
                finalPredictions.push(p);
            }
            return finalPredictions;
        }
        /**
         * Returns an array of alignment suggestions
         * @param predictions - the predictions from which to base the suggestion
         * @param maxSuggestions - the maximum number of suggestions to return
         * @return {Suggestion}
         */
        static suggest(predictions, maxSuggestions = 1) {
            const suggestions = [];
            // build suggestions
            for (let i = 0; i < maxSuggestions; i++) {
                if (i >= predictions.length) {
                    break;
                }
                const suggestion = new Suggestion_1.default();
                let filtered = [...predictions];
                // TRICKY: sequentially pick the best starting point in descending order
                const best = filtered.splice(i, 1)[0];
                suggestion.addPrediction(best);
                filtered = filtered.filter((p) => {
                    return !best.intersects(p);
                });
                // fill suggestion
                while (filtered.length) {
                    const nextBest = filtered.shift();
                    if (nextBest === undefined) {
                        break;
                    }
                    suggestion.addPrediction(nextBest);
                    filtered = filtered.filter((p) => {
                        return !nextBest.intersects(p);
                    });
                }
                suggestions.push(suggestion);
            }
            return Engine.sortSuggestions(suggestions);
        }
        /**
         * Sorts an array of suggestions by compound confidence
         * @param {Suggestion[]} suggestions - the suggestions to sort
         * @return {Suggestion[]}
         */
        static sortSuggestions(suggestions) {
            return suggestions.sort((a, b) => {
                const aConfidence = a.compoundConfidence();
                const bConfidence = b.compoundConfidence();
                if (aConfidence < bConfidence) {
                    return 1;
                }
                if (aConfidence > bConfidence) {
                    return -1;
                }
                return 0;
            });
        }
        /**
         * Sorts an array of predictions by confidence
         * @param {Prediction[]} predictions - the predictions to sort
         * @return {Prediction[]}
         */
        static sortPredictions(predictions) {
            return predictions.sort((a, b) => {
                const aConfidence = a.getScore("confidence");
                const bConfidence = b.getScore("confidence");
                if (aConfidence < bConfidence) {
                    return 1;
                }
                if (aConfidence > bConfidence) {
                    return -1;
                }
                return 0;
            });
        }
        /**
         * Returns a list of algorithms that are registered in the engine
         * @return {Array<Algorithm>}
         */
        get algorithms() {
            return this.registeredAlgorithms;
        }
        /**
         * Executes prediction algorithms on the unaligned sentence pair.
         * The sentence tokens should contain positional metrics for better accuracy.
         *
         * @param {Token[]} sourceSentence - the source sentence tokens.
         * @param {Token[]} targetSentence - the target sentence tokens.
         * @param {CorpusIndex} cIndex
         * @param {AlignmentMemoryIndex} saIndex
         * @param {Algorithm[]} algorithms
         * @return {Prediction[]}
         */
        performPrediction(sourceSentence, targetSentence, cIndex, saIndex, algorithms) {
            const sourceNgrams = Parser_1.default.ngrams(sourceSentence, this.maxSourceNgramLength);
            const targetNgrams = Parser_1.default.ngrams(targetSentence, this.maxTargetNgramLength);
            // generate alignment permutations
            let predictions = Engine.generatePredictions(sourceNgrams, targetNgrams);
            const sentenceIndex = new UnalignedSentenceIndex.default();
            sentenceIndex.append([sourceSentence], [targetSentence]);
            for (const algorithm of algorithms) {
                predictions = algorithm.execute(predictions, cIndex, saIndex, sentenceIndex);
            }
            return predictions;
        }
        /**
         * Generates the final confidence scores and sorts the predictions.
         * @param {Prediction[]} predictions
         * @return {Prediction[]}
         */
        score(predictions) {
            const results = Engine.calculateConfidence(predictions, this.alignmentMemoryIndex);
            return Engine.sortPredictions(results);
        }
        /**
         * Adds a new algorithm to the engine.
         * @param {Algorithm} algorithm - the algorithm to run with the engine.
         */
        registerAlgorithm(algorithm) {
            this.registeredAlgorithms.push(algorithm);
        }
        /**
         * Appends new corpus to the engine.
         * @param {[Token[]]} source - an array of tokenized source sentences.
         * @param {[Token[]]} target - an array of tokenized target sentences.
         */
        addCorpus(source, target) {
            this.corpusIndex.append(source, target);
        }
        /**
         * Appends new alignment memory to the engine.
         * Adding alignment memory improves the quality of predictions.
         * @param {Array<Alignment>} alignmentMemory - a list of alignments
         */
        addAlignmentMemory(alignmentMemory) {
            // TODO: we need a better way for calling program to query the number of nGrams that exceed the limit
            if (this.nGramWarnings) {
                for (let i = alignmentMemory.length - 1; i >= 0; i--) {
                    const target = alignmentMemory[i].targetNgram;
                    if (target.tokenLength > this.maxTargetNgramLength) {
                        console.warn(`Target Alignment Memory "${target.key}" exceeds maximum n-gram length of ${this.maxTargetNgramLength} and may be ignored.`);
                    }
                    const source = alignmentMemory[i].sourceNgram;
                    if (source.tokenLength > this.maxSourceNgramLength) {
                        console.warn(`Source Alignment Memory "${source.key}" exceeds maximum n-gram length of ${this.maxSourceNgramLength} and may be ignored.`);
                    }
                }
            }
            this.alignmentMemoryIndex.append(alignmentMemory);
        }
        /**
         * Performs the prediction calculations
         * @param {Token[]} sourceSentence
         * @param {Token[]} targetSentence
         * @return {Prediction[]}
         */
        run(sourceSentence, targetSentence) {
            return this.performPrediction(sourceSentence, targetSentence, this.corpusIndex, this.alignmentMemoryIndex, this.registeredAlgorithms);
        }
    }
    exports.default = Engine;
    });

    var WordMap_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });












    /**
     * Multi-Lingual Word Alignment Prediction
     */
    class WordMap {
        constructor(opts = {}) {
            this.engine = new Engine_1.default(opts);
            this.engine.registerAlgorithm(new NgramFrequency_1.default());
            this.engine.registerAlgorithm(new LemmaNgramFrequency_1.default()); // TODO: combine this with NgramFrequency for better performance
            this.engine.registerAlgorithm(new AlignmentPosition_1.default());
            this.engine.registerAlgorithm(new PhrasePlausibility_1.default());
            this.engine.registerAlgorithm(new NgramLength_1.default());
            this.engine.registerAlgorithm(new CharacterLength_1.default());
            this.engine.registerAlgorithm(new AlignmentOccurrences_1.default());
            this.engine.registerAlgorithm(new Uniqueness_1.default());
        }
        /**
         * Adds an array of corpus
         * @param {string[][]} corpus
         */
        appendCorpus(corpus) {
            for (const pair of corpus) {
                this.appendCorpusString(pair[0], pair[1]);
            }
        }
        /**
         * Add corpus to the MAP.
         * These may be single sentences or multiple sentence delimited by new lines.
         * @param {string} source
         * @param {string} target
         */
        appendCorpusString(source, target) {
            const sourceSentences = source.split("\n");
            const targetSentences = target.split("\n");
            const sourceTokens = [];
            const targetTokens = [];
            const sourceLength = sourceSentences.length;
            const targetLength = targetSentences.length;
            if (sourceLength !== targetLength) {
                throw Error("source and target corpus must be the same length");
            }
            for (let i = 0; i < sourceLength; i++) {
                sourceTokens.push(dist.default.tokenize(sourceSentences[i]));
                targetTokens.push(dist.default.tokenize(targetSentences[i]));
            }
            this.appendCorpusTokens(sourceTokens, targetTokens);
        }
        /**
         * Adds tokenized corpus to map
         * @param sourceTokens
         * @param targetTokens
         */
        appendCorpusTokens(sourceTokens, targetTokens) {
            if (sourceTokens.length !== targetTokens.length) {
                throw Error("source and target corpus must be the same length");
            }
            this.engine.addCorpus(sourceTokens, targetTokens);
        }
        /**
         * Appends alignment memory engine.
         * @param alignments - an alignment or array of alignments
         */
        appendAlignmentMemory(alignments) {
            if (alignments instanceof Array) {
                this.engine.addAlignmentMemory(alignments);
            }
            else {
                this.engine.addAlignmentMemory([alignments]);
            }
        }
        /**
         * Appends some alignment memory.
         * This may be multiple lines of text or a single line.
         *
         * @param {string} source - a string of source phrases separated by new lines
         * @param {string} target - a string of target phrases separated by new lines
         * @return {Alignment[]} an array of alignment objects (as a convenience)
         */
        appendAlignmentMemoryString(source, target) {
            const alignments = [];
            const sourceLines = source.split("\n");
            const targetLines = target.split("\n");
            const sourceLinesLength = sourceLines.length;
            if (sourceLinesLength !== targetLines.length) {
                throw new Error("source and target lines must be the same length");
            }
            for (let i = 0; i < sourceLinesLength; i++) {
                const sourceTokens = dist.default.tokenize(sourceLines[i]);
                const targetTokens = dist.default.tokenize(targetLines[i]);
                alignments.push(new Alignment_1.default(new Ngram_1.default(sourceTokens), new Ngram_1.default(targetTokens)));
            }
            this.appendAlignmentMemory(alignments);
            return alignments;
        }
        /**
         * Predicts the word alignments between the sentences.
         * @param {string} sourceSentence - a sentence from the source text
         * @param {string} targetSentence - a sentence from the target text
         * @param {number} maxSuggestions - the maximum number of suggestions to return
         * @return {Suggestion[]}
         */
        predict(sourceSentence, targetSentence, maxSuggestions = 1) {
            let sourceTokens = [];
            let targetTokens = [];
            if (typeof sourceSentence === "string") {
                sourceTokens = dist.default.tokenize(sourceSentence);
            }
            else {
                sourceTokens = sourceSentence;
            }
            if (typeof targetSentence === "string") {
                targetTokens = dist.default.tokenize(targetSentence);
            }
            else {
                targetTokens = targetSentence;
            }
            let predictions = this.engine.run(sourceTokens, targetTokens);
            predictions = this.engine.score(predictions);
            return Engine_1.default.suggest(predictions, maxSuggestions);
        }
        /**
         * Predicts word alignments between the sentences.
         * Returns an array of suggestions that match the benchmark.
         *
         * @param {string} sourceSentence
         * @param {string} targetSentence
         * @param {Suggestion} benchmark
         * @param {number} maxSuggestions
         * @return {Suggestion[]}
         */
        predictWithBenchmark(sourceSentence, targetSentence, benchmark, maxSuggestions = 1) {
            const sourceTokens = dist.default.tokenize(sourceSentence);
            const targetTokens = dist.default.tokenize(targetSentence);
            let predictions = this.engine.run(sourceTokens, targetTokens);
            predictions = this.engine.score(predictions);
            const validPredictions = [];
            for (const p of predictions) {
                for (const a of benchmark) {
                    if (a.key === p.alignment.key) {
                        validPredictions.push(p);
                    }
                }
            }
            return Engine_1.default.suggest(validPredictions, maxSuggestions);
        }
    }
    exports.default = WordMap;
    });

    var dist$1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.default = WordMap_1.default;

    exports.Parser = Parser_1.default;

    exports.Engine = Engine_1.default;
    // structures

    exports.Alignment = Alignment_1.default;

    exports.Ngram = Ngram_1.default;

    exports.Prediction = Prediction_1.default;

    exports.Suggestion = Suggestion_1.default;
    });

    var WordMAP = /*@__PURE__*/getDefaultExportFromCjs(dist$1);

    /* src/WordMap.svelte generated by Svelte v3.31.0 */
    const file$1 = "src/WordMap.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let input0;
    	let t1;
    	let br0;
    	let t2;
    	let input1;
    	let t3;
    	let br1;
    	let t4;
    	let textarea0;
    	let t5;
    	let br2;
    	let t6;
    	let textarea1;
    	let t7;
    	let br3;
    	let t8;
    	let textarea2;
    	let t9;
    	let br4;
    	let t10;
    	let textarea3;
    	let t11;
    	let br5;
    	let t12;
    	let h2;
    	let t14;
    	let t15;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Source: ");
    			input0 = element("input");
    			t1 = space();
    			br0 = element("br");
    			t2 = text("\n  Target: ");
    			input1 = element("input");
    			t3 = space();
    			br1 = element("br");
    			t4 = text("\n  Source Corpus: ");
    			textarea0 = element("textarea");
    			t5 = space();
    			br2 = element("br");
    			t6 = text("\n  Target Corpus: ");
    			textarea1 = element("textarea");
    			t7 = space();
    			br3 = element("br");
    			t8 = text("\n  Source Alignment Memory: ");
    			textarea2 = element("textarea");
    			t9 = space();
    			br4 = element("br");
    			t10 = text("\n  Target Alignment Memory: ");
    			textarea3 = element("textarea");
    			t11 = space();
    			br5 = element("br");
    			t12 = space();
    			h2 = element("h2");
    			h2.textContent = "Suggestions";
    			t14 = space();
    			t15 = text(/*suggestions*/ ctx[6]);
    			add_location(input0, file$1, 34, 10, 1005);
    			add_location(br0, file$1, 35, 2, 1037);
    			add_location(input1, file$1, 36, 10, 1053);
    			add_location(br1, file$1, 37, 2, 1085);
    			add_location(textarea0, file$1, 38, 17, 1108);
    			add_location(br2, file$1, 39, 2, 1149);
    			add_location(textarea1, file$1, 40, 17, 1172);
    			add_location(br3, file$1, 41, 2, 1213);
    			add_location(textarea2, file$1, 42, 27, 1246);
    			add_location(br4, file$1, 43, 2, 1296);
    			add_location(textarea3, file$1, 44, 27, 1329);
    			add_location(br5, file$1, 45, 2, 1379);
    			add_location(h2, file$1, 46, 2, 1387);
    			add_location(div, file$1, 33, 0, 989);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, input0);
    			set_input_value(input0, /*source*/ ctx[0]);
    			append_dev(div, t1);
    			append_dev(div, br0);
    			append_dev(div, t2);
    			append_dev(div, input1);
    			set_input_value(input1, /*target*/ ctx[1]);
    			append_dev(div, t3);
    			append_dev(div, br1);
    			append_dev(div, t4);
    			append_dev(div, textarea0);
    			set_input_value(textarea0, /*sourceCorpus*/ ctx[2]);
    			append_dev(div, t5);
    			append_dev(div, br2);
    			append_dev(div, t6);
    			append_dev(div, textarea1);
    			set_input_value(textarea1, /*targetCorpus*/ ctx[3]);
    			append_dev(div, t7);
    			append_dev(div, br3);
    			append_dev(div, t8);
    			append_dev(div, textarea2);
    			set_input_value(textarea2, /*sourceAlignmentMemory*/ ctx[4]);
    			append_dev(div, t9);
    			append_dev(div, br4);
    			append_dev(div, t10);
    			append_dev(div, textarea3);
    			set_input_value(textarea3, /*targetAlignmentMemory*/ ctx[5]);
    			append_dev(div, t11);
    			append_dev(div, br5);
    			append_dev(div, t12);
    			append_dev(div, h2);
    			append_dev(div, t14);
    			append_dev(div, t15);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen_dev(textarea0, "input", /*textarea0_input_handler*/ ctx[12]),
    					listen_dev(textarea1, "input", /*textarea1_input_handler*/ ctx[13]),
    					listen_dev(textarea2, "input", /*textarea2_input_handler*/ ctx[14]),
    					listen_dev(textarea3, "input", /*textarea3_input_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*source*/ 1 && input0.value !== /*source*/ ctx[0]) {
    				set_input_value(input0, /*source*/ ctx[0]);
    			}

    			if (dirty & /*target*/ 2 && input1.value !== /*target*/ ctx[1]) {
    				set_input_value(input1, /*target*/ ctx[1]);
    			}

    			if (dirty & /*sourceCorpus*/ 4) {
    				set_input_value(textarea0, /*sourceCorpus*/ ctx[2]);
    			}

    			if (dirty & /*targetCorpus*/ 8) {
    				set_input_value(textarea1, /*targetCorpus*/ ctx[3]);
    			}

    			if (dirty & /*sourceAlignmentMemory*/ 16) {
    				set_input_value(textarea2, /*sourceAlignmentMemory*/ ctx[4]);
    			}

    			if (dirty & /*targetAlignmentMemory*/ 32) {
    				set_input_value(textarea3, /*targetAlignmentMemory*/ ctx[5]);
    			}

    			if (dirty & /*suggestions*/ 64) set_data_dev(t15, /*suggestions*/ ctx[6]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("WordMap", slots, []);
    	let { corpus = [["Guten Tag", "Good day"]] } = $$props;
    	let { alignmentMemory = [["Tag", "day"]] } = $$props;
    	let { source = "Guten Tag" } = $$props;
    	let { target = "Good day" } = $$props;
    	let sourceCorpus = corpus.map(([_source, _target]) => _source).join("\n");
    	let targetCorpus = corpus.map(([_source, _target]) => _target).join("\n");
    	let sourceAlignmentMemory = alignmentMemory.map(([_source, _]) => _source).join("\n");
    	let targetAlignmentMemory = alignmentMemory.map(([_, _target]) => _target).join("\n");
    	let map;
    	let suggestions;
    	
    	const writable_props = ["corpus", "alignmentMemory", "source", "target"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WordMap> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		source = this.value;
    		$$invalidate(0, source);
    	}

    	function input1_input_handler() {
    		target = this.value;
    		$$invalidate(1, target);
    	}

    	function textarea0_input_handler() {
    		sourceCorpus = this.value;
    		$$invalidate(2, sourceCorpus);
    	}

    	function textarea1_input_handler() {
    		targetCorpus = this.value;
    		$$invalidate(3, targetCorpus);
    	}

    	function textarea2_input_handler() {
    		sourceAlignmentMemory = this.value;
    		$$invalidate(4, sourceAlignmentMemory);
    	}

    	function textarea3_input_handler() {
    		targetAlignmentMemory = this.value;
    		$$invalidate(5, targetAlignmentMemory);
    	}

    	$$self.$$set = $$props => {
    		if ("corpus" in $$props) $$invalidate(7, corpus = $$props.corpus);
    		if ("alignmentMemory" in $$props) $$invalidate(8, alignmentMemory = $$props.alignmentMemory);
    		if ("source" in $$props) $$invalidate(0, source = $$props.source);
    		if ("target" in $$props) $$invalidate(1, target = $$props.target);
    	};

    	$$self.$capture_state = () => ({
    		WordMAP,
    		corpus,
    		alignmentMemory,
    		source,
    		target,
    		sourceCorpus,
    		targetCorpus,
    		sourceAlignmentMemory,
    		targetAlignmentMemory,
    		map,
    		suggestions
    	});

    	$$self.$inject_state = $$props => {
    		if ("corpus" in $$props) $$invalidate(7, corpus = $$props.corpus);
    		if ("alignmentMemory" in $$props) $$invalidate(8, alignmentMemory = $$props.alignmentMemory);
    		if ("source" in $$props) $$invalidate(0, source = $$props.source);
    		if ("target" in $$props) $$invalidate(1, target = $$props.target);
    		if ("sourceCorpus" in $$props) $$invalidate(2, sourceCorpus = $$props.sourceCorpus);
    		if ("targetCorpus" in $$props) $$invalidate(3, targetCorpus = $$props.targetCorpus);
    		if ("sourceAlignmentMemory" in $$props) $$invalidate(4, sourceAlignmentMemory = $$props.sourceAlignmentMemory);
    		if ("targetAlignmentMemory" in $$props) $$invalidate(5, targetAlignmentMemory = $$props.targetAlignmentMemory);
    		if ("map" in $$props) $$invalidate(9, map = $$props.map);
    		if ("suggestions" in $$props) $$invalidate(6, suggestions = $$props.suggestions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*sourceAlignmentMemory, map, targetAlignmentMemory, sourceCorpus, targetCorpus, source, target*/ 575) {
    			 {
    				$$invalidate(9, map = new WordMAP());

    				sourceAlignmentMemory.split("\n").forEach((_source, i) => {
    					map.appendAlignmentMemoryString(_source, targetAlignmentMemory.split("\n")[i]);
    				});

    				map.appendCorpus(sourceCorpus.split("\n").map((_source, i) => [_source, targetCorpus.split("\n")[i]]));
    				$$invalidate(6, suggestions = map.predict(source, target));
    			}
    		}
    	};

    	return [
    		source,
    		target,
    		sourceCorpus,
    		targetCorpus,
    		sourceAlignmentMemory,
    		targetAlignmentMemory,
    		suggestions,
    		corpus,
    		alignmentMemory,
    		map,
    		input0_input_handler,
    		input1_input_handler,
    		textarea0_input_handler,
    		textarea1_input_handler,
    		textarea2_input_handler,
    		textarea3_input_handler
    	];
    }

    class WordMap extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			corpus: 7,
    			alignmentMemory: 8,
    			source: 0,
    			target: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WordMap",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get corpus() {
    		throw new Error("<WordMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set corpus(value) {
    		throw new Error("<WordMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alignmentMemory() {
    		throw new Error("<WordMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alignmentMemory(value) {
    		throw new Error("<WordMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get source() {
    		throw new Error("<WordMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set source(value) {
    		throw new Error("<WordMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get target() {
    		throw new Error("<WordMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set target(value) {
    		throw new Error("<WordMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.31.0 */
    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let wordmap;
    	let current;
    	wordmap = new WordMap({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			create_component(wordmap.$$.fragment);
    			attr_dev(h1, "class", "svelte-1tky8bj");
    			add_location(h1, file$2, 7, 1, 158);
    			attr_dev(main, "class", "svelte-1tky8bj");
    			add_location(main, file$2, 6, 0, 150);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(main, t3);
    			mount_component(wordmap, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wordmap.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wordmap.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(wordmap);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ AlignmentEditorWrapper, WordMap, name });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'WordMAP'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
