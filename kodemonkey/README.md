# 🚀 Transform ideas into apps in minutes! 📱💡
## Curious? Get to know us through 8 minutes of video:

Discover the magic of creating **fully functional apps** with a single-line prompt, all in just minutes! 👩‍💻👨‍💻 Explore it [here](https://drive.google.com/file/d/1XZjQZLmvGwY7Uit-LoSj2lWvbetrd35V/view?usp=sharing), and witness the generation of 4 apps [here](https://drive.google.com/file/d/1xjV-fyPE1hxTzMl-9hp7FutwxlrYK77G/view?usp=sharing). Check out our sleek [Slide Deck](https://docs.google.com/presentation/d/1zarR_nXyX-WSJTJUrjHezVSP3jAy6vKWehEuqF3BS6A/edit?usp=sharing) for a quick overview.

## 🤖 What it is
*kodemonkey* - your VSCode Extension, transforming your one-sentence idea into a fully-fledged app in minutes. It's like having your personal software development team, where you're always the boss! 💼💻

## 🚀 How to use it
1. Tell the kodemonkeys your app idea in one sentence.
2. Wait for the magic to happen.
3. Admire your new app in your VSCode editor! 🎉

## ⚙️ How it works
In the world of software development, *kodemonkey* combines a project manager and a software developer. With two GPT-4 LLMs, one as the PM and the other as the software dev, they collaborate to bring your app to life. Sit back and relax as they handle everything - from driving development to writing code. Your dream app materializes in just a few minutes! ✨

Explore sample conversations between the kodemonkeys [here](https://docs.google.com/document/d/19xDeuhentgLLNI9eWJA-hLm6DK5S5EW6REo9POnaook/edit#heading=h.5gucx2x3ncqq) and learn how we prompt the agents [here](https://docs.google.com/document/d/19xDeuhentgLLNI9eWJA-hLm6DK5S5EW6REo9POnaook/edit#heading=h.gxm1mdhkleye).

## 🌟 Inspiration
*kodemonkey* was born out of the inconvenience faced while coding with Copilot or ChatGPT, where AI suggestions couldn't be directly applied. Say goodbye to the copy-pasting hassle - with *kodemonkey*, the integration between coding assistants and your code editor eliminates the human middleman! 👋🤖

## 🔨 How we built it
We specially engineered system prompts for the Dev Monkey and PM KodeMonkey. Using the OpenAI GPT-4 API, we were able to get the Dev KodeMonkey to output it's intended actions as a software engineer into standardized JSON objects. Each action called provided functions (createFile, createFolder, runCommandLine, etc.) that we implemented using available VSCode extension APIs (and a hacky Node.js tool workaround to help when the VSCode was too limited) and provide all the tools that the Dev KodeMonkey needs to create a fully functional app on the user's machine! We initially acted as the "PM KodeMonkey" and sent it refining prompts to test our Dev KodeMonkey's ability to create applications. Once we were confident in KodeMonkey's capabilities, we engineered the prompt for PM KodeMonkey so that the user could play a very hands-off role in the process! This software development process was motivated by a paper we read titled [https://arxiv.org/abs/2307.07924](_Communicative Agents for Software Development_) by Qian et. all where they showed that LLMs can play a effective role in a software development company in many different roles.

## 🤔 Challenges we ran into
The biggest challenge we ran into initially and continue to have to address in rare cases is the unpredictability of an LLM response. We need a structured response from the Dev KodeMonkey (DK) in the form of a JSON for our extension to be able to interpret what the DK wants to do. One possible solution was the newly released response_format flag that OpenAI released. However, that was only available with GPT-4 Turbo (too slow) and GPT-3.5 Turbo (inferior code generation). Thus, we had to reinforce, through the system prompt itself, how important it was for DK to return a properly structured response. Through many iterations, we finally landed on a prompt similar to the one we use now. The vast majority of the time, it responds with a pure, properly formatted JSON, however, we have implemented some failsafes to improve the robustness of our extension.

Another big challenge that we had to face we command line execution. We originally used the VSCode Terminal API for everything which worked for smaller, simpler projects with not many dependencies. However, we ran into an issue with larger projects where dependencies would need to be installed before some actions could be run. This necessitated blocking actions where the next action would not be executed until one finished. So how do you tell if a VSCode Terminal is done running a command? Obviously you just read the exit status right? WRONG!!! VSCode doesn't provide an API for reading any terminal output for terminals that the extension creates. We saw online that a lot of people ran into this issue and it doesn't seem like Microsoft will actually add the capability. Thus, we tried a super hacky workaround; since VSCode extension run on Node.js, we can actually use spawn child processes through Node.js that allow you do interact with them like a normal terminal and read their output. Since there are some drawbacks to this approach, we ended going with a combination of Node.js children and VSCode terminals, the former for blocking command line calls and the latter for indefinitely lasting/asynchronous command line calls. 

## 🎯 Accomplishments that we're proud of
While testing KodeMonkey, we were able to generate multiple working applications, most of which required no additional prompting or coaxing. The two KodeMonkeys just went through the Software Development cycle and were able to produce an amazing, fully-functional app at the end! So far we've successfully tested a react todo-list app, a photo gallery, Python adventure game, a mock data generator, the list goes on. When the creativity and problem-solving skills of LLMs is fully utilized in this way, amazing things can occur :D.

## 🧠 What we learned
LLMs sure are temperamental, one instance of KodeMonkey running might yield exactly what we want and the next will be completely different. This can be slightly mitigated by turning down the temperature of the model, however, there is little to no determinism even with temperature set to 0.
There's a lot of unexpected intuition to creating an application that isn't always obvious to a naive model. Which dependencies to install, what port to listen to, when to start certain services in relation to others, these are all things that seem intuitive to us after years of trying stuff out. Luckily, through chain of thought reasoning and self-prompting, KodeMonkey was able to figure out most of these nuances!

## 👀 What's next for KodeMonkey
Right now KodeMonkey is limited to elementary apps that coders usually learn how to do within one or two years of starting out. While it was impressive what we were able to accomplish in the short time frame of 36 hours, there's lots of opportunity to flesh out this development tool. Currently the apps are small enough to fit within the context window of the OpenAI GPT-4 model so there is no need for KodeMonkey to requery for file contents or only return the needed diffs to modify the file. In a more sophisticated system, KodeMonkey would infer which files it needs to complete the task and query for their contents for context or modification. It would also save time and tokens by only returning the diff between current files and the proposed revision. 
Our vision for the future of this hack is for developers that are completely unfamiliar with a certain framework or workflow looking to make a project to be able to create a fully fleshed out website that they can mold to their liking. They can learn from the website to develop their skills in the area or just not even have to worry about that area with our KodeMonkey at their disposal!

