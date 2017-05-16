
import * as AppCommand from './appCommand';
import * as fs from 'fs';
import * as path from 'path';
import fs_extra = require('fs-extra');
import * as request from 'request';

export var command = 'createapp'
export var describe = '创建app项目'
export var builder = {
  folder:
  {
    alias: 'f',
    required: true,
    requiresArg: true,
    description: 'html5项目目录或资源路径 说明：把游戏资源打包进客户端以减少网络下载,选择本地\n的游戏目录，例如启动index在d:/game/index.html下,那资源路径就是d:/game'
  },
  path:
  {
    default: '.',
    required: false,
    requiresArg: true,
    description: 'native项目输出路径'
  },
  sdk:
  {
    alias: 's',
    required: false,
    requiresArg: true,
    description: 'SDK本地目录 说明：自定义的SDK目录'
  },
  version:
  {
    alias: 'v',
    required: false,
    requiresArg: true,
    description: 'SDK版本 说明：自动使用特定版本的SDK，系统会从服务器下载SDK并存放在特定位置。--version和--sdk互相矛盾不能同时指定，都不指定时默认使用最新版本的SDK'
  },
  platform:
  {
    alias: 'p',
    default: AppCommand.PLATFORM_ANDROID_ALL,
    choices: [AppCommand.PLATFORM_ANDROID_ALL, AppCommand.PLATFORM_IOS, AppCommand.PLATFORM_ANDROID_ECLIPSE, AppCommand.PLATFORM_ANDROID_STUDIO],
    required: false,
    requiresArg: true,
    description: '项目平台 [可选值: ' + AppCommand.PLATFORM_ANDROID_ALL + ', ' + AppCommand.PLATFORM_IOS + ', ' + AppCommand.PLATFORM_ANDROID_ECLIPSE + ', ' + AppCommand.PLATFORM_ANDROID_STUDIO + '] [默认值: ' + AppCommand.PLATFORM_ANDROID_ALL + ']'
  },
  type:
  {
    alias: 't',
    default: 0,
    choices: [0, 1, 2],
    required: false,
    requiresArg: true,
    description: '创建类型 说明：0: 不打资源包 1: 打资源包 2: 单机版本'
  },
  url:
  {
    alias: 'u',
    required: false,
    requiresArg: true,
    description: '游戏地址 说明：当t为0或者1的时候，必须填，当t为2的时候，不用填写'
  },
  name:
  {
    alias: 'n',
    default: 'LayaBox',
    required: false,
    requiresArg: true,
    description: '项目名称 说明：native项目的名称'
  },
  app_name:
  {
    alias: 'a',
    default: 'LayaBox',
    required: false,
    requiresArg: true,
    description: '应用名称 说明：app安装到手机后显示的名称'
  },
  package_name:
  {
    default: 'com.layabox.game',
    required: false,
    requiresArg: true,
    description: '包名'
  }
}

export var handler = async function (argv) {
  try {
    let cmd = new AppCommand.AppCommand();

    let folder = path.isAbsolute(argv.folder) ? argv.folder : path.join(process.cwd(), argv.folder);
    if (AppCommand.AppCommand.isH5Folder(folder)){
      folder = AppCommand.AppCommand.getH5BinFolder(folder);
    }

    let sdk;
    if (argv.sdk && argv.version) {
      console.log('错误：参数 --sdk 和 --version 不能同时指定两个');
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
        if (!AppCommand.AppCommand.isSDKExists(sdkVersionConfig.versionList[0].version)) {//最新版 
          let zip = path.join(AppCommand.AppCommand.getSDKRootPath(), path.basename(sdkVersionConfig.versionList[0].url));
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
        sdk = AppCommand.AppCommand.getSDKPath(sdkVersionConfig.versionList[0].version);

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
          console.log('错误：版本 ' + argv.version + ' 服务器找不到');
          return;
        }
        if (!AppCommand.AppCommand.isSDKExists(argv.version)) {
          let zip = path.join(AppCommand.AppCommand.getSDKRootPath(), path.basename(sdkVersionConfig.versionList[index].url));
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
        sdk = AppCommand.AppCommand.getSDKPath(argv.version);
      }
    }

    if (argv.type === 2 && argv.url) {
      console.log("警告： 单机版不需要参数url");
    }
    if (argv.type === 0 || argv.type === 1) {
      if (!argv.url || argv.url === '') {
        console.log('错误：缺少参数--url');
        return;
      }
      if (argv.url === AppCommand.STAND_ALONE_URL) {
        console.log('错误：请提供有效参数--url');
        return;
      }
    }

    if (argv.platform === AppCommand.PLATFORM_ANDROID_ALL) {
      cmd.excuteCreateApp(folder, sdk, AppCommand.PLATFORM_IOS, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, argv.path);
      cmd.excuteCreateApp(folder, sdk, AppCommand.PLATFORM_ANDROID_ECLIPSE, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, argv.path);
      cmd.excuteCreateApp(folder, sdk, AppCommand.PLATFORM_ANDROID_STUDIO, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, argv.path);
    }
    else {
      cmd.excuteCreateApp(folder, sdk, argv.platform, argv.type, argv.url, argv.name, argv.app_name, argv.package_name, argv.path);
    }

    let nativeJSONPath = AppCommand.AppCommand.getNativeJSONPath(path.join(argv.path, argv.name));
    let nativeJSON = { h5: path.relative(path.dirname(nativeJSONPath), folder) };
    fs_extra.writeJSONSync(nativeJSONPath, nativeJSON);
  }
  catch (error) {
    console.log();
    console.log(error.name);
    console.log(error.message);
  }
}

