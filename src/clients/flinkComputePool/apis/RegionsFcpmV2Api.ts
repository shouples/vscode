/* tslint:disable */
/* eslint-disable */
/**
 * Flink Compute Pool Management API
 * This is the Flink Compute Pool management API.
 *
 * The version of the OpenAPI document: 0.0.1
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import * as runtime from "../runtime";
import type { Failure, FcpmV2RegionList } from "../models/index";
import {
  FailureFromJSON,
  FailureToJSON,
  FcpmV2RegionListFromJSON,
  FcpmV2RegionListToJSON,
} from "../models/index";

export interface ListFcpmV2RegionsRequest {
  cloud?: string;
  region_name?: string;
  page_size?: number;
  page_token?: string;
}

/**
 *
 */
export class RegionsFcpmV2Api extends runtime.BaseAPI {
  /**
   * [![General Availability](https://img.shields.io/badge/Lifecycle%20Stage-General%20Availability-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy)  Retrieve a sorted, filtered, paginated list of all regions.
   * List of Regions
   */
  async listFcpmV2RegionsRaw(
    requestParameters: ListFcpmV2RegionsRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<FcpmV2RegionList>> {
    const queryParameters: any = {};

    if (requestParameters["cloud"] != null) {
      queryParameters["cloud"] = requestParameters["cloud"];
    }

    if (requestParameters["region_name"] != null) {
      queryParameters["region_name"] = requestParameters["region_name"];
    }

    if (requestParameters["page_size"] != null) {
      queryParameters["page_size"] = requestParameters["page_size"];
    }

    if (requestParameters["page_token"] != null) {
      queryParameters["page_token"] = requestParameters["page_token"];
    }

    const headerParameters: runtime.HTTPHeaders = {};

    if (
      this.configuration &&
      (this.configuration.username !== undefined || this.configuration.password !== undefined)
    ) {
      headerParameters["Authorization"] =
        "Basic " + btoa(this.configuration.username + ":" + this.configuration.password);
    }
    if (this.configuration && this.configuration.accessToken) {
      // oauth required
      headerParameters["Authorization"] = await this.configuration.accessToken(
        "confluent-sts-access-token",
        [],
      );
    }

    const response = await this.request(
      {
        path: `/fcpm/v2/regions`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      FcpmV2RegionListFromJSON(jsonValue),
    );
  }

  /**
   * [![General Availability](https://img.shields.io/badge/Lifecycle%20Stage-General%20Availability-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy)  Retrieve a sorted, filtered, paginated list of all regions.
   * List of Regions
   */
  async listFcpmV2Regions(
    requestParameters: ListFcpmV2RegionsRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<FcpmV2RegionList> {
    const response = await this.listFcpmV2RegionsRaw(requestParameters, initOverrides);
    return await response.value();
  }
}
