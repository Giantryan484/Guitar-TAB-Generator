# Guitar TAB Generator

<div style="text-align: center">
    This is the repository for my guitar TAB generation application. Upload an audio file of solo guitar playing, and then watch it be converted into playable TABs. 
    <br/>
    <img src="Website/tab-generator-app/public/demo_image(1).png" alt="Image of audio file being converted into TABs"/>
    <br/>
    The website is live at <a href="https://tabgenerator.app/">tabgenerator.app</a>, running entirely in your browser. 
    <br/>NOTICE: currently this website is non-functional because of an unforseen error. My hard deadline for having this functional is November 1, my first college deadline. 
</div>

## About the repository

The core of this project involves two tasks: training a model, and building an app that uses it. 

The `Python` directory hosts the python files used to generate training data for the model, and then train a convolutional (and recurrent, actually) neural network on said data. It has various subfolders that host the individual files and functions for different subtasks in this goal. 

The `Website` directory hosts the React app that I built entirely from scratch so that an average computer user could take advantage of the model's usefulness. It runs entirely on client-side resources using Tensorflow_JS, with what I hope is an intuitive UI (I'm a backend dev, so it's intuitive for me, at least). Considering that my target audience is a group with relatively little technical expertise, this was important to me.

I've excluded the `Python/Data/` directory because that is where hundreds of artificially-generated files and the dataset were taking up almost a gigabyte of space. I figure that, because I provided the code I used to generate it, anyone interested in investigating my approach can simply generate the data themselves. Do note that this requires installation of fluidsynth, the application used to generate audio with soundfonts.

## About the Project (From the MIT Maker Portfolio, incomplete.)

<details>
  <summary>Project summary</summary>
   - What is it? If it's not obvious, what does it do and how does it work?
<br/><br/>
I've built an open-source web-app that can take in the audio of a song and generate playable guitar sheet-music based on what it hears. Specifically, it will generate Guitar TABs (tablature), which is a type of sheet-music that is especially targeted towards beginner musicians (it simplifies complex sheet music into fret/string pairs). In a sense, I've built a tool that lets beginner guitarists play their favorite songs, even if they lack the skills to learn it by ear.
<br/><br/>
The core of this project's functionality is a convolutional neural network. My application takes the audio and converts it into a spectrogram using FFTs, then the CNN looks at slices of that audio-image and output notes based on what it sees. Specifically, the model can see several 32nd-note slices at a time, and it outputs any note-beginnings that it recognizes in those slices.
I've then written a separate analytical function that takes the notes that the CNN recognizes and transforms them into playable Guitar TABs. It's a bit of an inefficient algorithm, but it essentially looks at every possible way to play the notes in any period of time, and finds which one minimizes distance and is (hopefully) easiest to play. 
<br/><br/>
While the product is currently up and running, it's not at all in its final state. I plan on improving the application so it can also isolate guitar audio from vocals, drums, or bass, and I'm also interested in creating a separate model to transcribe bass-lines to help me learn jazz bass.
</details>

<details>
  <summary>Project highlight</summary>
   - Explain your favorite thing about this project and why.
<br/><br/>
My favorite thing about this project is seeing other people use it. Never before have I made something so helpful for other people. Once I got the website up and running, I showed it off to some of my colleagues, and the feedback was surprisingly very positive! People quickly started using it:
<br/><br/>
The guitarist in my school's jazz band, Peter, comes from a rock background, and he's not very comfortable reading sheet music. Using my tool, he was able to learn the music for our jazz band by transcribing recordings of the songs into a format he was familiar with, analyzing what the guitarist in the recording was doing and learning how to replicate it.<br/>
My elementary school music director, Mr. Shugert, runs private lessons with beginner guitarists, and I told him about this project. He eagerly tried it out, and he's now encouraging its use among his students to help them learn their favorite songs. <br/>
My brother, Andrew, is perhaps my most dear use case. I grew up listening to him slowly peck through songs in his room, learning every song by The Backseat Lovers by ear. I made this project with him in mind, and seeing him use it for the first time was perhaps the most personal fulfillment I've felt until now. It's so satisfying hearing how much he's been able to expand his musical breadth since I gave him this tool.
<br/><br/>
I think this project has taught me that I love helping people. I hope my projects in college and beyond are able to put smiles on peoples' faces like this one did.
</details>

<details>
  <summary>Contributions and credit </summary>
   - What was your personal role in this project? If you made changes to an existing project, explain what you started with and what you changed. Name any collaborators/mentors and summarize their roles. Tell us if any of your collaborators are also possibly submitting an MIT Maker Portfolio this year.
<br/><br/>
This was a lone-wolf project for me; nobody even knew I was working on it until I was almost done. I was already very familiar with all the technologies I needed, so the only outside resources I used was simply the documentation of the libraries I used.
<br/><br/>
The closest thing to a 'mentor' for me was Dr. Matthew Reisman (founder of Bedrock Research, see 'Jobs' section of my application). I told him about this project as an example of my previous ML experience, and he suggested that I make it into a tool that anyone, even non-programmers, could use. So, I took my python server and React frontend (which required lots of technical skill to set up) and combined them into one simple, user-friendly static-website that's hosted on GitHub-pages for all to use (which sounds a lot simpler to do than it actually was...).
<br/><br/>
I'll go ahead and cite the main python libraries used in this project:
TensorFlow, TensorFlow.js, Keras (machine learning)
Music21 (MIDI creation and bank/preset management, send a 'thank you' over to Dr. Cuthbert for me [though I heard he left MIT this year])
Mido (manipulating and analyzing MIDI contents)
NumPy (linear algebra; tensor handling)
</details>

<details>
  <summary>Background context</summary>
   - Tell us any goals that might help us better understand your project. “Having fun” and “learning” are valid goals.<br/>
 - Context: Who is it for? How is it used? Don't assume these answers are obvious. If you have made a tool or product to address some problem, what else already exists to solve the same problem?<br/>
 - Describe constraints like budget, space, available tooling, etc. If your project was submitted to an annual competition with a complex ruleset (like FIRST Robotics or VEX Robotics), summarize the most important constraints.
<br/><br/>
I started this project right after I finished studying for and achieving the TensorFlow Developer Certificate from Google. I figured it'd be a great first project for me to apply what I've learned, while also expanding my knowledge along the way. Aside from personal development, I also wanted to make something that would be useful for other people.
<br/><br/>
Constraints: low budget and horrible GPU, can't afford AWS stuff
</details>

<details>
  <summary>Build process</summary>
   - Tell us more about your build. What was your approach, and why did you decide to do it that way? If there was a design/testing process, what did you do? Consider attaching photos in the subsequent media uploader page to demonstrate your build process.
<br/><br/>

</details>

<details>
  <summary>Reflection and learnings</summary>
   - What changed along the way? Did the result fulfill your intended goals? What turned out well? What mistakes did you make? If things broke, why? Are there things you would like to do differently next time? What did you learn?
<br/><br/>

</details>