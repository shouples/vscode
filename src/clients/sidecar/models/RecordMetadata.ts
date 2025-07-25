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
import type { KeyOrValueMetadata } from "./KeyOrValueMetadata";
import {
  KeyOrValueMetadataFromJSON,
  KeyOrValueMetadataFromJSONTyped,
  KeyOrValueMetadataToJSON,
  KeyOrValueMetadataToJSONTyped,
} from "./KeyOrValueMetadata";

/**
 *
 * @export
 * @interface RecordMetadata
 */
export interface RecordMetadata {
  /**
   *
   * @type {KeyOrValueMetadata}
   * @memberof RecordMetadata
   */
  key_metadata?: KeyOrValueMetadata;
  /**
   *
   * @type {KeyOrValueMetadata}
   * @memberof RecordMetadata
   */
  value_metadata?: KeyOrValueMetadata;
}

/**
 * Check if a given object implements the RecordMetadata interface.
 */
export function instanceOfRecordMetadata(value: object): value is RecordMetadata {
  return true;
}

export function RecordMetadataFromJSON(json: any): RecordMetadata {
  return RecordMetadataFromJSONTyped(json, false);
}

export function RecordMetadataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): RecordMetadata {
  if (json == null) {
    return json;
  }
  return {
    key_metadata:
      json["key_metadata"] == null ? undefined : KeyOrValueMetadataFromJSON(json["key_metadata"]),
    value_metadata:
      json["value_metadata"] == null
        ? undefined
        : KeyOrValueMetadataFromJSON(json["value_metadata"]),
  };
}

export function RecordMetadataToJSON(json: any): RecordMetadata {
  return RecordMetadataToJSONTyped(json, false);
}

export function RecordMetadataToJSONTyped(
  value?: RecordMetadata | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    key_metadata: KeyOrValueMetadataToJSON(value["key_metadata"]),
    value_metadata: KeyOrValueMetadataToJSON(value["value_metadata"]),
  };
}
