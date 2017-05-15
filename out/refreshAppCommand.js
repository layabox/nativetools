"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = 'refresh_app';
exports.describe = '刷新app项目';
exports.builder = {
    type: {
        alias: 't',
        required: false,
        requiresArg: true,
        description: '创建类型 [可选值: 0: 不打资源包 1: 打资源包 2: 单机版本]'
    },
    url: {
        alias: 'u',
        required: false,
        requiresArg: true,
        description: '游戏地址'
    }
};
exports.handler = function (argv) {
};
