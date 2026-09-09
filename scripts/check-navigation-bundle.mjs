import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Check the emitted code, not just the build configuration: a successful build
// can still lose the namespace that next/link imports at runtime.
const directory = process.argv[2] ?? fileURLToPath(
  new URL("../dist/client/_next/static/chunks/", import.meta.url),
);
const parse = (file) => ts.createSourceFile(
  file, fs.readFileSync(path.join(directory, file), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.JS,
);
function nodes(root, predicate) {
  const found = [];
  function visit(node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}
const linkFile = fs.readdirSync(directory).find((file) => /^link-.*\.js$/.test(file));
assert.ok(linkFile, "The browser Link bundle is missing.");
const link = parse(linkFile);
const navigationImport = nodes(link, (node) =>
  ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword &&
  node.arguments[0] && /^\.\/navigation-[^/]+\.js$/.test(node.arguments[0].text ?? ""),
)[0];
assert.ok(navigationImport, "Link must load a preserved navigation module, not the browser entry.");
const navigation = parse(navigationImport.arguments[0].text);
const exports = new Map(nodes(navigation, ts.isExportSpecifier).map((node) =>
  [node.name.text, (node.propertyName ?? node.name).text],
));
const then = navigationImport.parent;
const selector = ts.isPropertyAccessExpression(then) && then.name.text === "then" &&
  ts.isCallExpression(then.parent) ? then.parent.arguments[0] : null;
const namespaceKey = selector && ts.isArrowFunction(selector) &&
  ts.isPropertyAccessExpression(selector.body) ? selector.body.name.text : null;
let members;
if (namespaceKey) {
  const namespace = exports.get(namespaceKey);
  assert.ok(namespace, "Link selects a navigation namespace that is not exported.");
  const declaration = nodes(navigation, (node) => ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) && node.name.text === namespace && node.initializer &&
    ts.isCallExpression(node.initializer) && node.initializer.arguments[0] &&
    ts.isObjectLiteralExpression(node.initializer.arguments[0]),
  )[0];
  const registration = nodes(navigation, (node) => ts.isCallExpression(node) &&
    node.arguments[0] && ts.isIdentifier(node.arguments[0]) && node.arguments[0].text === namespace &&
    node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1]),
  )[0];
  const getters = declaration?.initializer.arguments[0] ?? registration?.arguments[1];
  assert.ok(getters, "The navigation namespace must retain its named exports.");
  members = new Map(getters.properties.filter(ts.isPropertyAssignment)
    .map((node) => [node.name.text, ts.isArrowFunction(node.initializer) &&
      ts.isIdentifier(node.initializer.body) ? node.initializer.body.text : null]));
} else {
  members = exports;
}
const functions = new Set(nodes(navigation, ts.isFunctionDeclaration)
  .map((node) => node.name?.text));
for (const name of ["navigateClientSide", "getPrefetchInterceptionContext"]) {
  assert.ok(functions.has(members.get(name)), `Navigation export ${name} must be a function.`);
}
console.log("Navigation bundle checked: link navigation and prefetch exports are callable.");
