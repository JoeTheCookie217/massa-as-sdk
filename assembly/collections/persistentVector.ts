import {
  boolToByte,
  bytesToString,
  f64ToBytes,
  i64ToBytes,
  stringToBytes,
  unwrapStaticArray,
  wrapStaticArray,
} from '@massalabs/as-types';
import { Storage } from '../std';

const _KEY_ELEMENT_SUFFIX = '::';

/**
 * This class is one of several convenience collections built on top of the `Storage` class
 * It implements a vector -- a persistent array.
 *
 * To create a vector
 *
 * ```ts
 * let vec = new PersistentVector<string>("v")  // choose a unique prefix per account
 * ```
 *
 * To use the vector
 *
 * ```ts
 * vec.push(value)
 * vec.pop(value)
 * vec.length
 * ```
 *
 * IMPORTANT NOTE:
 * Since all data stored on the blockchain is kept in a single key-value store under the contract account,
 * you must always use a *unique storage prefix* for different collections to avoid data collision.
 *
 * @typeParam K - The generic type parameter `K` can be
 * any [valid AssemblyScript type](https://docs.assemblyscript.org/basics/types).
 */
export class PersistentVector<T> {
  private _elementPrefix: string;
  private length: i32;

  [key: number]: T;

  /**
   * Creates or restores a persistent vector with a given storage prefix.
   * Always use a unique storage prefix for different collections.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v") // note the prefix must be unique (per NEAR account)
   * ```
   *
   * @param prefix - A prefix to use for every key of this vector.
   */
  constructor(prefix: string) {
    this._elementPrefix = prefix + _KEY_ELEMENT_SUFFIX;
    this.length = 0;
  }

  /**
   * @param index - The index of the element to return
   * @returns An internal key for a given index.
   * @internal
   */
  @inline
  private _key(index: i32): StaticArray<u8> {
    return stringToBytes(this._elementPrefix + index.toString());
  }

  /**
   * Checks whether the index is within the range of the vector indices
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * vec.containsIndex(0) // false
   * vec.push("hello world")
   * vec.containsIndex(0) // true
   * ```
   *
   * @param index - The index to check.
   * @returns True if the given index is within the range of the vector indices.
   */
  containsIndex(index: i32): bool {
    return index >= 0 && index < this.length;
  }

  /**
   * Checks if the vector is empty
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * assert(vec.isEmpty)
   * vec.push("hello world")
   * assert(!vec.isEmpty)
   * ```
   *
   * @returns True if the vector is empty.
   */
  get isEmpty(): bool {
    return this.length == 0;
  }

  /**
   * Returns the vector size
   *
   * @example
   * ```ts
   * let vector = new PersistentVector<string> ("m")
   *
   * vector.size()
   * ```
   * @returns the vector size
   */
  size(): usize {
    return this.length;
  }

  /**
   * Retrieves the related value for a given key, or uses the `defaultValue` if not key is found
   *
   * ```ts
   * let vector = new PersistentVector<string>("m")
   *
   * vector.set(0, "world")
   * let found = vector.get("hello")
   * let notFound = vector.get(1, "cruel world")
   *
   * assert(found == "world")
   * assert(notFound == "cruel world")
   * ```
   *
   * @param key - Key of the element.
   * @param defaultValue - The default value if the key is not present.
   * @returns Value for the given key or the default value.
   */
  get(index: i32): T | null {
    if (!this.containsIndex(index)) return null;
    return this.__unchecked_get(index);
  }

  /**
   * @example
   * ```ts
   * let vector = new PersistentVector<string>("m")
   *
   * vector.set(0, "world")
   * ```
   *
   * Sets the new value for the given key.
   * @param key - Key of the element.
   * @param value - The new value of the element.
   */
  set(index: i32, value: T): void {
    if (isString<T>()) {
      Storage.set(this._key(index), stringToBytes(value as string));
    } else if (isInteger<T>()) {
      Storage.set(this._key(index), i64ToBytes(value as i64));
    } else if (isFloat<T>()) {
      Storage.set(this._key(index), f64ToBytes(value as f64));
    } else if (isBoolean<T>()) {
      Storage.set(this._key(index), boolToByte(value as boolean));
    } else if (isArrayLike<T>()) {
      Storage.set(this._key(index), unwrapStaticArray(value as Uint8Array));
    } else {
      // @ts-ignore
      Storage.set(this._key(index), value.toString());
    }
  }

  /**
   * Returns the element of the vector for a given index. Asserts the given index is within the
   * range of the vector.
   *
   * ```ts
   * let vec = PersistentVector<string>("v")
   *
   * vec.push("hello world")
   * vec[0] // "hello world"
   *
   * vec[1] // will throw with failed assertion: "Index out of range"
   * ```
   *
   * @param index - the index The index of the element to return.
   * @returns The element at the given index.
   */
  @operator('[]')
  private __get(index: i32): T {
    assert(this.containsIndex(index), 'Index out of range');
    return this.__unchecked_get(index);
  }

  /**
   * Returns the element of the vector for a given index without checks.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * vec.push("hello world")
   * vec{0} // "hello world"
   *
   * vec{1} // will throw with failed assertion from getSome()
   * ```
   *
   * @param index - the index The index of the element to return.
   * @returns The element at the given index.
   */
  @operator('{}')
  private __unchecked_get(index: i32): T {
    assert(Storage.has(this._key(index)), 'Index out of range');

    if (isString<T>()) {
      // @ts-ignore
      return bytesToString(Storage.get(this._key(index)));
    } else if (isInteger<T>()) {
      // @ts-ignore
      return bytesToI64(Storage.get(this._key(index)));
    } else if (isFloat<T>()) {
      // @ts-ignore
      return bytesToF64(Storage.get(this._key(index)));
    } else if (isBoolean<T>()) {
      // @ts-ignore
      return byteToBool(Storage.get(this._key(index)));
    } else if (isArrayLike<T>()) {
      // @ts-ignore
      return wrapStaticArray(Storage.get(this._key(index)));
    } else {
      // @ts-ignore
      return Storage.get<T>(this._key(index));
      // return null;
    }
  }

  /**
   * Sets the value of an element at the given index. Asserts the given index is within the
   * range of the vector.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * vec.push("hello world")
   * vec[0] = "hello again"
   *
   * assert(vec[0] == "hello again")
   * ```
   *
   * @param index - the index The index of the element.
   * @param value - the index The new value.
   */
  @operator('[]=')
  private __set(index: i32, value: T): void {
    assert(this.containsIndex(index), 'Index out of range');
    this.__unchecked_set(index, value);
  }

  /**
   * Sets the value of an element at the given index without checks.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * vec{0} = "hello world"
   *
   * assert(vec[0] == "hello world")
   * ```
   *
   * @param index - the index The index of the element.
   * @param value - the index The new value.
   */
  @operator('{}=')
  private __unchecked_set(index: i32, value: T): void {
    if (isString<T>()) {
      Storage.set(this._key(index), stringToBytes(value as string));
    } else if (isInteger<T>()) {
      Storage.set(this._key(index), i64ToBytes(value as i64));
    } else if (isFloat<T>()) {
      Storage.set(this._key(index), f64ToBytes(value as f64));
    } else if (isBoolean<T>()) {
      Storage.set(this._key(index), boolToByte(value as boolean));
    } else if (isArrayLike<T>()) {
      Storage.set(this._key(index), unwrapStaticArray(value as Uint8Array));
    } else {
      // @ts-ignore
      Storage.set(this._key(index), value.toString());
    }
  }

  /**
   * Adds a new element to the end of the vector. Increases the length of the vector.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * vec.length // 0
   * vec.push("hello world")
   * vec.length // 1
   * ```
   *
   * @param element - the index A new element to add.
   * @returns The index of a newly added element
   */
  push(element: T): i32 {
    let index = this.length;
    this.length += 1;
    this.__unchecked_set(index, element);
    return index;
  }

  /**
   * Removes the last element from the vector and returns it. Asserts that the vector is not empty.
   * Decreases the length of the vector.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * let text = "hello world"
   *
   * vec.push(text)
   * vec.length // 1
   *
   * let element = vec.pop()
   * vec.length // 0
   *
   * assert(element == text, "PersistentVector returned surprising results, time for a break ;)")
   * ```
   *
   * @returns The removed last element of the vector.
   */
  pop(): T {
    assert(this.length > 0, 'Vector is empty');
    let index = this.length - 1;
    this.length = index;
    let result = this.__unchecked_get(index);
    Storage.del(this._key(index));
    return result;
  }

  /**
   * Removes an element from the vector and returns it. The removed element is replaced by the last element of the
   * vector. Does not preserve ordering, but is O(1). Panics if index is out of bounds.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * // the phrase "the quick brown fox" is well known in English
   *
   * vec.push("the")
   * vec.push("quick")
   * vec.push("red")
   * vec.push("fox")
   * vec.push("brown")
   *
   * let element = vec.swap_remove(2)
   *
   * assert(element == "red", "PersistentVector returned surprising results, time for a break ;)")
   * assert(vec[2] == "brown", "PersistentVector returned surprising results, time for a break ;)")
   * ```
   *
   * @param index - the index
   * @returns The element that was removed
   */
  swap_remove(index: i32): T {
    assert(index < this.length, 'Index out of bounds');
    if (index + 1 == this.length) {
      return this.pop();
    } else {
      // Swap last element with this one.
      let currValue = this.__unchecked_get(index);
      let lastValue = this.__unchecked_get(this.length - 1);
      Storage.del(this._key(this.length - 1));
      this.__unchecked_set(index, lastValue);
      this.length -= 1;
      return currValue;
    }
  }

  /**
   * Inserts the element at index, returns evicted element. Panics if index is out of bounds.
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * // the phrase "the quick brown fox" is well known in English
   *
   * vec.push("the")
   * vec.push("quick")
   * vec.push("red")
   * vec.push("fox")
   *
   * let element = vec.replace(2, "brown")
   *
   * assert(element == "red", "PersistentVector returned surprising results, time for a break ;)")
   * assert(vec[2] == "brown", "PersistentVector returned surprising results, time for a break ;)")
   * ```
   *
   * @param index - the index The index of the element to replace
   * @param newElement - the index The new value of the element to replace
   * @returns The element that was replaced
   */
  replace(index: i32, newElement: T): T {
    assert(index < this.length, 'Index out of bounds');
    let evicted = this.__unchecked_get(index);
    this.set(index, newElement);
    return evicted;
  }

  /**
   * Returns the last element of the vector
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * // the phrase "the quick brown fox" is well known in English
   *
   * vec.push("the")
   * vec.push("quick")
   * vec.push("brown")
   * vec.push("fox")
   *
   * assert(vec.back == "fox", "PersistentVector returned surprising results, time for a break ;)")
   * ```
   *
   * @returns The last element of the vector. Asserts that the vector is not empty.
   */
  get back(): T {
    return this.__get(this.length - 1);
  }

  /**
   * Returns the first element of the vector
   *
   * ```ts
   * let vec = new PersistentVector<string>("v")
   *
   * // the phrase "the quick brown fox" is well known in English
   *
   * vec.push("the")
   * vec.push("quick")
   * vec.push("brown")
   * vec.push("fox")
   *
   * assert(vec.front == "the", "PersistentVector returned surprising results, time for a break ;)")
   * ```
   *
   * @returns The first element of the vector. Asserts that the vector is not empty.
   */
  get front(): T {
    return this.__get(0);
  }
}
