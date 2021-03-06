import Protocol from './protocol';
import Core from '../core';

function iterator_to_reducer(iterable, acc, fun) {
  const iterator = iterable[Symbol.iterator]();
  let x = iterator.next();
  let _acc = acc;

  while (x.done === false) {
    _acc = fun(x.value, _acc.get(1));
    if (_acc.get(0) === Symbol.for('halt')) {
      return new Core.Tuple(Symbol.for('halted'), _acc.get(1));
    } else if (_acc.get(0) === Symbol.for('suspend')) {
      return new Core.Tuple(Symbol.for('suspended'), _acc.get(1), new_acc => {
        return iterator_to_reducer(iterator, new_acc, fun);
      });
    }

    x = iterator.next();
  }

  return new Core.Tuple(Symbol.for('done'), _acc.get(1));
}

function call_property(item, property) {
  if (!property) {
    if (item instanceof Function || typeof item === 'function') {
      return item();
    }

    return item;
  }

  if (item instanceof Map) {
    let prop = null;

    if (item.has(property)) {
      prop = property;
    } else if (item.has(Symbol.for(property))) {
      prop = Symbol.for(property);
    }

    if (prop === null) {
      throw new Error(`Property ${property} not found in ${item}`);
    }

    if (
      item.get(prop) instanceof Function ||
      typeof item.get(prop) === 'function'
    ) {
      return item.get(prop)();
    }
    return item.get(prop);
  }

  let prop = null;

  if (
    typeof item === 'number' ||
    typeof item === 'symbol' ||
    typeof item === 'boolean' ||
    typeof item === 'string'
  ) {
    if (item[property] !== undefined) {
      prop = property;
    } else if (item[Symbol.for(property)] !== undefined) {
      prop = Symbol.for(property);
    }
  } else if (property in item) {
    prop = property;
  } else if (Symbol.for(property) in item) {
    prop = Symbol.for(property);
  }

  if (prop === null) {
    throw new Error(`Property ${property} not found in ${item}`);
  }

  if (item[prop] instanceof Function || typeof item[prop] === 'function') {
    return item[prop]();
  }
  return item[prop];
}

function defprotocol(spec) {
  return new Protocol(spec);
}

function defimpl(protocol, type, impl) {
  protocol.implementation(type, impl);
}

function build_namespace(ns, ns_string) {
  let parts = ns_string.split('.');
  const root = ns;
  let parent = ns;

  if (parts[0] === 'Elixir') {
    parts = parts.slice(1);
  }

  for (const part of parts) {
    if (typeof parent[part] === 'undefined') {
      parent[part] = {};
    }

    parent = parent[part];
  }

  root.__table__ = ns.__table__ || {};
  root.__table__[Symbol.for(ns_string)] = parent;

  return parent;
}

function map_to_object(map) {
  const object = {};

  for (const [key, value] of map.entries()) {
    if (value instanceof Map) {
      object[key] = map_to_object(value);
    } else {
      object[key] = value;
    }
  }

  return object;
}

export default {
  call_property,
  defprotocol,
  defimpl,
  build_namespace,
  iterator_to_reducer,
  map_to_object
};
