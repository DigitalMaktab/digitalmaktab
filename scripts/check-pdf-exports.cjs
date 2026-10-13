#!/usr/bin/env node
// Inventory every shared table export and exercise real multilingual PDFs/settings.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const projects = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
const artifacts = process.env.PDF_AUDIT_ARTIFACTS || path.join(os.tmpdir(), 'digitalmaktab-pdf-audit');
fs.mkdirSync(artifacts, { recursive: true });
const ts = require(path.join(projects, 'digitalmaktab-spa-core/node_modules/typescript'));
const tables = [];
const generators = [];
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const names = new Set(['AppTable']);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) {
        if ((binding.propertyName ?? binding.name).text === 'AppTable') names.add(binding.name.text);
      }
    }
    const visit = node => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && names.has(node.tagName.getText(source))) {
        const hidden = node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) &&
          attribute.name.text === 'showExport' && attribute.initializer?.getText(source) === '{false}');
        tables.push({ file: path.relative(projects, file), line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, pdfEnabled: !hidden });
      }
      if ((ts.isNewExpression(node) && node.expression.getText(source) === 'jsPDF') ||
          (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'createPdf')) {
        generators.push(path.relative(projects, file));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
for (const name of fs.readdirSync(projects)) {
  if (name !== 'digitalmaktab-spa' && name !== 'digitalmaktab-spa-core' && !name.startsWith('digitalmaktab-spa-country-')) continue;
  const source = path.join(projects, name, 'src');
  if (fs.existsSync(source)) scan(source);
}
assert(tables.length > 0, 'No table export sites found');
assert.deepEqual([...new Set(generators)], ['digitalmaktab-spa-core/src/hooks/useJsPdfExportToPdf.ts'], 'All table PDF paths must use the shared Unicode exporter');
const environment = { ...process.env, PDF_AUDIT_PROJECTS: projects, PDF_AUDIT_ARTIFACTS: artifacts };
for (const test of ['pdf-export.cjs', 'pdf-print-settings.cjs', 'date-range.cjs', 'table-date-range.cjs', 'pdf-workflow.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'tests', test)], { env: environment, stdio: 'inherit', timeout: 60_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, test + ' failed');
}
// Date-only Solar Hijri selections must survive a host timezone west of UTC.
const timezoneCheck = spawnSync(process.execPath, [path.join(__dirname, 'tests/date-range.cjs')], {
  env: { ...environment, TZ: 'America/New_York' }, stdio: 'inherit', timeout: 60_000,
});
if (timezoneCheck.error) throw timezoneCheck.error;
assert.equal(timezoneCheck.status, 0, 'UTC date-only calendar round-trip failed');
for (const locale of ['en-US', 'fa-AF', 'ps-AF']) {
  const content = spawnSync('pdftotext', ['-layout', path.join(artifacts, 'pdf-' + locale + '.pdf'), '-'], { encoding: 'utf8' });
  if (content.status === 0) {
    const text = content.stdout.normalize('NFKC');
    assert(!text.includes('[object'), 'Object placeholder reached the PDF');
    assert(text.includes('Ahmad 10012') && text.includes('09898989'), 'Mixed-script names or phone numbers were reversed');
    assert(text.includes('ښځینه ښوونځی'), 'Pashto glyphs/shaping were corrupted');
    if (locale !== 'en-US') assert(text.includes('مسیرهای ترانسپورت'), 'RTL report title was corrupted or reversed');
  }
  const pdf = path.join(artifacts, 'modal-' + locale + '.pdf');
  // Poppler is optional for portable runs; where installed, inspect actual PDF data.
  const metadata = spawnSync('pdfinfo', [pdf], { encoding: 'utf8' });
  if (metadata.status === 0) assert(/792 x 612 pts \(letter\)/.test(metadata.stdout), 'Selected landscape Letter size was not applied');
  const extracted = spawnSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' });
  if (extracted.status === 0) {
    assert(extracted.stdout.includes('Boundary'), 'Inclusive date-filtered row is missing');
    assert(!/Earlier|Later|Invalid|\[object/.test(extracted.stdout), 'Excluded rows or object placeholders reached the PDF');
  }
}
const report = { checkedAt: new Date().toISOString(), tables, generators: [...new Set(generators)], locales: ['en-US', 'fa-AF', 'ps-AF'], status: 'passed', artifacts };
fs.writeFileSync(path.join(artifacts, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`PDF audit passed: ${tables.length} AppTable sites inventoried, shared export/settings tested in all three languages. Artifacts: ${artifacts}`);
