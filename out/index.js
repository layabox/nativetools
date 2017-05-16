"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createAppCommand_1 = require("./createAppCommand");
module.exports = {
    create_app: (folder, sdk, version, platform, type, url, name, app_name, package_name, path) => {
        var args = {
            folder: folder,
            sdk: sdk,
            version: version,
            platform: platform,
            type: type,
            url: url,
            name: name,
            app_name: app_name,
            package_name: package_name,
            path: path
        };
        createAppCommand_1.handler(args);
    },
    refreshres: (platform, path, url) => {
        var args = {
            platform: platform,
            path: path,
            url: url
        };
        createAppCommand_1.handler(args);
    },
    removeres: (path) => {
        var args = {
            path: path
        };
        createAppCommand_1.handler(args);
    },
    listversions: () => {
    }
};
