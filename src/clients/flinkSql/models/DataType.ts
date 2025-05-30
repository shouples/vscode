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
import type { RowFieldType } from "./RowFieldType";
import {
  RowFieldTypeFromJSON,
  RowFieldTypeFromJSONTyped,
  RowFieldTypeToJSON,
  RowFieldTypeToJSONTyped,
} from "./RowFieldType";

/**
 *
 * @export
 * @interface DataType
 */
export interface DataType {
  /**
   * The data type of the column.
   * @type {string}
   * @memberof DataType
   */
  type: string;
  /**
   * Indicates whether values in this column can be null.
   * @type {boolean}
   * @memberof DataType
   */
  nullable: boolean;
  /**
   * The length of the data type.
   * @type {number}
   * @memberof DataType
   */
  length?: number;
  /**
   * The precision of the data type.
   * @type {number}
   * @memberof DataType
   */
  precision?: number;
  /**
   * The scale of the data type.
   * @type {number}
   * @memberof DataType
   */
  scale?: number;
  /**
   * The type of the key in the data type (if applicable).
   * @type {DataType}
   * @memberof DataType
   */
  key_type?: DataType;
  /**
   * The type of the value in the data type (if applicable).
   * @type {DataType}
   * @memberof DataType
   */
  value_type?: DataType;
  /**
   * The type of the element in the data type (if applicable).
   * @type {DataType}
   * @memberof DataType
   */
  element_type?: DataType;
  /**
   * The fields of the element in the data type (if applicable).
   * @type {Array<RowFieldType>}
   * @memberof DataType
   */
  fields?: Array<RowFieldType>;
  /**
   * The resolution of the data type (if applicable).
   * @type {string}
   * @memberof DataType
   */
  resolution?: string;
  /**
   * The fractional precision of the data type (if applicable).
   * @type {number}
   * @memberof DataType
   */
  fractional_precision?: number;
}

/**
 * Check if a given object implements the DataType interface.
 */
export function instanceOfDataType(value: object): value is DataType {
  if (!("type" in value) || value["type"] === undefined) return false;
  if (!("nullable" in value) || value["nullable"] === undefined) return false;
  return true;
}

export function DataTypeFromJSON(json: any): DataType {
  return DataTypeFromJSONTyped(json, false);
}

export function DataTypeFromJSONTyped(json: any, ignoreDiscriminator: boolean): DataType {
  if (json == null) {
    return json;
  }
  return {
    type: json["type"],
    nullable: json["nullable"],
    length: json["length"] == null ? undefined : json["length"],
    precision: json["precision"] == null ? undefined : json["precision"],
    scale: json["scale"] == null ? undefined : json["scale"],
    key_type: json["key_type"] == null ? undefined : DataTypeFromJSON(json["key_type"]),
    value_type: json["value_type"] == null ? undefined : DataTypeFromJSON(json["value_type"]),
    element_type: json["element_type"] == null ? undefined : DataTypeFromJSON(json["element_type"]),
    fields:
      json["fields"] == null ? undefined : (json["fields"] as Array<any>).map(RowFieldTypeFromJSON),
    resolution: json["resolution"] == null ? undefined : json["resolution"],
    fractional_precision:
      json["fractional_precision"] == null ? undefined : json["fractional_precision"],
  };
}

export function DataTypeToJSON(json: any): DataType {
  return DataTypeToJSONTyped(json, false);
}

export function DataTypeToJSONTyped(
  value?: DataType | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    type: value["type"],
    nullable: value["nullable"],
    length: value["length"],
    precision: value["precision"],
    scale: value["scale"],
    key_type: DataTypeToJSON(value["key_type"]),
    value_type: DataTypeToJSON(value["value_type"]),
    element_type: DataTypeToJSON(value["element_type"]),
    fields:
      value["fields"] == null ? undefined : (value["fields"] as Array<any>).map(RowFieldTypeToJSON),
    resolution: value["resolution"],
    fractional_precision: value["fractional_precision"],
  };
}
