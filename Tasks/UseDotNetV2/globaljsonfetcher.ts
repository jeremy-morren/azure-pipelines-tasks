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

// Tries to parse a version string in format 'major.minor' or 'major.minor.patch'.
function tryParseVersionString(version: string) : number[] | string {
    if (version == null || version.length === 0) {
        return "Version string must not be null or empty";
    }
    const parts = version.split('.').map(part => parseInt(part, 10));
    if (parts.length < 2 || version.length > 3 || parts.some(isNaN) || parts.some(v => v < 0)) {
        // Invalid version format. Must be 'major.minor' or 'major.minor.patch'.
        return `Invalid version format: ${version}`;
    }
    return parts;
}

// Parses a version string in format 'major.minor' or 'major.minor.patch'.
function parseVersionString(version: string) : number[] {
    const result = tryParseVersionString(version);
    if (typeof result === 'string') {
        assert.fail(`Invalid version string: ${version}. Error: ${result}`);
    }
    return result;
}

// Compares two version strings in format 'major.minor' or 'major.minor.patch'. Formats must match.
function compareVersionStrings(a: string, b: string) : number {
    const aParts = parseVersionString(a);
    const bParts = parseVersionString(b);
    assert(aParts.length === bParts.length, `Versions must have the same number of parts: ${a} vs ${b}`);
    for (let i = 0; i < aParts.length; i++) {
        if (aParts[i] > bParts[i]) {
            // a is greater than b
            return 1;
        }
        if (aParts[i] < bParts[i]) {
            // a is less than b
            return -1;
        }
    }
    return 0; // Versions are equal
}

// Parse the global.json content. Returns the parsed SDK or an error.
// @param content The content of the global.json file.
export function parseGlobalJson(content: string) : globalJsonSDK | string {
    const globalJson = (JSON5.parse(content)) as {
        sdk: {
            version?: string | null,
            rollForward?: string | null,
            allowPrerelease?: boolean | null
        }
    };
    if (globalJson == null || globalJson.sdk == null) {
        // Input is null
        return "sdk property not found or null";
    }
    // Parse the input. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#globaljson-schema

    const sdk = globalJson.sdk;
    const versionStr = sdk.version;
    const allowPrerelease = sdk.allowPrerelease == null
        ? true // Default to true if not specified.
        : sdk.allowPrerelease;
    const rollForward = sdk.rollForward ? sdk.rollForward : 'patch'; // Default to 'patch' if not specified.

    if (versionStr == null) {
        // No version specified. Only allowed if rollForward is 'latestMajor' or preRelease is specified.
        if (rollForward === 'latestMajor') {
            // If rollForward is 'latestMajor', we can use any sdk.
            return new globalJsonSDK(null, rollForwardPolicy.latestMajor, allowPrerelease);
        }

        if (sdk.allowPrerelease != null) {
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
    const version = tryParseVersionString(versionStr);
    if (typeof version === 'string') {
        // Error parsing version.
        return version;
    }

    // Version must be in format 'major.minor.patch'.
    if (version.length !== 3 || version[2] < 100 || version[2] > 999) {
        return `Invalid version format: ${versionStr}`;
    }

    switch (rollForward) {
        case 'minor':
        case 'major':
        case 'latestMinor':
        case 'latestMajor':
            // major/minor rollForward, no validation of feature band or patch version needed.
            return new globalJsonSDK(versionStr, rollForward as rollForwardPolicy, allowPrerelease);

        // Special case for 'patch': legacy behavior. Allows 2 or 3 version parts.
        case 'patch':
            // major/minor rollForward, no validation of feature band or patch version needed.
            return new globalJsonSDK(versionStr, rollForward as rollForwardPolicy, allowPrerelease);

        case 'feature':
        case 'latestPatch':
        case 'latestFeature':
        case 'disable':
            // rollForward is patch/feature, Version should be in format x.y.znn
            if (version.length !== 3) {
                // Version must have 3 parts.
                return `Invalid version format for rollForward policy ${rollForward}: ${version}`;
            }
            return new globalJsonSDK(versionStr, rollForward as rollForwardPolicy, allowPrerelease);
        default:
            // Invalid roll forward policy.
            return `Invalid roll forward policy: ${rollForward}`
    }
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
    constructor(version: string | null, rollForward: rollForwardPolicy, allowPrerelease: boolean) {
        this.version = version;
        this.rollForward = rollForward;
        this.allowPrerelease = allowPrerelease;
        this.sdkVersion = version != null ? new sdkVersion(version) : null;
    }

    // SDK version.
    public version: string | null;

    // Roll forward policy. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#version
    public rollForward: rollForwardPolicy;

    // Allow prerelease versions. See https://learn.microsoft.com/en-us/dotnet/core/tools/global-json#allowprerelease
    public allowPrerelease: boolean;

    // Parsed SDK version number.
    public sdkVersion: sdkVersion | null;

    public toString() : string {
        const version = this.version ?? 'null';
        return `{ version: ${version}, rollForward: ${this.rollForward}, allowPrerelease: ${this.allowPrerelease} }`;
    }

    // Checks if this SDK can use the specified channel.
    // @param channel The channel name, e.g. '6.0', '7.0', etc.
    // @param prerelease If the channel is a prerelease channel.
    public canUseChannel(channel: string, prerelease: boolean) : boolean {
        // Compare only major and minor versions.
        const other = new channelVersion(channel);

        if (!this.allowPrerelease && prerelease) {
            // If allowPrerelease is false, we can't use any prerelease channel.
            return false;
        }

        if (this.sdkVersion == null) {
            // If the global.json version is null, we can use any channel.
            assert(this.rollForward == rollForwardPolicy.latestMajor, 'If global.json version is null, roll forward must be latestMajor');
            return true;
        }

        if (this.sdkVersion.equals(other)) {
            // If the major and minor versions match, we can use the channel.
            return true;
        }

        if (this.rollForward == rollForwardPolicy.latestMajor || this.rollForward == rollForwardPolicy.major) {
            // If roll forward is major, we can use any major version.
            return other.major >= this.sdkVersion.major;
        }

        // Other than latestMajor or major, major version must match.
        if (other.major != this.sdkVersion.major) {
            return false;
        }

        // By now, major version matches.
        if (this.rollForward == rollForwardPolicy.latestMinor || this.rollForward == rollForwardPolicy.minor) {
            // If roll forward is minor, we can use any minor version.
            return other.minor >= this.sdkVersion.minor;
        }

        // Other than latestMinor or minor, minor version must match.
        return other.minor === this.sdkVersion.minor;
    }

    // Checks if this SDK can use the specified SDK version.
    // @param sdk The SDK version string in the format 'major.minor' or 'major.minor.patch'.
    // @param prerelease If the SDK version is a prerelease version.
    public canUseVersion(version: string, prerelease: boolean) : boolean {
        const other = new sdkVersion(version);

        console.log(`Matching ${this.version}: ${this.sdkVersion} with provided ${version}: ${other}`);

        if (!this.allowPrerelease && prerelease) {
            // If allowPrerelease is false, we can't use any prerelease version.
            return false;
        }

        if (this.sdkVersion == null) {
            assert(this.rollForward == rollForwardPolicy.latestMajor);
            // If the global.json version is null, we can use any version.
            return true;
        }

        if (this.sdkVersion.equals(other)) {
            // If the versions are identical, we can use it.
            return true;
        }

        if (this.sdkVersion.greaterThan(other)) {
            // global.json version is greater than the provided version
            return false;
        }

        // Fall through each type: i.e. validate major and minor versions.
        // NB: When checking IF we can use an SDK, there is no difference between latestN and N roll forward policies.

        if (this.rollForward == rollForwardPolicy.latestMajor || this.rollForward == rollForwardPolicy.major) {
            // If roll forward is major, we can use any major version.
            return other.major >= this.sdkVersion.major;
        }

        // Other than latestMajor or major, major version must match.
        if (other.major != this.sdkVersion.major) {
            return false;
        }

        // By now, major version matches.

        if (this.rollForward == rollForwardPolicy.latestMinor || this.rollForward == rollForwardPolicy.minor) {
            // If roll forward is minor, we can use any minor version.
            return other.minor >= this.sdkVersion.minor;
        }

        // Other than latestMinor or minor, minor version must match.
        if (other.minor != this.sdkVersion.minor) {
            return false;
        }

        // By now, major and minor versions match.

        if (this.rollForward == rollForwardPolicy.latestFeature || this.rollForward == rollForwardPolicy.feature) {
            // If roll forward is feature, we can use any feature band.
            return other.featureBand >= this.sdkVersion.featureBand;
        }

        // Other than latestFeature or feature, feature band must match.
        if (other.featureBand != this.sdkVersion.featureBand) {
            return false;
        }

        // By now, major, minor and feature bands match.

        if (this.rollForward == rollForwardPolicy.latestPatch) {
            // If roll forward is latestPatch, we can use any patch version.
            return other.patch >= this.sdkVersion.patch;
        }

        // Other than latestPatch, patch version must match.
        if (other.patch != this.sdkVersion.patch) {
            return false;
        }

        // By now, major, minor, feature bands and patch versions match.
        // We shouldn't reach here because we already checked that the versions are equal above.
        assert.fail('Versions are not equal but all parts match');
    }

    // Selects the best channel from the provided list of channels, or returns null if no suitable channel is found.
    public selectChannel(channels: { version: string, prerelease: boolean }[]) : string | null {
        if (channels.length === 0) {
            // No channels provided.
            return null;
        }

        // Sort channels by version, so that we can select the latest one.
        channels = channels.sort((a,b) => compareVersionStrings(a.version, b.version));

        const canUse = channels
            .filter(c => this.canUseChannel(c.version, c.prerelease))
            .map(c => new channelVersion(c.version));
        if (canUse.length === 0) {
            // No suitable channels found.

            // Only for patch: legacy SDK behavior: select the latest channel version.
            if (this.rollForward === rollForwardPolicy.patch)
                return channels[channels.length - 1].version;
            return null;
        }
        switch (this.rollForward) {
            case rollForwardPolicy.latestMajor:
                // For latestMajor, return the latest channel.
                return canUse[canUse.length - 1].version;
            case rollForwardPolicy.major:
                // For major: return the channel with the same major version.
                const major = channels.find(c => par)
        }
    }
}

// Checks if two version parts arrays are equal.
function partsEqual(left: number[], right: number[]) : boolean {
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    // If we reached here, all compared parts are equal.
    return true;
}

// Returns true if the left version parts are greater than the right version parts.
function partsGreaterThan(left: number[], right: number[]) : boolean {
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
        if (left[i] > right[i]) {
            // Left version part is greater than the right one.
            return true;
        }
        if (left[i] < right[i]) {
            // Left version part is less than the right one.
            return false;
        }
    }
    // If we reached here, all compared parts are equal.
    return false;
}


// Represents an SDK version with major, minor and optional patch version.
class sdkVersion {
    constructor(version: string) {
        const parts = parseVersionString(version);
        this.major = parts[0];
        this.minor = parts[1];
        this.featureBand = Math.floor(parts[2] / 100);
        this.patch = parts[2] % 100;
    }

    public major: number;
    public minor: number;
    public featureBand: number;
    public patch: number;

    // Checks if this version is identical to another
    public equals(other: sdkVersion | channelVersion | string) : boolean {
        if (typeof other === 'string') {
            other = new sdkVersion(other);
        }
        return partsEqual(this.getParts(), other.getParts());
    }

    // Checks if this version is greater than the specified version.
    public greaterThan(other: sdkVersion | channelVersion) : boolean {
        return partsGreaterThan(this.getParts(), other.getParts());
    }

    // Returns the version as the input string
    public toString() : string {
        return `${this.major}.${this.minor}.${this.featureBand}${this.patch.toString().padStart(2, '0')}`;
    }

    public getParts() : number[] {
        return [this.major, this.minor, this.featureBand, this.patch];
    }
}

class channelVersion {
    constructor(channel: string) {
        this.value = channel;

        const parts = parseVersionString(channel);
        assert(parts.length === 2, `Channel version must have 2 parts: ${channel}`);
        this.major = parts[0];
        this.minor = parts[1];
    }

    public value: string;
    public major: number;
    public minor: number;

    // Checks if this channel version is equal to another channel version or a string.
    public equals(other: sdkVersion | channelVersion | string) : boolean {
        if (typeof other === 'string') {
            other = new channelVersion(other);
        }
        return partsEqual(this.getParts(), other.getParts());
    }

    // Checks if this channel version is greater than the specified channel version.
    public greaterThan(other: channelVersion) : boolean {
        return partsGreaterThan(this.getParts(), other.getParts());
    }

    public toString() : string {
        return this.value;
    }

    // Gets the major and minor version parts as an array.
    public getParts() : number[] {
        return [this.major, this.minor];
    }
}