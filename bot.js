const { createClient, segment } = require("oicq-icalingua-plus-plus")
require("./jrrp")
require("./bot_config")
var redisClient=require('redis')
var udp = require('dgram')
const { Jrrp } = require("./jrrp")
const { Bot_config } = require("./bot_config")
var peerSend = udp.createSocket('udp4')
var peerRec = udp.createSocket('udp4')
var waitDict={}
var bot_config=new Bot_config()
var superUser="Your QQid"

var rcli=redisClient.createClient({
  host: 'localhost',
  port: 6379,
  password: ""
});

var rpHandler=new Jrrp()

function isEnabledGroup(group_id){
  if(bot_config.enabledGroups[group_id]===true){
    return true
  }
  return false
}

function sendBuffer(gpt_question){
  //console.log(JSON.stringify(gpt_question))
  peerSend.send(
    Buffer.from(JSON.stringify(gpt_question)),7788,'localhost',function(error){
      if(error){
          console.log(error)
          peerSend.close()
        }
    }
  )
}

function CheckCMD_Authority(tokens,qqid){
  var superUserCMD=['renew','add_group']

  superUserCMD.forEach((e)=>{
    if(e==tokens[0].substring(1)&&qqid!=superUser){
      return false
    }
  })
  return true
}

async function CMD_MessageHandler(e,tokens){
  var time_now=new Date().getTime()
  if (!CheckCMD_Authority(tokens,e.sender.user_id)&&tokens[0]){
    e.reply("错误：无权限",true)
    return
  }
  waitDict[time_now]={msg_event:e}
  var gpt_question={
    qqid:e.sender.user_id,
    question:tokens[1],
    date:time_now,
    controller:tokens[0]
  }
  sendBuffer(gpt_question)
}

function GroupGPTMessageHandler(e){
  var time_now=new Date().getTime()
  waitDict[time_now]={msg_event:e}
  var gpt_question={
    qqid:e.group_id,
    question:e.raw_message.substring(1),
    date:time_now,
    controller:""
  }
  sendBuffer(gpt_question)
}

function PrivateMessageHandler(e){
  var time_now=new Date().getTime()
  waitDict[time_now]={msg_event:e}
  var gpt_question={
    qqid:e.sender.user_id,
    question:e.raw_message,
    date:time_now,
    controller:""
  }
  sendBuffer(gpt_question)
}

async function LocalSuperUserMessageHandler(e,tokens){
  if(CheckCMD_Authority(tokens,e.sender.user_id)){
    e.reply("无权限",true)
    return
  }
  bot_config.enabledGroups[parseInt(tokens[1])]=true
  e.reply("群组"+parseInt(tokens[1])+"添加成功")
}

async function JrrpMessageHandler(e){
  var jrrp_evaluate=((rp_value)=>{
    if(rp_value>80){
      return "，为大吉"
    }
    else if(rp_value>60){
      return "，为中吉"
    }
    else if(rp_value>40){
      return "，为小吉"
    }
    return ""
  })(rpHandler.get_jrrp(e.sender.user_id))
  var reply_message=[segment.reply(e.message_id),"同学你好，你今天的人品值为"+rpHandler.get_jrrp(e.sender.user_id),jrrp_evaluate]
  e.reply(reply_message)
}

async function DLUT_HeadMasterMessageHandler(e){
  var time_now=new Date().getTime()
  waitDict[time_now]={msg_event:e}
  var gpt_question={
    qqid:"校长",
    question:e.raw_message.substring(3),
    date:time_now,
    controller:""
  }
  sendBuffer(gpt_question)
}


async function methodRouter(e){
  var tokens=e.raw_message.split(' ').filter(d=>d)

  if(tokens[0]=="校长"){
    DLUT_HeadMasterMessageHandler(e)
  }
  else if(tokens[0]=="今日人品"||tokens[0]=="jrrp"){
    JrrpMessageHandler(e)
  }
  else if(tokens[0]=='!add_group'){
    LocalSuperUserMessageHandler(e,tokens)
  }
  else if(e.raw_message[0]=='!'||e.raw_message[0]=='！'){
    CMD_MessageHandler(e,tokens)
  }
  else if(e.raw_message[0]=='#'&&e.message_type=="group"){
    GroupGPTMessageHandler(e)
  }
  else if(e.message_type=="private"){
    PrivateMessageHandler(e)
  }
}

{//port listening

}

async function main(){
  await rcli.connect();
  var qq_account=await rcli.GET("qq_account")
  var qq_password=await rcli.GET("qq_password")
  const qqClient = createClient(qq_account, {
    log_level: "none",
    platform: 4,
  })

  qqClient.on("system.online", () => console.log("Logged in!"))
  
  qqClient.on("message.private.friend", async e => {
      console.log("「私聊消息」"+e.sender.nickname+"["+e.sender.user_id+"]:"+e.raw_message+"\n")
      methodRouter(e)
  })
  
  qqClient.on("message.group", async e => {
      if(isEnabledGroup(e.group_id)){
        methodRouter(e)
      }
  })
  qqClient.on("system.login.slider", function (event) { //监听滑动验证码事件
    process.stdin.once("data", (input) => {
      this.sliderLogin(input); //输入ticket
    })
  }).on("system.login.device", function (event) { //监听登录保护验证事件
    process.stdin.once("data", () => {
      this.login(); //验证完成后按回车登录
    })
  }).login(qq_password)
  peerRec.on('listening',()=>{//listen chatgpt answer
    console.log('开始监听端口7789')
  })
  peerRec.on('message',async (msg,info)=>{//return chatgpt answer
      console.log('已接收到消息')
      const answer_obj=JSON.parse(msg.toString())
      //console.log(answer_obj)
      if(info.address!="127.0.0.1"){
        console.log("非法来源")
        return
      }
      if(waitDict[answer_obj.date].msg_event.message_type=="group"){
        var group_reply=[segment.reply(waitDict[answer_obj.date].msg_event.message_id),answer_obj.answer]
        waitDict[answer_obj.date].msg_event.reply(group_reply)
      }
      else{
        waitDict[answer_obj.date].msg_event.reply(answer_obj.answer)
      }
      delete waitDict[answer_obj.date]
  })
  peerRec.bind(7789)
}

main()
