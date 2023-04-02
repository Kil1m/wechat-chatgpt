import {
  Configuration,
  CreateImageRequestResponseFormatEnum,
  CreateImageRequestSizeEnum,
  OpenAIApi
} from "openai";
import DBUtils from "./data.js";
import fs from "fs";
let apiKeys=process.env.OPENAI_API_KEYS;
let curIndex=0;
let configuration = new Configuration({
  apiKey: apiKeys[curIndex],
});
let openai = new OpenAIApi(configuration);

/**
 * Get completion from OpenAI
 * @param username
 * @param message
 */
async function chatgpt(username:string,message: string): Promise<string> {
  // 先将用户输入的消息添加到数据库中
  DBUtils.addUserMessage(username, message);
  const messages = DBUtils.getChatMessage(username);
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: 0.6
  }).then((res) => res.data).catch((err) => console.log(err));
  if (response) {
    let availableKey= apiKeys.splice(curIndex, 1);
    apiKeys.unshift(availableKey);
    curIndex=0;
    return (response.choices[0].message as any).content.replace(/^\n+|\n+$/g, "");
  } else {
    if(curIndex>=apiKeys.length-1){
      curIndex=0;
      return "Something went wrong"
    }else{
      curIndex++;
      openai=new OpenAIApi(new Configuration(apiKeys[curIndex]))
      return chatgpt(username,message)
    }
   
  }
}

/**
 * Get image from Dall·E
 * @param username
 * @param prompt
 */
async function dalle(username:string,prompt: string) {
  const response = await openai.createImage({
    prompt: prompt,
    n:1,
    size: CreateImageRequestSizeEnum._256x256,
    response_format: CreateImageRequestResponseFormatEnum.Url,
    user: username
  }).then((res) => res.data).catch((err) => console.log(err));
  if (response) {
    return response.data[0].url;
  }else{
    return "Generate image failed"
  }
}

/**
 * Speech to text
 * @param username
 * @param videoPath
 */
async function whisper(username:string,videoPath: string): Promise<string> {
  const file:any= fs.createReadStream(videoPath);
  const response = await openai.createTranscription(file,"whisper-1")
    .then((res) => res.data).catch((err) => console.log(err));
  if (response) {
    return response.text;
  }else{
    return "Speech to text failed"
  }
}

export {chatgpt,dalle,whisper};