import React, { useState } from 'react';
import { VStack, Flex, Heading, HStack, Box, Divider } from '@chakra-ui/react';
import DOMPurify from 'dompurify';
import SourceBubble from './SourceBubble';
import InlineCitation from './InlineCitation';

function filterSources(sources) {
  const filtered = [];
  const urlMap = new Map();
  const indexMap = new Map();

  sources.forEach((source, i) => {
    const { url } = source;
    const index = urlMap.get(url);
    if (index === undefined) {
      urlMap.set(url, i);
      indexMap.set(i, filtered.length);
      filtered.push(source);
    } else {
      const resolvedIndex = indexMap.get(index);
      if (resolvedIndex !== undefined) {
        indexMap.set(i, resolvedIndex);
      }
    }
  });

  return { filtered, indexMap };
};

function createAnswerElements(
  content,
  filteredSources,
  sourceIndexMap,
  highlighedSourceLinkStates,
  setHighlightedSourceLinkStates,
) {
  const matches = Array.from(
    content.matchAll(/\[\^?\$?{?(\d+)}?\^?\]|\[\$\{(\d+)\}\]/g)
  );
  const elements = [];
  let prevIndex = 0;

  matches.forEach((match) => {
    const sourceNum = parseInt(match[1], 10);
    const resolvedNum = sourceIndexMap.get(sourceNum) ?? 10;

    if (match.index !== null && resolvedNum < filteredSources.length) {
      elements.push(
        <span
          key={`content:${prevIndex}`}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(content.slice(prevIndex, match.index)),
          }}
        ></span>
      );
      elements.push(
        <InlineCitation
          key={`citation:${prevIndex}`}
          source={filteredSources[resolvedNum]}
          sourceNumber={resolvedNum + 1}
          highlighted={highlighedSourceLinkStates[resolvedNum + 1]}
          onMouseEnter={() =>
            setHighlightedSourceLinkStates(
              filteredSources.map((_, i) => i === resolvedNum)
            )
          }
          onMouseLeave={() =>
            setHighlightedSourceLinkStates(filteredSources.map(() => false))
          }
        />
      );
      prevIndex = (match?.index ?? 0) + match[0].length;
    }
  });

  elements.push(
    <span
      key={`content:${prevIndex}`}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(content.slice(prevIndex)),
      }}
    ></span>
  );

  return elements;
};

function ChatMessageBubble(props) {
  const { role, content } = props.message;
  const isUser = role === 'user';

  const sources = props.message.sources ?? [];
  const { filtered: filteredSources, indexMap: sourceIndexMap } = filterSources(sources);
  const [highlightedSourceLinkStates, setHighlightedSourceLinkStates] = useState(
    filteredSources.map(() => false)
  );
  const answerElements =
    role === 'assistant'
      ? createAnswerElements(
        content,
        filteredSources,
        sourceIndexMap,
        highlightedSourceLinkStates,
        setHighlightedSourceLinkStates
      )
      : [];

  return (
    <VStack align="start" spacing={5} pb={5}>
      {!isUser && filteredSources.length > 0 && (
        <>
          <Flex direction="column" width="100%">
            <VStack spacing="5px" align="start" width="100%">
              <Heading
                fontSize="lg"
                fontWeight="medium"
                mb={1}
                color="blue.300"
                paddingBottom="10px"
              >
                Sources
              </Heading>
              <HStack spacing="10px" maxWidth="100%" overflow="auto">
                {filteredSources.map((source, index) => (
                  <Box key={index} alignSelf="stretch" width={40}>
                    <SourceBubble
                      source={source}
                      highlighted={highlightedSourceLinkStates[index]}
                      onMouseEnter={() =>
                        setHighlightedSourceLinkStates(
                          filteredSources.map((_, i) => i === index)
                        )
                      }
                      onMouseLeave={() =>
                        setHighlightedSourceLinkStates(
                          filteredSources.map(() => false)
                        )
                      }
                    />
                  </Box>
                ))}
              </HStack>
            </VStack>
          </Flex>
          <Heading size="lg" fontWeight="medium" color="blue.300">
            Answer
          </Heading>
        </>
      )}

      {isUser ? (
        <Heading size="lg" fontWeight="medium" color="white">
          {content}
        </Heading>
      ) : (
        <Box className="whitespace-pre-wrap" color="white">
          {answerElements}
        </Box>
      )}

      {!isUser && <Divider mt={4} mb={4} />}
    </VStack>
  );
};

export default ChatMessageBubble;
