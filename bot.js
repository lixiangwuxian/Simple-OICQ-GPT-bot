const { createClient, GroupMessage, Message } = require("oicq-icalingua-plus-plus")

const account =123456789
const qq_password="YourPassWord"
const qqClient = createClient(account, {
    log_level: "none",
    platform: 5,
})

var udp = require('dgram')
var peerSend = udp.createSocket('udp4')
var peerRec = udp.createSocket('udp4')
var waitDict={}
//const { Jrrp } = require("./jrrp")
//var rpHandler=new Jrrp()
var enabledGroups=[123456789]

function isEnableedGroup(group_id){
  enabledGroups.forEach(element => {
    if(element==group_id){
      return true
    }
  });
  return false
}

function sendBuffer(gpt_question){
  console.log(JSON.stringify(gpt_question))
  peerSend.send(
    Buffer.from(JSON.stringify(gpt_question)),7788,'localhost',function(error){
      if(error){
          console.log(error)
          peerSend.close()
        }
        else{
          console.log('Sent GPT question')
        }
    }
  )
}

async function methodHandler(e){
  if(e.raw_message.split(' ',1)=="今日人品"||e.raw_message.split(' ',1)=="jrrp"){
    //await new Promise(r => setTimeout(r,Math.floor(Math.random()*1000)+1000))
    //e.reply("今日人品："+rpHandler.get_jrrp(e.sender.user_id))
    return
  }
  else{
    if(e.raw_message[0]=='!'||e.raw_message[0]=='！'){
      var gpt_question={
        qqid:e.sender.user_id,
        question:" ",
        date:0,
        controller:e.raw_message
      }
      sendBuffer(gpt_question)
      await new Promise(r => setTimeout(r,Math.floor(Math.random()*500)+500))
      e.reply("Sent the operation")
      return
    }
    else if(e.raw_message[0]=='#'&&e.message_type=="group"){//group msg
      var time_now=new Date().getTime()
      waitDict[e.group_id]={msg_event:e,date:time_now}
      var gpt_question={
        qqid:e.group_id,
        question:e.raw_message.substring(1),
        date:time_now,
        controller:""
      }
      sendBuffer(gpt_question)
      return
    }
    else if(e.message_type=="private"){
      var time_now=new Date().getTime()
      waitDict[e.sender.user_id]={msg_event:e,date:time_now}
      var gpt_question={
        qqid:e.sender.user_id,
        question:e.raw_message,
        date:time_now,
        controller:""
      }
      sendBuffer(gpt_question)
      return
    }
  }
}

peerRec.on('listening',()=>{//listen chatgpt answer
    console.log('开始监听端口7789')
})
peerRec.on('message',(msg,info)=>{//return chatgpt answer
    console.log('已接收到消息')
    const answer_obj=JSON.parse(msg.toString())
    if(info.address!="127.0.0.1"){
      console.log("非法来源")
      return
    }
    if(answer_obj.date!==waitDict[answer_obj.qqid].date){
      console.log("非对应回复")
      console.log("提问时间"+answer_obj.date+"回答对应的提问时间"+waitDict[answer_obj.qqid].date)
      //return
    }
    waitDict[answer_obj.qqid].msg_event.reply(content=answer_obj.answer)
    console.log("已回复")
})
peerRec.bind(7789)

qqClient.on("system.online", () => console.log("Logged in!"))

qqClient.on("message.private", async e => {
    console.log("「私聊消息」"+e.sender.nickname+"["+e.sender.user_id+"]:"+e.raw_message+"\n")
    methodHandler(e)
})

qqClient.on("message.group", async e => {
    if(isEnableedGroup(e.group_id)){
        console.log(e.group_name+"["+e.group_id+"]"+"的群员\n "+(e.sender.user_id==80000000?"匿名者":(e.sender.nickname+"["+e.sender.user_id+"]"))+":"+e.raw_message+"\n")
        methodHandler(e)
    }
})

{//Login part
  qqClient.on("system.login.slider", function (event) { //监听滑动验证码事件
    process.stdin.once("data", (input) => {
      this.sliderLogin(input); //输入ticket
    })
  }).on("system.login.device", function (event) { //监听登录保护验证事件
    process.stdin.once("data", () => {
      this.login(); //验证完成后按回车登录
    })
  }).login(qq_password)
}

