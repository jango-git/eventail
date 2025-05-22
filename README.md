# Eventail

A tiny, typed, priority-based event emitter for TypeScript/JavaScript.

The name "Eventail" is a combination of "event" + "tail", reflecting its queue-like nature with priority support.

## Features

- 🏃‍♂️ Lightweight and zero dependencies
- 📝 Full TypeScript support
- ⚡ Priority-based event handling
- 🎯 Context binding
- 🔄 One-time event listeners
- ⛓️ Chainable API
- 🛡️ Duplicate listener protection

## Installation

```bash
npm install eventail
```

## Usage

### Basic Example

```typescript
import { Eventail } from 'eventail';

const emitter = new Eventail();

// Regular event listener
emitter.on('data', (value) => console.log('Received:', value));

// High-priority listener (50 is higher priority than default 100)
emitter.on('data', (value) => console.log('High priority:', value), null, 50);

// One-time event listener
emitter.once('init', () => console.log('Initialized'));

// Remove specific listener
const callback = (data) => console.log(data);
emitter.on('event', callback);
emitter.off('event', callback);

// Remove all listeners for an event
emitter.off('event');
```

### Custom Emitter

```typescript
class MyEmitter extends Eventail {
  public send(data: string) {
    this.emit('data', data);
  }
}

const myEmitter = new MyEmitter();
myEmitter.on('data', console.log);
myEmitter.send('Hello World!');
```

### With Context

```typescript
class Controller {
  private value = 42;
  
  public handler(data: string) {
    console.log(data, this.value);
  }
}

const controller = new Controller();
const emitter = new Eventail();

// Bind the handler to controller instance
emitter.on('data', controller.handler, controller);
```

## API

### `on(type: string, callback: Function, context?: any, priority = 100): this`

Adds an event listener.
- `type`: Event name
- `callback`: Function to call when the event occurs
- `context`: (optional) `this` context for the callback
- `priority`: (optional) Priority level (lower numbers = higher priority)

### `once(type: string, callback: Function, context?: any, priority = 100): this`

Adds a one-time event listener that removes itself after first execution.

### `off(type: string, callback?: Function, context?: any): this`

Removes event listener(s).
- Without `callback`: Removes all listeners for the event type
- With `callback`: Removes specific listener
- With `context`: Only removes if context matches

## Priority System

Listeners are executed in priority order, with lower numbers indicating higher priority. Default priority is 100.

```typescript
// High priority (50)
emitter.on('event', () => console.log('First'), null, 50);

// Default priority (100)
emitter.on('event', () => console.log('Second'));

// Low priority (150)
emitter.on('event', () => console.log('Third'), null, 150);
```

## License

MIT

## Contributing

Issues and pull requests are welcome on GitHub.