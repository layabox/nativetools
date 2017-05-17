import * as AppCommand from './appCommand';
import * as fs from 'fs';
import * as path from 'path';
import fs_extra = require('fs-extra');


exports.command = 'refreshres';
exports.describe = '刷新app项目资源'
exports.builder = {
  platform:
  {
    alias: 'p',
    default: AppCommand.PLATFORM_ANDROID_ALL,
    choices: [AppCommand.PLATFORM_ANDROID_ALL, AppCommand.PLATFORM_IOS, AppCommand.PLATFORM_ANDROID_ECLIPSE, AppCommand.PLATFORM_ANDROID_STUDIO],
    required: false,
    requiresArg: true,
    description: '项目平台'
  },
  path: {
    default: '.',
    required: false,
    requiresArg: true,
    description: 'native路径'
  },
  url:
  {
    alias: 'u',
    required: false,
    requiresArg: true,
    description: '游戏地址'
  }
}

exports.handler = function (argv) {
  try {
    let cmd = new AppCommand.AppCommand();

    let nativeJSONPath = null;
    let nativePath = null;
    nativePath = AppCommand.AppCommand.getNativePath(argv.path);
    nativeJSONPath = AppCommand.AppCommand.getNativeJSONPath(argv.path);

    if (!fs.existsSync(nativePath)) {
      console.log('错误: 找不到目录 ' + nativePath);
      return;
    }

    if (!fs.existsSync(nativeJSONPath)) {
      console.log('错误: 找不到文件 ' + nativeJSONPath);
      return;
    }

    let nativeJSON = fs_extra.readJSONSync(nativeJSONPath);

    if (!nativeJSON || !nativeJSON.h5) {
      console.log('错误: 文件 ' + nativeJSONPath + ' 无效');
    }

    let folder = path.join(path.dirname(nativeJSONPath), nativeJSON.h5);

    if (argv.platform === AppCommand.PLATFORM_ANDROID_ALL) {

      let appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_IOS);
      cmd.excuteRefreshRes(folder, argv.url, appPath);
      
      appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_ANDROID_ECLIPSE);
      cmd.excuteRefreshRes(folder, argv.url, appPath);

      appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_ANDROID_STUDIO);
      cmd.excuteRefreshRes(folder, argv.url, appPath);
    }
    else {
      let appPath = AppCommand.AppCommand.getAppPath(nativePath, argv.platform);
      if (fs.existsSync(appPath)) {
        cmd.excuteRefreshRes(folder, argv.url, appPath);
      }
      else {
        console.log('错误：找不到目录' + appPath);
      }
    }

  }
  catch (error) {
    console.log();
    if (error.code === 'EPERM') {
      console.log('错误：文件已经被使用或被其他程序打开');
    }
    console.log(error.name);
    console.log(error.message);
  }
}