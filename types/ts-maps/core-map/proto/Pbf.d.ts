// Protobuf decoder — in-house, zero-dep.
// Inspired by the wire-format descriptions in mapbox/pbf (BSD-3-Clause);
// this implementation is an independent TypeScript rewrite.
//
// Implements the subset of the protobuf wire format needed to read
// Mapbox Vector Tiles v2 (plus symmetric write support for fixtures
// and debug tooling). Groups (wire types 3 and 4) are not supported.
// See https://protobuf.dev/programming-guides/encoding/ for details.
// Wire types, per the protobuf spec.
export declare const PBF_VARINT: number;
export declare const PBF_FIXED64: number;
export declare const PBF_BYTES: number;
export declare const PBF_FIXED32: number;
// eslint-disable-next-line no-unused-vars
export type PbfReadFieldFn<T> = (tag: number, result: T, pbf: Pbf) => void;
// eslint-disable-next-line no-unused-vars
export type PbfWriteFn<V> = (value: V, pbf: Pbf) => void;
export declare class Pbf {
  buf: Uint8Array;
  pos: number;
  type: number;
  length: number;
  constructor(buf?: Uint8Array | ArrayBuffer);
  readFields<T>(readField: PbfReadFieldFn<T>, result: T, end?: number): T;
  readMessage<T>(readField: PbfReadFieldFn<T>, result: T): T;
  readFixed32(): number;
  readSFixed32(): number;
  readFixed64(): number;
  readSFixed64(): number;
  readFloat(): number;
  readDouble(): number;
  readVarint(isSigned?: boolean): number;
  readVarint64(): number;
  readSVarint(): number;
  readBoolean(): boolean;
  readString(): string;
  readBytes(): Uint8Array;
  readPackedVarint(arr?: number[], isSigned?: boolean): number[];
  readPackedSVarint(arr?: number[]): number[];
  readPackedBoolean(arr?: boolean[]): boolean[];
  readPackedFloat(arr?: number[]): number[];
  readPackedDouble(arr?: number[]): number[];
  readPackedFixed32(arr?: number[]): number[];
  readPackedSFixed32(arr?: number[]): number[];
  readPackedFixed64(arr?: number[]): number[];
  readPackedSFixed64(arr?: number[]): number[];
  skip(val: number): void;
  writeTag(tag: number, type: number): void;
  realloc(min: number): void;
  finish(): Uint8Array;
  destroy(): void;
  writeVarint(val: number): void;
  writeSVarint(val: number): void;
  writeBoolean(val: boolean): void;
  writeString(str: string): void;
  writeFloat(val: number): void;
  writeDouble(val: number): void;
  writeBytes(bytes: Uint8Array): void;
  writeRawFixed32(val: number): void;
  writeRawSFixed32(val: number): void;
  writeRawFixed64(val: number): void;
  writeRawSFixed64(val: number): void;
  writeMessage<V>(tag: number, fn: PbfWriteFn<V>, value: V): void;
  writePackedVarint(tag: number, arr: number[]): void;
  writePackedSVarint(tag: number, arr: number[]): void;
  writePackedBoolean(tag: number, arr: boolean[]): void;
  writePackedFloat(tag: number, arr: number[]): void;
  writePackedDouble(tag: number, arr: number[]): void;
  writePackedFixed32(tag: number, arr: number[]): void;
  writePackedSFixed32(tag: number, arr: number[]): void;
  writePackedFixed64(tag: number, arr: number[]): void;
  writePackedSFixed64(tag: number, arr: number[]): void;
  writeBytesField(tag: number, buffer: Uint8Array): void;
  writeFixed32(tag: number, val: number): void;
  writeSFixed32(tag: number, val: number): void;
  writeFixed64(tag: number, val: number): void;
  writeSFixed64(tag: number, val: number): void;
  writeVarintField(tag: number, val: number): void;
  writeSVarintField(tag: number, val: number): void;
  writeStringField(tag: number, str: string): void;
  writeFloatField(tag: number, val: number): void;
  writeDoubleField(tag: number, val: number): void;
  writeBooleanField(tag: number, val: boolean): void;
}
