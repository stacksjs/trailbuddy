#pragma once

#include <memory>

#include "BufferForArraySpecJSI.h"

namespace facebook::react {

class BufferForArrayModule : public NativeBufferForArrayCxxSpec<BufferForArrayModule> {
public:
  BufferForArrayModule(std::shared_ptr<CallInvoker> jsInvoker);

  double
  byteLengthUTF8(jsi::Runtime &rt, jsi::String string);

  jsi::String
  toStringUTF8(jsi::Runtime &rt, jsi::Object buffer, double offset, double length);

  double
  writeUTF8(jsi::Runtime &rt, jsi::Object buffer, double offset, double length, jsi::String string);

  jsi::String
  toStringUTF16(jsi::Runtime &rt, jsi::Object buffer, double offset, double length);

  double
  writeUTF16(jsi::Runtime &rt, jsi::Object buffer, double offset, double length, jsi::String string);

  jsi::String
  toStringBase64(jsi::Runtime &rt, jsi::Object buffer, double offset, double length);

  double
  writeBase64(jsi::Runtime &rt, jsi::Object buffer, double offset, double length, jsi::String string);

  jsi::String
  toStringHex(jsi::Runtime &rt, jsi::Object buffer, double offset, double length);

  double
  writeHex(jsi::Runtime &rt, jsi::Object buffer, double offset, double length, jsi::String string);
};

} // namespace facebook::react
