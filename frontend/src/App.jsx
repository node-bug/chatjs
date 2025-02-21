import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ToastContainer } from 'react-toastify';
import { ChakraProvider } from '@chakra-ui/react';
import ChatWindow from './components/ChatWindow';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <div
      className="flex flex-col h-full md:p-8"
      style={{ background: "rgb(38, 38, 41)" }}
    >
      <ChakraProvider>
        <ToastContainer />
        <ChatWindow conversationId={uuidv4()} />
      </ChakraProvider>
    </div>
  );
}

export default App;