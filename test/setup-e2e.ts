import * as fs from 'fs';
import * as path from 'path';

const cacheDir = path.resolve(__dirname, '../.cache');

beforeAll(() => {
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
});
