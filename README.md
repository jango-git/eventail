# Eventail

A tiny, typed priority event emitter that makes complex event handling easy.

[![npm version](https://img.shields.io/npm/v/eventail.svg)](https://www.npmjs.com/package/eventail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.8.0-blue)](https://www.typescriptlang.org/)

## Features

- 🎯 Priority-based event handling
- 🌟 Single and one-time event listeners
- 🔄 Context binding support
- ⚡ Lightweight and efficient
- 📦 Full TypeScript support
- 🧪 Zero dependencies

## Installation

```bash
npm install eventail
```

## Usage

### Basic Event Handling

Register and handle events with optional context:

```typescript
import { Eventail } from 'eventail';

// Create event emitter
const events = new Eventail();

// Regular event listener
events.on('data', (data) => {
  console.log('Received:', data);
});

// With context and priority
const handler = {
  process(data) {
    console.log(this.prefix, data);
  },
  prefix: 'Data:'
};

events.on('data', handler.process, handler, 50);  // Priority 50 (default is 100)
```

### One-Time Events

Listen for events that should only trigger once:

```typescript
// One-time event listener
events.once('init', () => {
  console.log('Initialized - this runs only once');
});

// With context and priority
events.once('ready', handler.process, handler, 75);
```

### Priority System

Lower numbers = higher priority:

```typescript
// High priority (50)
events.on('event', () => console.log('First'), null, 50);

// Default priority (100)
events.on('event', () => console.log('Second'));

// Low priority (150)
events.on('event', () => console.log('Third'), null, 150);
```

### Removing Listeners

Remove specific or all listeners:

```typescript
// Remove specific listener
const callback = (data) => console.log(data);
events.on('event', callback);
events.off('event', callback);

// Remove all listeners for an event
events.off('event');
```

### Event Emission

Protected emit method for derived classes:

```typescript
class MyEmitter extends Eventail {
  public trigger(type: string, ...args: unknown[]) {
    return this.emit(type, ...args);
  }
}

const myEmitter = new MyEmitter();
myEmitter.on('data', console.log);
myEmitter.trigger('data', 'Hello World!');
```

## API Reference

### `on(type: string, callback: Callback, context?: unknown, priority = 100): this`
Registers an event listener.
- `type`: Event name to listen for
- `callback`: Function to call when event occurs
- `context`: (optional) `this` context for callback
- `priority`: (optional) Priority level, lower = higher priority

### `once(type: string, callback: Callback, context?: unknown, priority = 100): this`
Registers a one-time event listener.
- Same parameters as `on()`
- Automatically removes itself after first execution

### `off(type: string, callback?: Callback, context?: unknown): this`
Removes event listener(s).
- `type`: Event name
- `callback`: (optional) Specific callback to remove
- `context`: (optional) Specific context to match

### `protected emit(type: string, ...args: unknown[]): boolean`
Protected method for emitting events.
- `type`: Event name to emit
- `args`: Arguments to pass to listeners
- Returns: `true` if event had listeners

## License

MIT © [jango](https://github.com/jango-git)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
