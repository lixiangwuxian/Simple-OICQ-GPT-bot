from revChatGPT.V1 import Chatbot
import os
import sys
import socket
import asyncio
import threading
import json
import redis
peerIP="localhost"
listenPort = 7788
sendPort = 7789
#access_token=""
#需要预先在redis中设置

class QQMessageHandler():
    def __init__(self):
        self.redisController=Redis_controller()
        if self.redisController.get_token()!="":
            self.need_token=False
            self.chatbot=Chatbot(config={"access_token": self.redisController.get_token()})
        else:
            self.need_token=True
        self.sem=threading.Semaphore(1)#only one request at a time allowed
        self.rec_UDP()
    def rec_UDP(self):#Listen Message from UDP port 7788, forward message to self.get_answer()
        print("Listening on port", listenPort)
        while True:
            # UDP commands for listening
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.bind(('localhost', listenPort))
            botMessage,addr=sock.recvfrom(65535)
            threading.Thread(target=self.get_answer,args=((botMessage),)).start()
    def get_answer(self,botMessage):
        #botMessage=botMessage.decode("UTF-8")
        self.sem.acquire()
        answer_data=json.loads(botMessage)
        if answer_data["controller"]!="":
            self.cmd_handler(answer_data)
        else:
            self.answer_handler(answer_data)
    def answer_handler(self,answer_data):
        print("提问"+answer_data["question"])
        try:
            if self.need_token==True:
                answer_data["answer"]="请更新token"
                self.send_UDP(answer_data)
                return
            print("回答中",end="")
            if not self.redisController.check_qqid_exist(answer_data["qqid"].__str__()):
                data=self.redisController.new_covoid(answer_data["question"],answer_data["qqid"].__str__())
                self.chatbot.change_title(self.redisController.get_covoid_by_qqid(answer_data["qqid"].__str__()), answer_data["qqid"].__str__())
                response=data["message"]
            else:
                parent_id=None
                for data in self.chatbot.ask(prompt=answer_data["question"],conversation_id=self.redisController.get_covoid_by_qqid(answer_data["qqid"].__str__()),parent_id=parent_id):
                    print(".",end="",flush=True)
                print("")
                response = data["message"]
            print(response,end="\n")
            answer_data["answer"]=response
            print("Done")
        finally:
            self.send_UDP(answer_data)
    def cmd_handler(self,answer_data):
        try:
            if answer_data["controller"][1:6]=="reset":
                if self.need_token==True:
                    answer_data["answer"]="请更新token"
                else:
                    answer_data["answer"]="已重置"
                    self.redisController.delete_cov(answer_data["qqid"].__str__())
            elif answer_data["controller"][1:9]=="rollback":
                answer_data["answer"]="此功能目前无法使用"
            elif answer_data["controller"][1:6]=="renew":
                answer_data["answer"]="token更新成功"
                self.redisController.set_token(answer_data["question"])
                self.chatbot.set_access_token(answer_data["question"])
            elif answer_data["controller"][1:]=="help":
                answer_data["answer"]=(
                    "输入 !reset 以重新开始对话\n"
                    "输入 jrrp 获取今日人品\n"
                    "输入 !renew <token> 更新api token\n"
                    "输入 !addgroup <group id> 添加启用的群组"
                )
            else:
                answer_data["answer"]="指令无效"
        finally:
            self.send_UDP(answer_data)
    def send_UDP(self, answer_data):
        self.sem.release()
        answer_data_str=json.dumps(answer_data)
        if not isinstance(answer_data_str, bytes):
            answer_data_str = answer_data_str.encode()
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(answer_data_str,(peerIP, sendPort))



class Redis_controller:
    def __init__(self):
        self.pool = redis.ConnectionPool(host='localhost', port=6379, decode_responses=True)
        self.r = redis.Redis(connection_pool=self.pool)
        self.r.auth("password")
    def check_qqid_exist(self,qqid):
        if self.r.exists(qqid):
            return True
        else:
            return False
    def get_covoid_by_qqid(self,qqid):
        return self.r.get(qqid)
    def new_covoid(self,first_question,qqid):
        chatbot=Chatbot(config={"access_token": self.get_token()})
        for data in chatbot.ask(first_question):
            pass
        self.r.set(qqid,data['conversation_id'])
        return data
    def delete_cov(self,qqid):
        if not self.r.exists(qqid):
            return False
        chatbot=Chatbot(config={"access_token": self.get_token()})
        chatbot.delete_conversation(self.r.get(qqid))
        self.r.delete(qqid)
    def get_token(self):
        if not self.r.exists("token"):
            return ""
        return self.r.get("token")
    def set_token(self,token):
        self.r.set("token",token)

if __name__ == "__main__":
  qmsg=QQMessageHandler()

