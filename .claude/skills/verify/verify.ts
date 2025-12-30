#!/usr/bin/env npx ts-node
/**
 * Spec Verification Helper (TypeScript)
 *
 * Automates verification checks against a codebase with enhanced
 * TypeScript-specific analysis using the TypeScript compiler API.
 *
 * Usage:
 *   npx ts-node verify.ts find-file <filename>
 *   npx ts-node verify.ts find-function <functionName> [--file <hint>]
 *   npx ts-node verify.ts check-dependency <packageName>
 *   npx ts-node verify.ts check-export <symbol> <file>
 *   npx ts-node verify.ts check-signature <symbol> <file> [--expected <signature>]
 *   npx ts-node verify.ts naming-convention [--sample-size <n>]
 *   npx ts-node verify.ts analyze-types <file>
 */

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { execSync } from "child_process";

// ============================================================================
// Types
// ============================================================================

interface VerificationResult {
  status:
    | "EXISTS"
    | "NOT_FOUND"
    | "FOUND"
    | "INSTALLED"
    | "NOT_INSTALLED"
    | "EXPORTED"
    | "NOT_EXPORTED"
    | "MATCH"
    | "MISMATCH"
    | "ANALYZED"
    | "ERROR";
  message: string;
  [key: string]: unknown;
}

interface FileResult extends VerificationResult {
  path: string;
  similar?: string[];
}

interface FunctionMatch {
  file: string;
  line: number;
  column: number;
  name: string;
  signature: string;
  isExported: boolean;
  isAsync: boolean;
  parameters: ParameterInfo[];
  returnType: string;
}

interface FunctionResult extends VerificationResult {
  function: string;
  matches: FunctionMatch[];
}

interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

interface DependencyInfo {
  file: string;
  type: string;
  version: string;
}

interface DependencyResult extends VerificationResult {
  package: string;
  foundIn: DependencyInfo[];
  alternatives?: string[];
}

interface ExportResult extends VerificationResult {
  symbol: string;
  file: string;
  kind?: string;
  signature?: string;
}

interface SignatureResult extends VerificationResult {
  symbol: string;
  file: string;
  expected?: string;
  actual?: string;
  differences?: string[];
}

interface NamingConventionResult extends VerificationResult {
  fileConvention: string;
  functionConvention: string;
  variableConvention: string;
  classConvention: string;
  examples: {
    files: string[];
    functions: string[];
    variables: string[];
    classes: string[];
  };
}

interface TypeInfo {
  name: string;
  kind: string;
  exported: boolean;
  properties?: PropertyInfo[];
  methods?: MethodInfo[];
  extends?: string[];
  implements?: string[];
}

interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  readonly: boolean;
}

interface MethodInfo {
  name: string;
  signature: string;
  parameters: ParameterInfo[];
  returnType: string;
}

interface TypeAnalysisResult extends VerificationResult {
  file: string;
  types: TypeInfo[];
  interfaces: TypeInfo[];
  classes: TypeInfo[];
  functions: FunctionMatch[];
  exports: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

function findRoot(): string {
  let current = process.cwd();
  while (current !== "/") {
    if (
      fs.existsSync(path.join(current, "package.json")) ||
      fs.existsSync(path.join(current, "tsconfig.json")) ||
      fs.existsSync(path.join(current, ".git"))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

function walkDir(
  dir: string,
  callback: (file: string) => void,
  options?: { maxDepth?: number; exclude?: RegExp[] },
): void {
  const maxDepth = options?.maxDepth ?? 10;
  const exclude = options?.exclude ?? [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.next/,
  ];

  function walk(currentDir: string, depth: number): void {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      if (exclude.some((re) => re.test(relativePath))) continue;

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        callback(fullPath);
      }
    }
  }

  walk(dir, 0);
}

function inferNamingStyle(name: string): string {
  if (name.includes("-")) return "kebab-case";
  if (name.includes("_")) {
    if (name === name.toUpperCase()) return "SCREAMING_SNAKE_CASE";
    return "snake_case";
  }
  if (name[0] === name[0].toUpperCase() && name.length > 1) return "PascalCase";
  return "camelCase";
}

function createProgram(files: string[]): ts.Program {
  const configPath = ts.findConfigFile(
    findRoot(),
    ts.sys.fileExists,
    "tsconfig.json",
  );

  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS,
    allowJs: true,
    checkJs: false,
    strict: false,
    skipLibCheck: true,
    noEmit: true,
  };

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath),
    );
    compilerOptions = { ...compilerOptions, ...parsedConfig.options };
  }

  return ts.createProgram(files, compilerOptions);
}

function getTypeString(type: ts.Type, checker: ts.TypeChecker): string {
  return checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
}

function getNodeSignature(node: ts.Node, checker: ts.TypeChecker): string {
  const signature = checker.getSignatureFromDeclaration(
    node as ts.SignatureDeclaration,
  );
  if (signature) {
    return checker.signatureToString(signature);
  }
  return "";
}

// ============================================================================
// Verification Functions
// ============================================================================

function findFile(root: string, filename: string): FileResult {
  const targetPath = path.join(root, filename);

  if (fs.existsSync(targetPath)) {
    return {
      status: "EXISTS",
      path: filename,
      message: `File exists at ${filename}`,
    };
  }

  const basename = path.basename(filename);
  const nameWithoutExt = path.parse(filename).name.toLowerCase();
  const similar: string[] = [];

  walkDir(root, (file) => {
    const relPath = path.relative(root, file);
    const fileBasename = path.basename(file);
    const fileNameWithoutExt = path.parse(file).name.toLowerCase();

    if (fileBasename === basename) {
      similar.push(relPath);
    } else if (
      fileNameWithoutExt.includes(nameWithoutExt) ||
      nameWithoutExt.includes(fileNameWithoutExt)
    ) {
      similar.push(relPath);
    }
  });

  return {
    status: "NOT_FOUND",
    path: filename,
    similar: similar.slice(0, 10),
    message:
      similar.length > 0
        ? `File not found, but similar files exist`
        : `File not found: ${filename}`,
  };
}

function findFunction(
  root: string,
  functionName: string,
  fileHint?: string,
): FunctionResult {
  const filesToCheck: string[] = [];

  if (fileHint) {
    const hintPath = path.join(root, fileHint);
    if (fs.existsSync(hintPath)) {
      filesToCheck.push(hintPath);
    }
  }

  if (filesToCheck.length === 0) {
    walkDir(root, (file) => {
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        filesToCheck.push(file);
      }
    });
  }

  const matches: FunctionMatch[] = [];
  const program = createProgram(filesToCheck);
  const checker = program.getTypeChecker();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    if (
      !filesToCheck.some((f) =>
        sourceFile.fileName.includes(f.replace(root, "")),
      )
    )
      continue;

    ts.forEachChild(sourceFile, function visit(node) {
      let name: string | undefined;
      let isExported = false;
      let isAsync = false;
      let parameters: ParameterInfo[] = [];
      let returnType = "unknown";
      let signature = "";

      // Function declaration
      if (ts.isFunctionDeclaration(node) && node.name) {
        name = node.name.text;
        isExported = !!node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        isAsync = !!node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
        );
        signature = getNodeSignature(node, checker);
        parameters = node.parameters.map((p) => ({
          name: p.name.getText(),
          type: p.type ? p.type.getText() : "any",
          optional: !!p.questionToken,
          defaultValue: p.initializer?.getText(),
        }));
        if (node.type) {
          returnType = node.type.getText();
        }
      }

      // Arrow function in variable declaration
      if (ts.isVariableStatement(node)) {
        isExported = !!node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            if (
              ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer)
            ) {
              name = decl.name.text;
              const fn = decl.initializer;
              isAsync = !!fn.modifiers?.some(
                (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
              );
              signature = getNodeSignature(fn, checker);
              parameters = fn.parameters.map((p) => ({
                name: p.name.getText(),
                type: p.type ? p.type.getText() : "any",
                optional: !!p.questionToken,
                defaultValue: p.initializer?.getText(),
              }));
              if (fn.type) {
                returnType = fn.type.getText();
              }
            }
          }
        }
      }

      // Method declaration in class
      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        name = node.name.text;
        isExported = true; // Methods are accessible if class is exported
        isAsync = !!node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
        );
        signature = getNodeSignature(node, checker);
        parameters = node.parameters.map((p) => ({
          name: p.name.getText(),
          type: p.type ? p.type.getText() : "any",
          optional: !!p.questionToken,
          defaultValue: p.initializer?.getText(),
        }));
        if (node.type) {
          returnType = node.type.getText();
        }

        // Check if parent class is exported
        const parent = node.parent;
        if (ts.isClassDeclaration(parent)) {
          isExported = !!parent.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword,
          );
        }
      }

      if (name === functionName) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(),
        );
        matches.push({
          file: path.relative(root, sourceFile.fileName),
          line: line + 1,
          column: character + 1,
          name,
          signature:
            signature ||
            `${name}(${parameters.map((p) => `${p.name}: ${p.type}`).join(", ")}): ${returnType}`,
          isExported,
          isAsync,
          parameters,
          returnType,
        });
      }

      ts.forEachChild(node, visit);
    });
  }

  if (matches.length > 0) {
    return {
      status: "FOUND",
      function: functionName,
      matches,
      message: `Found ${matches.length} definition(s) for ${functionName}`,
    };
  }

  return {
    status: "NOT_FOUND",
    function: functionName,
    matches: [],
    message: `Function/method '${functionName}' not found`,
  };
}

function checkDependency(root: string, packageName: string): DependencyResult {
  const foundIn: DependencyInfo[] = [];

  // Check package.json
  const packageJsonPath = path.join(root, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      if (pkg.dependencies?.[packageName]) {
        foundIn.push({
          file: "package.json",
          type: "dependencies",
          version: pkg.dependencies[packageName],
        });
      }
      if (pkg.devDependencies?.[packageName]) {
        foundIn.push({
          file: "package.json",
          type: "devDependencies",
          version: pkg.devDependencies[packageName],
        });
      }
      if (pkg.peerDependencies?.[packageName]) {
        foundIn.push({
          file: "package.json",
          type: "peerDependencies",
          version: pkg.peerDependencies[packageName],
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check if actually installed in node_modules
  const nodeModulesPath = path.join(root, "node_modules", packageName);
  const isInstalled = fs.existsSync(nodeModulesPath);

  if (foundIn.length > 0) {
    return {
      status: "INSTALLED",
      package: packageName,
      foundIn,
      message: `Package '${packageName}' is ${isInstalled ? "installed" : "listed but not installed (run npm install)"}`,
    };
  }

  // Look for alternatives with similar names
  const alternatives: string[] = [];
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const allDeps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];

      const lowerName = packageName.toLowerCase();
      for (const dep of allDeps) {
        if (
          dep.toLowerCase().includes(lowerName) ||
          lowerName.includes(dep.toLowerCase())
        ) {
          alternatives.push(dep);
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    status: "NOT_INSTALLED",
    package: packageName,
    foundIn: [],
    alternatives: alternatives.slice(0, 5),
    message: `Package '${packageName}' not found${alternatives.length > 0 ? `, similar packages: ${alternatives.join(", ")}` : ""}`,
  };
}

function checkExport(
  root: string,
  symbol: string,
  filePath: string,
): ExportResult {
  const fullPath = path.join(root, filePath);

  if (!fs.existsSync(fullPath)) {
    return {
      status: "ERROR",
      symbol,
      file: filePath,
      message: `File not found: ${filePath}`,
    };
  }

  const program = createProgram([fullPath]);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fullPath);

  if (!sourceFile) {
    return {
      status: "ERROR",
      symbol,
      file: filePath,
      message: `Could not parse file: ${filePath}`,
    };
  }

  let found = false;
  let isExported = false;
  let kind = "";
  let signature = "";

  ts.forEachChild(sourceFile, function visit(node) {
    // Check various declaration types
    if (ts.isFunctionDeclaration(node) && node.name?.text === symbol) {
      found = true;
      kind = "function";
      isExported = !!node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      signature = getNodeSignature(node, checker);
    }

    if (ts.isClassDeclaration(node) && node.name?.text === symbol) {
      found = true;
      kind = "class";
      isExported = !!node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
    }

    if (ts.isInterfaceDeclaration(node) && node.name.text === symbol) {
      found = true;
      kind = "interface";
      isExported = !!node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
    }

    if (ts.isTypeAliasDeclaration(node) && node.name.text === symbol) {
      found = true;
      kind = "type";
      isExported = !!node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
    }

    if (ts.isEnumDeclaration(node) && node.name.text === symbol) {
      found = true;
      kind = "enum";
      isExported = !!node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
    }

    if (ts.isVariableStatement(node)) {
      const varExported = !!node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === symbol) {
          found = true;
          kind = "variable";
          isExported = varExported;
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer))
          ) {
            kind = "function";
            signature = getNodeSignature(decl.initializer, checker);
          }
        }
      }
    }

    // Check export declarations: export { symbol }
    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const element of node.exportClause.elements) {
        if (element.name.text === symbol) {
          isExported = true;
        }
      }
    }

    // Check default export
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      if (ts.isIdentifier(node.expression) && node.expression.text === symbol) {
        isExported = true;
      }
    }

    ts.forEachChild(node, visit);
  });

  if (!found) {
    return {
      status: "NOT_FOUND",
      symbol,
      file: filePath,
      message: `Symbol '${symbol}' not found in ${filePath}`,
    };
  }

  if (!isExported) {
    return {
      status: "NOT_EXPORTED",
      symbol,
      file: filePath,
      kind,
      signature: signature || undefined,
      message: `Symbol '${symbol}' exists but is not exported from ${filePath}`,
    };
  }

  return {
    status: "EXPORTED",
    symbol,
    file: filePath,
    kind,
    signature: signature || undefined,
    message: `Symbol '${symbol}' (${kind}) is exported from ${filePath}`,
  };
}

function checkSignature(
  root: string,
  symbol: string,
  filePath: string,
  expectedSignature?: string,
): SignatureResult {
  const fullPath = path.join(root, filePath);

  if (!fs.existsSync(fullPath)) {
    return {
      status: "ERROR",
      symbol,
      file: filePath,
      message: `File not found: ${filePath}`,
    };
  }

  const program = createProgram([fullPath]);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fullPath);

  if (!sourceFile) {
    return {
      status: "ERROR",
      symbol,
      file: filePath,
      message: `Could not parse file: ${filePath}`,
    };
  }

  let actualSignature: string | undefined;

  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === symbol) {
      actualSignature = getNodeSignature(node, checker);
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === symbol &&
          decl.initializer
        ) {
          if (
            ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer)
          ) {
            actualSignature = getNodeSignature(decl.initializer, checker);
          }
        }
      }
    }

    if (
      ts.isMethodDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === symbol
    ) {
      actualSignature = getNodeSignature(node, checker);
    }

    ts.forEachChild(node, visit);
  });

  if (!actualSignature) {
    return {
      status: "NOT_FOUND",
      symbol,
      file: filePath,
      message: `Function '${symbol}' not found in ${filePath}`,
    };
  }

  if (!expectedSignature) {
    return {
      status: "FOUND",
      symbol,
      file: filePath,
      actual: actualSignature,
      message: `Found signature: ${actualSignature}`,
    };
  }

  // Normalize signatures for comparison (remove whitespace differences)
  const normalizeSignature = (sig: string) => sig.replace(/\s+/g, " ").trim();
  const normalizedActual = normalizeSignature(actualSignature);
  const normalizedExpected = normalizeSignature(expectedSignature);

  if (normalizedActual === normalizedExpected) {
    return {
      status: "MATCH",
      symbol,
      file: filePath,
      expected: expectedSignature,
      actual: actualSignature,
      message: `Signature matches expected`,
    };
  }

  return {
    status: "MISMATCH",
    symbol,
    file: filePath,
    expected: expectedSignature,
    actual: actualSignature,
    differences: [
      `Expected: ${expectedSignature}`,
      `Actual: ${actualSignature}`,
    ],
    message: `Signature does not match expected`,
  };
}

function analyzeNamingConventions(
  root: string,
  sampleSize: number = 30,
): NamingConventionResult {
  const filenames: string[] = [];
  const functionNames: string[] = [];
  const variableNames: string[] = [];
  const classNames: string[] = [];

  const filesToAnalyze: string[] = [];

  walkDir(root, (file) => {
    if (/\.(ts|tsx)$/.test(file) && !file.includes(".d.ts")) {
      filesToAnalyze.push(file);
      filenames.push(path.parse(file).name);
    }
  });

  // Analyze a sample of files for code patterns
  const sample = filesToAnalyze.slice(0, sampleSize);
  const program = createProgram(sample);

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    if (!sample.includes(sourceFile.fileName)) continue;

    ts.forEachChild(sourceFile, function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functionNames.push(node.name.text);
      }

      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (
          node.initializer &&
          (ts.isArrowFunction(node.initializer) ||
            ts.isFunctionExpression(node.initializer))
        ) {
          functionNames.push(name);
        } else {
          variableNames.push(name);
        }
      }

      if (ts.isClassDeclaration(node) && node.name) {
        classNames.push(node.name.text);
      }

      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        functionNames.push(node.name.text);
      }

      ts.forEachChild(node, visit);
    });
  }

  // Count conventions
  const countConventions = (names: string[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const name of names) {
      const style = inferNamingStyle(name);
      counts[style] = (counts[style] || 0) + 1;
    }
    return counts;
  };

  const getDominant = (counts: Record<string, number>): string => {
    let max = 0;
    let dominant = "unknown";
    for (const [style, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        dominant = style;
      }
    }
    return dominant;
  };

  const fileCounts = countConventions(filenames);
  const functionCounts = countConventions(functionNames);
  const variableCounts = countConventions(variableNames);
  const classCounts = countConventions(classNames);

  return {
    status: "ANALYZED",
    fileConvention: getDominant(fileCounts),
    functionConvention: getDominant(functionCounts),
    variableConvention: getDominant(variableCounts),
    classConvention: getDominant(classCounts),
    examples: {
      files: filenames.slice(0, 5),
      functions: functionNames.slice(0, 10),
      variables: variableNames.slice(0, 10),
      classes: classNames.slice(0, 5),
    },
    message: "Naming conventions analyzed from codebase",
  };
}

function analyzeTypes(root: string, filePath: string): TypeAnalysisResult {
  const fullPath = path.join(root, filePath);

  if (!fs.existsSync(fullPath)) {
    return {
      status: "ERROR",
      file: filePath,
      types: [],
      interfaces: [],
      classes: [],
      functions: [],
      exports: [],
      message: `File not found: ${filePath}`,
    };
  }

  const program = createProgram([fullPath]);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fullPath);

  if (!sourceFile) {
    return {
      status: "ERROR",
      file: filePath,
      types: [],
      interfaces: [],
      classes: [],
      functions: [],
      exports: [],
      message: `Could not parse file: ${filePath}`,
    };
  }

  const types: TypeInfo[] = [];
  const interfaces: TypeInfo[] = [];
  const classes: TypeInfo[] = [];
  const functions: FunctionMatch[] = [];
  const exports: string[] = [];

  ts.forEachChild(sourceFile, function visit(node) {
    const isExported =
      ts.canHaveModifiers(node) &&
      ts
        .getModifiers(node)
        ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    if (ts.isTypeAliasDeclaration(node)) {
      types.push({
        name: node.name.text,
        kind: "type",
        exported: !!isExported,
      });
      if (isExported) exports.push(node.name.text);
    }

    if (ts.isInterfaceDeclaration(node)) {
      const properties: PropertyInfo[] = [];
      const methods: MethodInfo[] = [];

      for (const member of node.members) {
        if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
          properties.push({
            name: member.name.text,
            type: member.type?.getText() || "unknown",
            optional: !!member.questionToken,
            readonly: !!member.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.ReadonlyKeyword,
            ),
          });
        }
        if (ts.isMethodSignature(member) && ts.isIdentifier(member.name)) {
          methods.push({
            name: member.name.text,
            signature: getNodeSignature(member, checker),
            parameters: member.parameters.map((p) => ({
              name: p.name.getText(),
              type: p.type?.getText() || "any",
              optional: !!p.questionToken,
            })),
            returnType: member.type?.getText() || "unknown",
          });
        }
      }

      const extendsClause = node.heritageClauses?.find(
        (c) => c.token === ts.SyntaxKind.ExtendsKeyword,
      );

      interfaces.push({
        name: node.name.text,
        kind: "interface",
        exported: !!isExported,
        properties,
        methods,
        extends: extendsClause?.types.map((t) => t.getText()),
      });
      if (isExported) exports.push(node.name.text);
    }

    if (ts.isClassDeclaration(node) && node.name) {
      const properties: PropertyInfo[] = [];
      const methods: MethodInfo[] = [];

      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name)) {
          properties.push({
            name: member.name.text,
            type: member.type?.getText() || "unknown",
            optional: !!member.questionToken,
            readonly: !!member.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.ReadonlyKeyword,
            ),
          });
        }
        if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
          methods.push({
            name: member.name.text,
            signature: getNodeSignature(member, checker),
            parameters: member.parameters.map((p) => ({
              name: p.name.getText(),
              type: p.type?.getText() || "any",
              optional: !!p.questionToken,
            })),
            returnType: member.type?.getText() || "unknown",
          });
        }
      }

      const extendsClause = node.heritageClauses?.find(
        (c) => c.token === ts.SyntaxKind.ExtendsKeyword,
      );
      const implementsClause = node.heritageClauses?.find(
        (c) => c.token === ts.SyntaxKind.ImplementsKeyword,
      );

      classes.push({
        name: node.name.text,
        kind: "class",
        exported: !!isExported,
        properties,
        methods,
        extends: extendsClause?.types.map((t) => t.getText()),
        implements: implementsClause?.types.map((t) => t.getText()),
      });
      if (isExported) exports.push(node.name.text);
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(),
      );
      functions.push({
        file: filePath,
        line: line + 1,
        column: character + 1,
        name: node.name.text,
        signature: getNodeSignature(node, checker),
        isExported: !!isExported,
        isAsync: !!node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
        ),
        parameters: node.parameters.map((p) => ({
          name: p.name.getText(),
          type: p.type?.getText() || "any",
          optional: !!p.questionToken,
        })),
        returnType: node.type?.getText() || "unknown",
      });
      if (isExported) exports.push(node.name.text);
    }

    ts.forEachChild(node, visit);
  });

  return {
    status: "ANALYZED",
    file: filePath,
    types,
    interfaces,
    classes,
    functions,
    exports,
    message: `Analyzed ${filePath}: ${types.length} types, ${interfaces.length} interfaces, ${classes.length} classes, ${functions.length} functions`,
  };
}

// ============================================================================
// CLI
// ============================================================================

function printHelp(): void {
  console.log(`
Spec Verification Helper (TypeScript)

Usage:
  npx ts-node verify.ts <command> [options]

Commands:
  find-file <filename>                    Check if a file exists
  find-function <name> [--file <hint>]    Find a function/method definition
  check-dependency <package>              Check if a package is installed
  check-export <symbol> <file>            Check if a symbol is exported
  check-signature <symbol> <file>         Get or compare function signature
    [--expected <signature>]
  naming-convention [--sample-size <n>]   Analyze codebase naming conventions
  analyze-types <file>                    Analyze all types in a file

Options:
  --root, -r <path>    Root directory (default: auto-detect)
  --help, -h           Show this help message

Examples:
  npx ts-node verify.ts find-file src/services/UserService.ts
  npx ts-node verify.ts find-function createUser --file src/services/UserService.ts
  npx ts-node verify.ts check-dependency axios
  npx ts-node verify.ts check-export UserService src/services/UserService.ts
  npx ts-node verify.ts check-signature findById src/repositories/UserRepository.ts
  npx ts-node verify.ts naming-convention --sample-size 50
  npx ts-node verify.ts analyze-types src/models/User.ts
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  // Parse --root option
  let root = findRoot();
  const rootIndex = args.findIndex((a) => a === "--root" || a === "-r");
  if (rootIndex !== -1 && args[rootIndex + 1]) {
    root = path.resolve(args[rootIndex + 1]);
    args.splice(rootIndex, 2);
  }

  const command = args[0];
  let result: VerificationResult;

  try {
    switch (command) {
      case "find-file": {
        if (!args[1]) throw new Error("Missing filename argument");
        result = findFile(root, args[1]);
        break;
      }

      case "find-function": {
        if (!args[1]) throw new Error("Missing function name argument");
        const fileIndex = args.indexOf("--file");
        const fileHint = fileIndex !== -1 ? args[fileIndex + 1] : undefined;
        result = findFunction(root, args[1], fileHint);
        break;
      }

      case "check-dependency": {
        if (!args[1]) throw new Error("Missing package name argument");
        result = checkDependency(root, args[1]);
        break;
      }

      case "check-export": {
        if (!args[1] || !args[2])
          throw new Error("Missing symbol or file argument");
        result = checkExport(root, args[1], args[2]);
        break;
      }

      case "check-signature": {
        if (!args[1] || !args[2])
          throw new Error("Missing symbol or file argument");
        const expectedIndex = args.indexOf("--expected");
        const expected =
          expectedIndex !== -1 ? args[expectedIndex + 1] : undefined;
        result = checkSignature(root, args[1], args[2], expected);
        break;
      }

      case "naming-convention": {
        const sizeIndex = args.indexOf("--sample-size");
        const sampleSize =
          sizeIndex !== -1 ? parseInt(args[sizeIndex + 1], 10) : 30;
        result = analyzeNamingConventions(root, sampleSize);
        break;
      }

      case "analyze-types": {
        if (!args[1]) throw new Error("Missing file argument");
        result = analyzeTypes(root, args[1]);
        break;
      }

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ status: "ERROR", message }, null, 2));
    process.exit(1);
  }
}

main();
