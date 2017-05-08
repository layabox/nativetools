import * as AppCommand from './appCommand';
import * as fs from 'fs';
import * as path from 'path';
import fs_extra = require('fs-extra');


exports.command = 'refresh_app [options]'
exports.describe = '刷新app项目'
exports.builder = {
  type:
  {
    alias: 't',
    //default: 0,
    //choices: [0, 1, 2],
    required: false,
    requiresArg: true,
    description: '0为只有url   1为URL+资源包  2为单机版本 \n [choices: 0, 1, 2] [default: 0]'
  },
  url:
  {
    alias: 'u',
    required: false,
    requiresArg: true,
    description: '当t为0或者1的时候，必须填，当t为2的时候，不用填写。'
  },
  name:
  {
    alias: 'n',
    //default: 'LayaBox',
    required: false,
    requiresArg: true,
    description: '项目名称，不是必填，默认是LayaBox'
  },
  app_name:
  {
    alias: 'a',
    //default: 'LayaBox',
    required: false,
    requiresArg: true,
    description: '应用名称，不是必填，默认是LayaBox'
  },
  package_name:
  {
    alias: 'package_name',
    //default: 'com.layabox.game',
    required: false,
    requiresArg: true,
    description: '包名，不是必填，默认是 com.layabox.game'
  }
}

exports.handler = function (argv) {
  try {
    let cmd = new AppCommand.AppCommand();

    let nativeJSON = null;
    let nativeJSONPath = cmd.getNativeJSONPath();
    if (fs.existsSync(nativeJSONPath)) {
      nativeJSON = fs_extra.readJSONSync(nativeJSONPath);
      if (!nativeJSON) {
        console.log('错误：读取文件 ' + nativeJSONPath + ' 失败。');
        return;
      }
      if (!fs.existsSync(path.join(process.cwd(), nativeJSON.native))) {
        console.log('错误：找不到文件 ' + nativeJSON.native + ' 。');
        return;
      }
    }
    else {
      console.log('错误: 在当前目录找不到文件 ' + nativeJSONPath + ' 。');
      return;
    }

    if (!cmd.check(argv, nativeJSON)) {
      return;
    }

    if (!nativeJSON || !nativeJSON.h5 || !nativeJSON.sdk) {
      console.log('错误: 文件 ' + nativeJSONPath + ' 无效。');
    }
    let folder = path.join(process.cwd(), nativeJSON.h5);
    if (!fs.existsSync(folder)) {
      console.log('错误: 找不到目录 ' + folder + '。');
    }

    let app = cmd.getAppPath(argv.name, AppCommand.PLATFORM_IOS, nativeJSON);
    if (fs.existsSync(app)) {
      //let tempPath = fs.mkdtempSync(AppCommand.PLATFORM_IOS);
      let date = new Date;
      let tempPath = app + String(date.getTime());
      fs.renameSync(app, tempPath);
      if (cmd.excuteCreateApp(folder, nativeJSON.sdk, AppCommand.PLATFORM_IOS, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, nativeJSON)) {
        fs_extra.removeSync(tempPath);
      }
      else {
        fs.renameSync(tempPath, app);
      }
    }

    app = cmd.getAppPath(argv.name, AppCommand.PLATFORM_ANDROID_ECLIPSE, nativeJSON);
    if (fs.existsSync(app)) {
      let date = new Date;
      let tempPath = app + String(date.getTime());
      fs.renameSync(app, tempPath);
      if (cmd.excuteCreateApp(folder, nativeJSON.sdk, AppCommand.PLATFORM_ANDROID_ECLIPSE, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, nativeJSON)) {
        fs_extra.removeSync(tempPath);
      }
      else {
        fs.renameSync(tempPath, app);
      }
    }

    app = cmd.getAppPath(argv.name, AppCommand.PLATFORM_ANDROID_STUDIO, nativeJSON);
    if (fs.existsSync(app)) {
      let date = new Date;
      let tempPath = app + String(date.getTime());
      fs.renameSync(app, tempPath);
      if (cmd.excuteCreateApp(folder, nativeJSON.sdk, AppCommand.PLATFORM_ANDROID_STUDIO, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, nativeJSON)) {
        fs_extra.removeSync(tempPath);
      }
      else {
        fs.renameSync(tempPath, app);
      }
    }
  }
  catch (error) {
    console.log(error);
  }
}