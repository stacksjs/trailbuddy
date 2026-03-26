const {
  default: NativeBufferForArray
} = require('./specs/NativeBufferForArray')

const ascii = require('./lib/ascii')
const base64 = require('./lib/base64')
const hex = require('./lib/hex')
const utf8 = require('./lib/utf8')
const utf16le = require('./lib/utf16le')

function codecFor(encoding) {
  switch (encoding) {
    case 'ascii':
      return ascii
    case 'base64':
      return base64
    case 'hex':
      return hex
    case 'utf8':
    case 'utf-8':
    case undefined:
    case null:
      return utf8
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return utf16le
    default:
      throw new Error(`Unknown encoding '${encoding}'`)
  }
}

exports.isBuffer = function isBuffer(value) {
  return value instanceof Uint8Array
}

exports.isEncoding = function isEncoding(encoding) {
  try {
    codecFor(encoding)
    return true
  } catch {
    return false
  }
}

exports.alloc = function alloc(size, fill, encoding) {
  const buffer = new Uint8Array(size)
  if (fill !== undefined) {
    exports.fill(buffer, fill, 0, buffer.byteLength, encoding)
  }
  return buffer
}

exports.allocUnsafe = function allocUnsafe(size) {
  return new Uint8Array(size)
}

exports.allocUnsafeSlow = function allocUnsafeSlow(size) {
  return new Uint8Array(size)
}

exports.byteLength = function byteLength(string, encoding) {
  return codecFor(encoding).byteLength(string)
}

exports.compare = function compare(a, b) {
  if (a === b) return 0

  return NativeBufferForArray.compare(
    a.buffer,
    a.byteOffset,
    a.byteLength,
    b.buffer,
    b.byteOffset,
    b.byteLength
  )
}

exports.concat = function concat(buffers, length) {
  if (length === undefined) {
    length = buffers.reduce((len, buffer) => len + buffer.byteLength, 0)
  }

  const result = new Uint8Array(length)

  let offset = 0

  for (const buffer of buffers) {
    if (offset + buffer.byteLength > result.byteLength) {
      result.set(buffer.subarray(0, result.byteLength - offset), offset)
      return result
    }

    result.set(buffer, offset)
    offset += buffer.byteLength
  }

  return result
}

exports.copy = function copy(
  source,
  target,
  targetStart = 0,
  sourceStart = 0,
  sourceEnd = source.byteLength
) {
  if (targetStart < 0) targetStart = 0
  if (targetStart >= target.byteLength) return 0

  const targetLength = target.byteLength - targetStart

  if (sourceStart < 0) sourceStart = 0
  if (sourceStart >= source.byteLength) return 0

  if (sourceEnd <= sourceStart) return 0
  if (sourceEnd > source.byteLength) sourceEnd = source.byteLength

  if (sourceEnd - sourceStart > targetLength) {
    sourceEnd = sourceStart + targetLength
  }

  const sourceLength = sourceEnd - sourceStart

  if (source === target) {
    target.copyWithin(targetStart, sourceStart, sourceEnd)
  } else {
    if (sourceStart !== 0 || sourceEnd !== source.byteLength) {
      source = source.subarray(sourceStart, sourceEnd)
    }

    target.set(source, targetStart)
  }

  return sourceLength
}

exports.equals = function equals(a, b) {
  if (a === b) return true
  if (a.byteLength !== b.byteLength) return false

  return exports.compare(a, b) === 0
}

exports.fill = function fill(
  buffer,
  value,
  offset = 0,
  end = buffer.byteLength,
  encoding = 'utf8'
) {
  if (typeof value === 'string') {
    if (typeof offset === 'string') {
      // fill(string, encoding)
      encoding = offset
      offset = 0
      end = buffer.byteLength
    } else if (typeof end === 'string') {
      // fill(string, offset, encoding)
      encoding = end
      end = buffer.byteLength
    }
  } else if (typeof value === 'number') {
    value = value & 0xff
  } else if (typeof value === 'boolean') {
    value = +value
  }

  if (offset < 0) offset = 0
  if (offset >= buffer.byteLength) return buffer

  if (end <= offset) return buffer
  if (end > buffer.byteLength) end = buffer.byteLength

  if (typeof value === 'number') return buffer.fill(value, offset, end)

  if (typeof value === 'string') value = exports.from(value, encoding)

  const len = value.byteLength

  for (let i = 0, n = end - offset; i < n; ++i) {
    buffer[i + offset] = value[i % len]
  }

  return buffer
}

exports.from = function from(value, encodingOrOffset, length) {
  // from(string, encoding)
  if (typeof value === 'string') return fromString(value, encodingOrOffset)

  // from(array)
  if (Array.isArray(value)) return fromArray(value)

  // from(buffer)
  if (ArrayBuffer.isView(value)) return fromBuffer(value)

  // from(arrayBuffer[, byteOffset[, length]])
  return fromArrayBuffer(value, encodingOrOffset, length)
}

function fromString(string, encoding) {
  const codec = codecFor(encoding)
  const buffer = new Uint8Array(codec.byteLength(string))
  codec.write(buffer, string, 0, buffer.byteLength)
  return buffer
}

function fromArray(array) {
  const buffer = new Uint8Array(array.length)
  buffer.set(array)
  return buffer
}

function fromBuffer(buffer) {
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(buffer)
  return copy
}

function fromArrayBuffer(arrayBuffer, byteOffset, length) {
  return new Uint8Array(arrayBuffer, byteOffset, length)
}

exports.includes = function includes(buffer, value, byteOffset, encoding) {
  return exports.indexOf(buffer, value, byteOffset, encoding) !== -1
}

exports.indexOf = function indexOf(buffer, value, byteOffset, encoding) {
  return bidirectionalIndexOf(
    buffer,
    value,
    byteOffset,
    encoding,
    true /* first */
  )
}

exports.lastIndexOf = function lastIndexOf(
  buffer,
  value,
  byteOffset,
  encoding
) {
  return bidirectionalIndexOf(
    buffer,
    value,
    byteOffset,
    encoding,
    false /* last */
  )
}

function bidirectionalIndexOf(buffer, value, byteOffset, encoding, first) {
  if (buffer.byteLength === 0) return -1

  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset === undefined) {
    byteOffset = first ? 0 : buffer.length - 1
  } else if (byteOffset < 0) {
    byteOffset += buffer.byteLength
  }

  if (byteOffset >= buffer.byteLength) {
    if (first) return -1
    else byteOffset = buffer.byteLength - 1
  } else if (byteOffset < 0) {
    if (first) byteOffset = 0
    else return -1
  }

  if (typeof value === 'string') {
    value = from(value, encoding)
  } else if (typeof value === 'number') {
    value = value & 0xff

    if (first) {
      return buffer.indexOf(value, byteOffset)
    } else {
      return buffer.lastIndexOf(value, byteOffset)
    }
  }

  if (value.byteLength === 0) return -1

  if (first) {
    let foundIndex = -1

    for (let i = byteOffset; i < buffer.byteLength; i++) {
      if (buffer[i] === value[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === value.byteLength) return foundIndex
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + value.byteLength > buffer.byteLength) {
      byteOffset = buffer.byteLength - value.byteLength
    }

    for (let i = byteOffset; i >= 0; i--) {
      let found = true

      for (let j = 0; j < value.byteLength; j++) {
        if (buffer[i + j] !== value[j]) {
          found = false
          break
        }
      }

      if (found) return i
    }
  }

  return -1
}

function swap(buffer, n, m) {
  const i = buffer[n]
  buffer[n] = buffer[m]
  buffer[m] = i
}

exports.swap16 = function swap16(buffer) {
  const len = buffer.byteLength

  if (len % 2 !== 0)
    throw new RangeError('Buffer size must be a multiple of 16-bits')

  for (let i = 0; i < len; i += 2) swap(buffer, i, i + 1)

  return buffer
}

exports.swap32 = function swap32(buffer) {
  const len = buffer.byteLength

  if (len % 4 !== 0)
    throw new RangeError('Buffer size must be a multiple of 32-bits')

  for (let i = 0; i < len; i += 4) {
    swap(buffer, i, i + 3)
    swap(buffer, i + 1, i + 2)
  }

  return buffer
}

exports.swap64 = function swap64(buffer) {
  const len = buffer.byteLength

  if (len % 8 !== 0)
    throw new RangeError('Buffer size must be a multiple of 64-bits')

  for (let i = 0; i < len; i += 8) {
    swap(buffer, i, i + 7)
    swap(buffer, i + 1, i + 6)
    swap(buffer, i + 2, i + 5)
    swap(buffer, i + 3, i + 4)
  }

  return buffer
}

exports.toBuffer = function toBuffer(buffer) {
  return buffer
}

exports.toString = function toString(
  buffer,
  encoding,
  start = 0,
  end = buffer.byteLength
) {
  // toString(buffer)
  if (arguments.length === 1) return utf8.toString(buffer)

  // toString(buffer, encoding)
  if (arguments.length === 2) return codecFor(encoding).toString(buffer)

  if (start < 0) start = 0
  if (start >= buffer.byteLength) return ''

  if (end <= start) return ''
  if (end > buffer.byteLength) end = buffer.byteLength

  if (start !== 0 || end !== buffer.byteLength) {
    buffer = buffer.subarray(start, end)
  }

  return codecFor(encoding).toString(buffer)
}

exports.write = function write(buffer, string, offset, length, encoding) {
  // write(buffer, string)
  if (arguments.length === 2) return utf8.write(buffer, string)

  if (typeof offset === 'string') {
    // write(buffer, string, encoding)
    encoding = offset
    offset = 0
    length = buffer.byteLength
  } else if (typeof length === 'string') {
    // write(buffer, string, offset, encoding)
    encoding = length
    length = buffer.byteLength - offset
  }

  length = Math.min(length, exports.byteLength(string, encoding))

  let start = offset
  if (start < 0) start = 0
  if (start >= buffer.byteLength) return 0

  let end = offset + length
  if (end <= start) return 0
  if (end > buffer.byteLength) end = buffer.byteLength

  if (start !== 0 || end !== buffer.byteLength) {
    buffer = buffer.subarray(start, end)
  }

  return codecFor(encoding).write(buffer, string)
}

exports.readDoubleBE = function readDoubleBE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getFloat64(offset, false)
}

exports.readDoubleLE = function readDoubleLE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getFloat64(offset, true)
}

exports.readFloatBE = function readFloatBE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getFloat32(offset, false)
}

exports.readFloatLE = function readFloatLE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getFloat32(offset, true)
}

exports.readInt32BE = function readInt32BE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getInt32(offset, false)
}

exports.readInt32LE = function readInt32LE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getInt32(offset, true)
}

exports.readUInt32BE = function readUInt32BE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getUint32(offset, false)
}

exports.readUInt32LE = function readUInt32LE(buffer, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return view.getUint32(offset, true)
}

exports.writeDoubleBE = function writeDoubleBE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setFloat64(offset, value, false)
  return offset + 8
}

exports.writeDoubleLE = function writeDoubleLE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setFloat64(offset, value, true)
  return offset + 8
}

exports.writeFloatBE = function writeFloatBE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setFloat32(offset, value, false)
  return offset + 4
}

exports.writeFloatLE = function writeFloatLE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setFloat32(offset, value, true)
  return offset + 4
}

exports.writeInt32BE = function writeInt32BE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setInt32(offset, value, false)
  return offset + 4
}

exports.writeInt32LE = function writeInt32LE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setInt32(offset, value, true)
  return offset + 4
}

exports.writeUInt32BE = function writeUInt32BE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setUint32(offset, value, false)
  return offset + 4
}

exports.writeUInt32LE = function writeUInt32LE(buffer, value, offset = 0) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  view.setUint32(offset, value, true)
  return offset + 4
}
