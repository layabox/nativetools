import * as AppCommand from './appCommand';
import * as fs from 'fs';
exports.command = 'list_versions'
exports.describe = '列出所有SDK版本'

exports.handler = async function (argv) {
  try {
    let sdkVersionConfig = await AppCommand.getServerJSONConfig(AppCommand.VERSION_CONFIG_URL + '?' + Math.random());
    if (!sdkVersionConfig) {
      return;
    }
    console.log();
    for (let i = 0; i < sdkVersionConfig.versionList.length; i++) {
      console.log(' ' + sdkVersionConfig.versionList[i].version);
    }
  }
  catch (error) {
    console.log(error);
  }
}