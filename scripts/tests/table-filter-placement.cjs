// Guard table filters in every installed SPA package, including wrapper tables.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const projects = path.resolve(__dirname, '../../..');
const ts = require(projects + '/digitalmaktab-spa-core/node_modules/typescript');
const violations = []; let tables = 0, filters = 0;
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : entry.name.endsWith('.tsx') ? [path.join(directory, entry.name)] : []);
for (const repo of fs.readdirSync(projects).filter(name => /^digitalmaktab-spa(?:$|-core$|-country-|-school-)/.test(name))) {
  const directory = path.join(projects, repo, 'src'); if (!fs.existsSync(directory)) continue;
  for (const file of walk(directory)) {
    const text = fs.readFileSync(file, 'utf8'); if (!/<App(?:Table|GradeBook|AttendanceSummary)/.test(text)) continue;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const tag = node.tagName.getText(source);
        if (tag === 'AppTable') tables++;
        if (/^App(?:.*Select|LocalDatePicker|StandaloneInput|Checkbox)$/.test(tag)) {
          let parent = node.parent, owned = false;
          const name = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'name')?.initializer?.getText(source);
          // These fields create a promotion; they do not select/narrow roster rows.
          if (file.endsWith('/GraduationBatch.tsx') && ['"promoteSource"', '"promoteDest"'].includes(name)) owned = true;
          while (parent) {
            if (ts.isJsxAttribute(parent) && ['filterControls', 'modalContent', 'render', 'columns', 'tabs'].includes(parent.name.getText(source))) owned = true;
            if (ts.isJsxElement(parent) && /^App(?:Form|Modal)/.test(parent.openingElement.tagName.getText(source))) owned = true;
            if (ts.isVariableDeclaration(parent) && (parent.name.getText(source) === 'columns' || /Cell$/.test(parent.name.getText(source)))) owned = true;
            parent = parent.parent;
          }
          if (owned) filters++; else violations.push(path.relative(projects, file) + ':' + (source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1) + ' ' + tag);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
assert(tables > 80); assert(filters > 30);
assert.deepEqual(violations, [], 'Table filter controls must live in AppTable.filterControls or a column filter; record forms/cells are separate.');
console.log(`PASS: audited ${tables} AppTable sites across installed SPA packages; no filter controls remain outside the shared section.`);
