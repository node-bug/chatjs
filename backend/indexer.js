const { log } = require('@nodebug/logger')
const {
  _HashedDocument,  // Creates a unique hash for each document
  _batch,  // Splits an array into smaller batches for processing efficiency
  _deduplicateInOrder, // Removes duplicate documents while preserving order
  _getSourceIdAssigner, // Assigns unique source IDs to documents
} = require("@langchain/core/indexing");

const DEFAULTS = {
  batchSize: 100,
  cleanupBatchSize: 1000,
  forceUpdate: false,
};

async function indexer(options) {
  const {
    docsSource,
    recordManager,
    vectorStore,
    batchSize,
    cleanup = "incremental",
    sourceIdKey,
    cleanupBatchSize,
    forceUpdate,
  } = { ...DEFAULTS, ...options };

  if (cleanup === "incremental" && !sourceIdKey) {
    throw new Error("Source id key is required when cleanup mode is incremental.");
  }

  let docs;
  if (!Array.isArray(docsSource)) {
    try {
      docs = await docsSource.load();
    } catch (e) {
      throw new Error(`Error loading documents from source: ${e.stack}`);
    }
  } else {
    docs = docsSource;
  }

  const sourceIdAssigner = _getSourceIdAssigner(sourceIdKey);
  const indexStartDt = await recordManager.getTime();
  let numAdded = 0;
  let numSkipped = 0;
  let numDeleted = 0;

  for (const docBatch of _batch(batchSize, docs)) {
    const hashedDocs = _deduplicateInOrder(
      docBatch.map((doc) => _HashedDocument.fromDocument(doc))
    );

    let sourceIds = hashedDocs.map(sourceIdAssigner);

    if (cleanup === "incremental") {
      for (let i = 0; i < sourceIds.length; i += 1) {
        const sourceId = sourceIds[i];
        const hashedDoc = hashedDocs[i];
        if (sourceId === null) {
          throw new Error(
            `Source ids are required when cleanup mode is incremental.\nDocument that starts with content: ${hashedDoc.pageContent.substring(
              0,
              100
            )} was not assigned as source id.`
          );
        }
      }
    }

    const existsBatch = await recordManager.exists(
      hashedDocs.map(({ uid }) => uid)
    );

    const uids = [];
    const docsToIndex = [];
    const uidsToRefresh = [];

    for (let i = 0; i < hashedDocs.length; i += 1) {
      const hashedDoc = hashedDocs[i];
      const docExists = existsBatch[i];
      if (docExists && !forceUpdate) {
        uidsToRefresh.push(hashedDoc.uid);
        continue;
      }
      uids.push(hashedDoc.uid);
      docsToIndex.push(hashedDoc.toDocument());
    }

    if (uidsToRefresh.length) {
      await recordManager.update(uidsToRefresh, { timeAtLeast: indexStartDt });
      numSkipped += uidsToRefresh.length;
    }

    if (docsToIndex.length) {
      log.info(`Indexing ${docsToIndex.length} docs`)
      await vectorStore.addDocuments(docsToIndex, { ids: uids });
      numAdded += docsToIndex.length;
    }

    await recordManager.update(
      hashedDocs.map(({ uid }) => uid),
      {
        groupIds: sourceIds,
        timeAtLeast: indexStartDt,
      }
    );

    if (cleanup === "incremental") {
      sourceIds.forEach((id) => {
        if (id === null) {
          throw new Error("Source ids cannot be null here.");
        }
      });

      const _sourceIds = sourceIds;

      const uidsToDelete = await recordManager.listKeys({
        groupIds: _sourceIds,
        before: indexStartDt,
      });

      if (uidsToDelete.length) {
        await vectorStore.delete({
          ids: uidsToDelete,
        });
        await recordManager.deleteKeys(uidsToDelete);
        numDeleted += uidsToDelete.length;
      }
    }
  }

  if (cleanup === "full") {
    let uidsToDelete = await recordManager.listKeys({
      before: indexStartDt,
      limit: cleanupBatchSize,
    });

    while (uidsToDelete.length) {
      await vectorStore.delete({
        ids: uidsToDelete,
      });
      await recordManager.deleteKeys(uidsToDelete);
      numDeleted += uidsToDelete.length;

      uidsToDelete = await recordManager.listKeys({
        before: indexStartDt,
        limit: cleanupBatchSize,
      });
    }
  }

  return {
    numAdded,
    numSkipped,
    numDeleted,
  };
}

module.exports = indexer