const { normalizeBoolean } = require('../src/utils')

describe('Utils', () => {
  describe('normalizeBoolean', () => {
    it('Should manage capatitalized strings', () => {
      expect(normalizeBoolean('TRUE')).toBe(true)
      expect(normalizeBoolean('ON')).toBe(true)
      expect(normalizeBoolean('YES')).toBe(true)
      expect(normalizeBoolean('Y')).toBe(true)
      expect(normalizeBoolean('FALSE')).toBe(false)
      expect(normalizeBoolean('OFF')).toBe(false)
      expect(normalizeBoolean('NO')).toBe(false)
      expect(normalizeBoolean('N')).toBe(false)
    })

    it('Should manage non-trimmed strings', () => {
      expect(normalizeBoolean('true  ')).toBe(true)
      expect(normalizeBoolean('  true')).toBe(true)
      expect(normalizeBoolean(' true ')).toBe(true)
      expect(normalizeBoolean('false  ')).toBe(false)
      expect(normalizeBoolean('  false')).toBe(false)
      expect(normalizeBoolean(' false ')).toBe(false)
      expect(normalizeBoolean(' ')).toBe(false)
    })

    it('Should manage numerical values that are strings', () => {
      expect(normalizeBoolean('1')).toBe(true)
      expect(normalizeBoolean('1.0')).toBe(true)
      expect(normalizeBoolean('1,0')).toBe(true)
      expect(normalizeBoolean('0')).toBe(false)
      expect(normalizeBoolean('0.0')).toBe(false)
      expect(normalizeBoolean('0,0')).toBe(false)
    })

    it('Should manage string edge cases', () => {
      expect(normalizeBoolean('true')).toBe(true)
      expect(normalizeBoolean('on')).toBe(true)
      expect(normalizeBoolean('yes')).toBe(true)
      expect(normalizeBoolean('y')).toBe(true)
      expect(normalizeBoolean('false')).toBe(false)
      expect(normalizeBoolean('off')).toBe(false)
      expect(normalizeBoolean('no')).toBe(false)
      expect(normalizeBoolean('n')).toBe(false)
      expect(normalizeBoolean('')).toBe(false)
      expect(normalizeBoolean('randomValue')).toBe(false)
    })

    it('Should manage number edge cases', () => {
      expect(normalizeBoolean(1)).toBe(true)
      expect(normalizeBoolean(1.0)).toBe(true)
      expect(normalizeBoolean(10)).toBe(false)
      expect(normalizeBoolean(0)).toBe(false)
      expect(normalizeBoolean(0.0)).toBe(false)
      expect(normalizeBoolean(-0)).toBe(false)
      expect(normalizeBoolean(-1)).toBe(false)
      expect(normalizeBoolean(-123)).toBe(false)
      expect(normalizeBoolean(123)).toBe(false)
    })

    it('Should return false for non-primite values', () => {
      expect(normalizeBoolean([])).toBe(false)
      expect(normalizeBoolean(["hello"])).toBe(false)
      expect(normalizeBoolean({})).toBe(false)
      expect(normalizeBoolean({"hello": "world"})).toBe(false)
      expect(normalizeBoolean(() => {})).toBe(false)
    })

    it('Should manage same cases as native Boolean', () => {
      expect(normalizeBoolean(true)).toBe(true)
      expect(normalizeBoolean(false)).toBe(false)
      expect(normalizeBoolean(null)).toBe(false)
      expect(normalizeBoolean("")).toBe(false)
      expect(normalizeBoolean(NaN)).toBe(false)
    })



  })

})
