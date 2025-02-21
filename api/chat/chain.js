const { OllamaEmbeddings } = require("@langchain/ollama");
const { Chroma } = require("@langchain/community/vectorstores/chroma");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const {
    RunnableSequence,
    RunnableLambda,
    RunnableBranch,
    RunnableMap,
} = require("@langchain/core/runnables");
const { PromptTemplate, ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");

const config = require('@nodebug/config')('chatjs')

function getRetriever() {
    const embeddings = new OllamaEmbeddings({
        baseUrl: config.LLM_BASE_URL,
        model: config.EMBEDDING_MODEL,
    });
    const client = new Chroma(
        embeddings,
        {
            collectionName: config.CHROMA_COLLECTION_NAME,
            url: config.CHROMA_URL,
        }
    );
    return client.asRetriever({ k: config.RETRIEVER_K });
};

const REPHRASE_TEMPLATE = `Given the following conversation and a follow-up question, rephrase the follow-up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone Question:`;
function createRetrieverChain(llm, retriever) {
    const condenseQuestionPrompt = PromptTemplate.fromTemplate(REPHRASE_TEMPLATE);
    const condenseQuestionChain = RunnableSequence.from([
        condenseQuestionPrompt,
        llm,
        new StringOutputParser(),
    ]).withConfig({ runName: "CondenseQuestionChain" });
    const hasChatHistory = RunnableLambda.from((input) => input.chat_history.length > 0).withConfig({ runName: "CheckChatHistory" });
    const retrievalWithHistoryChain = condenseQuestionChain.pipe(retriever).withConfig({ runName: "RetrievalWithHistoryChain" });
    
    const retrievalWithoutHistoryChain = RunnableLambda.from((input) => input.question)
        .withConfig({ runName: "Extractor:Question" })
        .pipe(retriever)
        .withConfig({ runName: "RetrievalWithoutHistoryChain" });

    return RunnableBranch.from([
        [hasChatHistory, retrievalWithHistoryChain],
        retrievalWithoutHistoryChain,
    ]).withConfig({ runName: "RetrieverChain" });
};

function formattedChatHistory(history) {
    return history.map((message) => `${message._getType()}: ${message.content}`).join("\n");
};

function formattedDocs(docs) {
    return docs.map((doc, i) => `<doc id='${i}'>${doc.pageContent}</doc>`).join("\n");
};

function serializedHistory(input) {
    const chatHistory = input.chat_history || [];
    const convertedChatHistory = [];
    for (const message of chatHistory) {
        if (message.human !== undefined) {
            convertedChatHistory.push(new HumanMessage({ content: message.human }));
        }
        if (message["ai"] !== undefined) {
            convertedChatHistory.push(new AIMessage({ content: message.ai }));
        }
    }
    return convertedChatHistory;
};

const RESPONSE_TEMPLATE = `You are an expert problem-solver, tasked to answer any question about Idgard, responding to an email.
Using the provided context, answer the user's question to the best of your ability using the resources provided.
Generate a comprehensive and informative answer (but no more than 80 words) for a given question based solely on the provided search results (URL and content).
You must only use information from the provided search results.
Use an unbiased and journalistic tone.
Combine search results together into a coherent answer.
Do not repeat text.
Cite search results using [\${{number}}] notation.
Only cite the most relevant results that answer the question accurately.
Place these citations at the end of the sentence or paragraph that reference them - do not put them all at the end.
If different results refer to different entities within the same name, write separate answers for each entity.
If there is nothing in the context relevant to the question at hand, just say "Hmm, I'm not sure." Don't try to make up an answer.

You should use bullet points in your answer for readability
Put citations where they apply rather than putting them all at the end.

Anything between the following \`context\`  html blocks is retrieved from a knowledge bank, not part of the conversation with the user.

<context>
{context}
<context/>

REMEMBER: If there is no relevant information within the context, just say "Hmm, I'm not sure." Don't try to make up an answer.
Anything between the preceding 'context' html blocks is retrieved from a knowledge bank, not part of the conversation with the user.`;

function createChain(llm, retriever) {
    const retrieverChain = createRetrieverChain(llm, retriever);
    const context = RunnableMap.from({
        context: RunnableSequence.from([
            ({ question, chat_history }) => ({
                question,
                chat_history: formattedChatHistory(chat_history),
            }),
            retrieverChain,
            RunnableLambda.from(formattedDocs).withConfig({ runName: "FormatRetrievedDocuments" }),
        ]),
        question: RunnableLambda.from((input) => input.question).withConfig({ runName: "Extractor:Question" }),
        chat_history: RunnableLambda.from((input) => input.chat_history).withConfig({ runName: "Extractor:ChatHistory" }),
    }).withConfig({ tags: ["ContextProcessing"] });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", RESPONSE_TEMPLATE],
        new MessagesPlaceholder("chat_history"),
        ["human", "{question}"],
    ]);

    const responseGenerationChain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
    ]).withConfig({ tags: ["ResponseGeneration"] });

    return RunnableSequence.from([
        {
            question: RunnableLambda.from(
                (input) => input.question
            ).withConfig({ runName: "Extractor:Question" }),
            chat_history: RunnableLambda.from(serializedHistory).withConfig({
                runName: "SerializeChatHistory",
            }),
        },
        context,
        responseGenerationChain,
    ]);
};

module.exports = {
    getRetriever,
    createChain,
}