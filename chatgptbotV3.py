from revChatGPT.V3 import Chatbot
import os
import sys
import socket
import asyncio
import threading
import json
peerIP="localhost"
listenPort = 7788
sendPort = 7789

class QQMessageHandler():
    def __init__(self):
        self.chatbot = Chatbot(api_key="ab-Y0UrApiKeyFrom0PenAIDotCom")
        #Chatbot(config={"email":"yourEmail@someWebsite.com", "password":"p@ssw0rd"})
        self.rec_UDP()
    def rec_UDP(self):#Listen Message from UDP port 7788, forward message to self.get_answer()
        print("Listening on port", listenPort)
        while True:
            # UDP commands for listening
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.bind(('localhost', listenPort))
            botMessage,addr=sock.recvfrom(65535)
            if addr!="127.0.0.1":
                continue
            threading.Thread(target=self.get_answer,args=((botMessage),)).start()

    def get_answer(self,botMessage):
        #botMessage=botMessage.decode("UTF-8")
        answer_data=json.loads(botMessage)
        print(answer_data["question"])
        if answer_data["controller"]!="":
            if answer_data["controller"]=="!reset" or answer_data["controller"]=="！reset":
                print("reset!")
                self.chatbot.reset(convo_id=answer_data["qqid"].__str__())
            if answer_data["controller"]=="!rollback" or answer_data["controller"]=="！rollback":
                print("rollback!")
                self.chatbot.rollback(n=2,convo_id=answer_data["qqid"].__str__())
            return
        answer_data["answer"] = ""
        for line in self.chatbot.ask(prompt=answer_data["question"],convo_id=answer_data["qqid"].__str__()):
            answer_data["answer"]+=line
            print(line,end="")
        self.send_UDP(answer_data)

    def send_UDP(self, answer_data):
        # UDP commands for sending
        answer_data_str=json.dumps(answer_data)
        if not isinstance(answer_data_str, bytes):
            answer_data_str = answer_data_str.encode()
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(answer_data_str,(peerIP, sendPort))

if __name__ == "__main__":
  qmsg=QQMessageHandler()

