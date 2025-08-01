/* tslint:disable */
/* eslint-disable */
/**
 * Confluent ide-sidecar API
 * API for the Confluent ide-sidecar, part of Confluent for VS Code
 *
 * The version of the OpenAPI document: 0.220.0
 * Contact: vscode@confluent.io
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
/**
 *
 * @export
 * @interface UserInfo
 */
export interface UserInfo {
  /**
   *
   * @type {string}
   * @memberof UserInfo
   */
  id?: string;
  /**
   *
   * @type {string}
   * @memberof UserInfo
   */
  username?: string;
  /**
   *
   * @type {string}
   * @memberof UserInfo
   */
  first_name?: string;
  /**
   *
   * @type {string}
   * @memberof UserInfo
   */
  last_name?: string;
  /**
   *
   * @type {string}
   * @memberof UserInfo
   */
  social_connection?: string;
  /**
   *
   * @type {string}
   * @memberof UserInfo
   */
  auth_type?: string;
}

/**
 * Check if a given object implements the UserInfo interface.
 */
export function instanceOfUserInfo(value: object): value is UserInfo {
  return true;
}

export function UserInfoFromJSON(json: any): UserInfo {
  return UserInfoFromJSONTyped(json, false);
}

export function UserInfoFromJSONTyped(json: any, ignoreDiscriminator: boolean): UserInfo {
  if (json == null) {
    return json;
  }
  return {
    id: json["id"] == null ? undefined : json["id"],
    username: json["username"] == null ? undefined : json["username"],
    first_name: json["first_name"] == null ? undefined : json["first_name"],
    last_name: json["last_name"] == null ? undefined : json["last_name"],
    social_connection: json["social_connection"] == null ? undefined : json["social_connection"],
    auth_type: json["auth_type"] == null ? undefined : json["auth_type"],
  };
}

export function UserInfoToJSON(json: any): UserInfo {
  return UserInfoToJSONTyped(json, false);
}

export function UserInfoToJSONTyped(
  value?: UserInfo | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    id: value["id"],
    username: value["username"],
    first_name: value["first_name"],
    last_name: value["last_name"],
    social_connection: value["social_connection"],
    auth_type: value["auth_type"],
  };
}
