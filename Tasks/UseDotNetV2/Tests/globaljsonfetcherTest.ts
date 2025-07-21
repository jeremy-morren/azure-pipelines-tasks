"use strict";

import {globalJsonSDK, rollForwardPolicy} from "../globaljsonfetcher";

// import * as tl from 'azure-pipelines-task-lib/task';
// import { GlobalJson } from "../globaljsonfetcher";
// import { Buffer } from "buffer";
// import { VersionInfo } from '../models';
// import { Promise } from 'q';
// import fs = require('fs');
// var mockery = require('azure-pipelines-task-lib/lib-mocker');
//
// const workingDir: string = "work/";
// const validRootGlobalJson = workingDir + "global.json";
// const rootVersionNumber = "2.2.2";
// const workingSubDir = workingDir + "testdir/";
// const validSubDirGlobalJson = workingSubDir + "global.json";
// const subDirVersionNumber = "3.0.0-pre285754637";
// const pathToEmptyGlobalJsonDir = workingDir + "empty/";
// const pathToEmptyGlobalJson = pathToEmptyGlobalJsonDir + "global.json";
// const pathToGlobalJsonWithCommentsDir = workingDir + "comments/";
// const pathToGlobalJsonWithComments = pathToGlobalJsonWithCommentsDir + "global.json";
//
// //setup mocks
// mockery.enable({
//     useCleanCache: true,
//     warnOnReplace: false,
//     warnOnUnregistered: false
// });
//
// mockery.registerMock('azure-pipelines-task-lib/task', {
//     findMatch: function (path: string, searchPattern: string): string[] {
//         if (searchPattern != "**/global.json") {
//             return [];
//         }
//         if (path == workingDir) {
//             // If it's working dir subdir is included, because it is a child;
//             return [validRootGlobalJson, validSubDirGlobalJson];
//         }
//         if (path == workingSubDir) {
//             return [validSubDirGlobalJson];
//         }
//         if (path == pathToEmptyGlobalJsonDir) {
//             return [pathToEmptyGlobalJson];
//         }
//         if (path == pathToGlobalJsonWithCommentsDir) {
//             return [pathToGlobalJsonWithComments];
//         }
//         return [];
//     },
//     loc: function (locString, ...param: string[]) { return tl.loc(locString, param); },
//     debug: function (message) { return tl.debug(message); }
// });
//
// mockery.registerMock('fs', {
//     ...fs,
//     readFileSync: function (path: string): Buffer {
//         if (path == validRootGlobalJson) {
//             var globalJson = new GlobalJson(rootVersionNumber);
//             return Buffer.from(JSON.stringify(globalJson));
//         }
//         if (path == validSubDirGlobalJson) {
//             var globalJson = new GlobalJson(subDirVersionNumber);
//             return Buffer.from(JSON.stringify(globalJson));
//         }
//         if (path == pathToEmptyGlobalJson) {
//             return Buffer.from("");
//         }
//         if (path == pathToGlobalJsonWithComments) {
//             return Buffer.from(`{
//                 /*
//                   This is a mult-line comment
//                 */
//                 "sdk": {
//                     // This is a single-line comment
//                     "version": "${rootVersionNumber}"
//                 }
//             }`);
//         }
//         return Buffer.from(null);
//     }
// });
//
// mockery.registerMock('./versionfetcher', {
//     DotNetCoreVersionFetcher: function (explicitVersioning: boolean = false) {
//         return {
//             getVersionInfo: function (versionSpec: string, vsVersionSpec: string, packageType: string, includePreviewVersions: boolean): Promise<VersionInfo> {
//                 return Promise<VersionInfo>((resolve, reject) => {
//                     resolve(new VersionInfo({
//                         version: versionSpec,
//                         files: [{
//                             name: 'testfile.json',
//                             hash: 'testhash',
//                             url: 'testurl',
//                             rid: 'testrid'
//                         }],
//                         "runtime-version": versionSpec,
//                         "vs-version": vsVersionSpec
//                     }, packageType));
//                 });
//             }
//         }
//     }
//
// });
//
// // start test
// import { globalJsonFetcher } from "../globaljsonfetcher";
// if (process.env["__case__"] == "subdirAsRoot") {
//     let fetcher = new globalJsonFetcher(workingSubDir);
//     fetcher.GetVersions().then(versionInfos => {
//         if (versionInfos.length != 1) {
//             throw "GetVersions should return one result if one global.json is found.";
//         }
//         if (versionInfos[0].getVersion() != subDirVersionNumber) {
//             throw `GetVersions should return the version number that was inside the global.json. Expected: ${subDirVersionNumber} Actual: ${versionInfos[0].getVersion()}`;
//         }
//         if (versionInfos[0].getPackageType() != 'sdk') {
//             throw `GetVersions return always 'sdk' as package type. Actual: ${versionInfos[0].getPackageType()}`;
//         }
//     });
// }
//
// if (process.env["__case__"] == "rootAsRoot") {
//     let fetcher = new globalJsonFetcher(workingDir);
//     fetcher.GetVersions().then(versionInfos => {
//         if (versionInfos.length != 2) {
//             throw "GetVersions should return all global.json in a folder hierarchy result if multiple global.json are found.";
//         }
//     });
// }
//
// if (process.env["__case__"] == "invalidDir") {
//     let fetcher = new globalJsonFetcher("invalidDir");
//     fetcher.GetVersions().then(versionInfos => {
//         throw "GetVersions shouldn't success if no matching version was found.";
//     }, err => {
//         // here we are good because the getVersion throw an error.
//         return;
//     });
// }
//
// if (process.env["__case__"] == "emptyGlobalJson") {
//     let fetcher = new globalJsonFetcher(pathToEmptyGlobalJsonDir);
//     fetcher.GetVersions().then(versionInfos => {
//         if (versionInfos == null) {
//             throw "GetVersions shouldn't return null if the global.json is empty.";
//         }
//         if (versionInfos.length != 0) {
//             throw "GetVersions shouldn't return a arry with 0 elements if global.json is empty.";
//         }
//     }, err => {
//         throw "GetVersions shouldn't throw an error if global.json is empty.";
//     });
// }
//
// if (process.env["__case__"] == "globalJsonWithComments") {
//     let fetcher = new globalJsonFetcher(pathToGlobalJsonWithCommentsDir);
//     fetcher.GetVersions().then(versionInfos => {
//         if (versionInfos == null) {
//             throw "GetVersions shouldn't return null if the global.json has comments.";
//         }
//         if (versionInfos.length != 1) {
//             throw "GetVersions shouldn't return a arry with 0 elements if global.json has comments.";
//         }
//     }, err => {
//         throw "GetVersions shouldn't throw an error if global.json has comments.";
//     });
// }

import {parseGlobalJson} from "../globaljsonfetcher";
import assert = require("node:assert");

export function testParseGlobalJson() {

    const assertSuccess = (test: string,
                           json: string, version: string | null,
                           rollForward: rollForwardPolicy,
                           allowPrerelease: boolean,
                           canUseVersion: string[] = null,
                           cannotUseVersion: string[] = null,
                           canUseChannel: string[] = null,
                           cannotUseChannel: string[] = null) => {
        const result = parseGlobalJson(json);
        assert(result instanceof globalJsonSDK, `Expected result to be an instance of globalJsonSDK. Error: ${result}. Test: ${test}`);
        if (version == null) {
            assert(result.version === null, "Expected version to be null");
            assert(result.sdkVersion === null, "Expected sdkVersion to be null");
        }
        else {
            assert.strictEqual(version, result.version, `Expected version to be ${version}. Test: ${test}`);
            assert.strictEqual(result.sdkVersion.equals(version), true, `Expected sdkVersion to be ${version}. Test: ${test}`);
        }
        assert.strictEqual(result.rollForward, rollForward, `Expected rollForward to be ${rollForward}. Test: ${test}`);
        assert.strictEqual(result.allowPrerelease, allowPrerelease, `Expected allowPrerelease to be ${allowPrerelease}`);

        if (version) {
            assert.strictEqual(result.canUseVersion(version, false), true,
                `Expected canUseSDK(${version}, false) to be true. Test: ${test}`);
            assert.strictEqual(result.canUseVersion(version, true), allowPrerelease,
                `Expected canUseSDK(${version}, true) to be ${allowPrerelease}. Test: ${test}`);
        }

        if (canUseVersion) {
            canUseVersion.forEach((v) => {
                assert.strictEqual(result.canUseVersion(v, false), true,
                    `Expected canUseSDK(${v}, false) to be true. Test: ${test}`);
                assert.strictEqual(result.canUseVersion(v, true), allowPrerelease,
                    `Expected canUseSDK(${v}, true) to be ${allowPrerelease}. Test: ${test}`);
            });
        }
        if (cannotUseVersion) {
            cannotUseVersion.forEach((v) => {
                assert.strictEqual(result.canUseVersion(v, false), false,
                    `Expected canUseSDK(${v}, false) to be false. Test: ${test}`);
                assert.strictEqual(result.canUseVersion(v, true), false,
                    `Expected canUseSDK(${v}, true) to be false. Test: ${test}`);
            });
        }
        if (canUseChannel) {
            canUseChannel.forEach((v) => {
                assert.strictEqual(result.canUseChannel(v, false), true,
                    `Expected canUseChannel(${v}, false) to be true. Test: ${test}`);
                assert.strictEqual(result.canUseChannel(v, true), allowPrerelease,
                    `Expected canUseChannel(${v}, true) to be ${allowPrerelease}. Test: ${test}`);
            });
        }
        if (cannotUseChannel) {
            cannotUseChannel.forEach((v) => {
                assert.strictEqual(result.canUseChannel(v, false), false,
                    `Expected canUseChannel(${v}, false) to be false. Test: ${test}`);
                assert.strictEqual(result.canUseChannel(v, true), false,
                    `Expected canUseChannel(${v}, true) to be false. Test: ${test}`);
            });
        }
    }

    const assertFailure = (reason: string, json: string) => {
        const result = parseGlobalJson(json);
        assert(typeof result === 'string', `Expected parseGlobalJson to return an error string because ${reason}`);
    }

    assertFailure("it is an empty object", '{}');
    assertFailure("it is an empty sdk object", '{ "sdk": {} }');

    assertSuccess("specify only \"allowPrerelease\": true should default to latestMajor",
        '{ "sdk": { "allowPrerelease": true } }',
        null, rollForwardPolicy.latestMajor, true,
        ["1.0.100"]);
    assertSuccess("specify only \"allowPrerelease\": false should default to latestMajor",
        '{ "sdk": { "allowPrerelease": false } }',
        null, rollForwardPolicy.latestMajor, false,
        ["10.5.200"]);

    // Test without version
    assertSuccess("no version with latestMajor should succeed",
        `{ sdk: { rollForward: "latestMajor" } }`,
        null, rollForwardPolicy.latestMajor, true,
        ["1.0.245" ]);
    assertFailure("no version without latestMajor should fail",
        `{ sdk: { rollForward: "latest" } }`);

    // Test with major.minor
    Array(
        rollForwardPolicy.major,
        rollForwardPolicy.minor,
        rollForwardPolicy.latestMajor,
        rollForwardPolicy.latestMinor)
        .forEach((rollForward) => {
            const json = `{
                "sdk": {
                    // a comment
                    "version": "25.1",
                    "rollForward": "${rollForward}" /* multiline comment */ } }`;
            assertFailure("major.minor without version should fail", json);
        });

    // Test with major.minor.patch
    Array(
        rollForwardPolicy.major,
        rollForwardPolicy.minor,
        rollForwardPolicy.feature,
        rollForwardPolicy.patch,
        rollForwardPolicy.latestMajor,
        rollForwardPolicy.latestMinor,
        rollForwardPolicy.latestFeature,
        rollForwardPolicy.latestPatch,
        rollForwardPolicy.disable)
        .forEach((rollForward) => {
            const json = `{
                /* comment */ "sdk": {
                    // a comment
                    "allowPrerelease": false,
                    "version": "5.22.890",
                    "rollForward": "${rollForward}" }  // comment
                }`;
            assertSuccess(`major.minor.patch with rollForward ${rollForward}`,
                json, "5.22.890", rollForward, false);

            Array('7.8.9', '5.22.1001').forEach(version => {
                assertFailure(`major.minor.patch with rollForward ${rollForward} and invalid patch`,
                    `{ "sdk": { "version": "${version}", "rollForward": "${rollForward}" } }`);
            })
        });

    assertSuccess("allowPrerelease should default to true",
        '{ sdk: { version: "5.0.200", rollForward: "latestMinor" } }',
        "5.0.200", rollForwardPolicy.latestMinor, true);
    assertSuccess("allowPrerelease should default to true",
        '{ sdk: { version: "4.2.400", rollForward: "latestMinor", "allowPrerelease": null } }',
        "4.2.400", rollForwardPolicy.latestMinor, true);

    // Assert each rollForward policy works as expected

    // NB: 'patch' is special (legacy behaviour):
    // canUseVersion is true for exact match only,
    // getDownloadVersion returns latest version of any channel if no exact match.

    // For all others: rollForward and latestRollForward are the same for canUseVersion.
    // getDownloadVersion differs: for rollForward it uses the matching version if found, otherwise rolls forward.
    // For latestRollForward it always rolls forward.

    Array(rollForwardPolicy.disable, rollForwardPolicy.patch)
        .forEach(rollForward => {
            assertSuccess(`rollForward ${rollForward}`,
                `{ sdk: {version: "5.1.509", rollForward: "${rollForward}" } }`,
                "5.1.509", rollForward, true,

                // Exact match only
                ["5.1.509" ],
                ["4.6.509", "5.1.100", "5.1.600", "6.1.509" ],

                ["5.1"],
                ["4.1", "5.0", "5.2", "6.2"]);
        });

    assertSuccess('rollForward latestPatch',
        '{ sdk: {version: "5.3.509", rollForward: "latestPatch", "allowPrerelease": false } }',
        "5.3.509", rollForwardPolicy.latestPatch, false,

        ["5.3.509", "5.3.580", "5.3.599" ],
        ["4.6.509", "5.2.509", "5.3.508" ],

        ["5.3"],
        ["4.1", "5.0", "5.2", "6.1" ]
    );

    Array(rollForwardPolicy.feature, rollForwardPolicy.latestFeature)
        .forEach(rollForward => {
            assertSuccess(`rollForward ${rollForward}`,
                `{ sdk: {version: "5.1.509", rollForward: "${rollForward}" } }`,
                "5.1.509", rollForward, true,

                ["5.1.509", "5.1.510", "5.1.800", "5.1.909" ],
                [ "4.6.509", "5.1.100", "5.1.508", "6.1.509" ],

                ["5.1"],
                ["4.1", "5.0", "5.2", "6.1", "6.2" ]
            );
        });

    Array(rollForwardPolicy.minor, rollForwardPolicy.latestMinor)
        .forEach(rollForward => {
            assertSuccess(`rollForward ${rollForward}`,
                `{ sdk: {version: "6.2.452", rollForward: "${rollForward}" } }`,
                "6.2.452", rollForward, true,
                ["6.2.452", "6.2.600", "6.5.100" ],
                ["5.1.509", "6.0.100", "7.2.452" ],

                ["6.2", "6.4", "6.10"],
                ["5.1", "5.0", "6.0", "7.1" ]
            );
        });

    Array(rollForwardPolicy.major, rollForwardPolicy.latestMajor)
        .forEach(rollForward => {
            assertSuccess(`rollForward ${rollForward}`,
                `{ sdk: {version: "5.1.509", rollForward: "${rollForward}" } }`,
                "5.1.509", rollForward, true,

                ["5.2.100", "5.5.800", "10.8.568" ],
                ["3.1.800", "5.0.204" ],

                ["5.1", "5.2", "6.0", "6.1"],
                ["4.0", "4.9", "5.0"]
            );
        });
}