// jscodeshift -t ./reportFunctDependencies.js ./file.js

const fs = require('fs');
const path = require('path');

module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const functionDeclarations = {};
  const functionCalls = {};

  function trackFunctionCall(caller, callee) {
    if (!functionCalls[caller]) {
      functionCalls[caller] = new Set();
    }
    functionCalls[caller].add(callee);
  }

  root.find(j.FunctionDeclaration).forEach(path => {
    const functionName = path.node.id.name;
    functionDeclarations[functionName] = path;
  });

  root.find(j.VariableDeclarator).forEach(path => {
    if (path.node.init && (path.node.init.type === 'FunctionExpression' || path.node.init.type === 'ArrowFunctionExpression')) {
      const functionName = path.node.id.name;
      functionDeclarations[functionName] = path;
    }
  });

  // Traverse the AST and collect function calls
  root.find(j.CallExpression).forEach(path => {
    const calleeName = path.node.callee.type === 'Identifier' ? path.node.callee.name : null;
    if (calleeName && path.scope && path.scope.path && path.scope.path.node && path.scope.path.node.id) {
      const callerName = path.scope.path.node.id.name;
      if (functionDeclarations[callerName]) {
        trackFunctionCall(callerName, calleeName);
      }
    }
  });

  // Generate ASCII tree with cycle detection
  function generateTree(name, depth = 0, visited = new Set()) {
    if (visited.has(name)) {
      return `${' '.repeat(depth * 2)}- ${name} (cycle detected)\n`;
    }
    visited.add(name);

    let tree = `${' '.repeat(depth * 2)}- ${name}\n`;
    if (functionCalls[name]) {
      Array.from(functionCalls[name]).forEach(callee => {
        tree += generateTree(callee, depth + 1, new Set(visited));
      });
    }
    return tree;
  }

  let trees = '';
  Object.keys(functionDeclarations).forEach(rootFunction => {
    trees += generateTree(rootFunction);
  });

  const outputFilePath = path.resolve(__dirname, 'functionDependencies.txt');
  fs.writeFileSync(outputFilePath, trees, 'utf8');

  return null; // No need to modify the source code
};
