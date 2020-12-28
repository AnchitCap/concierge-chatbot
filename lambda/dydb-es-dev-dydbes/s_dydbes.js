
var serverlessSDK = require('./serverless_sdk/index.js');
serverlessSDK = new serverlessSDK({
  orgId: 'anchit',
  applicationName: 'dydb-es-app',
  appUid: 'cmH8YJ0zDk4rFnzGK8',
  orgUid: 'r8rBCpgyN2cwzvjnHt',
  deploymentUid: '3f64f2c2-2736-4c00-9f7f-67a3f71041f8',
  serviceName: 'dydb-es',
  shouldLogMeta: true,
  shouldCompressLogs: true,
  disableAwsSpans: false,
  disableHttpSpans: false,
  stageName: 'dev',
  serverlessPlatformStage: 'prod',
  devModeEnabled: false,
  accessKey: null,
  pluginVersion: '4.1.1',
  disableFrameworksInstrumentation: false
});

const handlerWrapperArgs = { functionName: 'dydb-es-dev-dydbes', timeout: 6 };

try {
  const userHandler = require('./handler.js');
  module.exports.handler = serverlessSDK.handler(userHandler.dydbes, handlerWrapperArgs);
} catch (error) {
  module.exports.handler = serverlessSDK.handler(() => { throw error }, handlerWrapperArgs);
}