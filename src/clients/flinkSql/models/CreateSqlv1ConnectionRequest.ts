/* tslint:disable */
/* eslint-disable */
/**
 * SQL API v1
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 0.0.1
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
import type { SqlV1ConnectionStatus } from "./SqlV1ConnectionStatus";
import {
  SqlV1ConnectionStatusFromJSON,
  SqlV1ConnectionStatusFromJSONTyped,
  SqlV1ConnectionStatusToJSON,
  SqlV1ConnectionStatusToJSONTyped,
} from "./SqlV1ConnectionStatus";
import type { SqlV1ConnectionMetadata } from "./SqlV1ConnectionMetadata";
import {
  SqlV1ConnectionMetadataFromJSON,
  SqlV1ConnectionMetadataFromJSONTyped,
  SqlV1ConnectionMetadataToJSON,
  SqlV1ConnectionMetadataToJSONTyped,
} from "./SqlV1ConnectionMetadata";

/**
 *
 * @export
 * @interface CreateSqlv1ConnectionRequest
 */
export interface CreateSqlv1ConnectionRequest {
  /**
   * APIVersion defines the schema version of this representation of a resource.
   * @type {string}
   * @memberof CreateSqlv1ConnectionRequest
   */
  readonly api_version?: CreateSqlv1ConnectionRequestApiVersionEnum;
  /**
   * Kind defines the object this REST resource represents.
   * @type {string}
   * @memberof CreateSqlv1ConnectionRequest
   */
  readonly kind?: CreateSqlv1ConnectionRequestKindEnum;
  /**
   *
   * @type {SqlV1ConnectionMetadata}
   * @memberof CreateSqlv1ConnectionRequest
   */
  metadata?: SqlV1ConnectionMetadata;
  /**
   * The user provided name of the resource, unique within this environment.
   * @type {string}
   * @memberof CreateSqlv1ConnectionRequest
   */
  name: string;
  /**
   *
   * @type {object}
   * @memberof CreateSqlv1ConnectionRequest
   */
  spec: object;
  /**
   *
   * @type {SqlV1ConnectionStatus}
   * @memberof CreateSqlv1ConnectionRequest
   */
  status?: SqlV1ConnectionStatus;
}

/**
 * @export
 * @enum {string}
 */
export enum CreateSqlv1ConnectionRequestApiVersionEnum {
  SqlV1 = "sql/v1",
}
/**
 * @export
 * @enum {string}
 */
export enum CreateSqlv1ConnectionRequestKindEnum {
  Connection = "Connection",
}

/**
 * Check if a given object implements the CreateSqlv1ConnectionRequest interface.
 */
export function instanceOfCreateSqlv1ConnectionRequest(
  value: object,
): value is CreateSqlv1ConnectionRequest {
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("spec" in value) || value["spec"] === undefined) return false;
  return true;
}

export function CreateSqlv1ConnectionRequestFromJSON(json: any): CreateSqlv1ConnectionRequest {
  return CreateSqlv1ConnectionRequestFromJSONTyped(json, false);
}

export function CreateSqlv1ConnectionRequestFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateSqlv1ConnectionRequest {
  if (json == null) {
    return json;
  }
  return {
    api_version: json["api_version"] == null ? undefined : json["api_version"],
    kind: json["kind"] == null ? undefined : json["kind"],
    metadata:
      json["metadata"] == null ? undefined : SqlV1ConnectionMetadataFromJSON(json["metadata"]),
    name: json["name"],
    spec: json["spec"],
    status: json["status"] == null ? undefined : SqlV1ConnectionStatusFromJSON(json["status"]),
  };
}

export function CreateSqlv1ConnectionRequestToJSON(json: any): CreateSqlv1ConnectionRequest {
  return CreateSqlv1ConnectionRequestToJSONTyped(json, false);
}

export function CreateSqlv1ConnectionRequestToJSONTyped(
  value?: Omit<CreateSqlv1ConnectionRequest, "api_version" | "kind"> | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    metadata: SqlV1ConnectionMetadataToJSON(value["metadata"]),
    name: value["name"],
    spec: value["spec"],
    status: SqlV1ConnectionStatusToJSON(value["status"]),
  };
}
