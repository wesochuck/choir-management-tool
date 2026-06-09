/**
 * ESLint rule: no-effect-state-cycle
 *
 * Flags when a useEffect's dependency array includes a state variable
 * that is also written by a .then() or .catch() handler inside the effect.
 * This creates a feedback loop on failure: catch sets fallback state,
 * state change re-fires the effect, more failed requests.
 *
 * ✅ Safe:
 *   const hasResolved = useRef(false);
 *   useEffect(() => {
 *     if (hasResolved.current) return;
 *     hasResolved.current = true;
 *     apiCall().then(setData).catch(() => setData([]));
 *   }, [filters]);
 *
 * ❌ Unsafe:
 *   useEffect(() => {
 *     apiCall().then(setData).catch(() => setData([]));
 *   }, [filters, data]);  // data in deps causes loop
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow useEffect dependency arrays that include state variables written by .then()/.catch() handlers',
      recommended: false,
    },
    schema: [],
    messages: {
      stateCycle:
        "{{stateVar}} is set inside a .then()/.catch() handler and also appears in the useEffect dependency array. This creates a feedback loop on failure — the catch handler's setState re-fires the effect. Use a ref-based guard or remove {{stateVar}} from deps.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isUseEffect(node)) return;

        const deps = extractDepArray(node);
        if (!deps || deps.length === 0) return;

        const callback = node.arguments[0];
        if (!callback || (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')) return;

        // Walk the effect body for .then()/.catch() calls
        const setterCallsInPromiseChain = findSetterNamesInPromiseChains(callback.body);

        for (const setterName of setterCallsInPromiseChain) {
          // setData → data
          const stateVar = setterName[0].toLowerCase() + setterName.slice(1);
          if (deps.includes(stateVar)) {
            context.report({
              node,
              messageId: 'stateCycle',
              data: { stateVar },
            });
          }
        }
      },
    };
  },
};

function isUseEffect(node) {
  const callee = node.callee;
  return (
    (callee.type === 'Identifier' && callee.name === 'useEffect') ||
    (callee.type === 'MemberExpression' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'useEffect')
  );
}

function extractDepArray(node) {
  const depsArg = node.arguments[1];
  if (!depsArg || depsArg.type !== 'ArrayExpression') return null;
  return depsArg.elements
    .filter(Boolean)
    .map((el) => {
      if (el.type === 'Identifier') return el.name;
      if (el.type === 'MemberExpression') return extractMemberExpressionName(el);
      if (el.type === 'Literal' && typeof el.value === 'string') return el.value;
      return null;
    })
    .filter(Boolean);
}

function extractMemberExpressionName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const object = extractMemberExpressionName(node.object);
    const property = extractMemberExpressionName(node.property);
    return object && property ? `${object}.${property}` : null;
  }
  return null;
}

/**
 * Walk the AST body and find all setXxx() calls that appear inside .then() or .catch() chains.
 */
function findSetterNamesInPromiseChains(body) {
  const names = new Set();
  const visited = new WeakSet();

  function walk(node) {
    if (!node || visited.has(node)) return;
    visited.add(node);

    if (node.type === 'CallExpression') {
      // Check if this is a .then() or .catch() call
      const isPromiseMethod =
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        (node.callee.property.name === 'then' ||
          node.callee.property.name === 'catch' ||
          node.callee.property.name === 'finally');

      if (isPromiseMethod) {
        // Walk the arguments of .then()/.catch() to find setState calls
        for (const arg of node.arguments) {
          if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
            findSetterCalls(arg.body, names);
          }
        }

        // Also walk the receiver (the promise before .then()) to find nested chains
        walk(node.callee.object);
      }
    }

    // Recurse into children
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === 'string') walk(c);
        }
      } else if (child && typeof child.type === 'string') {
        walk(child);
      }
    }
  }

  walk(body);
  return names;
}

/**
 * Find all CallExpression nodes that look like setXxx(...) and collect
 * the setter base name (e.g. "setData" → "Data").
 */
function findSetterCalls(node, names) {
  if (!node) return;
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current.type === 'CallExpression') {
      const callee = current.callee;
      if (callee.type === 'Identifier' && /^set[A-Z]/.test(callee.name)) {
        names.add(callee.name.slice(3)); // "setData" → "Data"
      }
    }

    for (const key of Object.keys(current)) {
      if (key === 'parent') continue;
      const child = current[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === 'string') stack.push(c);
        }
      } else if (child && typeof child.type === 'string') {
        stack.push(child);
      }
    }
  }
}
