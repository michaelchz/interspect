
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const indexPath = path.resolve(__dirname, '../dist/public/index.html');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  let indexHtml = fs.readFileSync(indexPath, 'utf8');

  // 替换占位符为实际版本号
  indexHtml = indexHtml.replace('__APP_VERSION__', version);

  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log(`版本号 ${version} 已成功注入到 ${indexPath}`);
} catch (error) {
  console.error('注入版本号时出错:', error);
  process.exit(1);
}
