import { Box, Button, Flex, Textarea, useColorModeValue } from "@chakra-ui/react";
import Head from "next/head";
import { useTranslation } from "next-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardLayout } from "src/components/Layout";
import { get, post } from "src/lib/api";
export { getDefaultStaticProps as getStaticProps } from "src/lib/default_static_props";
import useSWRMutation from "swr/mutation";

const Chat = () => {
  const inputRef = useRef<HTMLTextAreaElement>();
  const [messages, setMessages] = useState<string[]>([]);
  const [activeMessage, setActiveMessage] = useState("");
  const { trigger: createChat, data: createChatResponse } = useSWRMutation<{ id: string }>("/api/chat", post);

  const chatID = createChatResponse?.id;

  const send = useCallback(async () => {
    const message = inputRef.current.value;

    if (!message || !chatID) {
      return;
    }

    setActiveMessage("...");
    setMessages((old) => [...old, message]);

    // we have to do this manually since we want to stream the chunks
    // there is also EventSource, but it only works with get requests.
    const { body } = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: chatID, message }),
    });
    const reader = body.pipeThrough(new TextDecoderStream()).getReader();

    // eslint-disable-next-line no-constant-condition
    let responseMessage = "",
      done = false,
      value = "";
    while (!done) {
      ({ value, done } = await reader.read());
      if (done) {
        break;
      }
      const object = JSON.parse(value.split("\n")[0].replace("data: ", ""));
      const text = object.token.text;
      responseMessage += text;

      setActiveMessage(responseMessage);
      // wait for render
      await new Promise(requestAnimationFrame);
    }

    setMessages((old) => [...old, responseMessage]);
    setActiveMessage("");

    // return sendMessage({ message });
  }, [chatID]);

  return (
    <>
      <Head>
        <meta name="description" content="Chat with Open Assistant and provide feedback." key="description" />
      </Head>
      <Flex flexDir="column" gap={4}>
        {!chatID && <Button onClick={() => createChat()}>Create Chat</Button>}
        {chatID && (
          <>
            chat id: {chatID}
            {messages.map((message, idx) => (
              <Entry key={idx} isAssistant={idx % 2 === 1}>
                {message}
              </Entry>
            ))}
            {activeMessage ? (
              <Entry isAssistant>{activeMessage}</Entry>
            ) : (
              <>
                <Textarea ref={inputRef} />
                <Button onClick={send}>Send</Button>
              </>
            )}
          </>
        )}
      </Flex>
    </>
  );
};

const Entry = ({ children, isAssistant }) => {
  const bgUser = useColorModeValue("gray.100", "gray.700");
  const bgAssistant = useColorModeValue("#DFE8F1", "#42536B");
  return (
    <Box bg={isAssistant ? bgAssistant : bgUser} borderRadius="lg" p="4" whiteSpace="pre-line">
      {children}
    </Box>
  );
};

Chat.getLayout = getDashboardLayout;

export default Chat;
