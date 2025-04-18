/* tslint:disable */
/* eslint-disable */
/**
 * Scaffolding API
 * The Scaffolding Service exposes collections of templates that can be applied to generate application projects.
 *
 * The version of the OpenAPI document: 0.0.1
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import * as runtime from "../runtime";
import type {
  ApplyScaffoldV1TemplateRequest,
  Failure,
  GetScaffoldV1Template200Response,
  ScaffoldV1TemplateList,
} from "../models/index";
import {
  ApplyScaffoldV1TemplateRequestFromJSON,
  ApplyScaffoldV1TemplateRequestToJSON,
  FailureFromJSON,
  FailureToJSON,
  GetScaffoldV1Template200ResponseFromJSON,
  GetScaffoldV1Template200ResponseToJSON,
  ScaffoldV1TemplateListFromJSON,
  ScaffoldV1TemplateListToJSON,
} from "../models/index";

export interface ApplyScaffoldV1TemplateOperationRequest {
  template_collection_name: string;
  name: string;
  ApplyScaffoldV1TemplateRequest?: ApplyScaffoldV1TemplateRequest;
}

export interface GetScaffoldV1TemplateRequest {
  template_collection_name: string;
  name: string;
}

export interface ListScaffoldV1TemplatesRequest {
  template_collection_name: string;
  page_size?: number;
  page_token?: string;
}

/**
 *
 */
export class TemplatesScaffoldV1Api extends runtime.BaseAPI {
  /**
   * [![Early Access](https://img.shields.io/badge/Lifecycle%20Stage-Early%20Access-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy) [![Request Access To Scaffolding API v1](https://img.shields.io/badge/-Request%20Access%20To%20Scaffolding%20API%20v1-%23bc8540)](mailto:ccloud-api-access+scaffold-v1-early-access@confluent.io?subject=Request%20to%20join%20scaffold/v1%20API%20Early%20Access&body=I%E2%80%99d%20like%20to%20join%20the%20Confluent%20Cloud%20API%20Early%20Access%20for%20scaffold/v1%20to%20provide%20early%20feedback%21%20My%20Cloud%20Organization%20ID%20is%20%3Cretrieve%20from%20https%3A//confluent.cloud/settings/billing/payment%3E.)  Generates an application project from a template using provided option values.
   * Apply a Template
   */
  async applyScaffoldV1TemplateRaw(
    requestParameters: ApplyScaffoldV1TemplateOperationRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<Blob>> {
    if (requestParameters["template_collection_name"] == null) {
      throw new runtime.RequiredError(
        "template_collection_name",
        'Required parameter "template_collection_name" was null or undefined when calling applyScaffoldV1Template().',
      );
    }

    if (requestParameters["name"] == null) {
      throw new runtime.RequiredError(
        "name",
        'Required parameter "name" was null or undefined when calling applyScaffoldV1Template().',
      );
    }

    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    headerParameters["Content-Type"] = "application/json";

    const response = await this.request(
      {
        path: `/scaffold/v1/template-collections/{template-collection-name}/templates/{name}/apply`
          .replace(
            `{${"template-collection-name"}}`,
            encodeURIComponent(String(requestParameters["template_collection_name"])),
          )
          .replace(`{${"name"}}`, encodeURIComponent(String(requestParameters["name"]))),
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: ApplyScaffoldV1TemplateRequestToJSON(
          requestParameters["ApplyScaffoldV1TemplateRequest"],
        ),
      },
      initOverrides,
    );

    return new runtime.BlobApiResponse(response);
  }

  /**
   * [![Early Access](https://img.shields.io/badge/Lifecycle%20Stage-Early%20Access-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy) [![Request Access To Scaffolding API v1](https://img.shields.io/badge/-Request%20Access%20To%20Scaffolding%20API%20v1-%23bc8540)](mailto:ccloud-api-access+scaffold-v1-early-access@confluent.io?subject=Request%20to%20join%20scaffold/v1%20API%20Early%20Access&body=I%E2%80%99d%20like%20to%20join%20the%20Confluent%20Cloud%20API%20Early%20Access%20for%20scaffold/v1%20to%20provide%20early%20feedback%21%20My%20Cloud%20Organization%20ID%20is%20%3Cretrieve%20from%20https%3A//confluent.cloud/settings/billing/payment%3E.)  Generates an application project from a template using provided option values.
   * Apply a Template
   */
  async applyScaffoldV1Template(
    requestParameters: ApplyScaffoldV1TemplateOperationRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<Blob> {
    const response = await this.applyScaffoldV1TemplateRaw(requestParameters, initOverrides);
    return await response.value();
  }

  /**
   * [![Early Access](https://img.shields.io/badge/Lifecycle%20Stage-Early%20Access-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy) [![Request Access To Scaffolding API v1](https://img.shields.io/badge/-Request%20Access%20To%20Scaffolding%20API%20v1-%23bc8540)](mailto:ccloud-api-access+scaffold-v1-early-access@confluent.io?subject=Request%20to%20join%20scaffold/v1%20API%20Early%20Access&body=I%E2%80%99d%20like%20to%20join%20the%20Confluent%20Cloud%20API%20Early%20Access%20for%20scaffold/v1%20to%20provide%20early%20feedback%21%20My%20Cloud%20Organization%20ID%20is%20%3Cretrieve%20from%20https%3A//confluent.cloud/settings/billing/payment%3E.)  Make a request to read a template.
   * Read a Template
   */
  async getScaffoldV1TemplateRaw(
    requestParameters: GetScaffoldV1TemplateRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetScaffoldV1Template200Response>> {
    if (requestParameters["template_collection_name"] == null) {
      throw new runtime.RequiredError(
        "template_collection_name",
        'Required parameter "template_collection_name" was null or undefined when calling getScaffoldV1Template().',
      );
    }

    if (requestParameters["name"] == null) {
      throw new runtime.RequiredError(
        "name",
        'Required parameter "name" was null or undefined when calling getScaffoldV1Template().',
      );
    }

    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    const response = await this.request(
      {
        path: `/scaffold/v1/template-collections/{template-collection-name}/templates/{name}`
          .replace(
            `{${"template-collection-name"}}`,
            encodeURIComponent(String(requestParameters["template_collection_name"])),
          )
          .replace(`{${"name"}}`, encodeURIComponent(String(requestParameters["name"]))),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetScaffoldV1Template200ResponseFromJSON(jsonValue),
    );
  }

  /**
   * [![Early Access](https://img.shields.io/badge/Lifecycle%20Stage-Early%20Access-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy) [![Request Access To Scaffolding API v1](https://img.shields.io/badge/-Request%20Access%20To%20Scaffolding%20API%20v1-%23bc8540)](mailto:ccloud-api-access+scaffold-v1-early-access@confluent.io?subject=Request%20to%20join%20scaffold/v1%20API%20Early%20Access&body=I%E2%80%99d%20like%20to%20join%20the%20Confluent%20Cloud%20API%20Early%20Access%20for%20scaffold/v1%20to%20provide%20early%20feedback%21%20My%20Cloud%20Organization%20ID%20is%20%3Cretrieve%20from%20https%3A//confluent.cloud/settings/billing/payment%3E.)  Make a request to read a template.
   * Read a Template
   */
  async getScaffoldV1Template(
    requestParameters: GetScaffoldV1TemplateRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetScaffoldV1Template200Response> {
    const response = await this.getScaffoldV1TemplateRaw(requestParameters, initOverrides);
    return await response.value();
  }

  /**
   * [![Early Access](https://img.shields.io/badge/Lifecycle%20Stage-Early%20Access-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy) [![Request Access To Scaffolding API v1](https://img.shields.io/badge/-Request%20Access%20To%20Scaffolding%20API%20v1-%23bc8540)](mailto:ccloud-api-access+scaffold-v1-early-access@confluent.io?subject=Request%20to%20join%20scaffold/v1%20API%20Early%20Access&body=I%E2%80%99d%20like%20to%20join%20the%20Confluent%20Cloud%20API%20Early%20Access%20for%20scaffold/v1%20to%20provide%20early%20feedback%21%20My%20Cloud%20Organization%20ID%20is%20%3Cretrieve%20from%20https%3A//confluent.cloud/settings/billing/payment%3E.)  Retrieve a sorted, filtered, paginated list of all templates.
   * List of Templates
   */
  async listScaffoldV1TemplatesRaw(
    requestParameters: ListScaffoldV1TemplatesRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ScaffoldV1TemplateList>> {
    if (requestParameters["template_collection_name"] == null) {
      throw new runtime.RequiredError(
        "template_collection_name",
        'Required parameter "template_collection_name" was null or undefined when calling listScaffoldV1Templates().',
      );
    }

    const queryParameters: any = {};

    if (requestParameters["page_size"] != null) {
      queryParameters["page_size"] = requestParameters["page_size"];
    }

    if (requestParameters["page_token"] != null) {
      queryParameters["page_token"] = requestParameters["page_token"];
    }

    const headerParameters: runtime.HTTPHeaders = {};

    const response = await this.request(
      {
        path: `/scaffold/v1/template-collections/{template-collection-name}/templates`.replace(
          `{${"template-collection-name"}}`,
          encodeURIComponent(String(requestParameters["template_collection_name"])),
        ),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ScaffoldV1TemplateListFromJSON(jsonValue),
    );
  }

  /**
   * [![Early Access](https://img.shields.io/badge/Lifecycle%20Stage-Early%20Access-%2345c6e8)](#section/Versioning/API-Lifecycle-Policy) [![Request Access To Scaffolding API v1](https://img.shields.io/badge/-Request%20Access%20To%20Scaffolding%20API%20v1-%23bc8540)](mailto:ccloud-api-access+scaffold-v1-early-access@confluent.io?subject=Request%20to%20join%20scaffold/v1%20API%20Early%20Access&body=I%E2%80%99d%20like%20to%20join%20the%20Confluent%20Cloud%20API%20Early%20Access%20for%20scaffold/v1%20to%20provide%20early%20feedback%21%20My%20Cloud%20Organization%20ID%20is%20%3Cretrieve%20from%20https%3A//confluent.cloud/settings/billing/payment%3E.)  Retrieve a sorted, filtered, paginated list of all templates.
   * List of Templates
   */
  async listScaffoldV1Templates(
    requestParameters: ListScaffoldV1TemplatesRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ScaffoldV1TemplateList> {
    const response = await this.listScaffoldV1TemplatesRaw(requestParameters, initOverrides);
    return await response.value();
  }
}
