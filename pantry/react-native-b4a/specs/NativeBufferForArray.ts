import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  byteLengthUTF8(string: string): number

  toStringUTF8(buffer: Object, offset: number, length: number): string

  writeUTF8(
    buffer: Object,
    offset: number,
    length: number,
    string: string
  ): number

  toStringUTF16(buffer: Object, offset: number, length: number): string

  writeUTF16(
    buffer: Object,
    offset: number,
    length: number,
    string: string
  ): number

  toStringBase64(buffer: Object, offset: number, length: number): string

  writeBase64(
    buffer: Object,
    offset: number,
    length: number,
    string: string
  ): number

  toStringHex(buffer: Object, offset: number, length: number): string

  writeHex(
    buffer: Object,
    offset: number,
    length: number,
    string: string
  ): number
}

export default TurboModuleRegistry.getEnforcing<Spec>('BufferForArray')
