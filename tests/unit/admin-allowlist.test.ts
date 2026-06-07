import { describe, test, expect } from 'vitest';

import {
  parseAllowlist,
  isEmailOnAllowlist,
} from '@/lib/admin-allowlist';

/**
 * Tests for the admin email allowlist — the single gate that protects
 * the admin panel from unauthorized access.
 *
 * Why this matters: a regression here is a security incident. A typo
 * that flips the empty-allowlist policy from "dev open" to "always
 * open" — or breaks case-insensitivity, or fails to trim whitespace —
 * silently lets the wrong people in.
 */
describe('parseAllowlist', () => {
  test('returns empty array for undefined/empty', () => {
    expect(parseAllowlist(undefined)).toEqual([]);
    expect(parseAllowlist('')).toEqual([]);
    expect(parseAllowlist('   ')).toEqual([]);
  });

  test('splits on commas', () => {
    expect(parseAllowlist('a@x.com,b@x.com,c@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
    ]);
  });

  test('trims whitespace around each entry', () => {
    expect(parseAllowlist(' a@x.com , b@x.com ,c@x.com  ')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
    ]);
  });

  test('lowercases all entries (canonicalization)', () => {
    expect(parseAllowlist('Valdez@NovioGroup.com,Admin@X.COM')).toEqual([
      'valdez@noviogroup.com',
      'admin@x.com',
    ]);
  });

  test('drops empty segments from trailing/double commas', () => {
    expect(parseAllowlist('a@x.com,,b@x.com,')).toEqual([
      'a@x.com',
      'b@x.com',
    ]);
  });
});

describe('isEmailOnAllowlist', () => {
  describe('null/empty inputs', () => {
    test('null email returns false even when allowlist is empty', () => {
      // Important: empty allowlist = dev mode, but that mode still
      // requires an authenticated user (i.e. a non-null email).
      expect(isEmailOnAllowlist(null, [])).toBe(false);
      expect(isEmailOnAllowlist(undefined, [])).toBe(false);
    });

    test('null email returns false against populated allowlist', () => {
      expect(isEmailOnAllowlist(null, ['admin@x.com'])).toBe(false);
      expect(isEmailOnAllowlist(undefined, ['admin@x.com'])).toBe(false);
    });
  });

  describe('empty allowlist (dev mode)', () => {
    test('any authenticated email is allowed', () => {
      expect(isEmailOnAllowlist('anyone@example.com', [])).toBe(true);
      expect(isEmailOnAllowlist('attacker@evil.com', [])).toBe(true);
    });
  });

  describe('populated allowlist', () => {
    const allowlist = ['valdez@noviogroup.com', 'admin@bahabuddy.com'];

    test('exact match passes', () => {
      expect(isEmailOnAllowlist('valdez@noviogroup.com', allowlist)).toBe(
        true,
      );
      expect(isEmailOnAllowlist('admin@bahabuddy.com', allowlist)).toBe(true);
    });

    test('case-insensitive match passes', () => {
      // User typed with capitals during login — must still match.
      expect(isEmailOnAllowlist('Valdez@NovioGroup.com', allowlist)).toBe(
        true,
      );
      expect(isEmailOnAllowlist('VALDEZ@NOVIOGROUP.COM', allowlist)).toBe(
        true,
      );
    });

    test('unknown email is rejected', () => {
      expect(isEmailOnAllowlist('intern@noviogroup.com', allowlist)).toBe(
        false,
      );
      expect(isEmailOnAllowlist('attacker@evil.com', allowlist)).toBe(false);
    });

    test('substring matches are rejected (no fuzzy matching)', () => {
      // "valdez@noviogroup.com.evil.com" would be a classic homograph
      // attack — make sure it never resolves.
      expect(
        isEmailOnAllowlist('valdez@noviogroup.com.evil.com', allowlist),
      ).toBe(false);
      expect(isEmailOnAllowlist('xvaldez@noviogroup.com', allowlist)).toBe(
        false,
      );
      expect(isEmailOnAllowlist('valdez@noviogroup', allowlist)).toBe(false);
    });

    test('empty string is rejected (treated as no email)', () => {
      expect(isEmailOnAllowlist('', allowlist)).toBe(false);
    });
  });

  describe('end-to-end via env var (parseAllowlist + isEmailOnAllowlist)', () => {
    test('the auth-provider call shape works for typical config', () => {
      const env = ' Valdez@NovioGroup.com , Admin@BahaBuddy.com ';
      const list = parseAllowlist(env);

      expect(isEmailOnAllowlist('valdez@noviogroup.com', list)).toBe(true);
      expect(isEmailOnAllowlist('Admin@bahabuddy.com', list)).toBe(true);
      expect(isEmailOnAllowlist('outsider@example.com', list)).toBe(false);
    });
  });
});
