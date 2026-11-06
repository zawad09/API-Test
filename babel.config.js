/**
 * Babel is used ONLY by Jest, for one reason: @scalar/express-api-reference
 * ships as an ES module, while this project (and Jest's default runner) is
 * CommonJS. Babel transpiles that one package to CommonJS so the tests can
 * import the real app (src/app.js) which mounts the Scalar middleware.
 * Regular Node runs the project directly and does not need Babel at all.
 */
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
