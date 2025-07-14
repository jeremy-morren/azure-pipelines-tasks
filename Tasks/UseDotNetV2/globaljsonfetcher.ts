"use strict";
import * as fileSystem from "fs";
import * as tl from 'azure-pipelines-task-lib/task';
import * as JSON5 from 'json5';
import { DotNetCoreVersionFetcher } from "./versionfetcher";
import { VersionInfo } from "./models";
import {strict} from "node:assert";
import * as assert from "node:assert";

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
        const versionInformation: VersionInfo[] = new Array<VersionInfo>();
        const versionStrings = this.readSDKs();
        for (let index = 0; index < versionStrings.length; index++) {
            const version = versionStrings[index];
            if (version != null) {
                throw 'NotImplemented';
                // const versionInfo = await this.versionFetcher.getVersionInfo(version, null, "sdk", false);
                // versionInformation.push(versionInfo);
            }
        }

        return Array.from(new Set(versionInformation)); // this remove all not unique values.
    }

    private readSDKs(): Array<globalJsonSDK | null> {
        let filePathsToGlobalJson = tl.findMatch(this.workingDirectory, "**/global.json");
        if (filePathsToGlobalJson == null || filePathsToGlobalJson.length == 0) {
            throw tl.loc("FailedToFindGlobalJson", this.workingDirectory);
        }

        return filePathsToGlobalJson.map(path => this.readGlobalJson(path))
            .filter(d => d != null); // remove all global.json that can't read
    }

    private readGlobalJson(path: string): globalJsonSDK | null {
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

            const result = parseGlobalJson(fileContent.toString());
            if (typeof result === 'string') {
                // Error parsing. Write a warning and return null
                tl.warning(tl.loc("FailedToReadGlobalJson", path, result));
                return null;
            }
            // Successfully parsed global.json
            console.log(tl.loc("GlobalJsonSdkVersion", result.toString(), path));
            return result;
        } catch (error) {
            // Failed to read global.json, throw an error.
            throw tl.loc("FailedToReadGlobalJson", path, error);
        }
    }

}

// Parse the global.json content. Returns the parsed SDK or an error.
// @param content The content of the global.json file.
export function parseGlobalJson(content: string) : globalJsonSDK | string {
    const globalJson = (JSON5.parse(content)) as {
        sdk: {
            version?: string | null,
            rollForward?: string,
            allowPrerelease?: boolean
        }
    };
    if (globalJson == null || globalJson.sdk == null) {
        // Input is null
        return "sdk property not found or null";
    }
    // Parse the input. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#globaljson-schema

    const sdk = globalJson.sdk;
    const versionStr = sdk.version;
    const allowPrerelease = sdk.allowPrerelease !== undefined
        ? sdk.allowPrerelease
        : true; // Default to true if not specified.
    const rollForward = sdk.rollForward ? sdk.rollForward : 'patch'; // Default to 'patch' if not specified.

    if (versionStr == null) {
        // No version specified. Only allowed if rollForward is 'latestMajor' or preRelease is specified.
        if (rollForward === 'latestMajor') {
            // If rollForward is 'latestMajor', we can use any sdk.
            return new globalJsonSDK(null, rollForwardPolicy.latestMajor, allowPrerelease);
        }

        if (sdk.allowPrerelease !== undefined) {
            // If preRelease is specified, we can use any sdk.
            // Roll forward must be 'latestMajor' or null
            if (sdk.rollForward && sdk.rollForward !== 'latestMajor') {
                return `allowPrerelease is null with invalid rollForward policy: ${sdk.rollForward}`
            }
            return new globalJsonSDK(null, rollForwardPolicy.latestMajor, allowPrerelease);
        }

        // No version specified.
        return 'No version specified';
    }
    const version = versionStr.split('.').map(parseInt);
    if (version.length < 2 || version.length > 3) {
        // Invalid version format. Must be in the form of 'major.minor' or 'major.minor.patch'.
        return `Invalid version format: ${version}`;
    }

    switch (rollForward) {
        case 'minor':
        case 'major':
        case 'latestMinor':
        case 'latestMajor':
            // major/minor rollForward, no validation of feature band or patch version needed.
            return new globalJsonSDK(version, rollForward as rollForwardPolicy, allowPrerelease);

        case 'patch':
        case 'feature':
        case 'latestPatch':
        case 'latestFeature':
        case 'disable':
            // rollForward is patch/feature, we need to validate the version.
            // Version should be in format x.y.znn
            if (version.length !== 3 || version[2] < 100 || version[2] > 999) {
                // Invalid version format. Must be in the form of 'major.minor.patch'.
                return `Invalid version format for rollForward policy ${rollForward}: ${version}`
            }
            return new globalJsonSDK(version, rollForward as rollForwardPolicy, allowPrerelease);
        default:
            // Invalid roll forward policy.
            return `Invalid roll forward policy: ${rollForward}`
    }
}

// Gets the patch version from an global.json SDK version.
function getPatchVersion(version: number[]) : number {
    // Version is in format x.y.znn where nn is the patch version.
    assert(version.length === 3);
    assert(version[2] >= 100 && version[3] <= 999);
    return version[2] % 100;
}

// Gets the feature band from an global.json SDK version.
function getFeatureBand(version: number[]) : number {
    // Version is in format x.y.znn where z is the feature band.
    assert(version.length === 3);
    assert(version[2] >= 100 && version[3] <= 999);
    return Math.floor(version[2] / 100);
}

// Roll forward policy. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#version
export enum rollForwardPolicy {
    patch = "patch",
    feature = "feature",
    minor = "minor",
    major = "major",
    latestPatch = "latestPatch",
    latestFeature = "latestFeature",
    latestMinor = "latestMinor",
    latestMajor = "latestMajor",
    disable = "disable"
}

// GlobalJSON SDK structure. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#globaljson-schema
export class globalJsonSDK {
    constructor(version: number[] | null, rollForward: rollForwardPolicy, allowPrerelease: boolean) {
        this.version = version;
        this.rollForward = rollForward;
        this.allowPrerelease = allowPrerelease;
    }

    // SDK version.
    public version: number[] | null;

    // Roll forward policy. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#version
    public rollForward: rollForwardPolicy;

    // Allow prerelease versions. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#allowprerelease
    public allowPrerelease: boolean;

    public toString() : string {
        const version = this.version ? this.version.join('.') : 'null';
        return `{ version: ${version}, rollForward: ${this.rollForward}, allowPrerelease: ${this.allowPrerelease} }`;
    }

    // Checks if this SDK can use the specified SDK version.
    // @param sdk The SDK version string in the format 'major.minor.patch'.
    // @param prerelease If the SDK version is a prerelease version.
    public canUseSDK(sdk: string, prerelease: boolean) : boolean {
        if (!this.allowPrerelease && prerelease) {
            // If the allowPrerelease is false, we can't use any prerelease channel.
            return false;
        }

        if (this.version == null) {
            assert(this.rollForward == "latestMajor");
            // If the version is null, we can use any channel.
            return true;
        }

        const version = sdk.split('.').map(parseInt);
        assert(version.length === 3, 'Invalid sdk');

        // Fall through each type: i.e. validate major, minor, feature and patch versions.

        if (this.rollForward == 'latestMajor') {
            return version[0] >= this.version[0];
        }

        // Other than latestMajor, major version must match.
        if (version[0] != this.version[0]) {
            return false;
        }

        // By now, major version matches.
        if (this.rollForward == 'major') {
            return true;
        }

        if (this.rollForward == 'latestMinor') {
            // If roll forward is minor, we can use any minor version.
            return version[1] >= this.version[1];
        }

        // Other than latestMinor, minor version must match.
        if (version[1] != this.version[1]) {
            return false;
        }

        // By now, major and minor versions match.
        if (this.rollForward == 'minor') {
            return true;
        }

        if (this.rollForward == 'latestFeature') {
            // If roll forward is feature, we can use any feature band.
            return getFeatureBand(version) >= getFeatureBand(this.version);
        }

        // Other than latestFeature, feature band must match.
        if (getFeatureBand(version) != getFeatureBand(this.version)) {
            return false;
        }

        // By now, major, minor and feature bands match.
        if (this.rollForward == 'feature') {
            return true;
        }

        if (this.rollForward == 'latestPatch') {
            // If roll forward is patch, we can use any patch version.
            return getPatchVersion(version) >= getPatchVersion(this.version);
        }

        // Other than latestPatch, patch version must match.
        if (getPatchVersion(version) != getPatchVersion(this.version)) {
            return false;
        }

        // By now, major, minor, feature bands and patch versions match.
        // rollForward must be 'patch' or 'disable'.
        assert(this.rollForward == "patch" || this.rollForward == "disable");

        return true;
    }
}