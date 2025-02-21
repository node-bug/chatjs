import { Heading, Card, CardHeader, Flex, Spacer } from '@chakra-ui/react';

function EmptyState(props) {
  function handleClick(e) {
    props.onChoice(e.target.innerText);
  }

  return (
    <div className="rounded flex flex-col items-center max-w-full md:p-8">
      <Flex marginTop={'25px'} grow={1} maxWidth={'800px'} width={'100%'}>
        <Card
          onMouseUp={handleClick}
          width={'48%'}
          backgroundColor={'rgb(58, 58, 61)'}
          _hover={{ backgroundColor: 'rgb(78,78,81)' }}
          cursor={'pointer'}
          justifyContent={'center'}
        >
          <CardHeader justifyContent={'center'}>
            <Heading
              fontSize="lg"
              fontWeight={'medium'}
              mb={1}
              color={'gray.200'}
              textAlign={'center'}
            >
              Why are my boxes not showing in idgard?
            </Heading>
          </CardHeader>
        </Card>
        <Spacer />
        <Card
          onMouseUp={handleClick}
          width={'48%'}
          backgroundColor={'rgb(58, 58, 61)'}
          _hover={{ backgroundColor: 'rgb(78,78,81)' }}
          cursor={'pointer'}
          justifyContent={'center'}
        >
          <CardHeader justifyContent={'center'}>
            <Heading
              fontSize="lg"
              fontWeight={'medium'}
              mb={1}
              color={'gray.200'}
              textAlign={'center'}
            >
              How to edit file in idgard using MS Office?
            </Heading>
          </CardHeader>
        </Card>
      </Flex>
      <Flex marginTop={'25px'} grow={1} maxWidth={'800px'} width={'100%'}>
        <Card
          onMouseUp={handleClick}
          width={'48%'}
          backgroundColor={'rgb(58, 58, 61)'}
          _hover={{ backgroundColor: 'rgb(78,78,81)' }}
          cursor={'pointer'}
          justifyContent={'center'}
        >
          <CardHeader justifyContent={'center'}>
            <Heading
              fontSize="lg"
              fontWeight={'medium'}
              mb={1}
              color={'gray.200'}
              textAlign={'center'}
            >
              What are some ways of uploading data to idgard?
            </Heading>
          </CardHeader>
        </Card>
        <Spacer />
        <Card
          onMouseUp={handleClick}
          width={'48%'}
          backgroundColor={'rgb(58, 58, 61)'}
          _hover={{ backgroundColor: 'rgb(78,78,81)' }}
          cursor={'pointer'}
          justifyContent={'center'}
        >
          <CardHeader justifyContent={'center'}>
            <Heading
              fontSize="lg"
              fontWeight={'medium'}
              mb={1}
              color={'gray.200'}
              textAlign={'center'}
            >
              How to create new users in idgard?
            </Heading>
          </CardHeader>
        </Card>
      </Flex>
      <Flex marginTop={'25px'} grow={1} maxWidth={'800px'} width={'100%'} justifyContent={'center'}>
        <Card
          onMouseUp={handleClick}
          width={'70%'}
          backgroundColor={'rgb(58, 58, 61)'}
          _hover={{ backgroundColor: 'rgb(78,78,81)' }}
          cursor={'pointer'}
          justifyContent={'center'}
        >
          <CardHeader justifyContent={'center'}>
            <Heading
              fontSize="lg"
              fontWeight={'medium'}
              mb={1}
              color={'gray.200'}
              textAlign={'center'}
            >
              Wie kann ich meine Daten mit idgard schützen?
            </Heading>
          </CardHeader>
        </Card>
      </Flex>
    </div>
  );
}

export default EmptyState;
