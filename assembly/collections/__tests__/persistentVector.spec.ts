import { PersistentVector } from '../persistentvector';

describe('Persistent vector tests', () => {
  it('empty vector', () => {
    const vector = new PersistentVector<string>('my_vector');
    expect(vector.isEmpty).toBe(true, 'empty vector must have 0 size');
    expect(vector.containsIndex(0)).toBeFalsy(
      'empty vector contains no values',
    );
    expect(vector.get(0)).toBeNull('empty vector contains no values');
  });

  it('basic vector operations', () => {
    const vector = new PersistentVector<string>('my_vector');
    const value = 'some_value';

    // add a value
    vector.push(value);
    // expect(setResult0.isOk()).toBeTruthy('set should be OK');

    // check vector size
    expect(vector.size()).toBe(1, 'size must be 1');
    expect(vector.isEmpty).toBe(false, 'vector must not be empty');

    // check for value
    expect(vector.containsIndex(0)).toBeTruthy('must contain index 0');

    // get value
    expect(vector.get(0)).toStrictEqual(value);

    // replace value
    const updatedValue = value.toUpperCase();
    vector.replace(0, updatedValue);
    // expect(setResult.isOk()).toBeTruthy('set should be OK');

    // check for value
    expect(vector.get(0)).toStrictEqual(updatedValue);

    // check for value
    expect(vector.containsIndex(0)).toBeTruthy('must contain index 0');

    // check vector size
    expect(vector.size()).toBe(1, 'size must be 1');

    // add another value now
    vector.push(updatedValue);
    // // expect(setResult2.isOk()).toBeTruthy('set should be OK');

    // check vector size again
    expect(vector.size()).toBe(2, 'size must be 2');

    // delete value
    vector.swap_remove(0);

    // check vector size again
    expect(vector.size()).toBe(1, 'size must be 1');

    // index 0 should equal updated value
    expect(vector.get(0)).toStrictEqual(updatedValue);
  });

  it('uint8 values', () => {
    const vector = new PersistentVector<Uint8Array>('my_vector');
    const testArr = new Uint8Array(10).fill(255);
    vector.push(testArr);
    //   expect(setResult.isOk()).toBeTruthy('set should be OK');
    expect(vector.size()).toBe(1, 'size must be 1');

    const value = vector.get(0);
    expect(value).not.toBeNull('retrieved value must not be null');
    expect(value).toStrictEqual(testArr);
    let isU8Set = true;
    for (let i = 0; i < testArr.length; i++) {
      if (testArr[i] !== 255) {
        isU8Set = false;
      }
    }
    expect(isU8Set).toBeTruthy('expected an array of u8s of 255');
  });
});
