// jscodeshift -t ./reportFunctionsUsedOnce.js ./file.js

const fs = require('fs');
const path = require('path');

module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const functionUsage = {};

  function trackFunctionUsage(name) {
    if (!functionUsage[name]) {
      functionUsage[name] = 0;
    }
    functionUsage[name]++;
  }

  root.find(j.FunctionDeclaration).forEach(path => {
    const functionName = path.node.id.name;
    trackFunctionUsage(functionName);
  });

  root.find(j.VariableDeclarator).forEach(path => {
    if (path.node.init && (path.node.init.type === 'FunctionExpression' || path.node.init.type === 'ArrowFunctionExpression')) {
      const functionName = path.node.id.name;
      trackFunctionUsage(functionName);
    }
  });

  root.find(j.CallExpression).forEach(path => {
    if (path.node.callee.type === 'Identifier') {
      const functionName = path.node.callee.name;
      trackFunctionUsage(functionName);
    }
  });

  const functionsUsedOnce = Object.keys(functionUsage).filter(name => functionUsage[name] === 1);

  //console.log('Functions used only once:', functionsUsedOnce);

  const outputFilePath = path.resolve(__dirname, 'functionsUsedOnce.txt');
  fs.writeFileSync(outputFilePath, functionsUsedOnce.join('\n'));

  return null; // No need to modify the source code
};
