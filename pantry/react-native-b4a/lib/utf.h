#ifndef UTF_H
#define UTF_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

typedef unsigned char utf8_t;
typedef uint_least16_t utf16_t;
typedef uint_least32_t utf32_t;
typedef unsigned char latin1_t;
typedef unsigned char ascii_t;

#ifdef __cplusplus
}
#endif

#endif // UTF_H
