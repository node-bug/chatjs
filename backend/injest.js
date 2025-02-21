const { log } = require('@nodebug/logger')
const { RecursiveWebLoader } = require("./RecursiveWebLoader");
const { ConfluencePagesLoader } = require("@langchain/community/document_loaders/web/confluence");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OllamaEmbeddings } = require("@langchain/ollama");
const { Chroma } = require("@langchain/community/vectorstores/chroma");
const { PostgresRecordManager } = require("@langchain/community/indexes/postgres");

const config = require('@nodebug/config')('chatjs')
const indexer = require('./indexer')

async function confluenceDocs() {
    const loader = new ConfluencePagesLoader({
        baseUrl: "https://uniscon.atlassian.net/wiki",
        spaceKey: "IDGARD",
        username: "thomas.dsilva@uniscon.com",
        accessToken: "",
    });
    return loader.load();
}

async function loadDocs() {
    const loader = new RecursiveWebLoader("https://service.idgard.com/portal/en/kb/articles/creating-a-privacybox-in-the-idgard-ios-app", {
        maxDepth: 3,
        timeout: 60000,
    });
    return loader.load();
}


async function ingestDocs() {
    const docs = await loadDocs();
    log.debug(`Loaded docs`);

    if (!docs.length) {
        process.exit(1);
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkOverlap: 50,
        chunkSize: 512,
    });
    const docsTransformed = await textSplitter.splitDocuments([
        ...docs,
    ]);

    for (const doc of docsTransformed) {
        if (!doc.metadata.source) {
            doc.metadata.source = "";
        }
        if (!doc.metadata.title) {
            doc.metadata.title = "";
        }
    }

    const embeddings = new OllamaEmbeddings({
        baseUrl: config.LLM_BASE_URL,
        model: config.EMBEDDING_MODEL,
        // requestOptions: {
        //     num_ctx: 4096,
        // },
    });
    const vectorStore = new Chroma(embeddings, {
        collectionName: config.COLLECTION_NAME,
        url: config.CHROMA_URL,
    });

    const connectionOptions = config.RECORD_MANAGER_DB_URL
        ? { connectionString: config.RECORD_MANAGER_DB_URL }
        : {
            host: config.DB_HOST,
            port: Number(config.DB_PORT),
            user: config.DB_USERNAME,
            password: config.DB_PASSWORD,
            database: config.DB_NAME,
        };

    const recordManager = new PostgresRecordManager(
        `local/${config.COLLECTION_NAME}`,
        { postgresConnectionOptions: connectionOptions }
    );
    await recordManager.createSchema();

    const indexingStats = await indexer({
        docsSource: docsTransformed,
        recordManager,
        vectorStore,
        cleanup: "full",
        sourceIdKey: "source",
        forceUpdate: config.FORCE_UPDATE,
    });

    log.info(`${JSON.stringify(indexingStats)}, "Indexing stats"`);
}

ingestDocs().catch((e) => {
    log.error("Failed to ingest docs");
    log.info(e.stack);
    process.exit(1);
});


