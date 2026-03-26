const {
  default: NativeBufferForArray
} = require('../specs/NativeBufferForArray')

exports.byteLength = function byteLength(string) {
  return string.length >>> 1
}

exports.toString = function toString(buffer) {
  return NativeBufferForArray.toStringHex(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  )
}

exports.write = function write(buffer, string) {
  return NativeBufferForArray.writeHex(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
    string
  )
}
