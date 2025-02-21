import 'react-toastify/dist/ReactToastify.css';
import { Card, CardBody, Heading } from '@chakra-ui/react';
import React from 'react';

const SourceBubble = ({ source, highlighted, onMouseEnter, onMouseLeave }) => {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer">
      <Card
        onClick={async () => {
          window.open(source.url, '_blank');
        }}
        backgroundColor={highlighted ? 'rgb(58, 58, 61)' : 'rgb(78,78,81)'}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        cursor={'pointer'}
        alignSelf={'stretch'}
        height="100%"
        overflow={'hidden'}
      >
        <CardBody>
          <Heading size={'sm'} fontWeight={'normal'} color={'white'}>
            {source.title}
          </Heading>
        </CardBody>
      </Card>
    </a>
  );
};

export default SourceBubble;
