"use strict";
import * as fileSystem from "fs";
import * as tl from 'azure-pipelines-task-lib/task';
import * as JSON5 from 'json5';
import { DotNetCoreVersionFetcher } from "./versionfetcher";
import { VersionInfo } from "./models";
import {strict} from "node:assert";

export class globalJsonFetcher {

    private workingDirectory: string;
    private versionFetcher: DotNetCoreVersionFetcher = new DotNetCoreVersionFetcher(true);
    /**
     * The global json fetcher provider functionality to extract the version information from all global json in the working directory.
     * @param workingDirectory
     */
    constructor(workingDirectory: string) {
        this.workingDirectory = workingDirectory;
    }

    /**
     * Get all version information from all global.json starting from the working directory without duplicates.
     */
    public async GetVersions(): Promise<VersionInfo[]> {
        var versionInformation: VersionInfo[] = new Array<VersionInfo>();
        var versionStrings = this.getVersionStrings();
        for (let index = 0; index < versionStrings.length; index++) {
            const version = versionStrings[index];
            if (version != null) {
                var versionInfo = await this.versionFetcher.getVersionInfo(version, null, "sdk", false);
                versionInformation.push(versionInfo);
            }
        }

        return Array.from(new Set(versionInformation)); // this remove all not unique values.
    }

    private getVersionStrings(): Array<string | null> {
        let filePathsToGlobalJson = tl.findMatch(this.workingDirectory, "**/global.json");
        if (filePathsToGlobalJson == null || filePathsToGlobalJson.length == 0) {
            throw tl.loc("FailedToFindGlobalJson", this.workingDirectory);
        }

        return filePathsToGlobalJson.map(path => {
            var content = this.readGlobalJson(path);
            if (content != null) {
                tl.message(tl.loc("GlobalJsonSdkVersion", content.sdk.version, path));
                return content.sdk.version;
            }

            return null;
        })
            .filter(d => d != null); // remove all global.json that can't read
    }

    private readGlobalJson(path: string): GlobalJson | null {
        let globalJson: GlobalJson | null = null;
        console.log(tl.loc("GlobalJsonFound", path));
        try {
            let fileContent = fileSystem.readFileSync(path);
            // Since here is a buffer, we need to check length property to determine if it is empty. 
            if (!fileContent.length) {
                // do not throw if global.json is empty, task need not install any version in such case.
                // We log a warning and return null.
                tl.warning(tl.loc("GlobalJsonIsEmpty", path));
                return null;
            }

            globalJson = (JSON5.parse(fileContent.toString())) as {
                sdk: {
                    version: string,
                    rollForward?: string | null,
                    allowPrerelease?: boolean | null
                }
            };
        } catch (error) {
            // we throw if the global.json is invalid
            throw tl.loc("FailedToReadGlobalJson", path, error);
        }

        if (globalJson == null || globalJson.sdk == null || globalJson.sdk.version == null) {
            // Invalid global.json, we log a warning and return null.
            tl.warning(tl.loc("FailedToReadGlobalJson", path));
            return null;
        }

        return globalJson;
    }

}

// Parse the global.json content. Returns a string if the sdk is constant, or an sdk object if the sdk is dynamic.
// @param content The content of the global.json file.
// @param path The path to the global.json file, only used for logging.
export function ParseGlobalJson(content: string, path: string) : string | sdk | null {
    const globalJson = (JSON5.parse(content)) as {
        sdk: {
            version: string,
            rollForward?: string | null,
            allowPrerelease?: boolean | null
        }
    };
    if (globalJson == null || globalJson.sdk == null) {
        // Invalid global.json, we log a warning and return null.
        tl.warning(tl.loc("FailedToReadGlobalJson", path));
        return null;
    }
    // Parse the input. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#globaljson-schema

    const sdk = globalJson.sdk;
    const allowPrerelease = sdk.allowPrerelease ?? true; // Default to true if not specified.
    const version = sdk.version;
    const rollForward = sdk.rollForward;

    if (version == null) {
        // No version specified. Only allowed if rollForward is 'latestMajor' or preRelease is specified.
        if (rollForward === 'latestMajor' || sdk.allowPrerelease != null) {
            return {
                version: null,
                rollForward: 'latestMajor',
                allowPrerelease: allowPrerelease
            } as sdk;
        }
        // Invalid global.json, we log a warning and return null.
        tl.debug(`Failed to read global.json ${path}. No version specified`);
        tl.warning(tl.loc("FailedToReadGlobalJson", path));
        return null;
    }
    if (version.indexOf('*') === -1) {
        // The version contains a wildcard, which is not allowed in global.json.
        tl.error(tl.loc("OnlyExplicitVersionAllowed", path));
        return null;
    }
    switch (rollForward) {
        case 'feature':
        case 'minor':
        case 'major':
        case 'latestPatch':
        case 'latestFeature':
        case 'latestMinor':
        case 'latestMajor':
        case 'disable':
            // Valid roll forward policy.
            return {
                version: version,
                rollForward: rollForward,
                allowPrerelease: allowPrerelease
            } as sdk;

        case null:
            // No roll forward policy specified, default to 'patch'
            return {
                version: version,
                rollForward: 'patch',
                allowPrerelease: allowPrerelease
            } as sdk;
        default:
            // Invalid roll forward policy.
            tl.debug(`Failed to read global.json ${path}. Invalid roll forward policy: ${rollForward}`);
            tl.error(tl.loc("FailedToReadGlobalJson", path));
            return null;
    }
}

// global.json structure. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#globaljson-schema
export class GlobalJson {
    constructor(version: string | null = null) {
        if (version != null) {
            this.sdk = new sdk();
            this.sdk.version = version;
        }
    }
    public sdk: sdk;
}

// SDK structure. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#globaljson-schema
class sdk {
    // SDK version.
    public version: string | null;
    // Roll forward policy. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#version
    public rollForward: "patch" | "feature" | "minor" | "major" | "latestPatch" | "latestFeature" | "latestMinor" | "latestMajor" | "disable";
    // Allow prerelease versions. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#allowprerelease
    public allowPrerelease: boolean;
}