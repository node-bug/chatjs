const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const config = require('@nodebug/config')('chatjs')

const chat = require("./chat/stream_log/route")

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api/chat", chat);

app.listen(config.PORT, () => {
    console.log(`Server is running on http://localhost:${config.PORT}`);
});
