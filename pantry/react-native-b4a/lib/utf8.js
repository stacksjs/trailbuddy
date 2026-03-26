const {
  default: NativeBufferForArray
} = require('../specs/NativeBufferForArray')

exports.byteLength = function byteLength(string) {
  return NativeBufferForArray.byteLengthUTF8(string)
}

exports.toString = function toString(buffer) {
  return NativeBufferForArray.toStringUTF8(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  )
}

exports.write = function write(buffer, string) {
  return NativeBufferForArray.writeUTF8(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
    string
  )
}
