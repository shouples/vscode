/* tslint:disable */
/* eslint-disable */
/**
 * Docker Engine API
 * The Engine API is an HTTP API served by Docker Engine. It is the API the Docker client uses to communicate with the Engine, so everything the Docker client can do can be done with the API.  Most of the client\'s commands map directly to API endpoints (e.g. `docker ps` is `GET /containers/json`). The notable exception is running containers, which consists of several API calls.  # Errors  The API uses standard HTTP status codes to indicate the success or failure of the API call. The body of the response will be JSON in the following format:  ``` {   \"message\": \"page not found\" } ```  # Versioning  The API is usually changed in each release, so API calls are versioned to ensure that clients don\'t break. To lock to a specific version of the API, you prefix the URL with its version, for example, call `/v1.30/info` to use the v1.30 version of the `/info` endpoint. If the API version specified in the URL is not supported by the daemon, a HTTP `400 Bad Request` error message is returned.  If you omit the version-prefix, the current version of the API (v1.43) is used. For example, calling `/info` is the same as calling `/v1.43/info`. Using the API without a version-prefix is deprecated and will be removed in a future release.  Engine releases in the near future should support this version of the API, so your client will continue to work even if it is talking to a newer Engine.  The API uses an open schema model, which means server may add extra properties to responses. Likewise, the server will ignore any extra query parameters and request body properties. When you write clients, you need to ignore additional properties in responses to ensure they do not break when talking to newer daemons.   # Authentication  Authentication for registries is handled client side. The client has to send authentication details to various endpoints that need to communicate with registries, such as `POST /images/(name)/push`. These are sent as `X-Registry-Auth` header as a [base64url encoded](https://tools.ietf.org/html/rfc4648#section-5) (JSON) string with the following structure:  ``` {   \"username\": \"string\",   \"password\": \"string\",   \"email\": \"string\",   \"serveraddress\": \"string\" } ```  The `serveraddress` is a domain/IP without a protocol. Throughout this structure, double quotes are required.  If you have already got an identity token from the [`/auth` endpoint](#operation/SystemAuth), you can just pass this instead of credentials:  ``` {   \"identitytoken\": \"9cbaf023786cd7...\" } ```
 *
 * The version of the OpenAPI document: 1.43
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
/**
 * Information about the issuer of leaf TLS certificates and the trusted root
 * CA certificate.
 *
 * @export
 * @interface TLSInfo
 */
export interface TLSInfo {
  /**
   * The root CA certificate(s) that are used to validate leaf TLS
   * certificates.
   *
   * @type {string}
   * @memberof TLSInfo
   */
  TrustRoot?: string;
  /**
   * The base64-url-safe-encoded raw subject bytes of the issuer.
   * @type {string}
   * @memberof TLSInfo
   */
  CertIssuerSubject?: string;
  /**
   * The base64-url-safe-encoded raw public key bytes of the issuer.
   *
   * @type {string}
   * @memberof TLSInfo
   */
  CertIssuerPublicKey?: string;
}

/**
 * Check if a given object implements the TLSInfo interface.
 */
export function instanceOfTLSInfo(value: object): value is TLSInfo {
  return true;
}

export function TLSInfoFromJSON(json: any): TLSInfo {
  return TLSInfoFromJSONTyped(json, false);
}

export function TLSInfoFromJSONTyped(json: any, ignoreDiscriminator: boolean): TLSInfo {
  if (json == null) {
    return json;
  }
  return {
    TrustRoot: json["TrustRoot"] == null ? undefined : json["TrustRoot"],
    CertIssuerSubject: json["CertIssuerSubject"] == null ? undefined : json["CertIssuerSubject"],
    CertIssuerPublicKey:
      json["CertIssuerPublicKey"] == null ? undefined : json["CertIssuerPublicKey"],
  };
}

export function TLSInfoToJSON(json: any): TLSInfo {
  return TLSInfoToJSONTyped(json, false);
}

export function TLSInfoToJSONTyped(
  value?: TLSInfo | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    TrustRoot: value["TrustRoot"],
    CertIssuerSubject: value["CertIssuerSubject"],
    CertIssuerPublicKey: value["CertIssuerPublicKey"],
  };
}
