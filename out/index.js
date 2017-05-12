"use strict";
const createAppCommand_1 = require("./createAppCommand");
module.exports = {
    create_app: (folder, sdk, version, platform, type, url, name, app_name, package_name, outputPath) => {
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
            outputPath: outputPath
        };
        createAppCommand_1.handler(args);
    },
    refresh_app: () => {
    },
    list_versions: () => {
    }
};
