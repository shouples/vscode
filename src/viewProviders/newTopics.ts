import { Disposable, EventEmitter, TreeDataProvider, TreeItem, Uri, window } from "vscode";
import { ContextValues } from "../context/values";
import {
  environmentChanged,
  EnvironmentChangeEvent,
  schemaSubjectChanged,
  SchemaVersionChangeEvent,
  schemaVersionsChanged,
  SubjectChangeEvent,
  topicSearchSet,
  topicsViewResourceChanged,
} from "../emitters";
import { ResourceLoader } from "../loaders";
import { TopicFetchError } from "../loaders/loaderUtils";
import { KafkaCluster } from "../models/kafkaCluster";
import { Schema, SchemaTreeItem, Subject, SubjectTreeItem } from "../models/schema";
import { KafkaTopic, KafkaTopicTreeItem } from "../models/topic";
import { ParentedBaseViewProvider } from "./baseModels/parentedBase";
import { updateCollapsibleStateFromSearch } from "./utils/collapsing";
import { itemMatchesSearch, SEARCH_DECORATION_URI_SCHEME } from "./utils/search";

/**
 * The types managed by the {@link NewTopicsViewProvider}, which are converted to their appropriate tree item
 * type via the `getTreeItem()` method.
 */
type NewTopicViewProviderData = KafkaTopic | Subject | Schema;

/**
 * New implementation of the Topics view provider that extends {@link ParentedBaseViewProvider}.
 * Manages a hierarchical tree structure: KafkaTopic → Subject → Schema.
 */
export class NewTopicsViewProvider
  extends ParentedBaseViewProvider<KafkaCluster, NewTopicViewProviderData>
  implements TreeDataProvider<NewTopicViewProviderData>
{
  readonly kind = "topics";
  loggerName = "viewProviders.newTopics";
  viewId = "confluent-topics";

  parentResourceChangedEmitter = topicsViewResourceChanged;
  parentResourceChangedContextValue = ContextValues.kafkaClusterSelected;

  searchContextValue = ContextValues.topicSearchApplied;
  searchChangedEmitter: EventEmitter<string | null> = topicSearchSet;

  /** Flag to force deep reading from sidecar, bypassing cache. */
  private forceDeepRefresh: boolean = false;

  /** Map of topic ID -> topic currently in the tree view. */
  private topicsInTreeView: Map<string, KafkaTopic> = new Map();

  protected setCustomEventListeners(): Disposable[] {
    return [
      environmentChanged.event(this.environmentChangedHandler.bind(this)),
      schemaSubjectChanged.event(this.subjectChangeHandler.bind(this)),
      schemaVersionsChanged.event(this.subjectChangeHandler.bind(this)),
    ];
  }

  /**
   * Override refresh to support deep refresh flag for bypassing cache.
   * When invoked from the 'refresh' button, will force deep reading from sidecar.
   */
  async refresh(forceDeepRefresh: boolean = false): Promise<void> {
    this.forceDeepRefresh = forceDeepRefresh;

    // Clear existing topics cache
    this.topicsInTreeView.clear();

    if (this.resource) {
      await this.withProgress("Loading topics...", async () => {
        const loader = ResourceLoader.getInstance(this.resource!.connectionId);
        try {
          const topics = await loader.getTopicsForCluster(this.resource!, this.forceDeepRefresh);
          topics.forEach((topic: KafkaTopic) => this.topicsInTreeView.set(topic.id, topic));
        } catch (err) {
          this.logger.error("Error fetching topics for cluster", this.resource, err);
          if (err instanceof TopicFetchError) {
            window.showErrorMessage(
              `Failed to list topics for cluster "${this.resource!.name}": ${err.message}`,
            );
          }
        }
      });
    }

    // Clear the flag after refresh so subsequent repaints draw from cache
    this.forceDeepRefresh = false;

    // Fire the tree data change event
    this._onDidChangeTreeData.fire();
  }

  /**
   * Handle environment change events. If the environment matches the current cluster's parent
   * environment, update the view description or reset if the environment was deleted.
   */
  async environmentChangedHandler(envEvent: EnvironmentChangeEvent): Promise<void> {
    if (this.resource && this.resource.environmentId === envEvent.id) {
      if (!envEvent.wasDeleted) {
        this.logger.debug(
          "environmentChanged event fired with matching Kafka cluster env ID, updating view description",
          { envEvent },
        );
        await this.updateTreeViewDescription();
        await this.refresh();
      } else {
        this.logger.debug(
          "environmentChanged deletion event fired with matching Kafka cluster env ID, resetting view",
          { envEvent },
        );
        await this.reset();
      }
    }
  }

  /**
   * Handle schema subject or version changes. If the change is in the currently viewed
   * environment, refresh the view with deep refresh to reevaluate which topics have subjects.
   */
  async subjectChangeHandler(event: SubjectChangeEvent | SchemaVersionChangeEvent): Promise<void> {
    const [subject, change] = [event.subject, event.change];

    if (this.resource?.environmentId === subject.environmentId) {
      this.logger.debug(
        `A schema subject ${change} in the environment being viewed, refreshing toplevel`,
        { subject: subject.name },
      );

      // Toplevel (deep) repaint to reevaluate which topics have subjects.
      await this.refresh(true);
    }
  }

  /**
   * Get children for the tree view. Handles hierarchical structure:
   * - No element (root level): return KafkaTopic[] from cache
   * - KafkaTopic element: return Subject[] for that topic (lazy load if needed)
   * - Subject element: return Schema[] for that subject
   */
  getChildren(element?: NewTopicViewProviderData): NewTopicViewProviderData[] {
    let children: NewTopicViewProviderData[] = [];

    if (element) {
      // --- CHILDREN OF TREE BRANCHES ---
      if (element instanceof KafkaTopic) {
        // Get the topic from cache to ensure we're working with the cached instance
        const cachedTopic = this.topicsInTreeView.get(element.id);
        if (!cachedTopic) {
          return [];
        }

        if (cachedTopic.children && cachedTopic.children.length > 0) {
          // Already fetched the subjects for this topic
          children = cachedTopic.children;
        } else {
          // Need to fetch subjects for the topic. Kick off in background.
          // In the meantime, return empty array to indicate no children (at this time).
          children = [];
          void this.updateTopicSubjects(cachedTopic);
        }
      } else if (element instanceof Subject) {
        // Subject carrying schemas, return schema versions for the topic
        children = element.schemas!;
      }
    } else {
      // --- ROOT-LEVEL ITEMS ---
      children = [...this.topicsInTreeView.values()];
    }

    return this.filterChildren(element, children);
  }

  /**
   * Fetch and update subjects for a topic. Called when a topic is expanded
   * and subjects haven't been loaded yet.
   */
  private async updateTopicSubjects(topic: KafkaTopic): Promise<void> {
    await this.withProgress(`Loading subjects for ${topic.name}...`, async () => {
      this.logger.debug("updateTopicSubjects(): Fetching subjects for topic", { topic: topic.id });

      const loader = ResourceLoader.getInstance(topic.connectionId);
      const subjects = await loader.getTopicSubjectGroups(topic);

      // Update the cached topic with the subjects (stored in .children property)
      topic.children = subjects;

      // Notify the tree view that this topic's children have changed
      this._onDidChangeTreeData.fire(topic);
    });
  }

  /**
   * Get tree item for each element. Applies search decoration and collapsible state updates
   * when search is active.
   */
  getTreeItem(element: NewTopicViewProviderData): TreeItem {
    let treeItem: TreeItem;
    if (element instanceof KafkaTopic) {
      treeItem = new KafkaTopicTreeItem(element);
    } else if (element instanceof Subject) {
      treeItem = new SubjectTreeItem(element);
    } else {
      // must be individual Schema.
      treeItem = new SchemaTreeItem(element);
    }

    if (this.itemSearchString) {
      if (itemMatchesSearch(element, this.itemSearchString)) {
        // special URI scheme to decorate the tree item with a dot to the right of the label,
        // and color the label, description, and decoration so it stands out in the tree view
        treeItem.resourceUri = Uri.parse(
          `${SEARCH_DECORATION_URI_SCHEME}:/${element.searchableText()}`,
        );
      }
      treeItem = updateCollapsibleStateFromSearch(element, treeItem, this.itemSearchString);
    }

    return treeItem;
  }

  /**
   * Override setSearch to handle the search string set count for telemetry.
   */
  override setSearch(searchString: string | null): void {
    if (searchString !== null) {
      // used to group search events without sending the search string itself
      this.searchStringSetCount++;
    }
    super.setSearch(searchString);
  }
}
