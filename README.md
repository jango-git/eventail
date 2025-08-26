<p align="center">
  <img src="https://raw.githubusercontent.com/jango-git/eventail/main/assets/logotype.svg" width="200" alt="Eventail logo"><br/>
  <h1 align="center">Eventail</h1>
  <p align="center">
    An event emitter abstract class with priority support
  </p>
</p>

<p align="center">
<a href="https://www.npmjs.com/package/eventail"><img src="https://img.shields.io/npm/v/eventail.svg" alt="npm version"></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-%5E5.8.0-blue" alt="TypeScript"></a>
</p>

## What it does

- 🎯 Priority-based event handling
- ⚡ Single and one-time event listeners
- 🔄 Context binding support
- 📦 TypeScript support
- 🧪 No external dependencies

This is an abstract class, so you need to extend it to use it. The `emit` method is protected, meaning only your class can trigger events internally.

## Installation

```bash
npm install eventail
```

## Usage

### Basic Example

```typescript
import { Eventail } from 'eventail';

class Player extends Eventail {
  private level = 1;
  private experience = 0;

  public gainExperience(amount: number) {
    this.experience += amount;
    this.emit('experienceGained', amount, this.experience);

    if (this.experience >= this.level * 100) {
      this.level++;
      this.experience = 0;
      this.emit('leveledUp', this.level);
    }
  }
}

const player = new Player();

player.on('experienceGained', (amount, total) => {
  console.log(`Gained ${amount} XP (Total: ${total})`);
});

player.on('leveledUp', (level) => {
  console.log(`Level up! Now level ${level}`);
});

player.gainExperience(150);
```

### With Context and Priority

```typescript
const ui = {
  showMessage(text: string) {
    console.log(`[UI] ${text}`);
  }
};

// Lower numbers = higher priority
player.on('leveledUp', function(level) {
  this.showMessage(`Reached level ${level}`);
}, ui, -10);
```

### One-Time Listeners

```typescript
// Runs only once
player.once('firstDeath', () => {
  console.log('This only happens once');
});
```

### Removing Listeners

```typescript
const handler = (data) => console.log(data);
player.on('event', handler);
player.off('event', handler); // Remove specific listener
player.off('event'); // Remove all listeners for this event
```

## API

### `on(type: string | number, callback: Function, context?: object, priority?: number)`
Adds an event listener. Lower priority numbers execute first.

### `once(type: string | number, callback: Function, context?: object, priority?: number)`
Adds a listener that removes itself after first execution.

### `off(type: string | number, callback?: Function, context?: object)`
Removes listener(s). Without callback, removes all listeners for the event.

### `protected emit(type: string | number, ...args: any[])`
Emits an event. Only available inside your class that extends Eventail.

## Notes

- Listeners with the same priority may execute in any order
- The class uses WeakMap internally, so context objects can be garbage collected normally
- Event types can be strings or numbers
- This is just one way to handle events - there are probably better solutions for your specific use case

## License

MIT © [jango](https://github.com/jango-git)
