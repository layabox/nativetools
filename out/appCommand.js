"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const fs_extra = require("fs-extra");
const gen_dcc = require("layadcc");
const request = require("request");
const child_process = require("child_process");
const xmldom = require("xmldom");
const ProgressBar = require("progress");
exports.STAND_ALONE_URL = 'http://stand.alone.version/index.html';
exports.VERSION_CONFIG_URL = 'http://10.10.20.102:9999/versionconfig.json';
exports.DEFAULT_NAME = 'LayaBox';
exports.DEFAULT_APP_NAME = 'LayaBox';
exports.DEFAULT_PACKAGE_NAME = 'com.layabox.game';
exports.DEFAULT_TYPE = 0;
exports.NATIVE_JSON_FILE_NAME = 'native.json';
exports.PLATFORM_ANDROID_ALL = 'all';
exports.PLATFORM_IOS = 'ios';
exports.PLATFORM_ANDROID_ECLIPSE = 'android_eclipse';
exports.PLATFORM_ANDROID_STUDIO = 'android_studio';
exports.H5_PROJECT_CONFIG_FILE = 'config.json';
class AppCommand {
    constructor() {
    }
    excuteRefreshApp(folder, platform, type, url, name, nativeJSON) {
        if (!fs.existsSync(folder)) {
            console.log('错误: 找不到目录 ' + folder);
            return false;
        }
        var me = this;
        let appPath = this.getAppPath(name, platform, nativeJSON);
        let configPath = path.join(appPath, "config.json");
        if (!fs.existsSync(configPath)) {
            console.log('错误: 找不到文件 ' + configPath);
            return false;
        }
        let config = fs_extra.readJSONSync(configPath);
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }
        if (!fs.existsSync(appPath)) {
            console.log("错误 :找不到目录 " + appPath);
            return false;
        }
        this.processUrl(config, type, url, appPath);
        fs_extra.emptyDirSync(path.join(appPath, config["res"]["path"]));
        if (type === 1 || type === 2) {
            this.processDcc(config, folder, url, appPath);
        }
        nativeJSON.type = type;
        nativeJSON.url = type == 2 ? exports.STAND_ALONE_URL : url;
        fs_extra.writeJSONSync(this.getNativeJSONPath(), nativeJSON);
        return true;
    }
    excuteCreateApp(folder, sdk, platform, type, url, name, app_name, package_name, nativeJSON) {
        if (!fs.existsSync(folder)) {
            console.log('错误: 找不到目录 ' + folder);
            return false;
        }
        var me = this;
        let appPath = this.getAppPath(name, platform, nativeJSON);
        let configPath = path.join(path.join(sdk, platform), "config.json");
        if (!fs.existsSync(configPath)) {
            console.log('错误: 找不到文件 ' + configPath + '。SDK文件可能已被删除，请重新下载');
            return false;
        }
        let config = fs_extra.readJSONSync(configPath);
        if (!config) {
            console.log('错误: 读取文件 ' + configPath + ' 失败');
            return false;
        }
        if (fs.existsSync(appPath)) {
            console.log("警告： 项目 " + appPath + " 已经存在");
            return false;
        }
        fs_extra.copySync(path.join(sdk, platform), appPath);
        this.processUrl(config, type, url, appPath);
        this.processPackageName(config, package_name, appPath);
        if (type === 1 || type === 2) {
            this.processDcc(config, folder, url, appPath);
        }
        this.processDisplayName(config, platform, app_name, appPath);
        this.processName(config, name, appPath);
        this.processConfig(config, name, appPath);
        nativeJSON.type = type;
        nativeJSON.url = type == 2 ? exports.STAND_ALONE_URL : url;
        nativeJSON.name = name;
        nativeJSON.app_name = app_name;
        nativeJSON.package_name = package_name;
        fs_extra.writeJSONSync(this.getNativeJSONPath(), nativeJSON);
        return true;
    }
    check(argv, nativeJSON) {
        if (argv.platform === undefined) {
            argv.platform = exports.PLATFORM_ANDROID_ALL;
        }
        else {
            if (argv.platform !== exports.PLATFORM_ANDROID_ALL && argv.platform !== exports.PLATFORM_IOS && argv.platform != exports.PLATFORM_ANDROID_ECLIPSE && argv.platform != exports.PLATFORM_ANDROID_STUDIO) {
                console.log('无效的选项值：');
                console.log('  选项名称: platform, 传入的值: ' + argv.platform + ', 可选的值：' + exports.PLATFORM_ANDROID_ALL
                    + ',' + exports.PLATFORM_IOS + ',' + exports.PLATFORM_ANDROID_ECLIPSE + ',' + exports.PLATFORM_ANDROID_STUDIO);
                return false;
            }
        }
        if (argv.type === undefined) {
            if (nativeJSON && nativeJSON.type) {
                argv.type = nativeJSON.type;
            }
            else {
                argv.type = exports.DEFAULT_TYPE;
            }
        }
        else {
            if (argv.type !== 0 && argv.type !== 1 && argv.type != 2) {
                console.log('无效的选项值：');
                console.log('  选项名称: type, 传入的值: ' + argv.type + ', 可选的值： 0, 1, 2');
                return false;
            }
        }
        if (!argv.url) {
            if (nativeJSON && nativeJSON.url) {
                argv.url = nativeJSON.url;
            }
        }
        if (argv.type === 0 || argv.type === 1) {
            if (!argv.url || argv.url === '') {
                console.log('错误：参数缺少--url');
                return false;
            }
            if (argv.url === exports.STAND_ALONE_URL) {
                console.log('错误：请提供有效参数--url');
                return false;
            }
        }
        if (!argv.name) {
            if (nativeJSON && nativeJSON.name) {
                argv.name = nativeJSON.name;
            }
            else {
                argv.name = exports.DEFAULT_NAME;
            }
        }
        if (!argv.app_name) {
            if (nativeJSON && nativeJSON.app_name) {
                argv.app_name = nativeJSON.app_name;
            }
            else {
                argv.app_name = exports.DEFAULT_APP_NAME;
            }
        }
        if (!argv.package_name) {
            if (nativeJSON && nativeJSON.package_name) {
                argv.package_name = nativeJSON.package_name;
            }
            else {
                argv.package_name = exports.DEFAULT_PACKAGE_NAME;
            }
        }
        return true;
    }
    processUrl(config, type, url, appPath) {
        var me = this;
        if (type === 2) {
            if (config.localize && config.localize.replace) {
                config.localize.replace.forEach((v, i, arr) => {
                    var p = path.join(appPath, v);
                    var s = me.read(p);
                    s = s.replace(new RegExp(config.localize.src, 'g'), config.localize.des);
                    fs.writeFileSync(p, s);
                });
            }
            url = exports.STAND_ALONE_URL;
        }
        if (url && url != "") {
            config["url"]["replace"].forEach(function (file) {
                var srcPath = path.join(appPath, file);
                var str = me.read(srcPath);
                str = str.replace(new RegExp(config["url"]["src"]), config["url"]["des"].replace("${url}", url));
                fs_extra.outputFileSync(srcPath, str);
            });
        }
    }
    processPackageName(config, package_name, appPath) {
        var me = this;
        if (package_name && package_name != "") {
            config["package"]["replace"].forEach(function (file) {
                var destPath = path.join(appPath, file);
                var str = me.read(destPath);
                str = str.replace(new RegExp(config["package"]["name"], "g"), package_name);
                fs_extra.outputFileSync(destPath, str);
            });
        }
    }
    processDcc(config, folder, url, appPath) {
        let res_path = this.getResFolder(folder);
        if (res_path && res_path != "" && fs.existsSync(res_path)) {
            var outpath = url;
            var index = outpath.indexOf('?');
            if (index > 0) {
                outpath = outpath.substring(0, index);
            }
            index = outpath.lastIndexOf('/');
            if (index > 0) {
                outpath = outpath.substring(0, index);
            }
            outpath = outpath.replace("http://", "");
            outpath = outpath.replace(/:/g, '.');
            outpath = outpath.replace(/\\/g, '_');
            outpath = outpath.replace(/\//g, '_');
            outpath = path.join(config["res"]["path"], outpath);
            outpath = path.join(appPath, outpath);
            if (!fs.existsSync(outpath)) {
                fs_extra.mkdirsSync(outpath);
            }
            gen_dcc.gendcc(res_path, outpath, true, false);
        }
    }
    processDisplayName(config, platform, app_name, appPath) {
        let file = path.join(appPath, config["template"]["display"]);
        let xml = this.read(file);
        let doc = new xmldom.DOMParser().parseFromString(xml);
        if (platform === exports.PLATFORM_IOS) {
            let dictNode = doc.getElementsByTagName('dict')[0];
            let keyNode = doc.createElement("key");
            let keyTextNode = doc.createTextNode("CFBundleDisplayName");
            keyNode.appendChild(keyTextNode);
            dictNode.appendChild(keyNode);
            let stringNode = doc.createElement("string");
            let stringTextNode = doc.createTextNode(app_name);
            stringNode.appendChild(stringTextNode);
            dictNode.appendChild(stringNode);
            dictNode.appendChild(stringNode);
        }
        else {
            let stringNodes = doc.getElementsByTagName('string');
            for (let i = 0; i < stringNodes.length; i++) {
                if (stringNodes[i].attributes.getNamedItem("name").value === "app_name") {
                    stringNodes[i].replaceChild(doc.createTextNode(app_name), stringNodes[i].childNodes[0]);
                    break;
                }
            }
        }
        fs_extra.outputFileSync(file, doc.toString());
    }
    processName(config, name, appPath) {
        var me = this;
        config["template"]["replace"].forEach(function (file) {
            var srcPath = path.join(appPath, file);
            var str = me.read(srcPath);
            str = str.replace(new RegExp(config["template"]["name"], "g"), name);
            fs_extra.outputFileSync(srcPath, str);
        });
        config["template"]["rename"].forEach(function (file) {
            var oldPath = path.join(appPath, file);
            var newPath = path.join(appPath, file);
            var dir_name = path.dirname(newPath);
            var base_name = path.basename(newPath);
            var new_base_name = base_name.replace(config["template"]["name"], name);
            newPath = path.join(dir_name, new_base_name);
            fs.renameSync(oldPath, newPath);
        });
    }
    processConfig(config, name, appPath) {
        let newConfigPath = path.join(appPath, "config.json");
        let newConfig = fs_extra.readJSONSync(newConfigPath);
        if (!newConfig) {
            console.log('错误: 读取文件 ' + newConfigPath + ' 失败');
            return false;
        }
        for (var i = 0; i < config["url"]["replace"].length; i++) {
            newConfig["url"]["replace"][i] = newConfig["url"]["replace"][i].replace(config["template"]["name"], name);
        }
        for (var i = 0; i < config["localize"]["replace"].length; i++) {
            newConfig["localize"]["replace"][i] = newConfig["localize"]["replace"][i].replace(config["template"]["name"], name);
        }
        newConfig["res"]["path"] = newConfig["res"]["path"].replace(config["template"]["name"], name);
        fs_extra.writeJSONSync(newConfigPath, newConfig);
    }
    getAppPath(name, platform, nativeJSON) {
        if (nativeJSON && nativeJSON.native) {
            return path.join(path.join(process.cwd(), nativeJSON.native), platform);
        }
        return path.join(path.join(process.cwd(), name), platform);
    }
    getNativeJSONPath() {
        return path.join(process.cwd(), exports.NATIVE_JSON_FILE_NAME);
    }
    isH5Folder(folder) {
        return fs.existsSync(path.join(folder, exports.H5_PROJECT_CONFIG_FILE));
    }
    getH5BinFolder(folder) {
        let config = fs_extra.readJSONSync(path.join(folder, exports.H5_PROJECT_CONFIG_FILE));
        return path.join(folder, config.resource);
    }
    getResFolder(folder) {
        if (this.isH5Folder(folder)) {
            return this.getH5BinFolder(folder);
        }
        return folder;
    }
    getAppDataPath() {
        let dataPath;
        if (process.platform === 'darwin') {
            let home = process.env.HOME || ("/Users/" + (process.env.NAME || process.env.LOGNAME));
            dataPath = home + "/Library/Application Support/Laya/NativeTools/template/";
        }
        else {
            var appdata = process.env.AppData || process.env.USERPROFILE + "/AppData/Roaming/";
            dataPath = appdata + "/Laya/NativeTools/template/";
        }
        if (!fs_extra.existsSync(dataPath)) {
            fs_extra.mkdirsSync(dataPath);
        }
        return dataPath;
    }
    getSDKRootPath() {
        return this.getAppDataPath();
    }
    getSDKPath(version) {
        return path.join(this.getAppDataPath(), version);
    }
    isSDKExists(version) {
        return fs.existsSync(path.join(this.getAppDataPath(), version));
    }
    read(path) {
        try {
            var text = fs.readFileSync(path, "utf-8");
            text = text.replace(/^\uFEFF/, '');
        }
        catch (err0) {
            return "";
        }
        return text;
    }
}
exports.AppCommand = AppCommand;
function getServerJSONConfig(url) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(function (res, rej) {
            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    res(JSON.parse(body));
                }
                else {
                    console.log('错误: ' + response.statusCode + ' 下载 ' + url + ' 错误');
                    res(null);
                }
            });
        });
    });
}
exports.getServerJSONConfig = getServerJSONConfig;
function download(url, file, callBack) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(function (res, rej) {
            let stream = fs.createWriteStream(file);
            let layaresponse;
            var bar;
            request(url).on('response', function (response) {
                layaresponse = response;
                var len = parseInt(layaresponse.headers['content-length'], 10);
                bar = new ProgressBar('  下载 [:bar] :rate/bps :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: len
                });
            }).on('data', function (chunk) {
                bar.tick(chunk.length);
            }).pipe(stream).on('close', function () {
                if (layaresponse.statusCode === 200) {
                    callBack();
                    res(true);
                }
                else {
                    console.log('错误: ' + layaresponse.statusCode + ' 下载 ' + url + ' 错误');
                    res(false);
                }
            }).on('end', function () {
                console.log('\n');
            });
        });
    });
}
exports.download = download;
function unzip(unzipurl, filepath, callbackHandler) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('正在解压 ' + unzipurl + ' 到 ' + filepath + ' ...');
        if (process.platform === 'darwin') {
            var cmd = "unzip -o \"" + unzipurl + "\" -d \"" + filepath + "\"";
            child_process.execSync(cmd);
        }
        else {
            var unzipexepath = path.join(__dirname, '..', 'tools', 'unzip.exe');
            var cmd = "\"" + unzipexepath + "\" -o \"" + unzipurl + "\" -d \"" + filepath + "\"";
            child_process.execSync(cmd);
        }
    });
}
exports.unzip = unzip;
