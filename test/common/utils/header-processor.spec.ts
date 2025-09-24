import { HeaderProcessor } from '../../../src/common/utils/header-processor';

describe('HeaderProcessor', () => {
  let headerProcessor: HeaderProcessor;

  beforeEach(() => {
    headerProcessor = new HeaderProcessor({});
  });

  describe('get', () => {
    it('should return the correct value for a case-sensitive key', () => {
      headerProcessor.set('Content-Type', 'application/json');
      expect(headerProcessor.get('Content-Type')).toBe('application/json');
    });

    it('should return the correct value for a case-insensitive key', () => {
      headerProcessor.set('content-type', 'application/json');
      expect(headerProcessor.get('Content-Type')).toBe('application/json');
    });

    it('should return undefined if the key is not found', () => {
      expect(headerProcessor.get('Accept')).toBeUndefined();
    });

    it('should handle array values correctly', () => {
      headerProcessor.set('Set-Cookie', ['cookie1=value1', 'cookie2=value2']);
      expect(headerProcessor.get('Set-Cookie')).toEqual(['cookie1=value1', 'cookie2=value2']);
    });

    it('should handle undefined values correctly', () => {
      headerProcessor.set('X-Undefined', undefined);
      expect(headerProcessor.get('X-Undefined')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set a new header', () => {
      headerProcessor.set('Content-Type', 'application/json');
      expect(headerProcessor.get('Content-Type')).toBe('application/json');
    });

    it('should update an existing header (case-sensitive)', () => {
      headerProcessor.set('Content-Type', 'application/json');
      headerProcessor.set('Content-Type', 'text/plain');
      expect(headerProcessor.get('Content-Type')).toBe('text/plain');
    });

    it('should update an existing header (case-insensitive)', () => {
      headerProcessor.set('content-type', 'application/json');
      headerProcessor.set('Content-Type', 'text/plain');
      expect(headerProcessor.get('content-type')).toBe('text/plain');
    });
  });

  describe('delete', () => {
    it('should delete an existing header (case-sensitive)', () => {
      headerProcessor.set('Content-Type', 'application/json');
      headerProcessor.delete('Content-Type');
      expect(headerProcessor.get('Content-Type')).toBeUndefined();
    });

    it('should delete an existing header (case-insensitive)', () => {
      headerProcessor.set('content-type', 'application/json');
      headerProcessor.delete('Content-Type');
      expect(headerProcessor.get('content-type')).toBeUndefined();
    });

    it('should do nothing if the header does not exist', () => {
      headerProcessor.delete('Non-Existent-Header');
      expect(headerProcessor.toRecord()).toEqual({});
    });
  });

  describe('getAsString', () => {
    it('should return string value directly', () => {
      headerProcessor.set('Content-Type', 'application/json');
      expect(headerProcessor.getAsString('Content-Type')).toBe('application/json');
    });

    it('should join array values with comma and space', () => {
      headerProcessor.set('Set-Cookie', ['cookie1=value1', 'cookie2=value2']);
      expect(headerProcessor.getAsString('Set-Cookie')).toBe('cookie1=value1, cookie2=value2');
    });

    it('should return undefined for non-existent header', () => {
      expect(headerProcessor.getAsString('Non-Existent')).toBeUndefined();
    });
  });

  describe('filterForRequest', () => {
    it('should filter out request-specific headers', () => {
      headerProcessor.set('Connection', 'keep-alive');
      headerProcessor.set('Content-Type', 'application/json');
      headerProcessor.set('Proxy-Authenticate', 'Basic');
      headerProcessor.filterForRequest();
      expect(headerProcessor.get('Connection')).toBeUndefined();
      expect(headerProcessor.get('Content-Type')).toBe('application/json');
      expect(headerProcessor.get('Proxy-Authenticate')).toBeUndefined();
    });
  });

  describe('filterForResponse', () => {
    it('should filter out response-specific headers', () => {
      headerProcessor.set('Connection', 'close');
      headerProcessor.set('Content-Type', 'application/json');
      headerProcessor.set('Content-Length', '123');
      headerProcessor.filterForResponse();
      expect(headerProcessor.get('Connection')).toBeUndefined();
      expect(headerProcessor.get('Content-Type')).toBe('application/json');
      expect(headerProcessor.get('Content-Length')).toBeUndefined();
    });
  });

  describe('toRecord', () => {
    it('should return all headers as a record', () => {
      headerProcessor.set('Content-Type', 'application/json');
      headerProcessor.set('Accept', 'application/xml');
      expect(headerProcessor.toRecord()).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/xml',
      });
    });

    it('should not include undefined values in the record', () => {
      headerProcessor.set('Content-Type', 'application/json');
      headerProcessor.set('X-Undefined', undefined);
      expect(headerProcessor.toRecord()).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });
});
