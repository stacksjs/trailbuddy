# bare-abort-controller

Abort controller support for Bare.

```
npm i bare-abort-controller
```

## Usage

```js
const controller = new AbortController()

const signal = controller.signal

signal.addEventListener('abort', (event) => {
  console.log(event)
})

controller.abort(new Error('Operation aborted'))
```

## License

Apache-2.0
