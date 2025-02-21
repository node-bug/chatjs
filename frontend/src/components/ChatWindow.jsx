import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { RemoteRunnable } from "@langchain/core/runnables/remote";
import { applyPatch } from "@langchain/core/utils/json_patch";

import { marked } from "marked";
import { Renderer } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/gradient-dark.css";
import "react-toastify/dist/ReactToastify.css";

import {
  Heading,
  Flex,
  IconButton,
  InputGroup,
  InputRightElement,
  Spinner,
  Link,
} from "@chakra-ui/react";
import { ArrowUpIcon } from "@chakra-ui/icons";
import ChatMessageBubble from "./ChatMessageBubble";
import AutoResizeTextarea from "./AutoResizeTextarea";
import EmptyState from "./EmptyState";
import apiBaseUrl from "../utils/constants";

export default function ChatWindow({ conversationId }) {
  const messageContainerRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const sendMessage = async (message) => {
    if (messageContainerRef.current) {
      messageContainerRef.current.classList.add("grow");
    }
    if (isLoading) return;
    const messageValue = message ?? input;
    if (messageValue === "") return;
    setInput("");
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: Math.random().toString(), content: messageValue, role: "user" },
    ]);
    setIsLoading(true);

    let accumulatedMessage = "";
    let runId;
    let sources;
    let messageIndex = null;

    const renderer = new Renderer();
    renderer.paragraph = (text) => `${text}\n`
    renderer.list = (text) => `${text}\n\n`
    renderer.listitem = (text) => `\n• ${text}`
    renderer.code = (code, language) => {
      const validLanguage = hljs.getLanguage(language || "") ? language : "plaintext";
      const highlightedCode = hljs.highlight(validLanguage || "plaintext", code).value;
      return `<pre class="highlight bg-gray-700" style="padding: 5px; border-radius: 5px; overflow: auto; overflow-wrap: anywhere; white-space: pre-wrap; max-width: 100%; display: block; line-height: 1.2"><code class="${language}" style="color: #d6e2ef; font-size: 12px;">${highlightedCode}</code></pre>`;
    };
    marked.setOptions({ renderer });

    try {
      const sourceStepName = "RetrieverChain";
      let streamedResponse = {};
      const remoteChain = new RemoteRunnable({ url: `${apiBaseUrl}/chat`, options: { timeout: 120000 } });
      const llmDisplayName = "mistral";

      const streamLog = remoteChain.streamLog(
        { question: messageValue, chat_history: chatHistory },
        { configurable: { llm: llmDisplayName }, tags: ["model:" + llmDisplayName], metadata: { conversation_id: conversationId, llm: llmDisplayName } },
        { includeNames: [sourceStepName] }
      );
      for await (const chunk of streamLog) {
        streamedResponse = applyPatch(streamedResponse, chunk.ops).newDocument;

        if (Array.isArray(streamedResponse?.logs?.[sourceStepName]?.final_output?.output)) {
          sources = streamedResponse.logs[sourceStepName].final_output.output.map((doc) => ({
            url: doc.metadata.source,
            title: doc.metadata.title,
          }));
        }
        if (streamedResponse.id !== undefined) {
          runId = streamedResponse.id;
        }
        console.log(streamedResponse)
        if (streamedResponse?.final_output) {
          accumulatedMessage = streamedResponse.final_output.output
        } else if(Array.isArray(streamedResponse?.streamed_output)){
          const uniqueStreamedOutput = [...new Set(streamedResponse.streamed_output)];
          accumulatedMessage = uniqueStreamedOutput.join("");
        }
        const parsedResult = marked.parse(accumulatedMessage);

        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          if (messageIndex === null || newMessages[messageIndex] === undefined) {
            messageIndex = newMessages.length;
            newMessages.push({ id: Math.random().toString(), content: parsedResult.trim(), runId, sources, role: "assistant" });
          } else if (newMessages[messageIndex] !== undefined) {
            newMessages[messageIndex].content = parsedResult.trim();
            newMessages[messageIndex].runId = runId;
            newMessages[messageIndex].sources = sources;
          }
          return newMessages;
        });
      }
      setChatHistory((prevChatHistory) => [...prevChatHistory, { human: messageValue, ai: accumulatedMessage }]);
      setIsLoading(false);
    } catch (e) {
      setMessages((prevMessages) => prevMessages.slice(0, -1));
      setIsLoading(false);
      setInput(messageValue);
      toast.error(e.message)
      throw e
    }
  };

  async function sendInitialQuestion(question) {
    await sendMessage(question)
  }

  return (
    <div className="flex flex-col items-center p-8 rounded grow max-h-full">
      <Flex direction={'column'} alignItems={'center'} marginTop={messages.length > 0 ? '' : '64px'}>
        <Heading fontSize={messages.length > 0 ? '2xl' : '3xl'} fontWeight={'medium'} mb={1} color={'white'}>
          idgard Chat ♣
        </Heading>
        {messages.length > 0 ? (
          <Heading fontSize="md" fontWeight={'normal'} mb={1} color={'white'}>
            We appreciate feedback!
          </Heading>
        ) : (
          <Heading fontSize="xl" fontWeight={'normal'} color={'white'} marginTop={'10px'} textAlign={'center'}>
            Ask me anything about idgard {' '}
            <Link href="https://www.idgard.de/" color={'blue.200'}> iOS documentation!</Link>
          </Heading>
        )}
      </Flex>
      <div className="flex flex-col-reverse w-full mb-2 overflow-auto" ref={messageContainerRef}>
        {messages.length > 0 ? (
          [...messages]
            .reverse()
            .map((m, index) => (
              <ChatMessageBubble key={m.id} message={m} aiEmoji="🦜" isMostRecent={index === 0} messageCompleted={!isLoading} />
            ))
        ) : (
          <EmptyState onChoice={sendInitialQuestion} />
        )}
      </div>
      <InputGroup size="md" alignItems={'center'}>
        <AutoResizeTextarea
          value={input}
          maxRows={5}
          marginRight={'56px'}
          textColor={'white'}
          borderColor={'rgb(58, 58, 61)'}
          placeholder="How can I access my boxes?"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            } else if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              setInput(`${input}\n`)
            }
          }}
        />
        <InputRightElement h="full">
          <IconButton
            colorScheme="blue"
            rounded={'full'}
            aria-label="Send"
            type="submit"
            icon={isLoading ? <Spinner /> : <ArrowUpIcon />}
            onClick={(e) => {
              e.preventDefault()
              sendMessage()
            }}
          />
        </InputRightElement>
      </InputGroup>

      {messages.length === 0 ? (
        <footer className="flex justify-center absolute bottom-8">
          <a
            href="https://github.com/node-bug/chatjs"
            target="_blank"
            className="text-white flex items-center"
          >
            <img
              src="/github-mark.svg"
              className="h-4 mr-1"
              alt="dummy"
            />
            <span>View Source</span>
          </a>
        </footer>
      ) : (
        ''
      )}
    </div>
  )
}
