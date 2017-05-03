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
class AppCommand {
    constructor() {
    }
    excuteCreateApp(folder, sdk, platform, type, url, name, app_name, package_name, nativeJSON) {
        console.log('platform: ' + platform);
        console.log('sdk: ' + path.join(sdk, platform));
        var me = this;
        let appPath = this.getAppPath(name, platform, nativeJSON);
        let configPath = path.join(path.join(sdk, platform), "config.json");
        if (!fs.existsSync(configPath)) {
            console.log('Error: can not find ' + configPath);
            return false;
        }
        let config = fs_extra.readJSONSync(configPath);
        if (!config) {
            console.log('Error: read ' + configPath + 'failed.');
            return false;
        }
        if (fs.existsSync(appPath)) {
            console.log("同名文件 " + appPath + " 已经存在");
            return false;
        }
        config["template"]["source"].forEach(function (source) {
            var srcPath = path.join(path.join(sdk, platform), source);
            var destPath = path.join(appPath, source);
            if (fs.existsSync(destPath)) {
                console.log("发现同名文件，请选择其他输出目录");
                return false;
            }
            fs_extra.copySync(srcPath, destPath);
        });
        this.processUrl(config, type, url, appPath);
        this.processPackageName(config, package_name, appPath);
        this.processDcc(config, folder, url, appPath);
        this.processName(config, name, appPath);
        nativeJSON.type = type;
        nativeJSON.url = type == 2 ? exports.STAND_ALONE_URL : url;
        nativeJSON.name = name;
        nativeJSON.app_name = app_name;
        nativeJSON.package_name = package_name;
        fs_extra.writeJSONSync(this.getNativeJSONPath(), nativeJSON);
        return true;
    }
    check(argv, nativeJSON) {
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
                console.log('Invalid values:');
                console.log('  Argument: type, Given: ' + argv.type + ', Choices: 0, 1, 2');
                return false;
            }
        }
        console.log('type: ' + argv.type);
        if (!argv.url) {
            if (nativeJSON && nativeJSON.url) {
                argv.url = nativeJSON.url;
            }
        }
        if (argv.type === 0 || argv.type === 1) {
            if (!argv.url || argv.url === '') {
                console.log('Missing url');
                return false;
            }
            if (argv.url === exports.STAND_ALONE_URL) {
                console.log('Invalid url');
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
        console.log('url: ' + url);
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
        console.log('package_name: ' + package_name);
    }
    processDcc(config, folder, url, appPath) {
        let res_path = this.getDataFolder(folder);
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
        console.log('name: ' + name);
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
        return false;
    }
    getH5BinFolder(folder) {
        return "";
    }
    getDataFolder(folder) {
        if (this.isH5Folder(folder)) {
            return this.getH5BinFolder(folder);
        }
        return folder;
    }
    getSDKRootPath() {
        return path.join(__dirname, '../template/');
    }
    getSDKPath(version) {
        return path.join(__dirname, '../template/', version);
    }
    isSDKExists(version) {
        return fs.existsSync(path.join(__dirname, '../template/', version));
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
                    console.log('Error: ' + response.statusCode + ' download ' + url + ' error.');
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
            request(url).on('response', function (response) {
                layaresponse = response;
            }).pipe(stream).on('close', function () {
                if (layaresponse.statusCode === 200) {
                    callBack();
                    res(true);
                }
                else {
                    console.log('Error: ' + layaresponse.statusCode + ' download ' + url + ' error.');
                    res(false);
                }
            });
        });
    });
}
exports.download = download;
function unzip(unzipurl, filepath, callbackHandler) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.platform === 'darwin') {
            var cmd = "unzip -o " + unzipurl + " -d " + filepath;
            child_process.execSync(cmd);
        }
        else {
            var unzipexepath = path.join(__dirname, '..', 'tools', 'unzip.exe');
            var cmd = unzipexepath + " -o " + unzipurl + " -d " + filepath;
            child_process.execSync(cmd);
        }
    });
}
exports.unzip = unzip;