const { ChatOllama } = require("@langchain/ollama");
const serverConfig = require('@nodebug/config')('chatjs')
const { getRetriever, createChain } = require('../chain')

const express = require("express");
const router = express.Router();
router.use(express.json());

router.post("/stream_log", async (req, res) => {
    try {
        const { input, config, include_names } = req.body;
        const llm = new ChatOllama({
            baseUrl : serverConfig.LLM_BASE_URL,
            model: serverConfig.MODEL,
        });
        const retriever = getRetriever();
        const answerChain = createChain(llm, retriever);
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });
        const stream = answerChain.streamLog(input, config, {
            includeNames: include_names,
        });
        for await (const chunk of stream) {
            res.write(`event: data\ndata: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write(`event: end\n\n`);
        res.end();
    } catch (e) {
        console.error("Error:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;