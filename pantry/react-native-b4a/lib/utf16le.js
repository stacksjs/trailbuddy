const {
  default: NativeBufferForArray
} = require('../specs/NativeBufferForArray')

exports.byteLength = function byteLength(string) {
  return string.length * 2
}

exports.toString = function toString(buffer) {
  return NativeBufferForArray.toStringUTF16(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  )
}

exports.write = function write(buffer, string) {
  return NativeBufferForArray.writeUTF16(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
    string
  )
}
