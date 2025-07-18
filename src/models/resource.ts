import { ConnectionType } from "../clients/sidecar";
import { CCLOUD_CONNECTION_ID, IconNames, LOCAL_CONNECTION_ID } from "../constants";

/** A uniquely-branded string-type for a connection ID. */
export type ConnectionId = string & { readonly brand: unique symbol };

/** Likewise for environment ids. Note that Direct Connection ids also double as environment ids. */
export type EnvironmentId = string & { readonly brand: unique symbol };

export type OrganizationId = string & { readonly brand: unique symbol };

// Function to convert a ConnectionId to a ConnectionType, because we can always
// go from one to the other.
export function connectionIdToType(id: ConnectionId): ConnectionType {
  if (id === LOCAL_CONNECTION_ID) {
    return ConnectionType.Local;
  } else if (id === CCLOUD_CONNECTION_ID) {
    return ConnectionType.Ccloud;
  } else {
    // Otherwise is a UUID-based Direct connection
    return ConnectionType.Direct;
  }
}

export interface IResourceBase {
  connectionId: ConnectionId;
  connectionType: ConnectionType;
  /** How this resource should be represented as a {@link TreeItem} or {@link QuickPickItem}. */
  iconName?: IconNames;
}

export interface ICCloudUrlable {
  /** The URL for this resource in Confluent Cloud. */
  ccloudUrl: string;
}

export function isResource(value: any): value is IResourceBase {
  return value.connectionId !== undefined && value.connectionType !== undefined;
}

/** Does this resource come from a "local" connection? */
export function isLocal(resource: IResourceBase): boolean {
  return resource.connectionType === ConnectionType.Local;
}

/** Does this resource come from a Confluent Cloud connection? */
export function isCCloud(resource: IResourceBase): boolean {
  return resource.connectionType === ConnectionType.Ccloud;
}

/** Does this resource have a ccloudUrl? */
export function hasCcloudUrl(resource: IResourceBase): resource is IResourceBase & ICCloudUrlable {
  return isCCloud(resource) && "ccloudUrl" in resource;
}

/** Does this resource come from a "direct" connection? */
export function isDirect(resource: IResourceBase): boolean {
  return resource.connectionType === ConnectionType.Direct;
}

/** Human-readable {@link ConnectionTypes} labeling for the UI. */
export enum ConnectionLabel {
  LOCAL = "Local",
  CCLOUD = "Confluent Cloud",
  DIRECT = "Other",
}

/** Get the human-readable label for the given connection type. */
export function getConnectionLabel(type: ConnectionType): string {
  switch (type) {
    case ConnectionType.Local:
      return ConnectionLabel.LOCAL;
    case ConnectionType.Ccloud:
      return ConnectionLabel.CCLOUD;
    case ConnectionType.Direct:
      return ConnectionLabel.DIRECT;
    default:
      throw new Error(`Unhandled connection type ${type}`);
  }
}

/** Subset of some resources which exist in a cloud provider + cloud region */
export interface IProviderRegion {
  /** The cloud provider for this resource. */
  provider: string;
  /** The region within the provider for this resource. */
  region: string;
}

/** Specifies a (Ccloud) environment/cloud provider/cloud region triplet. */
export interface IEnvProviderRegion extends IProviderRegion {
  /** The CCloud environment ID for this resource. */
  environmentId: EnvironmentId;
}

/**
 * Additional bits needed to make Flink API queries.
 **/
export interface IFlinkQueryable extends IEnvProviderRegion {
  /** The organization ID for the resource. */
  organizationId: OrganizationId;
  /** Limit to a specific compute pool? */
  computePoolId?: string;
}

export interface ISearchable {
  /** Space-separated strings for a given resource that should be searchable in the UI. */
  searchableText: () => string;

  /** Any searchable child resources of this resource. */
  children?: ISearchable[];
}

export function isSearchable(item: any): item is ISearchable {
  if (!item) {
    return false;
  }
  return "searchableText" in item;
}

/** Extension of IResourceBase identifying a specific schema registry or resources derived from within. */
export interface ISchemaRegistryResource extends IResourceBase {
  readonly environmentId: EnvironmentId;
  readonly schemaRegistryId: string;
}
