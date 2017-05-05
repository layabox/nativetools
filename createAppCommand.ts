
import * as AppCommand from './appCommand';
import * as fs from 'fs';
import * as path from 'path';
import fs_extra = require('fs-extra');

import * as request from 'request';

exports.command = 'create_app [options]'
exports.describe = '创建app项目'
exports.builder = {
  folder:
  {
    alias: 'f',
    required: true,
    requiresArg: true,
    description: 'html5项目目录或资源路径说明:把游戏资源打包进客户端以减少网络下载,选择本地的游戏目录，例如启动index在d:/game/wow/index.html下,那资源路径就是d:/game/wow    必选'
  },
  sdk:
  {
    alias: 's',
    required: false,
    requiresArg: true,
    description: 'SDK本地目录，不是必选'
  },
  version:
  {
    alias: 'v',
    required: false,
    requiresArg: true,
    description: 'SDK版本，不是必选'
  },
  platform:
  {
    alias: 'p',
    default: AppCommand.PLATFORM_ANDROID_ALL,
    choices: [AppCommand.PLATFORM_ANDROID_ALL, AppCommand.PLATFORM_IOS, AppCommand.PLATFORM_ANDROID_ECLIPSE, AppCommand.PLATFORM_ANDROID_STUDIO],
    required: false,
    requiresArg: true,
    description: ''
  },
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
    //default: 'com.layabox.game',
    required: false,
    requiresArg: true,
    description: '包名，不是必填，默认是 com.layabox.game'
  }
}

exports.handler = async function (argv) {
  try {
    let cmd = new AppCommand.AppCommand();
    let folder = path.isAbsolute(argv.folder) ? argv.folder : path.join(process.cwd(), argv.folder);
    console.log('folder: ' + folder);

    let nativeJSON = null;
    let nativeJSONPath = cmd.getNativeJSONPath();
    if (fs.existsSync(nativeJSONPath)) {
      nativeJSON = fs_extra.readJSONSync(nativeJSONPath);
      if (!nativeJSON) {
        console.log('Error: open ' + nativeJSONPath + ' error.');
        return;
      }

      if (!fs.existsSync(path.join(process.cwd(), nativeJSON.native))) {
        console.log('Error: missing ' + nativeJSON.native + ' error.');
        return;
      }
    }

    let sdk;
    if (argv.sdk && argv.version) {
      console.log('--sdk and --version can only choose one of the two');
      return;
    }
    else if (argv.sdk) {
      sdk = argv.sdk;
    }
    else {
      let sdkVersionConfig = await AppCommand.getServerJSONConfig(AppCommand.VERSION_CONFIG_URL + '?' + Math.random());
      if (!sdkVersionConfig) {
        return;
      }

      if (!argv.sdk && !argv.version) {
        if (!cmd.isSDKExists(sdkVersionConfig.versionList[0].version)) {//最新版 
          let zip = path.join(cmd.getSDKRootPath(), path.basename(sdkVersionConfig.versionList[0].url));
          await AppCommand.download(sdkVersionConfig.versionList[0].url, zip, function () {
            AppCommand.unzip(zip, path.dirname(zip), function (error: Error, stdout: string, stderr: string) {
              if (error) {
                console.log(error.name);
                console.log(error.message);
                console.log(error.stack);
              }
            });
          });
        }
         sdk = cmd.getSDKPath(sdkVersionConfig.versionList[0].version);
      }
      else {
        let found = false;
        let index;
        for (let i = 0; i < sdkVersionConfig.versionList.length; i++) {
          if (sdkVersionConfig.versionList[i].version === argv.version) {
            found = true;
            index = i;
            break;
          }
        }
        if (!found) {
          console.log('Invalid version ' + argv.version + ' not found');
          return;
        }
        if (!cmd.isSDKExists(argv.version)) {
          let zip = path.join(cmd.getSDKRootPath(), path.basename(sdkVersionConfig.versionList[index].url));
          await AppCommand.download(sdkVersionConfig.versionList[index].url, zip, function () {
            AppCommand.unzip(zip, path.dirname(zip), function (error: Error, stdout: string, stderr: string) {
              if (error) {
                console.log(error.name);
                console.log(error.message);
                console.log(error.stack);
              }
            });
          });
        }
        sdk = cmd.getSDKPath(argv.version);
      }
    }

    if (!cmd.check(argv, nativeJSON)) {
      return;
    }

    if (!nativeJSON) {
      nativeJSON = { h5: path.relative(path.dirname(nativeJSONPath), folder), native: argv.name };
    }

    if (argv.platform === AppCommand.PLATFORM_ANDROID_ALL) {
      nativeJSON.sdk = sdk;
      cmd.excuteCreateApp(folder, sdk, AppCommand.PLATFORM_IOS, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, nativeJSON);
      cmd.excuteCreateApp(folder, sdk, AppCommand.PLATFORM_ANDROID_ECLIPSE, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, nativeJSON);
      cmd.excuteCreateApp(folder, sdk, AppCommand.PLATFORM_ANDROID_STUDIO, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, nativeJSON);
    }
    else {
      nativeJSON.sdk = sdk;
      cmd.excuteCreateApp(folder, sdk, argv.platform, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, nativeJSON);
    }
  }
  catch (error) {
    console.log(error);
  }
}

