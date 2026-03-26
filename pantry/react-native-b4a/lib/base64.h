#ifndef BASE64_H
#define BASE64_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "utf.h"

#ifdef __cplusplus
extern "C" {
#endif

static const char base64__alphabet[65] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static const char base64url__alphabet[65] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

static const int8_t base64__inverse_alphabet[256] = {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, 62, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1};

static inline int
base64__encode_utf8(const char *alphabet, const uint8_t *buffer, size_t buffer_len, utf8_t *string, size_t *string_len, bool pad) {
  size_t len = pad ? 4 * ((buffer_len + 2) / 3) : ((buffer_len * 4 + 2) / 3);

  if (string == NULL) {
    *string_len = len;
    return 0;
  }

  if (*string_len < len) return -1;

  bool terminate = *string_len > len;

  *string_len = len;

  size_t k = 0, i = 0, n = buffer_len;

  uint8_t a, b, c;

  for (; i + 2 < n; i += 3) {
    a = buffer[i];
    b = buffer[i + 1];
    c = buffer[i + 2];

    string[k++] = alphabet[a >> 2];
    string[k++] = alphabet[((a & 0x03) << 4) | (b >> 4)];
    string[k++] = alphabet[((b & 0x0f) << 2) | (c >> 6)];
    string[k++] = alphabet[c & 0x3f];
  }

  if (i < n) {
    a = buffer[i];

    string[k++] = alphabet[a >> 2];

    if (i + 1 < n) {
      b = buffer[i + 1];

      string[k++] = alphabet[((a & 0x03) << 4) | (b >> 4)];
      string[k++] = alphabet[(b & 0x0f) << 2];

      if (pad) string[k++] = '=';
    } else {
      string[k++] = alphabet[(a & 0x03) << 4];

      if (pad) {
        string[k++] = '=';
        string[k++] = '=';
      }
    }
  }

  if (terminate) string[k] = '\0';

  return 0;
}

static inline int
base64__encode_utf16le(const char *alphabet, const uint8_t *buffer, size_t buffer_len, utf16_t *string, size_t *string_len, bool pad) {
  size_t len = pad ? 4 * ((buffer_len + 2) / 3) : ((buffer_len * 4 + 2) / 3);

  if (string == NULL) {
    *string_len = len;
    return 0;
  }

  if (*string_len < len) return -1;

  bool terminate = *string_len > len;

  *string_len = len;

  size_t k = 0, i = 0, n = buffer_len;

  uint8_t a, b, c;

  for (; i + 2 < n; i += 3) {
    a = buffer[i];
    b = buffer[i + 1];
    c = buffer[i + 2];

    string[k++] = alphabet[a >> 2];
    string[k++] = alphabet[((a & 0x03) << 4) | (b >> 4)];
    string[k++] = alphabet[((b & 0x0f) << 2) | (c >> 6)];
    string[k++] = alphabet[c & 0x3f];
  }

  if (i < n) {
    a = buffer[i];

    string[k++] = alphabet[a >> 2];

    if (i + 1 < n) {
      b = buffer[i + 1];

      string[k++] = alphabet[((a & 0x03) << 4) | (b >> 4)];
      string[k++] = alphabet[(b & 0x0f) << 2];

      if (pad) string[k++] = '=';
    } else {
      string[k++] = alphabet[(a & 0x03) << 4];

      if (pad) {
        string[k++] = '=';
        string[k++] = '=';
      }
    }
  }

  if (terminate) string[k] = '\0';

  return 0;
}

static inline int
base64__decode_utf8(const utf8_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  if (string_len % 4 == 1) return -1;

  if (string_len == 0) {
    *buffer_len = 0;
    return 0;
  }

  size_t pad = 0;
  if (string_len >= 2 && string[string_len - 1] == '=') pad++;
  if (string_len >= 2 && string[string_len - 2] == '=') pad++;

  size_t trailing = string_len % 4;

  size_t len = string_len / 4 * 3;

  if (trailing == 2) len += 1;
  else if (trailing == 3) len += 2;

  len -= pad;

  if (buffer == NULL) {
    *buffer_len = len;
    return 0;
  }

  if (*buffer_len < len) return -1;

  *buffer_len = len;

  size_t k = 0;
  size_t i = 0;

  for (; i + 3 < string_len; i += 4) {
    char chunk[4];

    for (size_t j = 0; j < 4; j++) {
      chunk[j] = string[i + j] == '=' ? 0 : base64__inverse_alphabet[string[i + j]];

      if (chunk[j] == (char) -1) return -1;
    }

    uint32_t triple = (chunk[0] << 18) + (chunk[1] << 12) + (chunk[2] << 6) + chunk[3];

    if (k < len) buffer[k++] = (triple >> 2 * 8) & 0xff;
    if (k < len) buffer[k++] = (triple >> 1 * 8) & 0xff;
    if (k < len) buffer[k++] = (triple >> 0 * 8) & 0xff;
  }

  if (trailing) {
    char chunk[4] = {0, 0, 0, 0};

    for (size_t j = 0; j < trailing; j++) {
      chunk[j] = base64__inverse_alphabet[string[i + j]];

      if (chunk[j] == (char) -1) return -1;
    }

    uint32_t triple = (chunk[0] << 18) | (chunk[1] << 12) | (chunk[2] << 6) | chunk[3];

    if (trailing == 2) {
      buffer[k++] = (triple >> 16) & 0xff;
    } else if (trailing == 3) {
      buffer[k++] = (triple >> 16) & 0xff;
      buffer[k++] = (triple >> 8) & 0xff;
    }
  }

  return 0;
}

static inline int
base64__decode_utf16le(const utf16_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  if (string_len % 4 == 1) return -1;

  if (string_len == 0) {
    *buffer_len = 0;
    return 0;
  }

  size_t pad = 0;
  if (string_len >= 2 && string[string_len - 1] == '=') pad++;
  if (string_len >= 2 && string[string_len - 2] == '=') pad++;

  size_t trailing = string_len % 4;

  size_t len = string_len / 4 * 3;

  if (trailing == 2) len += 1;
  else if (trailing == 3) len += 2;

  len -= pad;

  if (buffer == NULL) {
    *buffer_len = len;
    return 0;
  }

  if (*buffer_len < len) return -1;

  *buffer_len = len;

  size_t k = 0;
  size_t i = 0;

  for (; i + 3 < string_len; i += 4) {
    char chunk[4];

    for (size_t j = 0; j < 4; j++) {
      chunk[j] = string[i + j] == '=' ? 0 : base64__inverse_alphabet[string[i + j]];

      if (chunk[j] == (char) -1) return -1;
    }

    uint32_t triple = (chunk[0] << 18) + (chunk[1] << 12) + (chunk[2] << 6) + chunk[3];

    if (k < len) buffer[k++] = (triple >> 2 * 8) & 0xff;
    if (k < len) buffer[k++] = (triple >> 1 * 8) & 0xff;
    if (k < len) buffer[k++] = (triple >> 0 * 8) & 0xff;
  }

  if (trailing) {
    char chunk[4] = {0, 0, 0, 0};

    for (size_t j = 0; j < trailing; j++) {
      chunk[j] = base64__inverse_alphabet[string[i + j]];

      if (chunk[j] == (char) -1) return -1;
    }

    uint32_t triple = (chunk[0] << 18) | (chunk[1] << 12) | (chunk[2] << 6) | chunk[3];

    if (trailing == 2) {
      buffer[k++] = (triple >> 16) & 0xff;
    } else if (trailing == 3) {
      buffer[k++] = (triple >> 16) & 0xff;
      buffer[k++] = (triple >> 8) & 0xff;
    }
  }

  return 0;
}

static inline int
base64_encode_utf8(const uint8_t *buffer, size_t buffer_len, utf8_t *string, size_t *string_len) {
  return base64__encode_utf8(base64__alphabet, buffer, buffer_len, string, string_len, true);
}

static inline int
base64url_encode_utf8(const uint8_t *buffer, size_t buffer_len, utf8_t *string, size_t *string_len) {
  return base64__encode_utf8(base64url__alphabet, buffer, buffer_len, string, string_len, false);
}

static inline int
base64_decode_utf8(const utf8_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  return base64__decode_utf8(string, string_len, buffer, buffer_len);
}

static inline int
base64_encode_utf16le(const uint8_t *buffer, size_t buffer_len, utf16_t *string, size_t *string_len) {
  return base64__encode_utf16le(base64__alphabet, buffer, buffer_len, string, string_len, true);
}

static inline int
base64url_encode_utf16le(const uint8_t *buffer, size_t buffer_len, utf16_t *string, size_t *string_len) {
  return base64__encode_utf16le(base64url__alphabet, buffer, buffer_len, string, string_len, false);
}

static inline int
base64_decode_utf16le(const utf16_t *string, size_t string_len, uint8_t *buffer, size_t *buffer_len) {
  return base64__decode_utf16le(string, string_len, buffer, buffer_len);
}

#ifdef __cplusplus
}
#endif

#endif // BASE64_H
