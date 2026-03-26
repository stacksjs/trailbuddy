#include <memory>
#include <vector>

#include <react/bridging/Bridging.h>

#include "../lib/base64.h"
#include "../lib/hex.h"

#include "BufferForArrayModule.h"

using namespace facebook::jsi;
using namespace facebook::react;

namespace facebook::react {

BufferForArrayModule::BufferForArrayModule(std::shared_ptr<CallInvoker> jsInvoker) : NativeBufferForArrayCxxSpec(std::move(jsInvoker)) {}

double
BufferForArrayModule::byteLengthUTF8(Runtime &rt, String string) {
  return string.utf8(rt).size();
}

String
BufferForArrayModule::toStringUTF8(Runtime &rt, Object buffer, double offset, double length) {
  auto data = buffer.getArrayBuffer(rt).data(rt);

  return String::createFromUtf8(rt, &data[size_t(offset)], size_t(length));
}

double
BufferForArrayModule::writeUTF8(Runtime &rt, Object buffer, double offset, double length, String string) {
  auto data = buffer.getArrayBuffer(rt).data(rt);

  auto utf8 = string.utf8(rt);

  auto written = std::min(size_t(length), utf8.size());

  std::copy(utf8.begin(), utf8.begin() + written, &data[size_t(offset)]);

  return double(written);
}

String
BufferForArrayModule::toStringUTF16(Runtime &rt, Object buffer, double offset, double length) {
  auto data = reinterpret_cast<char16_t *>(buffer.getArrayBuffer(rt).data(rt));

  return String::createFromUtf16(rt, &data[size_t(offset) / sizeof(char16_t)], size_t(length) / sizeof(char16_t));
}

double
BufferForArrayModule::writeUTF16(Runtime &rt, Object buffer, double offset, double length, String string) {
  auto data = reinterpret_cast<char16_t *>(buffer.getArrayBuffer(rt).data(rt));

  auto utf16 = string.utf16(rt);

  auto written = std::min(size_t(length) / sizeof(char16_t), utf16.size());

  std::copy(utf16.begin(), utf16.begin() + written, &data[size_t(offset) / sizeof(char16_t)]);

  return double(written * sizeof(char16_t));
}

String
BufferForArrayModule::toStringBase64(Runtime &rt, Object buffer, double offset, double length) {
  int err;

  auto data = buffer.getArrayBuffer(rt).data(rt);

  size_t written;
  err = base64_encode_utf8(&data[size_t(offset)], size_t(length), NULL, &written);
  assert(err == 0);

  auto string = std::vector<utf8_t>(written);
  err = base64_encode_utf8(&data[size_t(offset)], size_t(length), string.data(), &written);
  assert(err == 0);

  return String::createFromUtf8(rt, string.data(), string.size());
}

double
BufferForArrayModule::writeBase64(Runtime &rt, Object buffer, double offset, double length, String string) {
  int err;

  auto data = buffer.getArrayBuffer(rt).data(rt);

  auto utf8 = string.utf8(rt);

  auto written = size_t(length);
  err = base64_decode_utf8(reinterpret_cast<const utf8_t *>(utf8.data()), utf8.size(), &data[size_t(offset)], &written);
  if (err < 0) throw JSError(rt, "Invalid input");

  return double(written);
}

String
BufferForArrayModule::toStringHex(Runtime &rt, Object buffer, double offset, double length) {
  int err;

  auto data = buffer.getArrayBuffer(rt).data(rt);

  size_t written;
  err = hex_encode_utf8(&data[size_t(offset)], size_t(length), NULL, &written);
  assert(err == 0);

  auto string = std::vector<utf8_t>(written);
  err = hex_encode_utf8(&data[size_t(offset)], size_t(length), string.data(), &written);
  assert(err == 0);

  return String::createFromUtf8(rt, string.data(), string.size());
}

double
BufferForArrayModule::writeHex(Runtime &rt, Object buffer, double offset, double length, String string) {
  int err;

  auto data = buffer.getArrayBuffer(rt).data(rt);

  auto utf8 = string.utf8(rt);

  auto written = size_t(length);
  err = hex_decode_utf8(reinterpret_cast<const utf8_t *>(utf8.data()), utf8.size(), &data[size_t(offset)], &written);
  if (err < 0) throw JSError(rt, "Invalid input");

  return double(written);
}

} // namespace facebook::react
