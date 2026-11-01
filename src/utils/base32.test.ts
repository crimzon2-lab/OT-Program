import { describe, expect, it } from 'vitest';
import { bitWidth, BitReader, BitWriter, groupByHyphen } from './base32';

describe('src/utils/base32.ts', () => {
  describe('bitWidth', () => {
    it('calculates correct bit widths', () => {
      expect(bitWidth(0)).toBe(0);
      expect(bitWidth(1)).toBe(1);
      expect(bitWidth(2)).toBe(2);
      expect(bitWidth(3)).toBe(2);
      expect(bitWidth(4)).toBe(3);
      expect(bitWidth(7)).toBe(3);
      expect(bitWidth(8)).toBe(4);
      expect(bitWidth(31)).toBe(5);
      expect(bitWidth(45)).toBe(6);
    });
  });

  describe('BitWriter and BitReader roundtrip', () => {
    it('writes and reads various bit widths accurately', () => {
      const writer = new BitWriter();
      writer.write(5, 3); // 101
      writer.write(0, 0); // no-op
      writer.write(19, 5); // 10011
      writer.write(3, 2); // 11
      writer.write(255, 8); // 11111111

      const crockford = writer.toCrockford();
      expect(crockford.length).toBeGreaterThan(0);

      const reader = BitReader.fromCrockford(crockford);
      expect(reader).not.toBeNull();

      expect(reader!.read(3)).toBe(5);
      expect(reader!.read(0)).toBe(0);
      expect(reader!.read(5)).toBe(19);
      expect(reader!.read(2)).toBe(3);
      expect(reader!.read(8)).toBe(255);
    });

    it('safely handles 32+ bits sequential writes without overflow', () => {
      const writer = new BitWriter();
      for (let i = 0; i < 40; i++) {
        writer.write(1, 1);
      }
      expect(writer.length).toBe(40);
      const str = writer.toCrockford();
      expect(str.length).toBe(8); // 40 bits = 8 base32 chars
      const reader = BitReader.fromCrockford(str)!;
      for (let i = 0; i < 40; i++) {
        expect(reader.read(1)).toBe(1);
      }
    });

    it('throws error when reading past remaining bits', () => {
      const writer = new BitWriter();
      writer.write(7, 3);
      const reader = BitReader.fromCrockford(writer.toCrockford())!;
      // 3 bits padded to 5 bits -> remaining 5
      expect(reader.read(3)).toBe(7);
      expect(reader.remainingBits).toBe(2);
      expect(() => reader.read(3)).toThrow();
    });
  });

  describe('Crockford Base32 normalization and error handling', () => {
    it('absorbs confusable characters o/O/i/I/l/L', () => {
      // 0 -> '0', 1 -> '1'
      const r1 = BitReader.fromCrockford('oOlLiI');
      const r2 = BitReader.fromCrockford('001111');
      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r1!.read(30)).toBe(r2!.read(30));
    });

    it('rejects invalid Crockford characters like U', () => {
      expect(BitReader.fromCrockford('123U45')).toBeNull();
      expect(BitReader.fromCrockford('ABC-DEF')).toBeNull(); // hyphen not allowed in raw Crockford reader
      expect(BitReader.fromCrockford('@#$')).toBeNull();
    });
  });

  describe('groupByHyphen', () => {
    it('groups string into 4-char segments separated by hyphen', () => {
      expect(groupByHyphen('')).toBe('');
      expect(groupByHyphen('ABCD')).toBe('ABCD');
      expect(groupByHyphen('ABCDEFGH')).toBe('ABCD-EFGH');
      expect(groupByHyphen('ABCDEFGHI')).toBe('ABCD-EFGH-I');
    });
  });
});
