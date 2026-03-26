#ifndef HEX_H
#define HEX_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "utf.h"

#ifdef __cplusplus
extern "C" {
#endif

static const char hex__alphabet[17] = "0123456789abcdef";

static const int8_t hex__inverse_alphabet[256] = {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -1, -1, -1, -1, -1, -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1};

static inline int
hex__encode_utf8(const uint8_t *buffer, size_t buffer_len, utf8_t *string, size_t *string_len) {
  size_t len = buffer_len * 2;

  if (string == NULL) {
    *string_len = len;
    return 0;
  }

  if (*string_len < len) return -1;

  bool terminate = *string_len > len;

  *string_len = len;

  size_t k = 0;

  for (size_t i = 0, n = buffer_len; i < n; i++) {
    string[k++] = hex__alphabet[buffer[i] >> 4];
    string[k++] = hex__alphabet[buffer[i] & 0x0f];
  }

  if (terminate) string[k] = '\0';

  return 0;
}

static inline int
hex__encode_utf16le(const uint8_t *buffer, size_t buffer_len, utf16_t *string, size_t *string_len) {
  size_t len = buffer_len * 2;

  if (string == NULL) {
    *string_len = len;
    return 0;
  }

  if (*string_len < len) return -1;

  bool terminate = *string_len > len;

  *string_len = len;

  size_t k = 0;

  for (size_t i = 0, n = buffer_len; i < n; i++) {
    string[k++] = hex__alphabet[buffer[i] >> 4];
    string[k++] = hex__alphabet[buffer[i] & 0x0f];
  }

  if (terminate) string[k] = '\0';

  return 0;
}

static inline int
hex__decode_utf8(const utf8_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  size_t len = string_len >> 1;

  if (buffer == NULL) {
    *buffer_len = len;
    return 0;
  }

  if (*buffer_len < len) return -1;

  *buffer_len = len;

  size_t k = 0;

  for (size_t i = 0, n = string_len; i < n; i += 2) {
    char chunk[2];

    for (size_t j = 0; j < 2; j++) {
      chunk[j] = i + j < n ? hex__inverse_alphabet[string[i + j]] : 0;

      if (chunk[j] == (char) -1) return -1;
    }

    buffer[k++] = (chunk[0] << 4) | chunk[1];
  }

  return 0;
}

static inline int
hex__decode_utf16le(const utf16_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  size_t len = string_len >> 1;

  if (buffer == NULL) {
    *buffer_len = len;
    return 0;
  }

  if (*buffer_len < len) return -1;

  *buffer_len = len;

  size_t k = 0;

  for (size_t i = 0, n = string_len; i < n; i += 2) {
    char chunk[2];

    for (size_t j = 0; j < 2; j++) {
      chunk[j] = i + j < n ? hex__inverse_alphabet[string[i + j]] : 0;

      if (chunk[j] == (char) -1) return -1;
    }

    buffer[k++] = (chunk[0] << 4) | chunk[1];
  }

  return 0;
}

static inline int
hex_encode_utf8(const uint8_t *buffer, size_t buffer_len, utf8_t *string, size_t *string_len) {
  return hex__encode_utf8(buffer, buffer_len, string, string_len);
}

static inline int
hex_decode_utf8(const utf8_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  return hex__decode_utf8(string, string_len, buffer, buffer_len);
}

static inline int
hex_encode_utf16le(const uint8_t *buffer, size_t buffer_len, utf16_t *string, size_t *string_len) {
  return hex__encode_utf16le(buffer, buffer_len, string, string_len);
}

static inline int
hex_decode_utf16le(const utf16_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  return hex__decode_utf16le(string, string_len, buffer, buffer_len);
}

#ifdef __cplusplus
}
#endif

#endif // HEX_H
