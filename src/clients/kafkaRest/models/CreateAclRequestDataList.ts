/* tslint:disable */
/* eslint-disable */
/**
 * REST Admin API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 3.0.0
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
import type { CreateAclRequestData } from "./CreateAclRequestData";
import {
  CreateAclRequestDataFromJSON,
  CreateAclRequestDataFromJSONTyped,
  CreateAclRequestDataToJSON,
  CreateAclRequestDataToJSONTyped,
} from "./CreateAclRequestData";

/**
 *
 * @export
 * @interface CreateAclRequestDataList
 */
export interface CreateAclRequestDataList {
  /**
   *
   * @type {Array<CreateAclRequestData>}
   * @memberof CreateAclRequestDataList
   */
  data: Array<CreateAclRequestData>;
}

/**
 * Check if a given object implements the CreateAclRequestDataList interface.
 */
export function instanceOfCreateAclRequestDataList(
  value: object,
): value is CreateAclRequestDataList {
  if (!("data" in value) || value["data"] === undefined) return false;
  return true;
}

export function CreateAclRequestDataListFromJSON(json: any): CreateAclRequestDataList {
  return CreateAclRequestDataListFromJSONTyped(json, false);
}

export function CreateAclRequestDataListFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateAclRequestDataList {
  if (json == null) {
    return json;
  }
  return {
    data: (json["data"] as Array<any>).map(CreateAclRequestDataFromJSON),
  };
}

export function CreateAclRequestDataListToJSON(json: any): CreateAclRequestDataList {
  return CreateAclRequestDataListToJSONTyped(json, false);
}

export function CreateAclRequestDataListToJSONTyped(
  value?: CreateAclRequestDataList | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: (value["data"] as Array<any>).map(CreateAclRequestDataToJSON),
  };
}
