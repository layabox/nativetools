"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AppCommand = require("./appCommand");
const fs = require("fs");
const path = require("path");
const fs_extra = require("fs-extra");
exports.command = 'refreshres';
exports.describe = '刷新app项目资源';
exports.builder = {
    platform: {
        alias: 'p',
        default: AppCommand.PLATFORM_ANDROID_ALL,
        choices: [AppCommand.PLATFORM_ANDROID_ALL, AppCommand.PLATFORM_IOS, AppCommand.PLATFORM_ANDROID_ECLIPSE, AppCommand.PLATFORM_ANDROID_STUDIO],
        required: false,
        requiresArg: true,
        description: '项目平台 [可选值: ' + AppCommand.PLATFORM_ANDROID_ALL + ', ' + AppCommand.PLATFORM_IOS + ', ' + AppCommand.PLATFORM_ANDROID_ECLIPSE + ', ' + AppCommand.PLATFORM_ANDROID_STUDIO + '] [默认值: ' + AppCommand.PLATFORM_ANDROID_ALL + ']'
    },
    path: {
        default: '.',
        required: false,
        requiresArg: true,
        description: 'native项目输出路径'
    },
    url: {
        alias: 'u',
        required: false,
        requiresArg: true,
        description: '游戏地址'
    }
};
exports.handler = function (argv) {
    try {
        let cmd = new AppCommand.AppCommand();
        let nativeJSONPath = null;
        let nativePath = null;
        nativePath = AppCommand.AppCommand.getNativePath(argv.path);
        nativeJSONPath = AppCommand.AppCommand.getNativeJSONPath(argv.path);
        if (!fs.existsSync(nativeJSONPath)) {
            console.log('错误: 目录' + path.dirname(nativeJSONPath) + ' 不是项目目录或已损坏');
            return;
        }
        let nativeJSON = fs_extra.readJSONSync(nativeJSONPath);
        if (!nativeJSON || !nativeJSON.h5) {
            console.log('错误: 文件 ' + nativeJSONPath + ' 无效');
        }
        let folder = path.join(path.dirname(nativeJSONPath), nativeJSON.h5);
        let appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_IOS);
        if (fs.existsSync(appPath)) {
            cmd.excuteRefreshRes(folder, AppCommand.PLATFORM_IOS, argv.url, appPath);
        }
        appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_ANDROID_ECLIPSE);
        if (fs.existsSync(appPath)) {
            cmd.excuteRefreshRes(folder, AppCommand.PLATFORM_ANDROID_ECLIPSE, argv.url, appPath);
        }
        appPath = AppCommand.AppCommand.getAppPath(nativePath, AppCommand.PLATFORM_ANDROID_STUDIO);
        if (fs.existsSync(appPath)) {
            cmd.excuteRefreshRes(folder, AppCommand.PLATFORM_ANDROID_STUDIO, argv.url, appPath);
        }
    }
    catch (error) {
        console.log();
        console.log(error.name);
        console.log(error.message);
    }
};
